/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Bookmark, Share2, Sparkles, BookOpen, ExternalLink, Trash2 } from 'lucide-react';
import { NewsArticle } from '../types';

const FALLBACK_IMAGES: Record<string, string> = {
  entertainment: 'https://images.unsplash.com/photo-1540747737956-378724044453?w=800&auto=format&fit=crop&q=80',
  television: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=800&auto=format&fit=crop&q=80',
  national: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80',
  international: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
};

interface ArticleCardProps {
  key?: string | number;
  article: NewsArticle;
  isBookmarked: boolean;
  onSelect: (article: NewsArticle) => void;
  onToggleBookmark: (id: string, e?: any) => void;
  onDeleteCustom?: (id: string, e: any) => void;
}

export default function ArticleCard({ article, isBookmarked, onSelect, onToggleBookmark, onDeleteCustom }: ArticleCardProps) {
  const categoryConfig: Record<string, { label: string; bg: string; text: string; icon: string }> = {
    entertainment: { label: 'বিনোদন ও খেলা', bg: 'bg-purple-100/80', text: 'text-purple-800', icon: '🎭' },
    television: { label: 'টেলিভিশন', bg: 'bg-indigo-100/80', text: 'text-indigo-800', icon: '📺' },
    national: { label: 'জাতীয় খবর', bg: 'bg-amber-100/80', text: 'text-amber-800', icon: '🇮🇳' },
    international: { label: 'আন্তর্জাতিক', bg: 'bg-cyan-100/80', text: 'text-cyan-800', icon: '🌍' },
  };

  const config = categoryConfig[article.category] || { label: 'খবর', bg: 'bg-gray-100', text: 'text-gray-800', icon: '📰' };

  // Share functionality handling
  const handleShare = (e: React.MouseEvent, type: 'whatsapp' | 'facebook' | 'copy') => {
    e.stopPropagation();
    const shareText = `*${article.title}*\n${article.summary}\n\nপড়ুন বাংলা খবর-এ: ${window.location.href}`;
    
    if (type === 'whatsapp') {
      const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } else if (type === 'facebook') {
      const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      navigator.clipboard.writeText(`${article.title} - ${article.summary}`);
      alert('খবরের লিংক ও বিবরণ ক্লিপবোর্ডে কপি করা হয়েছে!');
    }
  };

  return (
    <article
      onClick={() => onSelect(article)}
      className="group flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer h-full hover:-translate-y-1 shadow-xs"
    >
      {/* Article thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
        <img
          src={article.imageUrl}
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
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        
        {/* Category sticker */}
        <span className={`absolute top-3 left-3 text-[10px] font-sans font-bold uppercase tracking-wider px-2.5 py-1 shadow-md rounded-md ${config.bg} ${config.text} backdrop-blur-sm border border-white/20`}>
          {config.icon} {config.label}
        </span>

        {!article.isAiGenerated ? (
          <div className="absolute top-3 right-3 flex items-center gap-1.5">
            <span className="text-[10px] bg-brand-red/90 backdrop-blur-sm text-white px-2.5 py-1 rounded-md flex items-center gap-1 font-sans font-black border border-white/15 shadow-sm select-none">
              ✍️ সম্পাদক কর্তৃক সংযোজিত
            </span>
            {onDeleteCustom && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteCustom(article.id, e);
                }}
                className="p-1.5 rounded-md bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-700 transition-colors border border-slate-200/80 shadow-md cursor-pointer flex items-center justify-center"
                title="ম্যানুয়াল খবরটি মুছে ফেলুন"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          <div className="absolute top-3 right-3 flex items-center gap-1.5">
            <span className="text-[10px] bg-slate-900/85 backdrop-blur-sm text-white px-2.5 py-1 rounded-md flex items-center gap-1 font-mono font-medium border border-white/15 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-current" /> Grounded AI
            </span>
            {onDeleteCustom && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteCustom(article.id, e);
                }}
                className="p-1.5 rounded-md bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-700 transition-colors border border-slate-200/80 shadow-md cursor-pointer flex items-center justify-center select-none"
                title="ডিফল্ট খবরটি স্ক্রিন থেকে সরিয়ে দিন (Disable item)"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Card Content body */}
      <div className="p-5 flex flex-col flex-grow">
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 mb-2.5">
          <span className="flex items-center gap-1.5 font-sans font-black text-brand-red uppercase tracking-wider text-[10px]">
            {article.source}
          </span>
          <span>{article.publishedAt}</span>
        </div>

        {/* Article title */}
        <h3 className="font-serif font-black text-base sm:text-lg leading-snug text-slate-900 group-hover:text-brand-red transition-colors line-clamp-2 mb-2">
          {article.title}
        </h3>

        {/* Brief summary */}
        <p className="text-xs sm:text-sm text-slate-600 font-sans leading-relaxed line-clamp-3 mb-4">
          {article.summary}
        </p>

        {/* Footer actions */}
        <div className="mt-auto pt-3.5 border-t border-dashed border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-bold font-sans flex items-center gap-1 group-hover:text-brand-red transition-colors">
            <BookOpen className="w-3.5 h-3.5 text-slate-400 group-hover:text-brand-red" /> সম্পূর্ণ খবর পড়ুন →
          </span>

          <div className="flex items-center gap-1.55">
            {/* Share Menu */}
            <div className="relative group/share">
              <button
                onClick={(e) => { e.stopPropagation(); }}
                className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors border border-transparent hover:border-slate-200"
                title="খবর শেয়ার করুন"
              >
                <Share2 className="w-4 h-4" />
              </button>
              
              <div className="absolute right-0 bottom-full mb-1 bg-white border border-slate-200 shadow-xl rounded-lg py-1 hidden group-hover/share:block z-10 w-28 animate-fade-in">
                <button
                  onClick={(e) => handleShare(e, 'whatsapp')}
                  className="w-full text-left px-2.5 py-1.5 text-[11px] hover:bg-green-50 text-green-700 font-sans flex items-center gap-1 font-semibold"
                >
                  🟢 WhatsApp
                </button>
                <button
                  onClick={(e) => handleShare(e, 'facebook')}
                  className="w-full text-left px-2.5 py-1.5 text-[11px] hover:bg-blue-50 text-blue-800 font-sans flex items-center gap-1 font-semibold"
                >
                  🔵 Facebook
                </button>
                <button
                  onClick={(e) => handleShare(e, 'copy')}
                  className="w-full text-left px-2.5 py-1.5 text-[11px] hover:bg-slate-50 text-slate-700 font-sans flex items-center gap-1 border-t border-slate-100 font-semibold"
                >
                  🔗 কপি করুন
                </button>
              </div>
            </div>

            {/* Bookmark button */}
            <button
              onClick={(e) => onToggleBookmark(article.id, e)}
              className={`p-1.5 rounded-md transition-colors ${
                isBookmarked 
                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200' 
                  : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600 border border-transparent hover:border-slate-200'
              }`}
              title={isBookmarked ? 'বুকমার্ক সরান' : 'পড়ার জন্য বুকমার্ক করুন'}
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-amber-500 text-amber-600' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
