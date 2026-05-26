/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { X, Bookmark, Share2, Sparkles, BookOpen, ExternalLink, RefreshCw, Eye, Image, Upload, Check, Link, AlertTriangle, Volume2, VolumeX, Play, Pause, Square } from 'lucide-react';
import { NewsArticle } from '../types';

const FALLBACK_IMAGES: Record<string, string> = {
  entertainment: 'https://images.unsplash.com/photo-1540747737956-378724044453?w=800&auto=format&fit=crop&q=80',
  television: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=800&auto=format&fit=crop&q=80',
  national: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80',
  international: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
};

// Helper function to split text into Bengali sentences
const splitIntoBengaliSentences = (text: string): string[] => {
  if (!text) return [];
  // Split using Bengali full stop (।), period (.), exclamation (!), question mark (?)
  const sentences = text.match(/[^।\.!\?]+[।\.!\?]?/g);
  return sentences ? sentences.map(s => s.trim()).filter(Boolean) : [text];
};

// Smart language detection helper
const detectLanguage = (title: string, content: string): { code: string; name: string } => {
  const combined = (title + " " + content).toLowerCase();
  
  // Count specific language character patterns
  // Bengali Char Range: \u0980-\u09FF
  const bnChars = (combined.match(/[\u0980-\u09FF]/g) || []).length;
  // Hindi/Sanskrit/etc (Devanagari Char Range): \u0900-\u097F
  const hiChars = (combined.match(/[\u0900-\u097F]/g) || []).length;
  // Latin/English/Spanish/French/German letters: a-z
  const latinChars = (combined.match(/[a-z]/g) || []).length;

  const total = bnChars + hiChars + latinChars;
  if (total === 0) return { code: 'bn', name: 'Bengali' };

  if (bnChars > hiChars && bnChars > latinChars) {
    return { code: 'bn', name: 'Bengali' };
  } else if (hiChars > bnChars && hiChars > latinChars) {
    return { code: 'hi', name: 'Hindi' };
  } else {
    // Under Latin, let's check for Spanish, French, German using common high-frequency words
    const spanishWords = /\b(el|la|los|las|y|o|en|un|una|uno|que|es|del|al|con|para|por)\b/;
    const frenchWords = /\b(le|la|les|et|ou|en|un|une|des|du|dans|pour|par|sur|est|avec)\b/;
    const germanWords = /\b(der|die|das|und|oder|in|ein|eine|ist|mit|von|für|den|dem|des)\b/;

    if (spanishWords.test(combined)) {
      return { code: 'es', name: 'Spanish' };
    } else if (frenchWords.test(combined)) {
      return { code: 'fr', name: 'French' };
    } else if (germanWords.test(combined)) {
      return { code: 'de', name: 'German' };
    }
    
    return { code: 'en', name: 'English' };
  }
};

interface ArticleReaderProps {
  article: NewsArticle;
  isBookmarked: boolean;
  onClose: () => void;
  onToggleBookmark: (id: string) => void;
  onUpdateArticleImage: (id: string, newUrl: string) => void;
  isAdminMode: boolean;
}

export default function ArticleReader({
  article,
  isBookmarked,
  onClose,
  onToggleBookmark,
  onUpdateArticleImage,
  isAdminMode,
}: ArticleReaderProps) {
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generationStep, setGenerationStep] = useState('');
  const [customIllustrationUrl, setCustomIllustrationUrl] = useState<string | null>(null);
  
  // Admin-specific states
  const [targetUrl, setTargetUrl] = useState('');
  const [customPrompt, setCustomPrompt] = useState(article.imagePrompt);
  const [adminStatusMsg, setAdminStatusMsg] = useState({ text: '', type: 'success' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Web Speech API / TTS state-management
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('');
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [detectedLanguage, setDetectedLanguage] = useState<{ code: string; name: string }>({ code: 'bn', name: 'Bengali' });
  const [voiceExplanation, setVoiceExplanation] = useState<string>('');

  // Load voices for Web Speech API safely
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        setVoices(availableVoices);
      };

      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;

      return () => {
        window.speechSynthesis.onvoiceschanged = null;
        window.speechSynthesis.cancel();
      };
    }
  }, []);

  // Run smart language detection and auto-configuration of system voices
  useEffect(() => {
    const lang = detectLanguage(article.title, article.content);
    setDetectedLanguage(lang);

    if (voices.length > 0) {
      // Find a system voice matching the detected language code, e.g. "en", "bn", "hi", "es", "fr", "de"
      const matchedVoice = voices.find(v => v.lang.toLowerCase().startsWith(lang.code));
      if (matchedVoice) {
        setSelectedVoiceName(matchedVoice.name);
        if (lang.code !== 'bn') {
          setVoiceExplanation(`নিবন্ধটির প্রকৃত ভাষা "${lang.name}" সনাক্ত করা হয়েছে। একটি স্পষ্ট ও প্রাকৃতিক পড়ার অভিজ্ঞতার জন্য স্বয়ংক্রিয়ভাবে সিস্টেম ভয়েস "${matchedVoice.name}" প্রাক-নির্বাচন করা হয়েছে।`);
        } else {
          setVoiceExplanation('');
        }
      } else {
        // Fallback to Bengali if available, otherwise browser default
        const bnVoice = voices.find(v => v.lang.toLowerCase().includes('bn'));
        if (bnVoice) {
          setSelectedVoiceName(bnVoice.name);
        } else {
          const defVoice = voices.find(v => v.default) || voices[0];
          if (defVoice) {
            setSelectedVoiceName(defVoice.name);
          }
        }
        setVoiceExplanation('');
      }
    }
  }, [article, voices]);

  const handleSpeak = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      alert('আপনার ওয়েব ব্রাউজারটি টেক্সট-টু-স্পিচ অনুবাদের জন্য প্রস্তুত নয় বা স্পিচ সিন্থেসিস সমর্থন করে না।');
      return;
    }

    if (isPaused) {
      window.speechSynthesis.resume();
      setIsSpeaking(true);
      setIsPaused(false);
      return;
    }

    window.speechSynthesis.cancel();

    // Compile speaking segments dynamically
    const speechSegments: { id: string; text: string }[] = [];
    
    // 1. Title
    speechSegments.push({ id: 'title', text: `${article.title}।` });
    
    // 2. Highlights or Summary (Tailored of Bengali vs Other Languages)
    speechSegments.push({ id: 'highlight-0', text: `${article.summary}` });
    
    if (detectedLanguage.code === 'bn') {
      const bullet1Text = article.title.replace(/আইপিএল|টিআরপি|টলিউড|ইসরো/g, 'প্রাসঙ্গিক ঘটনাটি') + ' বিষয়ভিত্তিক প্রেক্ষাপটে পশ্চিমবঙ্গের সংস্কৃতি ও জাতীয় স্তরের জন্য অত্যন্ত গুরুত্বপূর্ণ।';
      speechSegments.push({ id: 'highlight-1', text: bullet1Text });
      
      const bullet2Text = `উৎস ${article.source} দ্বারা প্রতিবেদনটি বিশ্বস্ত উপায়ে সংগৃহীত এবং আমাদের এআই সম্পাদক দ্বারা নিখুঁত অনুবাদ ও সংক্ষিপ্তকরণ করা হয়েছে।`;
      speechSegments.push({ id: 'highlight-2', text: bullet2Text });
    } else {
      const isEnglish = detectedLanguage.code === 'en';
      const isHindi = detectedLanguage.code === 'hi';
      const bullet1Text = isEnglish
        ? `This report is curated by our intelligent AI editor from the verified source: ${article.source}.`
        : isHindi
        ? `यह रिपोर्ट हमारे बुद्धिमान एआई संपादक द्वारा सत्यापित स्रोत ${article.source} से ली गई है।`
        : `Report curated by AI from source ${article.source}.`;
      speechSegments.push({ id: 'highlight-1', text: bullet1Text });
    }
    
    // 3. Content paragraphs - split into sentences
    const contentParagraphs = article.content.split('\n\n');
    contentParagraphs.forEach((para, pIdx) => {
      const cleanPara = para.trim();
      if (!cleanPara) return;
      
      const sentences = splitIntoBengaliSentences(cleanPara);
      sentences.forEach((sentence, sIdx) => {
        speechSegments.push({ id: `para-${pIdx}-sent-${sIdx}`, text: sentence });
      });
    });

    const fullSpokenText = speechSegments.map(s => s.text).join(' ');

    // Calculate ranges for boundary highlighting mapping
    let offset = 0;
    const segmentsWithRanges = speechSegments.map(s => {
      const start = offset;
      const end = offset + s.text.length;
      offset = end + 1; // plus space separator
      return { ...s, start, end };
    });

    const utterance = new SpeechSynthesisUtterance(fullSpokenText);
    
    // Select Voice
    const currentVoice = voices.find(v => v.name === selectedVoiceName);
    if (currentVoice) {
      utterance.voice = currentVoice;
    }
    
    utterance.rate = speechRate;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
      setActiveSegmentId(null);
    };

    utterance.onerror = (e) => {
      console.error('SpeechSynthesis Utterance error:', e);
      setIsSpeaking(false);
      setIsPaused(false);
      setActiveSegmentId(null);
    };

    utterance.onboundary = (event) => {
      // event.charIndex specifies the index from the start of the utterance
      const charIndex = event.charIndex;
      const activeSeg = segmentsWithRanges.find(
        (seg) => charIndex >= seg.start && charIndex < seg.end
      );
      if (activeSeg) {
        setActiveSegmentId(activeSeg.id);
        
        // Auto-scroll screen to active spoken text for superior accessibility
        const element = document.getElementById(`speech-sent-${activeSeg.id}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  const handlePause = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.pause();
      setIsSpeaking(false);
      setIsPaused(true);
    }
  };

  const handleStop = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
      setActiveSegmentId(null);
    }
  };

  // Re-generate custom image using Gemini 2.5 flash image on the backend proxy
  const handleGenerateAiIllustration = async () => {
    setIsGeneratingImage(true);
    setGenerationStep('জেমিনি এআই ইঞ্জিন সক্রিয় হচ্ছে...');
    
    try {
      // Step simulated updates for elegant feedback
      setTimeout(() => setGenerationStep('আর্টিকেলের মূল শব্দ প্রক্রিয়াকরণ করা হচ্ছে...'), 1000);
      setTimeout(() => setGenerationStep('জেমিনি গ্রাফিক্স মডিউল চিত্র অঙ্কন করছে...'), 2200);

      const response = await fetch('/api/news/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imagePrompt: customPrompt || article.imagePrompt,
          articleId: article.id,
          title: article.title,
          summary: article.summary,
          content: article.content,
          category: article.category,
        }),
      });

      const data = await response.json();
      if (data.imageUrl) {
        setCustomIllustrationUrl(data.imageUrl);
        onUpdateArticleImage(article.id, data.imageUrl);
        setGenerationStep('চিত্র সফলতা প্রাপ্ত হয়েছে!');
        showAdminStatus('Imagen AI দ্বারা ছবি পুনরায় ডিজাইন সম্পন্ন হয়েছে!', 'success');
      } else {
        throw new Error('Image url missing from generation payload');
      }
    } catch (err) {
      console.error('Error generating image:', err);
      // Friendly message on retry
      setGenerationStep('চিত্র তৈরিতে মডিউল ত্রুটি। পুনরায় চেষ্টা করুন বা সংযোগ যাচাই করুন।');
      showAdminStatus('এআই চিত্র তৈরিতে ব্যর্থ হয়েছে।', 'error');
    } finally {
      setTimeout(() => {
        setIsGeneratingImage(false);
        setGenerationStep('');
      }, 1500);
    }
  };

  const showAdminStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setAdminStatusMsg({ text, type });
    setTimeout(() => {
      setAdminStatusMsg({ text: '', type: 'success' });
    }, 4000);
  };

  const handleApplyUrlOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUrl.trim()) {
      showAdminStatus('অনুগ্রহ করে সঠিক চিত্র লিঙ্ক বা ইউআরএল পেস্ট করুন!', 'error');
      return;
    }

    try {
      // Basic URL verification
      const url = new URL(targetUrl.trim());
      onUpdateArticleImage(article.id, url.href);
      setCustomIllustrationUrl(url.href);
      showAdminStatus('সাফল্যের সাথে গুগল ইমেজেস ওভাররাইড লিঙ্ক সংযুক্ত হয়েছে!', 'success');
      setTargetUrl('');
    } catch (err) {
      showAdminStatus('অবৈধ ইউআরএল ফরম্যাট। অনুগ্রহ করে সঠিক লিঙ্ক দিন।', 'error');
    }
  };

  const handleApplyLocalUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showAdminStatus('শুধুমাত্র চিত্র ফাইল (.png, .jpg, .jpeg) আপলোড করা সম্ভব!', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64Url = reader.result as string;
      onUpdateArticleImage(article.id, base64Url);
      setCustomIllustrationUrl(base64Url);
      showAdminStatus('সফলভাবে স্থানীয় ছবি আপলোড সম্পন্ন এবং সেভ হয়েছে!', 'success');
    };
    reader.onerror = () => {
      showAdminStatus('স্থানীয় ফাইল পড়তে সমস্যা হয়েছে। অন্য ছবি চেষ্টা করুন।', 'error');
    };
    reader.readAsDataURL(file);
  };

  const handleSocialShare = (platform: 'whatsapp' | 'facebook' | 'copy') => {
    const text = `*বাংলা খবর - ${article.title}*\n\n${article.summary}\n\nসম্পূর্ণ পড়তে ডাউনলোড করুন এবং নিউজ অ্যাপে যান।`;
    if (platform === 'whatsapp') {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank', 'noreferrer');
    } else if (platform === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, '_blank', 'noreferrer');
    } else {
      navigator.clipboard.writeText(text);
      alert('খবরের লিংক ও বিবরণ সাফল্যের সাথে কপি করা হয়েছে!');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fade-in overflow-y-auto">
      <div 
        className="bg-white w-full max-w-3xl rounded-xl shadow-2xl relative overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Close & Top Action header */}
        <div className="flex justify-between items-center px-5 py-3.5 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-brand-red text-white font-mono px-2 py-0.5 rounded uppercase font-black tracking-wider shadow-3xs">
              {article.category}
            </span>
            <span className="text-xs text-slate-500 font-bold font-mono">
              উৎস: {article.source}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Bookmark button */}
            <button
              onClick={() => onToggleBookmark(article.id)}
              className={`p-1.5 rounded-md transition-colors border cursor-pointer ${
                isBookmarked 
                  ? 'bg-amber-50 border-amber-200 text-amber-600' 
                  : 'bg-white border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-amber-500' : ''}`} />
            </button>

            {/* Close button */}
            <button
              onClick={onClose}
              className="p-1 px-1.5 bg-white hover:bg-red-50 text-gray-550 hover:text-red-700 rounded-md border border-slate-200 transition-colors cursor-pointer"
              title="বন্ধ করুন"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        {/* Scrollable Reader Body */}
        <div className="overflow-y-auto p-5 sm:p-7 flex-grow">
          {/* Main Headline */}
          <h1 
            id="speech-sent-title"
            className={`font-serif font-black text-2xl sm:text-3xl lg:text-4xl leading-snug mb-3 transition-all duration-200 rounded px-1 ${
              activeSegmentId === 'title' 
                ? 'bg-amber-100 text-slate-950 ring-2 ring-amber-300 shadow-2xs font-black' 
                : 'text-slate-900'
            }`}
          >
            {article.title}
          </h1>

          {/* Published date and times */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-500 border-b border-slate-200 pb-4 mb-4">
            <span>প্রকাশের সময়: {article.publishedAt}</span>
            <span className="border-l border-slate-200 pl-2">এআই সম্পাদিত সংস্করণ</span>
          </div>

          {/* TTS Audio Player Bar */}
          <div className="bg-slate-50/90 border border-slate-200 rounded-xl p-4 mb-6 shadow-3xs hover:border-slate-350 transition-all font-sans">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              
              {/* Left Action Buttons */}
              <div className="flex items-center gap-2 bg-white border border-slate-150 p-1.5 rounded-lg shrink-0 justify-center md:justify-start">
                {!isSpeaking || isPaused ? (
                  <button
                    onClick={handleSpeak}
                    className="p-2 bg-brand-red text-white hover:bg-red-700 active:scale-95 transition-all rounded-md cursor-pointer flex items-center justify-center gap-1.5 font-bold text-xs shadow-3xs"
                    title={isPaused ? "পড়া চালিয়ে যান" : "আর্টিকেল শুনুন (Speak Aloud)"}
                  >
                    <Play className="w-4 h-4 fill-current text-white" />
                    <span>{isPaused ? "চালিয়ে যান" : "আর্টিকেল শুনুন"}</span>
                  </button>
                ) : (
                  <button
                    onClick={handlePause}
                    className="p-2 bg-amber-500 hover:bg-amber-600 text-slate-950 active:scale-95 transition-all rounded-md cursor-pointer flex items-center justify-center gap-1.5 font-bold text-xs shadow-3xs"
                    title="সাময়িকভাবে থামান (Pause)"
                  >
                    <Pause className="w-4 h-4 text-slate-950" />
                    <span>থামান</span>
                  </button>
                )}

                <button
                  onClick={handleStop}
                  disabled={!isSpeaking && !isPaused}
                  className={`p-2 rounded-md active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5 font-bold text-xs ${
                    isSpeaking || isPaused
                      ? "bg-slate-200 hover:bg-slate-305 text-slate-750 border border-slate-300"
                      : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-100"
                  }`}
                  title="বন্ধ করুন (Stop)"
                >
                  <Square className="w-4 h-4" />
                  <span>বন্ধ</span>
                </button>
              </div>

              {/* Middle Right Options: Voice and Speed settings */}
              <div className="flex-grow grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                {/* Voice Selector */}
                <div className="flex flex-col gap-1">
                  <label className="text-slate-600 font-bold flex items-center gap-1.5 leading-3">
                    <Volume2 className="w-3.5 h-3.5 text-brand-red" />
                    <span>কণ্ঠস্বর (System Voice):</span>
                  </label>
                  <select
                    value={selectedVoiceName}
                    onChange={(e) => setSelectedVoiceName(e.target.value)}
                    className="bg-white border border-slate-250 rounded-lg p-1.5 outline-none focus:border-brand-red text-slate-700 w-full cursor-pointer"
                  >
                    {voices.length === 0 ? (
                      <option>ভয়েস লোড হচ্ছে...</option>
                    ) : (
                      voices.map((v) => (
                        <option key={v.name} value={v.name}>
                          {v.name} ({v.lang})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Speed Selector Slider */}
                <div className="flex flex-col gap-1 justify-end">
                  <div className="flex items-center justify-between text-slate-600 font-bold mb-0.5">
                    <span>পড়ার গতি (Rate):</span>
                    <span className="text-brand-red font-mono font-bold">{speechRate.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min={0.6}
                    max={2.0}
                    step={0.1}
                    value={speechRate}
                    onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                    className="w-full accent-brand-red cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none border-0"
                  />
                </div>
              </div>
              
            </div>

            {/* Language suggestion banner if a different language is detected */}
            {voiceExplanation && (
              <div className="mt-3 bg-indigo-50 border border-indigo-150 p-2.5 rounded-lg flex items-start gap-2.5 text-indigo-950 text-xs animate-fade-in border-l-4 border-l-indigo-600">
                <span className="p-1 rounded-full bg-indigo-100 text-indigo-600 self-start text-xs font-bold">
                  🗣️
                </span>
                <div>
                  <span className="font-bold block text-[11px] uppercase tracking-wider text-indigo-700">ভাষা সনাক্তকরণ সিস্টেম (Smart Language Detection)</span>
                  <p className="mt-0.5 leading-relaxed text-indigo-900 font-medium">{voiceExplanation}</p>
                </div>
              </div>
            )}
          </div>

          {/* Picture Grid Layout */}
          <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 mb-5 aspect-[4/3] sm:aspect-video w-full">
            <img
              src={customIllustrationUrl || article.imageUrl}
              alt={article.title}
              referrerPolicy="no-referrer"
              onError={(e) => {
                const target = e.currentTarget;
                const primaryFallback = FALLBACK_IMAGES[article.category] || FALLBACK_IMAGES['national'];
                if (target.src !== primaryFallback) {
                  target.src = primaryFallback;
                } else {
                  // Secure inline vectorized fallback to avoid any infinite network loading loops
                  target.src = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2050/svg" width="800" height="450" viewBox="0 0 800 450"><rect width="800" height="450" fill="%23f1f5f9"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="system-ui, sans-serif" font-size="28" font-weight="bold" fill="%23cbd5e1">বাংলা খবর মিডিয়া</text></svg>`;
                }
              }}
              className="w-full h-full object-cover"
            />
            
            {/* Overlay button for Custom AI Image Generation (ONLY FOR ADMIN) */}
            {isAdminMode && (
              <div className="absolute bottom-4 right-4 z-10">
                <button
                  disabled={isGeneratingImage}
                  onClick={handleGenerateAiIllustration}
                  className="bg-slate-900/90 hover:bg-brand-red text-white py-2 px-3.5 rounded-lg text-xs font-sans font-bold shadow-lg flex items-center gap-2 backdrop-blur-sm transition-all border border-white/20 hover:scale-102 cursor-pointer"
                >
                  {isGeneratingImage ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-yellow-400" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-amber-400 fill-current" />
                  )}
                  {isGeneratingImage ? 'এআই ছবি আঁকছে...' : 'AI দিয়ে ছবি পুনরায় ডিজাইন করুন'}
                </button>
              </div>
            )}

            {isGeneratingImage && (
              <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col justify-center items-center p-4 text-center z-20">
                <BrainActivitySpinner />
                <p className="text-white text-sm font-sans font-bold mt-4 animate-pulse">
                  {generationStep}
                </p>
                <p className="text-slate-400 text-xs font-mono max-w-sm mt-2 leading-relaxed">
                  "gemini-2.5-flash-image" ছবির প্রম্পটের ওপর ভিত্তি করে আর্টওয়ার্ক আঁকছে। এটি সম্পূর্ণ হতে কিছু মুহূর্ত সময় নিতে পারে।
                </p>
              </div>
            )}
            
            {customIllustrationUrl && !isGeneratingImage && (
              <span className="absolute top-4 left-4 bg-emerald-500 text-white text-[10px] font-mono px-2 py-0.5 rounded-sm shadow-md font-bold flex items-center gap-1 border border-emerald-400">
                <Eye className="w-3.5 h-3.5" /> Live Rendered by Imagen
              </span>
            )}
          </div>

          {/* Prompt Details */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-5 text-xs font-mono text-slate-600 flex items-center gap-2">
            <span className="text-brand-red font-bold uppercase">AI Sketch Prompt:</span>
            <span className="italic line-clamp-2 md:line-clamp-none text-slate-700">{article.imagePrompt}</span>
          </div>

          {/* Admin Override Dashboard Panel */}
          {isAdminMode && (
            <div className="bg-amber-50/70 border-2 border-dashed border-amber-300 rounded-xl p-5 mb-6 space-y-4 shadow-xs animate-fade-in">
              <div className="flex items-center justify-between border-b border-amber-250 pb-2">
                <h4 className="font-serif font-black text-sm text-amber-950 flex items-center gap-1.5">
                  <Image className="w-4 h-4 text-amber-600" />
                  <span>🔧 অ্যাডমিন মিডিয়া ওভাররাইড প্যানেল (Image Override Panel)</span>
                </h4>
                <span className="text-[10px] bg-amber-500 text-white font-mono px-1.5 py-0.5 rounded font-black uppercase tracking-wider">
                  Admin Active
                </span>
              </div>

              {/* Status Indicator inside panel */}
              {adminStatusMsg.text && (
                <div className={`p-2.5 rounded-lg text-xs font-sans font-bold flex items-center gap-2 ${
                  adminStatusMsg.type === 'success' 
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-250 animate-bounce' 
                    : 'bg-red-100 text-red-800 border border-red-250 animate-shake'
                }`}>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>{adminStatusMsg.text}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans text-slate-700">
                {/* Method 1: Google Images Link input URL override */}
                <form onSubmit={handleApplyUrlOverride} className="space-y-1.5 border border-slate-200 bg-white p-3.5 rounded-lg flex flex-col justify-between shadow-3xs">
                  <div>
                    <label className="font-bold text-slate-800 flex items-center gap-1">
                      <Link className="w-3.5 h-3.5 text-blue-600" />
                      <span>১. গুগল ইমেজ লিঙ্ক ওভাররাইড:</span>
                    </label>
                    <p className="text-[10px] text-slate-450 mt-0.5 leading-snug">গুগল থেকে যেকোনো ইমেজ লিঙ্ক পেস্ট করে সরাসরি আপডেট করুন:</p>
                    <input
                      type="text"
                      placeholder="https://images.unsplash.com/... বা অন্য লিংক"
                      value={targetUrl}
                      onChange={(e) => setTargetUrl(e.target.value)}
                      className="w-full mt-2 bg-slate-50 border border-slate-250 rounded p-1.5 outline-none focus:border-blue-500 text-slate-800"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-3 rounded text-[11px] cursor-pointer transition-colors mt-2 text-center"
                  >
                    লিঙ্ক যুক্ত করুন (Apply Link)
                  </button>
                </form>

                {/* Method 2: Drag & drop upload localized device files */}
                <div className="space-y-1.5 border border-slate-200 bg-white p-3.5 rounded-lg flex flex-col justify-between shadow-3xs">
                  <div>
                    <label className="font-bold text-slate-800 flex items-center gap-1">
                      <Upload className="w-3.5 h-3.5 text-emerald-605" />
                      <span>২. স্থানীয় ফাইল আপলোড ওভাররাইড:</span>
                    </label>
                    <p className="text-[10px] text-slate-450 mt-0.5 leading-snug">আপনার ডিভাইস থেকে ফটো আপলোড করে খবরটিতে সেট করুন:</p>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleApplyLocalUpload}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3 rounded text-[11px] cursor-pointer transition-colors mt-2 flex items-center justify-center gap-1 text-center"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>ফাইল নির্বাচন করুন (Upload File)</span>
                  </button>
                </div>
              </div>

              {/* Method 3: Customize AI illustration description */}
              <div className="border border-slate-200 bg-white p-3.5 rounded-lg space-y-2 text-xs font-sans shadow-3xs">
                <label className="font-bold text-slate-800 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-current" />
                  <span>৩. কাস্টম এআই ছবির প্রম্পট টিউনিং (Imagen Tuning):</span>
                </label>
                <p className="text-[10px] text-slate-450 mt-0.5">এআই যেভাবে ছবি আঁকবে তার বিবরণ সংস্কার বা পরিবর্তন করুন:</p>
                <textarea
                  rows={2}
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-250 rounded p-2 outline-none focus:border-amber-500 text-slate-800 font-mono mt-1"
                  placeholder="চিত্র আঁকার বর্ণনা ইংরেজিতে..."
                />
                <button
                  disabled={isGeneratingImage}
                  onClick={handleGenerateAiIllustration}
                  className="w-full bg-slate-900 hover:bg-slate-950 disabled:bg-slate-450 text-white font-bold py-2 px-3 rounded text-[11px] cursor-pointer transition-colors flex items-center justify-center gap-1"
                >
                  {isGeneratingImage ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-current" />
                  )}
                  <span>এআই জেনারেটর চালু করুন (Run AI Drawer)</span>
                </button>
              </div>
            </div>
          )}

          {/* Bulleted AI News Editor Highlights / Summaries */}
          <div className="bg-slate-50 border border-slate-200 border-l-4 border-l-brand-blue-accent p-5 rounded-r-xl mb-6 shadow-3xs select-text">
            <h3 className="font-serif font-black text-sm text-brand-blue flex items-center gap-1.5 mb-2.5">
              <Sparkles className="w-4 h-4 text-brand-blue-accent fill-current" /> দ্রুত এআই সারসংক্ষেপ (Highlights)
            </h3>
            <ul className="list-disc pl-5 text-xs sm:text-xs text-slate-800 space-y-2.5 font-sans leading-relaxed">
              <li 
                id="speech-sent-highlight-0"
                className={`transition-all duration-250 rounded px-1.5 py-0.5 ${
                  activeSegmentId === 'highlight-0'
                    ? 'bg-amber-100 text-slate-950 ring-2 ring-amber-300 font-bold shadow-3xs'
                    : 'text-slate-800'
                }`}
              >
                {article.summary}
              </li>
              <li 
                id="speech-sent-highlight-1"
                className={`transition-all duration-250 rounded px-1.5 py-0.5 ${
                  activeSegmentId === 'highlight-1'
                    ? 'bg-amber-100 text-slate-950 ring-2 ring-amber-300 font-bold shadow-3xs'
                    : 'text-slate-800'
                }`}
              >
                {article.title.replace(/আইপিএল|টিআরপি|টলিউড|ইসরো/g, 'প্রাসঙ্গিক ঘটনাটি')} বিষয়ভিত্তিক প্রেক্ষাপটে পশ্চিমবঙ্গের সংস্কৃতি ও জাতীয় স্তরের জন্য অত্যন্ত গুরুত্বপূর্ণ।
              </li>
              <li 
                id="speech-sent-highlight-2"
                className={`transition-all duration-250 rounded px-1.5 py-0.5 ${
                  activeSegmentId === 'highlight-2'
                    ? 'bg-amber-100 text-slate-950 ring-2 ring-amber-300 font-bold shadow-3xs'
                    : 'text-slate-800'
                }`}
              >
                উৎস {article.source} দ্বারা প্রতিবেদনটি বিশ্বস্ত উপায়ে সংগৃহীত এবং আমাদের এআই সম্পাদক দ্বারা নিখুঁত অনুবাদ ও সংক্ষিপ্তকরণ করা হয়েছে।
              </li>
            </ul>
          </div>

          {/* Full Detailed Content Body */}
          <div className="font-sans text-base sm:text-lg text-slate-800 leading-relaxed space-y-5 text-justify select-text">
            {article.content.split('\n\n').map((para, pIdx) => {
              const cleanPara = para.trim();
              if (!cleanPara) return null;
              const sentences = splitIntoBengaliSentences(cleanPara);
              
              return (
                <p key={pIdx} className="indent-4 sm:indent-6 leading-relaxed">
                  {sentences.map((sentence, sIdx) => {
                    const sentId = `para-${pIdx}-sent-${sIdx}`;
                    const isActive = activeSegmentId === sentId;
                    return (
                      <span
                        key={sIdx}
                        id={`speech-sent-${sentId}`}
                        className={`transition-all duration-300 rounded px-1 py-0.5 inline ${
                          isActive 
                            ? 'bg-amber-100 text-slate-950 font-bold ring-2 ring-amber-300 shadow-2xs' 
                            : 'text-slate-850 hover:bg-slate-50'
                        }`}
                      >
                        {sentence}{' '}
                      </span>
                    );
                  })}
                </p>
              );
            })}
          </div>

          {/* Ground-Truth external links if present */}
          {article.sourceUrl && (
            <div className="mt-8 pt-5 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="font-serif font-black text-sm text-slate-800">তথ্য যাচাই নিশ্চিতকরণ (Verified Source)</h4>
                <p className="text-xs text-slate-500 font-sans">গুগল সার্চ ক্রলিংয়ের মাধ্যমে সংগৃহীত সরাসরি সোর্স লিঙ্ক।</p>
              </div>

              <a
                href={article.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white hover:bg-slate-50 text-brand-red border border-slate-200 px-4 py-2 text-xs font-sans font-bold rounded-lg flex items-center justify-center gap-2 transition-colors duration-200 self-start sm:self-center cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" /> খবরের মূল উৎস লিঙ্ক দেখুন
              </a>
            </div>
          )}
        </div>

        {/* Modal footer socials */}
        <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:justify-between items-center gap-3">
          <span className="text-[11px] font-sans text-slate-500">
            © {new Date().getFullYear()} বাংলা খবর মিডিয়া গ্রুপ (dey group) • deypampa559@gmail.com
          </span>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500 font-mono font-semibold">শেয়ার করুন:</span>
            <button
              onClick={() => handleSocialShare('whatsapp')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full p-1.5 px-3.5 text-[11px] font-sans font-bold transition-colors flex items-center gap-1 cursor-pointer"
            >
              WhatsApp
            </button>
            <button
              onClick={() => handleSocialShare('facebook')}
              className="bg-blue-700 hover:bg-blue-800 text-white rounded-full p-1.5 px-3.5 text-[11px] font-sans font-bold transition-colors flex items-center gap-1 cursor-pointer"
            >
              Facebook
            </button>
            <button
              onClick={() => handleSocialShare('copy')}
              className="bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-full p-1.5 px-3.5 text-[11px] font-mono transition-colors cursor-pointer"
            >
              Copy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Decorative AI Brain Activity Spinner
function BrainActivitySpinner() {
  return (
    <div className="relative w-16 h-16 flex justify-center items-center">
      <div className="absolute border-4 border-yellow-400 border-t-transparent rounded-full w-full h-full animate-spin"></div>
      <div className="absolute border-4 border-cyan-400 border-b-transparent rounded-full w-12 h-12 animate-spin animate-reverse" style={{ animationDuration: '1.2s' }}></div>
      <Sparkles className="w-6 h-6 text-yellow-300 animate-pulse" />
    </div>
  );
}
