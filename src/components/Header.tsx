/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { Cloud, Sun, CloudRain, CloudSnow, Calendar, TrendingUp, Info, X, Lock, Unlock } from 'lucide-react';
import { WeatherData } from '../types';

interface HeaderProps {
  breakingNews: string[];
  onSelectArticleByTitle: (title: string) => void;
  isOfflineMode?: boolean;
  isAdminMode: boolean;
  onToggleAdmin: () => void;
}

export default function Header({
  breakingNews,
  onSelectArticleByTitle,
  isOfflineMode,
  isAdminMode,
  onToggleAdmin,
}: HeaderProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [bengaliDate, setBengaliDate] = useState('');
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [selectedNarrativeOption, setSelectedNarrativeOption] = useState<1 | 2 | 3>(1);

  // Fetch Weather information
  useEffect(() => {
    fetch('/api/weather')
      .then((res) => res.json())
      .then((data) => setWeather(data))
      .catch(() => {
        setWeather({ temp: 31, condition: 'আংশিক মেঘলা', city: 'কলকাতা' });
      });
  }, []);

  // Format real-time Bengali date
  useEffect(() => {
    const months = [
      'জানুয়ারী', 'ফেব্রুয়ারী', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
      'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
    ];
    const days = [
      'রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'
    ];
    
    const translateDigits = (n: number | string): string => {
      const numerals: Record<string, string> = {
        '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
        '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯'
      };
      return String(n).split('').map(d => numerals[d] || d).join('');
    };

    const d = new Date();
    const dayName = days[d.getDay()];
    const dateNum = translateDigits(d.getDate());
    const monthName = months[d.getMonth()];
    const yearNum = translateDigits(d.getFullYear());

    setBengaliDate(`${dayName}, ${dateNum} ${monthName}, ${yearNum}`);
  }, []);

  const getWeatherIcon = (cond: string) => {
    if (cond.includes('বৃষ্টি')) return <CloudRain className="w-5 h-5 text-sky-600 animate-pulse" />;
    if (cond.includes('তুষার')) return <CloudSnow className="w-5 h-5 text-sky-200 animate-spin" />;
    if (cond.includes('মেঘলা')) return <Cloud className="w-5 h-5 text-gray-400 animate-bounce" />;
    return <Sun className="w-5 h-5 text-amber-500 animate-spin" style={{ animationDuration: '20s' }} />;
  };

  const translateDigits = (n: number | string): string => {
    const numerals: Record<string, string> = {
      '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
      '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯'
    };
    return String(n).split('').map(d => numerals[d] || d).join('');
  };

  return (
    <header className="w-full border-b-4 border-brand-red bg-white sticky top-0 z-30 shadow-sm">
      {/* Top Banner stats and weather */}
      <div className="bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-col sm:flex-row justify-between items-center text-xs font-mono text-slate-500">
          <div className="flex items-center gap-2 mb-2 sm:mb-0">
            <Calendar className="w-4 h-4 text-brand-red" />
            <span className="font-semibold text-slate-700">{bengaliDate || 'আজকের খবর'}</span>
            <span className="hidden md:inline px-1 border-l border-slate-200"></span>
            {isOfflineMode ? (
              <span className="hidden md:inline text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded font-bold border border-emerald-100 uppercase tracking-wider animate-pulse font-sans">
                ● অফলাইন মোড সক্রিয়
              </span>
            ) : (
              <span className="hidden md:inline text-[10px] text-blue-800 bg-blue-50 px-2 py-0.5 rounded font-bold border border-blue-100 uppercase tracking-wider">
                ● এআই-সম্পাদকীয় মোড সক্রিয়
              </span>
            )}
          </div>

          {weather && (
            <div className="flex items-center gap-2 bg-white px-2.5 py-1 rounded border border-slate-200 shadow-xs">
              {getWeatherIcon(weather.condition)}
              <span className="font-bold text-slate-800">{weather.city}:</span>
              <span className="text-slate-900 font-semibold">{translateDigits(weather.temp)}°C</span>
              <span className="border-l border-slate-200 pl-1.5 text-[11px] font-sans text-slate-500">
                {weather.condition}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Newspaper Masthead */}
      <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 text-center sm:text-left w-full justify-between">
          <h1 
            onDoubleClick={onToggleAdmin}
            className="text-4xl sm:text-5xl font-black tracking-tighter text-brand-red font-serif select-none cursor-pointer hover:opacity-95 active:scale-99 transition-all duration-200"
            title="বাংলা খবর (ডাবল ক্লিকের মাধ্যমে এডমিন মোড সক্রিয় করুন)"
          >
            বাংলা খবর
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsInfoOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 hover:text-slate-950 rounded-xl text-xs sm:text-sm font-sans font-bold cursor-pointer transition-all duration-200 border border-slate-200 active:scale-95 shadow-2xs"
              title="অ্যাপের বিস্তারিত ও এআই ও ওভাররাইড সিস্টেম সম্পর্কে জানুন"
            >
              <Info className="w-4 h-4 text-brand-red" />
              <span>অ্যাপ পরিচিতি (About App)</span>
            </button>

            {isAdminMode && (
              <button
                onClick={onToggleAdmin}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-sans font-bold cursor-pointer transition-all duration-200 border active:scale-95 shadow-2xs bg-amber-500 hover:bg-amber-600 border-amber-600 text-white shadow-md"
                title="অ্যাডমিন মোড বন্ধ করতে ক্লিক করুন"
              >
                <Unlock className="w-4 h-4 text-amber-100 animate-pulse" />
                <span>অ্যাডমিন মোড (সক্রিয়)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* About App Info Modal */}
      {isInfoOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-55 animate-fade-in text-slate-800">
          <div className="bg-white rounded-2xl border-2 border-slate-800 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl relative animate-scale-up">
            
            {/* Modal Header */}
            <div className="border-b-2 border-slate-100 px-6 py-4 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📱</span>
                <h2 className="font-serif font-black text-xl text-slate-900 tracking-tight">
                  বাংলা খবর (Bangla Khobor)
                </h2>
              </div>
              <button 
                onClick={() => setIsInfoOpen(false)}
                className="p-1 px-2.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer text-xs font-sans font-bold flex items-center gap-1"
              >
                <X className="w-4 h-4" />
                <span>বন্ধ করুন</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 font-sans text-slate-700 text-sm leading-relaxed">
              
              {/* Curation Identity & Style Toggle */}
              <div className="bg-slate-50 border-2 border-slate-800 rounded-xl p-4 space-y-3.5">
                <div className="flex flex-col gap-1">
                  <h4 className="font-serif font-black text-slate-950 flex items-center gap-1.5 text-sm">
                    📢 Editorial Style Toggle / আমাদের দৃষ্টিভঙ্গি
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-sans select-none">
                    We value authentic human curation. Please select from the original design options below to preview our trust philosophy:
                  </p>
                </div>
                
                {/* 3 tabs */}
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-200/60 rounded-xl select-none">
                  <button
                    onClick={() => setSelectedNarrativeOption(1)}
                    className={`text-center py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      selectedNarrativeOption === 1
                        ? 'bg-brand-red text-white shadow-xs scale-[1.01]'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                    }`}
                  >
                    Option 1: Minimal
                  </button>
                  <button
                    onClick={() => setSelectedNarrativeOption(2)}
                    className={`text-center py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      selectedNarrativeOption === 2
                        ? 'bg-brand-red text-white shadow-xs scale-[1.01]'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                    }`}
                  >
                    Option 2: Punchy
                  </button>
                  <button
                    onClick={() => setSelectedNarrativeOption(3)}
                    className={`text-center py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      selectedNarrativeOption === 3
                        ? 'bg-brand-red text-white shadow-xs scale-[1.01]'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                    }`}
                  >
                    Option 3: Professional
                  </button>
                </div>

                {/* Render Selected Option Content */}
                <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2 shadow-3xs transition-all duration-200">
                  {selectedNarrativeOption === 1 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] bg-sky-50 text-sky-800 border border-sky-200 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">
                          Option 1: Clean & Minimalist
                        </span>
                        <span className="text-[9px] text-slate-400 font-serif font-black">100% Genuine</span>
                      </div>
                      <h5 className="font-serif font-black text-sm text-slate-950 leading-snug">
                        Authentic News, Hand-Picked Images.
                      </h5>
                      <p className="text-xs text-slate-600 leading-relaxed font-sans">
                        Welcome to a platform built on genuine human effort. Every single news story featured here is personally researched and added by me, and every image is carefully selected to match. No automated algorithms, no AI-generated filler—just real content curated by a real person.
                      </p>
                    </div>
                  )}

                  {selectedNarrativeOption === 2 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">
                          Option 2: Short & Punchy
                        </span>
                        <span className="text-[9px] text-slate-400 font-serif font-black">No AI-Automation</span>
                      </div>
                      <h5 className="font-serif font-black text-sm text-slate-950 leading-snug">
                        100% Human-Curated Content
                      </h5>
                      <p className="text-xs text-slate-600 leading-relaxed font-sans">
                        Every news update and image on this platform is manually selected and uploaded by me. I believe in delivering authentic information with a personal touch, completely free from AI automation.
                      </p>
                    </div>
                  )}

                  {selectedNarrativeOption === 3 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">
                          Option 3: Professional & Trust-Focused
                        </span>
                        <span className="text-[9px] text-slate-400 font-serif font-black">Intentional & Human</span>
                      </div>
                      <h5 className="font-serif font-black text-sm text-slate-950 leading-snug">
                        Real Insights. Human Editing.
                      </h5>
                      <p className="text-xs text-slate-600 leading-relaxed font-sans">
                        In a world driven by automated feeds, this platform chooses a different path. All news articles and accompanying visuals are manually sourced, verified, and uploaded by myself. By keeping AI out of the editorial process, I ensure that every piece of content you see is intentional, authentic, and truly human.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Introduction */}
              <div className="space-y-2 border-b border-slate-100 pb-4">
                <h3 className="font-serif font-black text-lg text-brand-red">
                  আপনার নির্ভরযোগ্য হ্যান্ডপিকড নিউজ অ্যাপ
                </h3>
                <p className="text-slate-800 font-medium">
                  স্বাগতম বাংলা খবর-এ! Experience a deeply curated and premium news platform designed for the modern Bengali reader. বাংলা খবর moves away from chaotic, automated algorithms to bring you a trusted, high-quality reading experience where every single story and image is personally selected and uploaded for ultimate accuracy.
                </p>
              </div>

              {/* The Power of Personal Curation */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
                <h4 className="font-bold text-slate-900 flex items-center gap-2">
                  ✨ The Power of Personal Curation:
                </h4>
                <p className="text-xs sm:text-sm text-slate-600">
                  In a world full of fake news and mismatched AI photos, বাংলা খবর stands out. Every major news headline is carefully verified, translated, and formatted into beautiful Bengali. Furthermore, every single article is paired with a perfectly matched, high-resolution image chosen explicitly to fit the story. This ensures a clean, accurate, and premium newspaper experience right on your screen.
                </p>
              </div>

              {/* News Categories */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 border-l-4 border-l-brand-red pl-2">
                  🌟 Key News Categories We Cover:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                  <div className="p-3 border border-slate-100 rounded-lg hover:bg-slate-50/50 transition-colors">
                    <span className="font-bold text-slate-800">🎮 বিনোদন ও খেলাধুলা (Entertainment & Play)</span>
                    <p className="text-slate-500 text-xs mt-1">Handpicked updates from Tollywood, Bollywood, cricket highlights, sports matches, and trending celebrity news.</p>
                  </div>
                  <div className="p-3 border border-slate-100 rounded-lg hover:bg-slate-50/50 transition-colors">
                    <span className="font-bold text-slate-800">📺 টেলিভিশন (Television)</span>
                    <p className="text-slate-500 text-xs mt-1">Personally curated news from your favorite mega-serials, top reality shows, TV stars, and daily broadcast highlights.</p>
                  </div>
                  <div className="p-3 border border-slate-100 rounded-lg hover:bg-slate-50/50 transition-colors">
                    <span className="font-bold text-slate-800">🇮🇳 জাতীয় খবর (National News)</span>
                    <p className="text-slate-500 text-xs mt-1">Verified and trusted national headlines covering politics, economy, and major breaking events from all across India.</p>
                  </div>
                  <div className="p-3 border border-slate-100 rounded-lg hover:bg-slate-50/50 transition-colors">
                    <span className="font-bold text-slate-800">🌎 আন্তর্জাতিক (International Affairs)</span>
                    <p className="text-slate-500 text-xs mt-1">Important global news, world politics, and international breakthroughs delivered directly to the Bengali community.</p>
                  </div>
                </div>
              </div>

              {/* Curated Features */}
              <div className="space-y-3 bg-red-50/50 border border-red-100 rounded-xl p-4">
                <h4 className="font-bold text-brand-red flex items-center gap-1.5">
                  🚀 Key Features of Our Curated App:
                </h4>
                <ul className="space-y-2 text-xs sm:text-sm">
                  <li>
                    <strong>100% Accurate & Verified:</strong> Because every news item is personally added, you get zero spam, zero clickbait, and completely reliable information.
                  </li>
                  <li>
                    <strong>Perfect Image Matching:</strong> No wrong or confusing visuals! Every news story features a carefully selected, crystal-clear image that perfectly represents the event.
                  </li>
                  <li>
                    <strong>Pure, Lucid Bengali:</strong> Articles are written and formatted in smooth, easy-to-read Bengali, making it accessible for readers of all age groups.
                  </li>
                  <li>
                    <strong>Completely Free Access:</strong> Enjoy a premium, editor-curated daily news feed with absolutely zero subscription fees or hidden costs.
                  </li>
                </ul>
              </div>

              {/* Premium App Design */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 border-l-4 border-l-slate-800 pl-2">
                  💎 Premium App Design Built for You:
                </h4>
                <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm text-slate-600 pl-1">
                  <li><strong>Super Fast & Lightweight:</strong> Highly optimized to load articles and rich visuals instantly, saving your phone memory and internet data.</li>
                  <li><strong>Clean, Minimalist UI:</strong> Enjoy a beautiful, distraction-free reading experience inspired by elite global news platforms like Anandabazar.</li>
                  <li><strong>Save & Share:</strong> Bookmark your favorite stories to read later and share breaking news instantly with your family and friends on WhatsApp and Facebook.</li>
                </ul>
              </div>

              {/* Bottom Call to action banner */}
              <div className="border-t border-slate-100 pt-4 text-center">
                <p className="font-serif font-black text-sm text-slate-800">
                  Download বাংলা খবর today and enjoy a news feed crafted with care, precision, and visual perfection!
                </p>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-100 px-6 py-4 flex justify-end bg-slate-50">
              <button 
                onClick={() => setIsInfoOpen(false)}
                className="bg-brand-red hover:bg-brand-red-dark text-white font-sans text-xs sm:text-sm font-black py-2.5 px-6 rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
              >
                ঠিক আছে, বুঝতে পেরেছি
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Breaking News Marquee */}
      {breakingNews.length > 0 && (
        <div className="bg-brand-red text-white py-2 flex items-center overflow-hidden h-9">
          <div className="bg-brand-red-dark px-4 py-1.5 skew-x-12 z-10 flex items-center gap-1.5 shrink-0 select-none shadow-md">
            <TrendingUp className="w-4 h-4 text-white" />
            <span className="text-[11px] sm:text-xs font-sans font-black tracking-wider uppercase">ব্রেকিং নিউজ:</span>
          </div>

          <div className="relative flex items-center overflow-hidden w-full whitespace-nowrap">
            <div className="animate-[marquee_30s_linear_infinite] hover:[animation-play-state:paused] flex gap-12 font-sans text-xs sm:text-sm font-medium pr-12 cursor-pointer">
              {breakingNews.map((item, idx) => (
                <span
                  key={idx}
                  onClick={() => onSelectArticleByTitle(item)}
                  className="hover:underline transition-colors decoration-white/70"
                >
                  🔥 {item}
                </span>
              ))}
              {/* Duplicate for seamless looping */}
              {breakingNews.map((item, idx) => (
                <span
                  key={`dup-${idx}`}
                  onClick={() => onSelectArticleByTitle(item)}
                  className="hover:underline transition-colors decoration-white/70"
                >
                  🔥 {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CSS For Seamless Marquee Loop */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </header>
  );
}
