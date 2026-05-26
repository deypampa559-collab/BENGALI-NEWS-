/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Newspaper, Search, Bookmark, HelpCircle, Loader2, RefreshCw, Send, AlertCircle, Heart, Plus, X, Image, FileText, CheckCircle, Clock } from 'lucide-react';
import { NewsArticle, UserPreferences } from './types';
import Header from './components/Header';
import SmartFeed from './components/SmartFeed';
import ArticleCard from './components/ArticleCard';
import ArticleReader from './components/ArticleReader';
import BookmarkTray from './components/BookmarkTray';
import { fallbackNews } from './data/fallbackNews';

export default function App() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<'entertainment' | 'television' | 'national' | 'international'>('national');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBookmarkOpen, setIsBookmarkOpen] = useState(false);
  const [newsSource, setNewsSource] = useState<'ai-grounded' | 'offline-cache' | 'quota-limited'>('offline-cache');

  // Administrator control states
  const [isAdminMode, setIsAdminMode] = useState<boolean>(() => {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('bangla_khobor_admin_mode') === 'true';
    }
    return false;
  });
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [adminError, setAdminError] = useState('');

  // Manual News Submission UI form states
  const [isAddNewsOpen, setIsAddNewsOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<'entertainment' | 'television' | 'national' | 'international'>('national');
  const [newSummary, setNewSummary] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newSource, setNewSource] = useState('বার্তা কক্ষ (নিউজডেস্ক)');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);

  // Local manually written articles collection
  const [localCustomArticles, setLocalCustomArticles] = useState<NewsArticle[]>([]);

  // Check URL parameters for editor entry override
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('editor') === 'true' || params.get('dey559') === 'true' || params.get('admin') === 'true') {
        setIsAdminMode(true);
        localStorage.setItem('bangla_khobor_admin_mode', 'true');
      }
    }
  }, []);

  // Option to hide all default/pre-set news and only show manually-added news
  const [hideDefaultNews, setHideDefaultNews] = useState<boolean>(() => {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('bangla_khobor_hide_default_news') === 'true';
    }
    return false;
  });

  // Keep track of individually deleted / disabled article IDs
  const [disabledArticleIds, setDisabledArticleIds] = useState<string[]>(() => {
    if (typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem('bangla_khobor_disabled_article_ids');
        return saved ? JSON.parse(saved) : [];
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const handleToggleAdmin = () => {
    if (isAdminMode) {
      setIsAdminMode(false);
      localStorage.removeItem('bangla_khobor_admin_mode');
    } else {
      setAdminPin('');
      setAdminError('');
      setIsAdminModalOpen(true);
    }
  };

  const handleAdminVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const pin = adminPin.trim();
    if (pin === 'dey559' || pin === 'admin' || pin === '1234' || pin === 'deypampa559') {
      setIsAdminMode(true);
      localStorage.setItem('bangla_khobor_admin_mode', 'true');
      setIsAdminModalOpen(false);
      setAdminPin('');
      setAdminError('');
    } else {
      setAdminError('ভুল অ্যাডমিন কোড! অনুগ্রহ করে আবার চেষ্টা করুন।');
    }
  };
  
  // Offline cache states
  const [offlineArticles, setOfflineArticles] = useState<NewsArticle[]>([]);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Local preferences state
  const [userPrefs, setUserPrefs] = useState<UserPreferences>({
    categoryViews: {
      entertainment: 0,
      television: 0,
      national: 0,
      international: 0,
    },
    bookmarkedIds: [],
  });

  // Load preferences and offline cached articles from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('bangla_khobor_prefs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.categoryViews && parsed.bookmarkedIds) {
          setUserPrefs(parsed);
        }
      } catch (e) {
        console.error('Failed to parse user preferences:', e);
      }
    }

    const savedOffline = localStorage.getItem('bangla_khobor_offline_articles');
    if (savedOffline) {
      try {
        setOfflineArticles(JSON.parse(savedOffline));
      } catch (e) {
        console.error('Failed to parse offline cached articles:', e);
      }
    }

    // Load handcrafted editorial articles written by current admin
    const savedCustom = localStorage.getItem('bangla_khobor_custom_articles');
    if (savedCustom) {
      try {
        setLocalCustomArticles(JSON.parse(savedCustom));
      } catch (e) {
        console.error('Failed to parse manual custom articles:', e);
      }
    }
  }, []);

  // Monitor network connection status for seamless automatic transition
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setIsOfflineMode(true); // Automatically trigger offline reading mode when actual network goes off
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync preferences to localStorage
  const savePreferences = (updated: UserPreferences) => {
    setUserPrefs(updated);
    localStorage.setItem('bangla_khobor_prefs', JSON.stringify(updated));
  };

  // Fetch news articles from the full-stack server
  const fetchNews = async (categoryName: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: categoryName }),
      });
      const data = await response.json();
      if (data.articles && Array.isArray(data.articles)) {
        // Find matching local manual custom articles to prepend
        const matchingLocal = localCustomArticles.filter(art => art.category === categoryName);
        // Exclude duplicates by id
        const uniqueFetched = data.articles.filter((art: NewsArticle) => !matchingLocal.some(m => m.id === art.id));
        setArticles([...matchingLocal, ...uniqueFetched]);
        setNewsSource(data.source || 'ai-grounded');
      } else {
        throw new Error('Invalid server return format');
      }
    } catch (err) {
      console.warn('Backend news fetching failed. Loading rich offline cache items.', err);
      // Grabbing appropriate category items from offline pre-seeds
      const seeded = fallbackNews.filter(art => art.category === categoryName);
      const matchingLocal = localCustomArticles.filter(art => art.category === categoryName);
      const uniqueSeeded = seeded.filter(art => !matchingLocal.some(m => m.id === art.id));
      setArticles([...matchingLocal, ...uniqueSeeded]);
      setNewsSource('offline-cache');
    } finally {
      setIsLoading(false);
    }
  };

  // Refetch when selected category updates
  useEffect(() => {
    fetchNews(selectedCategory);
  }, [selectedCategory, localCustomArticles]);

  // Track article clicks to build personal interest scores
  const handleSelectArticle = (article: NewsArticle) => {
    setSelectedArticle(article);

    // Increment category view counter
    const currentViews = userPrefs.categoryViews || {
      entertainment: 0,
      television: 0,
      national: 0,
      international: 0,
    };
    
    const updatedViews = {
      ...currentViews,
      [article.category]: (currentViews[article.category] || 0) + 1,
    };

    savePreferences({
      ...userPrefs,
      categoryViews: updatedViews,
    });
  };

  // Toggle offline bookmarks trigger and store full targets to the offline persistence cache
  const handleToggleBookmark = (id: string, e?: any) => {
    if (e && e.stopPropagation) e.stopPropagation();
    
    const isBookmarked = userPrefs.bookmarkedIds.includes(id);
    let updatedIds = [...userPrefs.bookmarkedIds];
    let updatedOffline = [...offlineArticles];

    if (isBookmarked) {
      updatedIds = updatedIds.filter((bId) => bId !== id);
      updatedOffline = updatedOffline.filter((item) => item.id !== id);
    } else {
      updatedIds.push(id);
      // Retrieve target full text article object from list feeds, archives, or readers
      const matchedArticle = articles.find((a) => a.id === id) || 
                            fallbackNews.find((a) => a.id === id) || 
                            (selectedArticle && selectedArticle.id === id ? selectedArticle : null);
      
      if (matchedArticle) {
        if (!updatedOffline.some(item => item.id === id)) {
          updatedOffline.push(matchedArticle);
        }
      }
    }

    // Persist full article dictionary to support genuine standalone offline reading
    localStorage.setItem('bangla_khobor_offline_articles', JSON.stringify(updatedOffline));
    setOfflineArticles(updatedOffline);

    savePreferences({
      ...userPrefs,
      bookmarkedIds: updatedIds,
    });
  };

  // Update image inside local articles array to persist the freshly drawn Imagen base64
  const handleUpdateArticleImage = (id: string, newUrl: string) => {
    setArticles((prev) =>
      prev.map((art) => (art.id === id ? { ...art, imageUrl: newUrl } : art))
    );
    if (selectedArticle && selectedArticle.id === id) {
      setSelectedArticle((prev) => (prev ? { ...prev, imageUrl: newUrl } : null));
    }
    
    // Also save the custom generated base64 artwork into our offline articles cache if it's card-bookmarked!
    if (userPrefs.bookmarkedIds.includes(id)) {
      setOfflineArticles((prev) => {
        const updated = prev.map((art) => (art.id === id ? { ...art, imageUrl: newUrl } : art));
        localStorage.setItem('bangla_khobor_offline_articles', JSON.stringify(updated));
        return updated;
      });
    }
  };

  // Handle clicking breaking news tickers to center corresponding item
  const handleSelectArticleByTitle = (title: string) => {
    const matched = articles.find((art) => art.title === title) || fallbackNews.find((art) => art.title === title);
    if (matched) {
      handleSelectArticle(matched);
    }
  };

  // Submit handcrafted manual news and images
  const handleAddNewsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) {
      alert('অনুগ্রহ করে শিরোনাম এবং খবরের মূল বিষয়বস্তু পূরণ করুন!');
      return;
    }
    setIsPublishing(true);
    try {
      const response = await fetch('/api/add-news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          summary: newSummary.trim() || newTitle.trim().slice(0, 100) + '...',
          content: newContent.trim(),
          category: newCategory,
          imageUrl: newImageUrl.trim(),
          source: newSource.trim() || 'বার্তা কক্ষ (নিউজডেস্ক)'
        }),
      });
      
      const data = await response.json();
      if (data.success && data.article) {
        // Save to client cache so it survives server restarts
        const updatedCustom = [data.article, ...localCustomArticles];
        localStorage.setItem('bangla_khobor_custom_articles', JSON.stringify(updatedCustom));
        setLocalCustomArticles(updatedCustom);

        // Prepend to current screen categories
        if (data.article.category === selectedCategory) {
          setArticles(prev => [data.article, ...prev]);
        }

        setPublishSuccess(true);
        setTimeout(() => {
          setIsAddNewsOpen(false);
          setPublishSuccess(false);
          // Reset form fields
          setNewTitle('');
          setNewSummary('');
          setNewContent('');
          setNewImageUrl('');
          setNewSource('বার্তা কক্ষ (নিউজডেস্ক)');
        }, 1500);
      } else {
        throw new Error('Failed to save manual article on the server');
      }
    } catch (err) {
      console.warn('Backend custom news publishing failed, using client fallback cache:', err);
      // Client-only local fallback representation
      const fallbackArticle: NewsArticle = {
        id: `custom-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        title: newTitle.trim(),
        summary: newSummary.trim() || newTitle.trim().slice(0, 100) + '...',
        content: newContent.trim(),
        category: newCategory,
        publishedAt: 'এখনই সম্প্রচারিত',
        imagePrompt: 'Manually uploaded offline curated',
        imageUrl: newImageUrl.trim() || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&auto=format&fit=crop&q=80',
        source: newSource.trim() || 'বার্তা কক্ষ (নিউজডেস্ক)',
        isAiGenerated: false,
      };
      const updatedCustom = [fallbackArticle, ...localCustomArticles];
      localStorage.setItem('bangla_khobor_custom_articles', JSON.stringify(updatedCustom));
      setLocalCustomArticles(updatedCustom);

      if (fallbackArticle.category === selectedCategory) {
        setArticles(prev => [fallbackArticle, ...prev]);
      }
      setPublishSuccess(true);
      setTimeout(() => {
        setIsAddNewsOpen(false);
        setPublishSuccess(false);
        setNewTitle('');
        setNewSummary('');
        setNewContent('');
        setNewImageUrl('');
        setNewSource('বার্তা কক্ষ (নিউজডেস্ক)');
      }, 1500);
    } finally {
      setIsPublishing(false);
    }
  };

  // Handler to delete or disable any article card item
  const handleDeleteArticle = async (id: string, e?: any) => {
    if (e) {
      e.stopPropagation();
    }

    if (id.startsWith('custom-')) {
      // It is a user handcrafted custom article
      const filtered = localCustomArticles.filter(art => art.id !== id);
      localStorage.setItem('bangla_khobor_custom_articles', JSON.stringify(filtered));
      setLocalCustomArticles(filtered);
      setArticles(prev => prev.filter(art => art.id !== id));

      try {
        await fetch('/api/delete-news', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        });
      } catch (err) {
        console.warn('Backend deletion failed, but local copy was successfully removed:', err);
      }
    } else {
      // It is a default/given article - add to local disabled list
      const updatedDisabled = [...disabledArticleIds, id];
      setDisabledArticleIds(updatedDisabled);
      localStorage.setItem('bangla_khobor_disabled_article_ids', JSON.stringify(updatedDisabled));
    }
  };

  const handleResetDisabledArticles = () => {
    setDisabledArticleIds([]);
    localStorage.removeItem('bangla_khobor_disabled_article_ids');
  };

  // Extract bookmark collections directly from our robust offline-cached state
  const bookmarkedArticles = offlineArticles;

  // Filter headlines for marquee
  const breakingNewsTitles = articles
    .filter(art => !disabledArticleIds.includes(art.id) && (!hideDefaultNews || art.id.startsWith('custom-')))
    .slice(0, 4)
    .map((art) => art.title);

  // Filter articles grid by search input and currently selected category if in offline mode
  const viewArticles = isOfflineMode ? offlineArticles : articles;

  const filteredArticles = viewArticles.filter((art) => {
    if (disabledArticleIds.includes(art.id)) {
      return false;
    }
    if (hideDefaultNews && !art.id.startsWith('custom-')) {
      return false;
    }
    const q = searchQuery.toLowerCase();
    const categoryMatches = isOfflineMode ? art.category === selectedCategory : true;
    return categoryMatches && (art.title.toLowerCase().includes(q) || art.summary.toLowerCase().includes(q));
  });

  // Categories list config for print-newspaper subheader
  const categoriesList = [
    { key: 'national', label: 'জাতীয় খবর', icon: '🇮🇳' },
    { key: 'international', label: 'আন্তর্জাতিক', icon: '🌍' },
    { key: 'television', label: 'টেলিভিশন', icon: '📺' },
    { key: 'entertainment', label: 'বিনোদন ও খেলা', icon: '🎭' },
  ] as const;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans antialiased text-slate-900">
      
      {/* Editorial Header */}
      <Header
        breakingNews={breakingNewsTitles.length > 0 ? breakingNewsTitles : fallbackNews.slice(0, 4).map(a => a.title)}
        onSelectArticleByTitle={handleSelectArticleByTitle}
        isOfflineMode={isOfflineMode}
        isAdminMode={isAdminMode}
        onToggleAdmin={handleToggleAdmin}
      />

      {/* Main content body */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 py-6 md:py-8 space-y-6 sm:space-y-8">
        
        {/* Editorial Subheader and navigation */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
          
          {/* Custom Category selection tags */}
          <div className="flex flex-wrap justify-center sm:justify-start gap-1.5 pb-1 md:pb-0 w-full md:w-auto">
            {categoriesList.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={`px-4 py-2 text-xs sm:text-sm font-sans font-bold rounded-lg border transition-all duration-200 cursor-pointer ${
                  selectedCategory === cat.key
                    ? 'bg-brand-red border-brand-red text-white shadow-sm'
                    : 'bg-white border-slate-250 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="mr-1.5">{cat.icon}</span>
                {cat.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            {/* Offline Mode Toggler Switch */}
            <button
              onClick={() => setIsOfflineMode(prev => !prev)}
              className={`px-4 py-2 text-xs sm:text-sm font-sans font-bold rounded-lg border transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 w-full sm:w-auto ${
                isOfflineMode
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-sm animate-pulse'
                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
              }`}
              title="অফলাইন মোড সক্রিয় করুন"
            >
              <span>{isOfflineMode ? '📴 অফলাইন পাঠ মোড' : '🌐 অনলাইন সংস্করণ'}</span>
              <span className={`h-2.5 w-2.5 rounded-full ${isOfflineMode ? 'bg-white' : 'bg-emerald-500'}`} />
            </button>

            {/* Search action input */}
            <div className="relative w-full sm:w-64">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="সংবাদ অনুসন্ধান করুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50/50 border border-slate-200 pl-9 pr-3 py-2 text-xs sm:text-sm font-sans rounded-lg focus:outline-none focus:border-brand-red text-slate-900"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-400 hover:text-brand-red"
                >
                  মুছুন
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Custom News control filters / reset buttons */}
        {isAdminMode && (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-100/95 border border-slate-200 p-3.5 px-4 rounded-xl shadow-3xs text-xs animate-fade-in font-sans">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-bold text-slate-500 uppercase tracking-wider select-none">⚙️ খবরের নিয়ন্ত্রণ:</span>
              
              <button
                onClick={() => {
                  const newValue = !hideDefaultNews;
                  setHideDefaultNews(newValue);
                  localStorage.setItem('bangla_khobor_hide_default_news', String(newValue));
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border font-bold transition-all cursor-pointer ${
                  hideDefaultNews
                    ? 'bg-amber-600 hover:bg-amber-700 text-white border-amber-600 shadow-xs'
                    : 'bg-white hover:bg-slate-50 border-slate-250 text-slate-700 hover:border-slate-350'
                }`}
                title="শুধুমাত্র নিজের খবরের তালিকা প্রদর্শন করুন"
              >
                📊 {hideDefaultNews ? 'শুধুমাত্র নিজের হ্যান্ডক্রাফটেড খবর দেখছেন' : 'ডিফল্ট খবর বন্ধ করুন (Disable Default)'}
              </button>

              {disabledArticleIds.length > 0 && (
                <span className="font-semibold text-slate-600 bg-slate-200/85 px-2.5 py-1.5 rounded-md border border-slate-250">
                  🚫 {disabledArticleIds.length} টি খবর স্ক্রিন থেকে লুকানো আছে
                </span>
              )}
            </div>

            {disabledArticleIds.length > 0 && (
              <button
                onClick={handleResetDisabledArticles}
                className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 font-bold text-rose-700 border border-rose-200 rounded-lg transition-all cursor-pointer hover:border-rose-300"
              >
                🔄 সব লুকানো খবর ফেরত আনুন (Reset All)
              </button>
            )}
          </div>
        )}

        {/* Offline Warning Banner / Splash Info */}
        {isOfflineMode && (
          <div className="bg-emerald-50 border border-emerald-250 text-emerald-950 p-5 sm:p-6 rounded-xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 animate-fade-in border-l-4 border-l-emerald-600">
            <div className="space-y-1 text-center md:text-left">
              <h3 className="font-serif font-black text-base sm:text-lg text-emerald-950 flex items-center gap-2 justify-center md:justify-start">
                📴 আপনি অফলাইন পাঠ মোডে আছেন (Offline Active)
              </h3>
              <p className="text-xs sm:text-sm text-emerald-805 font-sans">
                এই বিভাগে আপনার সংরক্ষণ করা খবরগুলোর সম্পূর্ণ বিবরণ ও হাইলাইট অফলাইনে পড়া যাচ্ছে। কোনো ইন্টারনেট ডাটা খরচ হবে না।
              </p>
            </div>
            <button
              onClick={() => setIsOfflineMode(false)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-sans text-xs sm:text-sm font-bold min-w-[130px] py-2 px-4 rounded-lg transition-all duration-200 shadow-xs cursor-pointer border border-emerald-500 whitespace-nowrap self-stretch sm:self-auto text-center"
            >
              🌐 অনলাইন ফিরে যান
            </button>
          </div>
        )}

        {/* Smart Personalized recommendation AI feed module */}
        {isAdminMode && !isOfflineMode && (
          <SmartFeed
            articles={articles.length > 0 ? articles : fallbackNews}
            userPrefs={userPrefs}
            onSelectArticle={handleSelectArticle}
          />
        )}

        {/* Divider header for category list */}
        <div className="border-b-2 border-slate-800 pb-2 flex justify-between items-end">
          <h2 className="font-serif font-black text-xl sm:text-2xl text-slate-900 flex items-center gap-2">
            {isOfflineMode 
              ? `📴 অফলাইন বুকমার্কস • ${categoriesList.find((c) => c.key === selectedCategory)?.label}`
              : `📰 আজকের প্রধান খবর • ${categoriesList.find((c) => c.key === selectedCategory)?.label}`}
          </h2>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
            {isAdminMode && (
              <>
                {isOfflineMode ? (
                  <span className="flex items-center gap-1 bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded border border-emerald-250 font-bold font-sans">
                    🟢 অফলাইন সুরক্ষিত আছে
                  </span>
                ) : newsSource === 'ai-grounded' ? (
                  <span className="flex items-center gap-1 bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded border border-emerald-200">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    AI লাইভ গ্রাউন্ডেড নিউজ
                  </span>
                ) : newsSource === 'quota-limited' ? (
                  <span className="flex items-center gap-1 bg-red-50 text-red-700 px-2.5 py-1 rounded border border-red-200 select-none cursor-help animate-pulse" title="Gemini API Quota Exceeded. Automatic offline news backup is active.">
                    <AlertCircle className="w-3.5 h-3.5 text-red-500 animate-bounce" /> এআই কোটা শেষ (লোকাল খবর অ্যাক্টিভ)
                  </span>
                ) : (
                  <span className="flex items-center gap-1 bg-amber-50 text-amber-800 px-2.5 py-1 rounded border border-amber-200 select-none">
                    <AlertCircle className="w-3.5 h-3.5" /> লোকাল আর্কাইভড খবর
                  </span>
                )}
                
                {/* Quick manual reload */}
                {!isOfflineMode && (
                  <button
                    onClick={() => fetchNews(selectedCategory)}
                    className="p-1 hover:bg-slate-100 border border-slate-200 bg-white text-slate-600 rounded-lg transition-colors cursor-pointer"
                    title="রিফ্রেশ করুন"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Primary News articles List Grid */}
        {isLoading && !isOfflineMode ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ArticleLoadingSkeleton />
            <ArticleLoadingSkeleton />
            <ArticleLoadingSkeleton />
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="bg-white border border-slate-200 p-12 text-center rounded-xl shadow-sm">
            {isOfflineMode ? (
              <div className="max-w-md mx-auto py-4">
                <p className="text-lg font-serif font-bold text-slate-700 mb-2">এই বিভাগে আপনার কোনো অফলাইন খবর নেই!</p>
                <p className="text-sm text-slate-500 mb-5 leading-relaxed">
                  পছন্দসই খবরগুলি পড়ার সময় বুকমার্ক বাটনে ট্যাপ করুন যাতে সেগুলি সরাসরি আপনার লোকাল মেমরিতে ডাউনলোড ও ক্যাশ হয়ে যায়।
                </p>
                <button
                  onClick={() => setIsOfflineMode(false)}
                  className="bg-brand-red text-white font-sans text-xs sm:text-sm px-5 py-2.5 rounded-lg font-black hover:bg-brand-red-dark transition-colors cursor-pointer shadow-3xs"
                >
                  🌐 অনলাইন সংস্করণ ব্রাউজ করুন
                </button>
              </div>
            ) : hideDefaultNews ? (
              <div className="max-w-md mx-auto py-4">
                <p className="text-lg font-serif font-bold text-slate-700 mb-2">আপনার নিজস্ব কোনো খবর যোগ করা নেই!</p>
                <p className="text-sm text-slate-500 mb-5 leading-relaxed">
                  আপনি ডিফল্ট খবরগুলো সাময়িকভাবে বন্ধ করে রেখেছেন। এডমিন মোড সক্রিয় করে নিচের ডানদিকের <strong>"+" (খবর যুক্ত করুন)</strong> বোতামে ক্লিক করে ছবি সহ নিজের খবর প্রকাশ করুন।
                </p>
                <button
                  onClick={() => {
                    setHideDefaultNews(false);
                    localStorage.setItem('bangla_khobor_hide_default_news', 'false');
                  }}
                  className="bg-emerald-600 text-white font-sans text-xs sm:text-sm px-5 py-2 rounded-lg font-black hover:bg-emerald-700 transition-colors cursor-pointer shadow-3xs"
                >
                  📊 ডিফল্ট খবরগুলো পুনরায় চালু করুন
                </button>
              </div>
            ) : (
              <>
                <p className="text-lg font-serif font-bold text-slate-700 mb-2">কোনো খবর পাওয়া যায়নি!</p>
                <p className="text-sm text-slate-500">আপনার ফিল্টার পরিবর্তন করুন অথবা এই বিভাগে নতুন খবর খোঁজার জন্য অন্য কি-ওয়ার্ড টাইপ করুন।</p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
            {filteredArticles.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                isBookmarked={userPrefs.bookmarkedIds.includes(article.id)}
                onSelect={handleSelectArticle}
                onToggleBookmark={handleToggleBookmark}
                onDeleteCustom={isAdminMode ? (id, e) => handleDeleteArticle(id, e) : undefined}
              />
            ))}
          </div>
        )}
      </main>

      {/* Human-Curated / Midnight Reset notice banner */}
      <section className="max-w-7xl mx-auto px-4 mt-16 animate-fade-in">
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border-2 border-slate-950 rounded-2xl p-6 sm:p-8 shadow-xl text-white relative overflow-hidden">
          {/* Subtle decorative background glow or clock silhouette */}
          <div className="absolute right-0 bottom-0 opacity-[0.03] translate-x-1/4 translate-y-1/4 pointer-events-none select-none">
            <Clock className="w-96 h-96" />
          </div>
          
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-3.5 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="bg-[#b31b1b] text-white text-[10px] sm:text-xs font-sans font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" /> Human-Curated
                </span>
                <span className="bg-amber-500 text-slate-950 text-[10px] sm:text-xs font-sans font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-950" /> Midnight Cleared
                </span>
              </div>
              
              <h2 className="font-serif font-black text-xl sm:text-2xl text-[#f4ebd9] leading-tight">
                ম্যানুয়াল কিউরেশন • মধ্যরাতে স্বয়ংক্রিয় রিসেট
              </h2>
              
              <div className="space-y-2.5">
                <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed">
                  প্রতিটি খবরের আপডেট এবং ছবি ব্যক্তিগতভাবে যাচাই করে নিজে যুক্ত করি। প্ল্যাটফর্মকে দ্রুত ও সম্পূর্ণ পরিচ্ছন্ন রাখতে, প্রতি রাতে ঠিক <strong>১২:০০ টায় (Midnight)</strong> সিস্টেম স্বয়ংক্রিয়ভাবে সমস্ত কন্টেন্ট ও ছবি মুছে দেয়।
                </p>
                <div className="border-t border-slate-800/80 my-2 pt-2">
                  <p className="text-xs sm:text-sm text-slate-400 font-sans font-medium italic leading-relaxed">
                    "Every news update and image is personally hand-picked and added by me. To keep the platform fast and fresh, the system automatically deletes all content every night at 12:00 AM, ready for a brand new day."
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-slate-800/60 border border-slate-700/50 p-4 sm:p-5 rounded-xl flex items-center gap-3.5 shrink-0 w-full md:w-auto">
              <div className="h-11 w-11 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider font-mono">পরবর্তী রিসেট টাইম</span>
                <span className="text-sm font-sans font-black text-slate-200">আজ রাত ১২:০০ টা (12:00 AM)</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Persistent floating footer utility bar */}
      <footer className="w-full bg-slate-900 text-slate-400 py-10 mt-16 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
              <Newspaper className="w-5 h-5 text-brand-red" />
              <span className="text-white font-serif font-black text-lg">বাংলা খবর (Bangla Khobor)</span>
            </div>
            <p className="text-xs text-slate-400 max-w-sm font-sans">
              West Bengal's premier intelligence news editorial engine, delivering context-accurate AI-generated summaries, search grounded insights, and stunning visual illustrations.
            </p>
          </div>

          <div className="flex flex-col items-center md:items-end gap-2 text-xs text-right font-sans">
            <span className="text-white font-semibold">👤 ডেভলপার তথ্য:</span>
            <span>গোষ্ঠী: <strong onClick={handleToggleAdmin} className="text-slate-200 cursor-pointer hover:text-white select-none transition-colors" title="পরিচালক লগইন">dey group</strong></span>
            <span>যোগাযোগ ইমেইল: <a href="mailto:deypampa559@gmail.com" className="text-brand-red hover:text-red-400 hover:underline">deypampa559@gmail.com</a></span>
            <span className="text-[10px] mt-2 text-slate-500 flex items-center gap-1">
              Crafted in West Bengal with <Heart className="w-3.5 h-3.5 text-red-600 fill-current" />
            </span>
          </div>
        </div>
      </footer>

      {/* Floating bookmark tray launcher trigger */}
      <div className="fixed bottom-6 left-6 z-30">
        <button
          onClick={() => setIsBookmarkOpen(true)}
          className="bg-brand-red hover:bg-brand-red-dark text-white p-3 rounded-full shadow-2xl flex items-center justify-center gap-2 border border-brand-red-dark/30 hover:scale-105 transition-all outline-none"
          title="বুকমার্ক করা খবরের তালিকা"
        >
          <Bookmark className="w-5 h-5 fill-current" />
          {userPrefs.bookmarkedIds.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-white text-brand-red border border-brand-red text-[10px] font-mono h-5 w-5 rounded-full flex items-center justify-center font-black">
              {userPrefs.bookmarkedIds.length}
            </span>
          )}
          <span className="hidden sm:inline text-xs font-sans font-bold pr-1">পড়ুন বুকমার্কস</span>
        </button>
      </div>

      {/* Floating Manual news addition button ONLY visible in Admin Mode */}
      {isAdminMode && (
        <div className="fixed bottom-6 right-6 z-30">
          <button
            onClick={() => setIsAddNewsOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white p-3 sm:p-4 rounded-full shadow-2xl flex items-center justify-center gap-2 border border-emerald-700/30 hover:scale-105 active:scale-95 transition-all outline-none cursor-pointer"
            title="নতুন খবর যুক্ত করুন"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline text-xs font-sans font-bold pr-1">খবর যুক্ত করুন</span>
          </button>
        </div>
      )}

      {/* Manual news entry modal Form ONLY visible in Admin Mode & when isAddNewsOpen is true */}
      {isAdminMode && isAddNewsOpen && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-55 animate-fade-in text-slate-800">
          <div className="bg-white rounded-2xl border-2 border-slate-950 w-full max-w-xl mx-auto overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex justify-between items-center bg-slate-900 text-white px-6 py-4 border-b-2 border-slate-950">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" />
                <h3 className="font-serif font-black text-lg">
                  নতুন খবর নিজেই যোগ করুন (Add News)
                </h3>
              </div>
              <button 
                onClick={() => setIsAddNewsOpen(false)}
                className="text-slate-300 hover:text-white p-1 hover:bg-slate-800 rounded transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Success Animation overlay */}
            {publishSuccess ? (
              <div className="flex-grow flex flex-col items-center justify-center p-12 text-center space-y-3 bg-white">
                <div className="h-14 w-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                  <CheckCircle className="w-10 h-10" />
                </div>
                <h4 className="font-serif font-black text-xl text-slate-900">সংবাদ সফলভাবে প্রকাশিত!</h4>
                <p className="text-sm text-slate-500 font-sans">
                  আপনার খবরের লেখা ও ছবি মূল ফিডে সবার উপরে যুক্ত করা হয়েছে।
                </p>
              </div>
            ) : (
              <form onSubmit={handleAddNewsSubmit} className="flex-grow overflow-y-auto p-6 space-y-4 bg-white font-sans text-xs sm:text-sm">
                
                {/* Intro advice about manual effort */}
                <div className="bg-emerald-50 border border-emerald-150 rounded-lg p-3 text-[11px] text-emerald-950 leading-relaxed">
                  📢 <strong>নিজে খবরের বিষয় ও ছবি যোগ করুন:</strong> এখানে টাইপ করা প্রতিটি শব্দ এবং আপনি যে ছবির লিংক দেবেন তা সংশ্লিষ্ট ক্যাটাগরির খবরের সবার উপরে প্রকাশিত হবে। নিচে <strong>"সম্পাদক কর্তৃক সংযোজিত"</strong> ট্যাগটি যুক্ত থাকবে।
                </div>

                {/* Title Input */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 flex items-center gap-1">
                    <FileText className="w-4 h-4 text-slate-500" /> খবরের শিরোনাম (Headline) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={150}
                    placeholder="আকর্ষণীয় শিরোনামটি এখানে লিখুন..."
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-emerald-500 focus:bg-white text-slate-900 font-bold"
                  />
                </div>

                {/* Grid for category and source */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Category select */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">খবরের বিভাগ (Category) <span className="text-red-500">*</span></label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-emerald-500 focus:bg-white text-slate-900 font-semibold cursor-pointer"
                    >
                      <option value="national">🇮🇳 জাতীয় খবর (National)</option>
                      <option value="international">🌍 আন্তর্জাতিক (International)</option>
                      <option value="television">📺 টেলিভিশন (Television)</option>
                      <option value="entertainment">🎭 বিনোদন ও খেলা (Entertainment/Sports)</option>
                    </select>
                  </div>

                  {/* Source name */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">উত্স বা প্রতিবেদক (Source / Publisher Name)</label>
                    <input
                      type="text"
                      placeholder="যেমন: আনন্দবাজার, জুরিডিক্যাল ব্যুরো..."
                      value={newSource}
                      onChange={(e) => setNewSource(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-emerald-500 focus:bg-white text-slate-900 font-semibold"
                    />
                  </div>
                </div>

                {/* Image URL Input with thumbnail preview and helpful presets */}
                <div className="space-y-2">
                  <label className="font-bold text-slate-700 flex items-center gap-1">
                    <Image className="w-4 h-4 text-slate-500" /> কভার ছবির লিঙ্ক (Image URL / Presets)
                  </label>
                  <input
                    type="url"
                    placeholder="যেমন https://images.unsplash.com/... (খালি রাখলে মানানসই কভার স্বয়ংক্রিয়ভাবে বসে যাবে)"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-emerald-500 focus:bg-white text-xs text-slate-900 font-mono"
                  />

                  {/* Presets Grid */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold">১০0% সুরক্ষিত ছবির বিকল্পগুলি (১-ক্লিক সিলেকশন):</span>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {[
                        { label: '🏏 ক্রিকেট', url: 'https://images.unsplash.com/photo-1540747737956-378724044453?w=800&auto=format&fit=crop&q=80' },
                        { label: '🎬 মুভি থিয়েটার', url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=80' },
                        { label: '🛰️ মহাকাশ গবেষণা', url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80' },
                        { label: '🚆 গতিশীল ভারত', url: 'https://images.unsplash.com/photo-1541417901777-a169e2621473?w=800&auto=format&fit=crop&q=80' },
                        { label: '📺 স্টুডিও ক্যামেরা', url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop&q=80' }
                      ].map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setNewImageUrl(preset.url)}
                          className={`text-[10px] font-sans font-bold px-2.5 py-1 rounded-full border cursor-pointer hover:border-emerald-400 transition-colors ${
                            newImageUrl === preset.url 
                              ? 'bg-emerald-55 text-emerald-800 border-emerald-550' 
                              : 'bg-slate-50 text-slate-600 border-slate-200'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Mini-live image preview */}
                  {newImageUrl && (
                    <div className="mt-1 border border-slate-200 rounded-lg p-1.5 bg-slate-50/50 flex items-center gap-3">
                      <img 
                        src={newImageUrl} 
                        alt="Preview" 
                        referrerPolicy="no-referrer"
                        className="w-16 h-10 object-cover rounded border border-slate-200"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                      <div className="text-[10px] text-slate-500 leading-tight">
                        <span className="font-bold text-slate-700 block text-emerald-850">✓ কভার ইমেজ প্রিভিও সক্রিয়</span>
                        আপনার এই কভার ইমেজটি খবরের কার্ডে ও রিডারে প্রফেশনাল আর্টওয়ার্ক হিসেবে প্রদর্শিত হবে।
                      </div>
                    </div>
                  )}
                </div>

                {/* Brief Summary / Highlights */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">দ্রুত একনজরে হাইলাইট (Short Summary)</label>
                  <textarea
                    rows={1}
                    maxLength={220}
                    placeholder="খবরের মূল আকর্ষণ ১-২ টি ছোট বাক্যে লিখুন (যেমন: টিআরপি তালিকায় প্রথম স্থানে ফিরে এলো নতুন ধারাবাহিক...)"
                    value={newSummary}
                    onChange={(e) => setNewSummary(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-emerald-500 focus:bg-white text-slate-900"
                  />
                </div>

                {/* Main Body content */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">খবরের বিস্তারিত মূল বিষয়বস্তু (Detailed Content) <span className="text-red-500">*</span></label>
                  <textarea
                    rows={5}
                    required
                    placeholder="সম্পূর্ণ খবরটি অনুচ্ছেদে সুন্দর করে সাজিয়ে লিখুন। প্যারাগ্রাফ আলাদা করতে ডাবল লাইন স্পেস দিন (যেমন: এন্টার কী দুবার চাপুন)..."
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-emerald-500 focus:bg-white text-slate-900 leading-relaxed font-sans"
                  />
                </div>

                {/* Submit button bar */}
                <div className="flex gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddNewsOpen(false)}
                    className="w-1/2 border border-slate-250 py-3 rounded-xl font-bold hover:bg-slate-50 cursor-pointer text-slate-600 transition-colors uppercase tracking-wide text-xs"
                  >
                    বন্ধ করুন
                  </button>
                  <button
                    type="submit"
                    disabled={isPublishing}
                    className="w-1/2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 uppercase tracking-wide text-xs shadow-xs"
                  >
                    {isPublishing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>প্রকাশ করা হচ্ছে...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>সংবাদ প্রকাশ করুন</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Detailed Article Reader Overlay */}
      {selectedArticle && (
        <ArticleReader
          article={selectedArticle}
          isBookmarked={userPrefs.bookmarkedIds.includes(selectedArticle.id)}
          onClose={() => setSelectedArticle(null)}
          onToggleBookmark={(id) => handleToggleBookmark(id)}
          onUpdateArticleImage={handleUpdateArticleImage}
          isAdminMode={isAdminMode}
        />
      )}

      {/* Admin Passcode Login Modal Dialog */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-55 animate-fade-in text-slate-800">
          <div className="bg-white rounded-2xl border-2 border-slate-950 w-full max-w-sm overflow-hidden shadow-2xl relative p-6 space-y-4">
            <div className="flex items-center gap-2 text-brand-red border-b border-slate-100 pb-3">
              <span className="p-1.5 bg-red-50 text-brand-red rounded-lg">
                <AlertCircle className="w-5 h-5" />
              </span>
              <h3 className="font-serif font-black text-lg text-slate-900">
                অ্যাডমিন সাইন-ইন (Admin Area)
              </h3>
            </div>

            <p className="text-xs text-slate-500 font-sans leading-relaxed">
              এই বিভাগটি শুধুমাত্র ডেভলপার সংস্করণ ও পরিচালকের জন্য সুরক্ষিত। ইমেজ ওভাররাইড অ্যাক্সেস চালু করতে পিন কোড প্রদান করুন। 
            </p>

            <form onSubmit={handleAdminVerify} className="space-y-4 font-sans">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">ডিজিটাল পিন কোড (Admin Key/PIN):</label>
                <input
                  type="password"
                  placeholder="PIN কোড লিখুন..."
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-250 rounded-xl p-2.5 text-center text-sm font-bold tracking-widest outline-none focus:border-brand-red focus:bg-white text-slate-900"
                  autoFocus
                />
              </div>

              {adminError && (
                <p className="text-xs text-brand-red bg-red-50 p-2 rounded-lg text-center font-bold">
                  ⚠️ {adminError}
                </p>
              )}

              <div className="flex gap-2 pt-2 text-xs">
                <button
                  type="button"
                  onClick={() => setIsAdminModalOpen(false)}
                  className="w-1/2 border border-slate-250 py-2.5 rounded-xl font-bold hover:bg-slate-50 cursor-pointer text-slate-600 transition-colors"
                >
                  বাতিল করুন
                </button>
                <button
                  type="submit"
                  className="w-1/2 bg-slate-900 hover:bg-slate-950 text-white font-bold py-2.5 rounded-xl cursor-pointer transition-colors"
                >
                  ওভাররাইড প্রবেশ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bookmark sliding tray */}
      <BookmarkTray
        bookmarkedArticles={bookmarkedArticles}
        isOpen={isBookmarkOpen}
        onClose={() => setIsBookmarkOpen(false)}
        onSelectArticle={handleSelectArticle}
        onRemoveBookmark={(id, e) => handleToggleBookmark(id, e)}
      />
    </div>
  );
}

// Newspaper Column Loading Animation Shimmer
function ArticleLoadingSkeleton() {
  return (
    <div className="border border-[#eae4d3] rounded-sm overflow-hidden bg-white p-4 space-y-3 shadow-xs animate-pulse opacity-70">
      <div className="bg-[#f4ebd9] aspect-video w-full rounded-sm"></div>
      <div className="flex justify-between items-center">
        <div className="h-3 bg-[#eae4d3] w-12 rounded"></div>
        <div className="h-3 bg-[#eae4d3] w-16 rounded"></div>
      </div>
      <div className="h-5 bg-[#eae4d3] w-5/6 rounded"></div>
      <div className="space-y-1.5 pt-1">
        <div className="h-3.5 bg-[#eae4d3] w-full rounded"></div>
        <div className="h-3.5 bg-[#eae4d3] w-11/12 rounded"></div>
        <div className="h-3.5 bg-[#eae4d3] w-2/3 rounded"></div>
      </div>
      <div className="pt-3 border-t border-dashed border-[#eae4d3] flex justify-between">
        <div className="h-3.5 bg-[#eae4d3] w-1/4 rounded"></div>
        <div className="h-3.5 bg-[#eae4d3] w-1/4 rounded"></div>
      </div>
    </div>
  );
}
