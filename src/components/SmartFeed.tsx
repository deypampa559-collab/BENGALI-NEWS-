/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Sparkles, BrainCircuit, Activity } from 'lucide-react';
import { NewsArticle, UserPreferences } from '../types';

interface SmartFeedProps {
  articles: NewsArticle[];
  userPrefs: UserPreferences;
  onSelectArticle: (article: NewsArticle) => void;
}

export default function SmartFeed({ articles, userPrefs, onSelectArticle }: SmartFeedProps) {
  // Extract category views
  const views = userPrefs.categoryViews || {
    entertainment: 0,
    television: 0,
    national: 0,
    international: 0,
  };

  const totalViews = Object.values(views).reduce((sum, v) => sum + v, 0);

  // Map category identifier to beautiful Bengali title
  const categoryLabels: Record<string, { label: string; icon: string; bg: string; text: string }> = {
    entertainment: { label: 'বিনোদন ও খেলা', icon: '🎭', bg: 'bg-purple-100', text: 'text-purple-800' },
    television: { label: 'টেলিভিশন', icon: '📺', bg: 'bg-indigo-100', text: 'text-indigo-800' },
    national: { label: 'জাতীয় খবর', icon: '🇮🇳', bg: 'bg-amber-100', text: 'text-amber-800' },
    international: { label: 'আন্তর্জাতিক', icon: '🌍', bg: 'bg-cyan-100', text: 'text-cyan-800' },
  };

  // Calculate recommendation score for each article
  // Base algorithm:
  // - If total views are 0, we treat categories equally.
  // - Otherwise, priority score = (views of category / total views) * 70 + (random/latest factor in article) * 30.
  // We sort articles by this personalized score!
  const scoredArticles = articles
    .map((art) => {
      const categoryViews = views[art.category] || 0;
      let ratio = totalViews > 0 ? categoryViews / totalViews : 0.25;
      
      // Add a slight boost if it matches the highest-viewed category
      const values = Object.values(views);
      const isHighest = categoryViews > 0 && categoryViews === Math.max(...values);
      const score = ratio * 80 + (isHighest ? 20 : 0);

      return { article: art, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3); // top 3 recommendations

  // Calculate percentages for user profile stats
  const profileStats = Object.entries(views)
    .map(([cat, count]) => {
      const pct = totalViews > 0 ? Math.round((count / totalViews) * 100) : 0;
      return { cat, count, pct, ...categoryLabels[cat] };
    })
    .filter((stat) => stat.count > 0)
    .sort((a, b) => b.pct - a.pct);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm border-l-4 border-l-brand-blue relative overflow-hidden animate-fade-in">
      <div className="absolute top-0 right-0 w-32 h-32 bg-brand-blue/5 rounded-full blur-3xl -z-10"></div>
      
      {/* Box Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="bg-brand-blue-accent p-2 rounded text-white shadow-xs">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-serif text-lg font-bold text-slate-800 flex items-center gap-1.5">
              স্মার্ট এআই সুপারিশ ফিড
              <span className="text-xs bg-brand-blue/10 text-brand-blue tracking-wider uppercase font-semibold font-mono px-2 py-0.5 rounded-full">
                Personalized
              </span>
            </h2>
            <p className="text-xs text-slate-500 font-sans">আপনার সাম্প্রতিক পছন্দ এবং রিডিং মোডের ওপর ভিত্তি করে এআই-সংকলিত খবর।</p>
          </div>
        </div>

        {totalViews > 0 && (
          <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-0 bg-slate-50 px-3 py-1.5 rounded-lg text-[11px] font-mono border border-slate-200 shadow-3xs">
            <span className="text-brand-blue-accent font-bold flex items-center gap-1">
              <Activity className="w-3.5 h-3.5" /> প্রোফাইল স্কোর:
            </span>
            {profileStats.map((stat) => (
              <span key={stat.cat} className="flex items-center gap-0.5 whitespace-nowrap text-slate-600">
                {stat.icon} {stat.pct}%
              </span>
            ))}
          </div>
        )}
      </div>

      {totalViews === 0 ? (
        // Clean onboarding card
        <div className="py-6 text-center max-w-lg mx-auto">
          <div className="text-3xl mb-3 animate-bounce">✨</div>
          <p className="font-sans text-sm text-slate-600 leading-relaxed">
            <strong className="text-slate-800">বাংলা খবর-এ আপনাকে স্বাগতম!</strong> আপনার কাস্টম ফিডটি খালি রয়েছে। বিনোদন, টেলিভিশন, জাতীয় বা আন্তর্জাতিক খবর থেকে আপনার পছন্দের কয়েকটি খবর ক্লিক করে পড়া শুরু করুন, আমাদের স্মার্ট এআই এডিটর অটোমেটিকালি আপনার জন্য একটি ব্যক্তিগত নিউজ কালেকশন সাজিয়ে তুলবে।
          </p>
        </div>
      ) : (
        // Scored Grid Card list
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {scoredArticles.map(({ article, score }) => (
            <div
              key={article.id}
              onClick={() => onSelectArticle(article)}
              className="group cursor-pointer border border-slate-150 hover:border-brand-blue-accent hover:shadow-md transition-all rounded-lg flex flex-col bg-slate-50/50 hover:bg-white overflow-hidden p-4 relative"
            >
              {/* Score indicator bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-blue-accent to-blue-400 opacity-60"></div>
              
              <div className="flex justify-between items-center mb-2.5">
                <span className={`text-[10px] font-sans font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm ${categoryLabels[article.category]?.bg} ${categoryLabels[article.category]?.text}`}>
                  {categoryLabels[article.category]?.icon} {categoryLabels[article.category]?.label}
                </span>
                
                <span className="text-[10px] font-mono text-slate-500 flex items-center gap-0.5 bg-slate-100 px-1.5 py-0.5 rounded font-bold">
                  🎯 {Math.round(score)}% মিল
                </span>
              </div>

              <h3 className="font-serif font-bold text-sm text-slate-800 group-hover:text-brand-blue-accent transition-colors line-clamp-2 leading-snug">
                {article.title}
              </h3>

              <p className="text-xs text-slate-650 font-sans mt-2 line-clamp-2 leading-relaxed">
                {article.summary}
              </p>

              <div className="mt-auto pt-3 border-t border-dashed border-slate-200 flex items-center justify-between text-[11px] font-mono text-slate-500">
                <span>{article.source}</span>
                <span>{article.publishedAt}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
