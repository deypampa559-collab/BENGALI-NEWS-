/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { fallbackNews } from './src/data/fallbackNews';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory store for handcrafted articles uploaded by the Administrator
let customArticles: any[] = [];

// Initialize Gemini Client safely
let ai: GoogleGenAI | null = null;
const API_KEY = process.env.GEMINI_API_KEY;

// Circuit breaker cooldown state for API Quota exhaustion (429 / RESOURCE_EXHAUSTED)
let geminiCooldownUntil = 0;
const COOLDOWN_DURATION = 15 * 60 * 1000; // 15 minutes cooldown

// A curated collection of 100% active, gorgeous, high-resolution premium Unsplash photos
// representing different aspects of each news category for our hyper-realistic visual vibe.
const CATEGORY_UNSPLASH_IDS: Record<string, string[]> = {
  entertainment: [
    'photo-1540747737956-378724044453', // Cricket stadium / packed match
    'photo-148546234645-a62644f84728', // Calcutta vintage cinematography street
    'photo-1536440136628-849c177e76a1', // Movie cinema background
    'photo-1514525253161-7a46d19cd819', // Concert / musical live performance
    'photo-1511671782779-c97d3d27a1d4', // Recording microphone studio
    'photo-1471341971476-ae15ff5dd4ea', // Indian traditional celebration dance
    'photo-1506157786151-b8491531f063', // Neon futuristic visual backdrop
    'photo-1516450360452-9312f5e86fc7', // Stadium cheering events
    'photo-1508700115892-45ecd05ae2ad', // Abstract modern sound synthesis
  ],
  television: [
    'photo-1593305841991-05c297ba4575', // Cozy Indian home lounge watching family TV
    'photo-1516035069371-29a1b244cc32', // Glowing television studio and camera production units
    'photo-1518495973542-4542c06a5843', // Sparkling spotlights and stage
    'photo-1461151304267-38535e780c79', // Modern TV display wall
    'photo-1522869635100-9f4c5e86aa37', // Sweet television set
    'photo-1598257006458-087169a1f08d', // Cameras recording live TV scene
    'photo-1478737270239-2f02b77fc618', // Voice mic and mixers
    'photo-1585647347483-22b66260dfff', // Modern media stream interface
  ],
  national: [
    'photo-1451187580459-43490279c0fa', // High tech satellite orbit (ISRO theme)
    'photo-1541417901777-a169e2621473', // Fast bullet train speed (Indian transit)
    'photo-1524492412937-b28074a5d7da', // Taj Mahal / National Heritage monument
    'photo-1506973035872-a4ec16b8e8d9', // Tech metropolis skyscrapers
    'photo-1595841696662-f30949c2551f', // Silicon microchip/advanced engineering
    'photo-1532094349884-543bc11b234d', // Research lab sci-tech breakthroughs
    'photo-1610483178706-9a153a2b0c60', // Beautiful Vande Bharat style train cabin
    'photo-1564507592333-c60657eea523', // Classic Indian royal gate
    'photo-1504711434969-e33886168f5c', // Broadcast national news room anchor table
  ],
  international: [
    'photo-1618005182384-a83a8bd57fbe', // Tech AI neural network lines
    'photo-1473341304170-971dccb5ac1e', // Solar mills and windmill energy
    'photo-1526374965328-7f61d4dc18c5', // Matrix of cyber code grids
    'photo-1507525428034-b723cf961d3e', // Natural oceanic climate
    'photo-1447752875215-b2761acb3c5d', // Evergreen natural environment forest
    'photo-1413706338175-a619c9acfbc1', // Global conference summits
    'photo-1517048676732-d65bc937f952', // Collaborative global strategies
    'photo-1501854140801-50d01698950b', // Global mountain scenery climate
  ],
};

function getReliableImageUrl(category: string, title?: string): string {
  const cat = (category || 'national').toLowerCase();
  const pool = CATEGORY_UNSPLASH_IDS[cat] || [
    'photo-1504711434969-e33886168f5c', // default news room
    'photo-1451187580459-43490279c0fa', // science/globe
    'photo-1593305841991-05c297ba4575', // media
  ];

  let hash = 0;
  if (title) {
    for (let i = 0; i < title.length; i++) {
      hash = (hash << 5) - hash + title.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
  } else {
    hash = Math.floor(Math.random() * 100);
  }

  const index = Math.abs(hash) % pool.length;
  const photoId = pool[index];
  return `https://images.unsplash.com/${photoId}?w=800&auto=format&fit=crop&q=80`;
}

function parseIsQuotaLimitError(err: any): boolean {
  if (!err) return false;
  const errMsg = err.message || '';
  const errStr = JSON.stringify(err);
  return (
    errMsg.includes('429') ||
    errMsg.includes('RESOURCE_EXHAUSTED') ||
    errMsg.includes('quota') ||
    errMsg.includes('Quota') ||
    errStr.includes('429') ||
    errStr.includes('RESOURCE_EXHAUSTED') ||
    errStr.includes('quota') ||
    errStr.includes('Quota')
  );
}

if (API_KEY && API_KEY !== 'MY_GEMINI_API_KEY' && API_KEY.trim() !== '') {
  try {
    ai = new GoogleGenAI({
      apiKey: API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    console.log('Gemini AI successfully initialized for server-side news generation.');
  } catch (err) {
    console.error('Failed to initialize GoogleGenAI:', err);
  }
} else {
  console.log('No valid GEMINI_API_KEY detected. Running in Offline Fallback modes.');
}

// API: Add client-uploaded manual news article (Editor Curation Feature)
app.post('/api/add-news', (req, res) => {
  const { title, summary, content, category, imageUrl, source } = req.body;
  if (!title || !content || !category) {
    return res.status(400).json({ error: 'Title, content, and category are required' });
  }

  const newArticle = {
    id: `custom-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    title,
    summary: summary || title.slice(0, 80) + '...',
    content,
    category,
    publishedAt: 'এখনই সম্প্রচারিত', // Broadcasted right now
    imagePrompt: 'Manually uploaded by Administrator',
    imageUrl: imageUrl || getReliableImageUrl(category, title),
    source: source || 'সম্পাদক (নিজে যোগ করা)',
    isAiGenerated: false,
  };

  customArticles.unshift(newArticle);
  console.log(`[Editor Admin] Manually published new article: "${title}" in category: "${category}"`);
  res.json({ success: true, article: newArticle });
});

// API: Delete client-uploaded manual news article (Editor Curation Feature)
app.post('/api/delete-news', (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ error: 'Article ID is required' });
  }

  const initialCount = customArticles.length;
  customArticles = customArticles.filter(art => art.id !== id);
  console.log(`[Editor Admin] Deleted custom article with ID: ${id}. Initial count: ${initialCount}, Remaining: ${customArticles.length}`);
  res.json({ success: true });
});

// API: Fetch breaking news
app.post('/api/news', async (req, res) => {
  const { category } = req.body;
  const targetCategory = category || 'national';

  // Filter custom articles of the requested category
  const categoryCustom = customArticles.filter(art => art.category === targetCategory);

  const isCooldownActive = geminiCooldownUntil > Date.now();
  if (isCooldownActive) {
    const remainingSecs = Math.ceil((geminiCooldownUntil - Date.now()) / 1000);
    console.warn(`[Circuit Breaker] Gemini is cooling down for another ${remainingSecs}s. Serving cached news.`);
    const filtered = fallbackNews.filter(art => art.category === targetCategory);
    return res.json({ articles: [...categoryCustom, ...filtered], source: 'quota-limited' });
  }

  // If Gemini client is active, attempt to generate real-time grounded news
  if (ai) {
    try {
      console.log(`Generating grounded news for category: ${targetCategory}...`);
      
      const currentTimeString = new Date().toISOString();
      const prompt = `You are a professional native Bengali editor for "বাংলা খবর" (Bangla Khobor).
Search today's web using Google Search tool for breaking news developments (within the last 24-48 hours) for the category: "${targetCategory}".
Create exactly 8 realistic, accurate, and interesting news articles based on real reports from India and globally, tailored for Bengali readers.

Strict category criteria:
- entertainment: Focus on Tollywood (Kolkata cinema), Bollywood, major sports highlights like cricket, football, or IPL updates.
- television: Focus on popular Bengali mega-serials (such as Star Jalsha, Zee Bangla shows), TV stars, or family reality shows.
- national: Focus on Indian national happenings, ISRO research, politics, infrastructure or economy.
- international: Focus on global developments, science discoveries, climate agreements, or international affairs.

The time right now is ${currentTimeString}. Ensure relative times look fresh (e.g. 10 মিনিট আগে, ১ ঘণ্টা আগে, ৪ ঘণ্টা আগে).
For each article, you MUST provide a true citation source and a corresponding link from your search results (sourceUrl / grounded search citation link) if possible.
In your imagePrompt, output a concrete English prompt for an AI illustrator to render the story. DO NOT include code blocks or Markdown in the JSON string itself.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              articles: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING, description: "A unique dynamic string, e.g. gen-1, gen-2" },
                    title: { type: Type.STRING, description: "Highly engaging and accurate headline in clear Bengali" },
                    summary: { type: Type.STRING, description: "A crisp 1-2 sentence Bengali summary of the breaking story" },
                    content: { type: Type.STRING, description: "Comprehensive, deep 2-3 paragraph detailed article content in Bengali, fully informative" },
                    category: { type: Type.STRING, description: "Must be exactly the string: " + targetCategory },
                    publishedAt: { type: Type.STRING, description: "A human-friendly relative time in Bengali, e.g. '১৫ মিনিট আগে', '২ ঘণ্টা আগে' referring to when it happened relative to now" },
                    imagePrompt: { type: Type.STRING, description: "Detailed descriptive English prompt for an AI illustration representing the story, e.g. 'Professional photorealistic view of a space rocket landing, wide angle, cinematic lighting'" },
                    source: { type: Type.STRING, description: "Authentic news channel name, e.g. 'আনন্দবাজার', 'এই সময়', 'জি ২৪ ঘণ্টা', 'আজতক বাংলা', etc." },
                    sourceUrl: { type: Type.STRING, description: "The authentic ground truth web search citation source link" },
                  },
                  required: ['id', 'title', 'summary', 'content', 'category', 'publishedAt', 'imagePrompt', 'source'],
                },
              },
            },
            required: ['articles'],
          },
        },
      });

      const parsedData = JSON.parse(response.text || '{}');
      if (parsedData.articles && Array.isArray(parsedData.articles) && parsedData.articles.length > 0) {
        // Assign top-tier premium photography URLs to news articles matching categories deterministically
        const generatedArticles = parsedData.articles.map((art: any) => {
          return {
            ...art,
            imageUrl: getReliableImageUrl(targetCategory, art.title),
            isAiGenerated: true,
          };
        });

        // Merge generated news with archive fallback news for an richer selection
        const fallbackOfCategory = fallbackNews.filter(art => art.category === targetCategory);
        const articles = [...generatedArticles, ...fallbackOfCategory];

        return res.json({ articles: [...categoryCustom, ...articles], source: 'ai-grounded' });
      }
    } catch (err: any) {
      if (parseIsQuotaLimitError(err)) {
        geminiCooldownUntil = Date.now() + COOLDOWN_DURATION;
        console.warn(`[Quota Exhausted] 429 Quota limits exceeded from Gemini API. Activating ${COOLDOWN_DURATION / 60000} mins cooldown.`);
        const filtered = fallbackNews.filter(art => art.category === targetCategory);
        return res.json({ articles: [...categoryCustom, ...filtered], source: 'quota-limited' });
      }
      console.error('Gemini content generation failed, using cached news:', err);
    }
  }

  // Fallback Mode if API key is not configured or fails
  console.log(`Serving fallback database for category: ${targetCategory}`);
  const filtered = fallbackNews.filter(art => art.category === targetCategory);
  res.json({ articles: [...categoryCustom, ...filtered], source: 'offline-cache' });
});

// API: Generate Live AI Illustration
app.post('/api/news/generate-image', async (req, res) => {
  const { imagePrompt, articleId, title, summary, content, category } = req.body;

  if (!imagePrompt && !title) {
    return res.status(400).json({ error: 'Either imagePrompt or title is required' });
  }

  const targetCategory = category || 'national';
  const isCooldownActive = geminiCooldownUntil > Date.now();

  let finalLiteralDescription = '';

  // 1. Keyword extraction & Metaphor Blocking step using Gemini (if available)
  if (ai && !isCooldownActive && (title || content)) {
    try {
      // Extract only the Main Headline + the first 2 sentences of the news to avoid overwhelming text limits
      let crispText = '';
      if (content && typeof content === 'string') {
        const sentences = content.split(/[।?!.]/).map((s: string) => s.trim()).filter(Boolean);
        // Add Bengali danda symbol as sentence separator
        crispText = sentences.slice(0, 2).join('। ') + (sentences.length > 0 ? '।' : '');
      } else if (summary && typeof summary === 'string') {
        crispText = summary;
      }

      const textCleanupPrompt = `You are a professional image prompt translator and contextualizer for a news website.
We have a Bengali news article. Translate its title and summary into a plain, literal, realistic description of what is happening in English.
IMPORTANT RULES:
1. Block and remove all metaphors, idioms, or poetic figures of speech (for example, if the headline has "আগুনে পারফরম্যান্স" (fiery performance) don't mention "fire" or "flames" unless there is an actual fire incident. Translate it literally to "exceptional sports play / outstanding player dynamic on the field". If it says "ঝড় উঠেছে" (a storm has brewed) about celebrity gossip, do not mention a physical "storm", "wind", or "rain", describe the scene literally as "news press conference, actor posing with microphones, or television star media interview").
2. Describe actual physical elements that would appear in a professional, natural, high-quality editorial photograph. Keep it highly realistic.
3. Be short (max 2 sentences), literal, and clear.
4. Output ONLY the plain english literal description. No markdown, no "Event:", just the pure literal text description.

Title of article: "${title || ''}"
First sentences of article: "${crispText || ''}"`;

      console.log(`[Visual Engine] Cleaning Bengali metaphors for: "${(title || imagePrompt || '').slice(0, 40)}..."`);
      const cleanupResponse = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: textCleanupPrompt,
      });

      const translatedOutput = cleanupResponse.text?.trim() || '';
      if (translatedOutput) {
        console.log(`[Visual Engine] Sanitized English Translation: "${translatedOutput}"`);
        finalLiteralDescription = translatedOutput;
      }
    } catch (err) {
      console.error('[Visual Engine] Metaphor translation phase errored:', err);
    }
  }

  // Use raw fallback prompt if translation failed or wasn't executed
  if (!finalLiteralDescription) {
    finalLiteralDescription = imagePrompt || 'news editorial photo representing recent updates';
  }

  // 2. Wrap prompt inside a highly professional strict "Prompt Template"
  const promptTemplate = `Create a highly realistic, professional, editorial news photograph illustrating the following event. High-resolution journalistic photography, eye-level cinematic camera perspective, no text layovers, no labels or logos, no illustrative/cartoon assets, clean natural ambient lighting and a believable real atmosphere. Event: ${finalLiteralDescription}`;
  console.log(`[Visual Engine] Merged Final Image Template: "${promptTemplate}"`);

  // 3. Initiate Image Generation with gemini-2.5-flash-image
  if (ai && !isCooldownActive) {
    try {
      console.log(`Drafting real AI image via gemini-2.5-flash-image...`);
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: promptTemplate }],
        },
        config: {
          imageConfig: {
            aspectRatio: '4:3',
          },
        },
      });

      let base64Data = '';
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            base64Data = part.inlineData.data;
            break;
          }
        }
      }

      if (base64Data) {
        return res.json({ imageUrl: `data:image/png;base64,${base64Data}`, mode: 'gemini-generated' });
      }
    } catch (err: any) {
      if (parseIsQuotaLimitError(err)) {
        geminiCooldownUntil = Date.now() + COOLDOWN_DURATION;
        console.warn(`[Quota Exhausted] 429 detected on Image generation. Cooldown set for ${COOLDOWN_DURATION / 60000} mins.`);
      }
      console.error('Gemini image rendering failed, shifting to dynamic fallback photo-engine:', err);
    }
  }

  // 4. Fallback: Use reliable curated Unsplash high-quality visuals matching category and context
  let matchedCat = targetCategory;
  if (!category && imagePrompt) {
    const lowercasePrompt = imagePrompt.toLowerCase();
    if (lowercasePrompt.includes('movie') || lowercasePrompt.includes('film') || lowercasePrompt.includes('cricket') || lowercasePrompt.includes('sport') || lowercasePrompt.includes('celebration') || lowercasePrompt.includes('actor') || lowercasePrompt.includes('actress')) {
      matchedCat = 'entertainment';
    } else if (lowercasePrompt.includes('tv') || lowercasePrompt.includes('serial') || lowercasePrompt.includes('television') || lowercasePrompt.includes('studio') || lowercasePrompt.includes('anchor')) {
      matchedCat = 'television';
    } else if (lowercasePrompt.includes('world') || lowercasePrompt.includes('global') || lowercasePrompt.includes('climate') || lowercasePrompt.includes('international') || lowercasePrompt.includes('summit')) {
      matchedCat = 'international';
    }
  }

  const fallbackUrl = getReliableImageUrl(matchedCat, title || imagePrompt);
  res.json({ imageUrl: fallbackUrl, mode: 'custom-unsplash-grounded' });
});

// API: Simulated weather data for Bengal region
app.get('/api/weather', (req, res) => {
  const weatherOptions = [
    { temp: 31, condition: 'আংশিক মেঘলা', city: 'কলকাতা' },
    { temp: 29, condition: 'ঝড়ো হাওয়া সহ বৃষ্টি', city: 'ঢাকা' },
    { temp: 33, condition: 'রৌদ্রোজ্জ্বল রোদ', city: 'নতুন দিল্লি' },
    { temp: 28, condition: 'মনোরম আবহাওয়া', city: 'দার্জিলিং' },
  ];
  const date = new Date();
  const index = date.getMinutes() % weatherOptions.length;
  res.json(weatherOptions[index]);
});

// Vite Middleware development configuration
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite middleware mounted in development mode.');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Serving compiled static assets in production mode.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Bangla Khobor server running locally at http://localhost:${PORT}`);
  });
}

startServer();
