/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: 'entertainment' | 'television' | 'national' | 'international';
  publishedAt: string;
  imagePrompt: string;
  imageUrl: string;
  source: string;
  sourceUrl?: string;
  isAiGenerated: boolean;
  groundedSearchUrl?: string;
}

export interface UserPreferences {
  categoryViews: Record<string, number>;
  bookmarkedIds: string[];
}

export interface WeatherData {
  temp: number;
  condition: string;
  city: string;
}
