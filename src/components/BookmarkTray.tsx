/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Bookmark, X, BookOpen, Trash2 } from 'lucide-react';
import { NewsArticle } from '../types';

interface BookmarkTrayProps {
  bookmarkedArticles: NewsArticle[];
  isOpen: boolean;
  onClose: () => void;
  onSelectArticle: (article: NewsArticle) => void;
  onRemoveBookmark: (id: string, e?: any) => void;
}

export default function BookmarkTray({
  bookmarkedArticles,
  isOpen,
  onClose,
  onSelectArticle,
  onRemoveBookmark,
}: BookmarkTrayProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 flex justify-end animate-fade-in" onClick={onClose}>
      <div
        className="bg-[#fcfaf2] w-full max-w-sm h-full shadow-2xl overflow-hidden flex flex-col p-5 border-l border-[#eae4d3] relative newsprint-texture"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="flex justify-between items-center border-b border-[#eae4d3] pb-4 mb-4">
          <div className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-brand-red fill-current" />
            <h2 className="font-serif font-black text-lg text-[#1e1e1e]">
              বুকমার্কস তালিকা ({bookmarkedArticles.length})
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Saved List Articles */}
        <div className="overflow-y-auto flex-grow space-y-3 pr-1">
          {bookmarkedArticles.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#787161] font-sans">
              <div className="text-4xl mb-3">🔖</div>
              <p>আপনার বুকমার্ক তালিকায় কোনো খবর নেই।</p>
              <p className="text-xs text-[#a19a84] mt-1">খবর পড়ার সময় বুকমার্ক বাটন টিপে এখানে সংরক্ষণ করতে পারেন।</p>
            </div>
          ) : (
            bookmarkedArticles.map((art) => (
              <div
                key={art.id}
                onClick={() => {
                  onSelectArticle(art);
                  onClose();
                }}
                className="group border border-[#eae4d3] bg-white p-3 rounded hover:border-brand-red hover:shadow-sm cursor-pointer transition-all duration-200 flex gap-3 relative"
              >
                {/* Visual mini-thumbnail */}
                <div className="w-14 h-14 rounded-sm bg-gray-100 overflow-hidden shrink-0">
                  <img
                    src={art.imageUrl}
                    alt={art.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    loading="lazy"
                  />
                </div>

                <div className="flex-grow min-w-0">
                  <span className="text-[9px] text-[#787161] font-mono tracking-wider uppercase block">
                    {art.category}
                  </span>
                  <h3 className="font-serif font-bold text-xs text-[#1e1e1e] group-hover:text-brand-red transition-colors line-clamp-2 leading-snug">
                    {art.title}
                  </h3>
                  <span className="text-[10px] text-[#a19a84] font-mono block mt-1">
                    {art.source}
                  </span>
                </div>

                {/* Remove from bookmarks inline button */}
                <button
                  onClick={(e) => onRemoveBookmark(art.id, e)}
                  className="absolute bottom-2 right-2 p-1 text-gray-400 hover:text-red-600 rounded bg-gray-50/10 hover:bg-red-50 transition-colors"
                  title="বুকমার্ক সরান"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Offline notice */}
        <div className="border-t border-[#eae4d3] pt-4 text-[11px] font-sans text-[#787161] leading-relaxed text-center">
          💡 বুকমার্ক করা খবরগুলি আপনার ডিভাইসের লোকাল স্টোরেজে সুরক্ষিত থাকে। ফলে আপনি ইন্টারনেট সংযোগ না থাকলেও এগুলি অফলাইনে যেকোনো সময় পড়তে পারবেন।
        </div>
      </div>
    </div>
  );
}
