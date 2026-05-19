import { useState } from 'react';

export interface WikiInfo {
  title: string;
  description: string;
  extract: string;
  thumbnail?: {
    source: string;
    width: number;
    height: number;
  };
  content_urls: {
    desktop: {
      page: string;
    };
  };
}

export function useWikiSearch() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchWiki = async (query: string, lang = 'zh'): Promise<WikiInfo | null> => {
    setLoading(true);
    setError(null);
    try {
      // Step 1: Search for the best matching page title
      const searchRes = await fetch(
        `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
          query
        )}&utf8=&format=json&origin=*`
      );
      if (!searchRes.ok) throw new Error('Wiki search failed');
      const searchData = await searchRes.json();
      
      const searchResults = searchData.query?.search;
      if (!searchResults || searchResults.length === 0) {
        setLoading(false);
        return null;
      }
      
      // Filter out weird unrelated matches for strictness
      // Wikipedia sometimes returns completely unrelated phonetic matches at index 0.
      let bestTitle = searchResults[0].title;
      const queryMatches = searchResults.filter((r: any) => 
        r.title.includes(query) || query.includes(r.title)
      );
      if (queryMatches.length > 0) {
        bestTitle = queryMatches[0].title;
      }

      // Step 2: Fetch the page summary
      const summaryRes = await fetch(
        `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(bestTitle)}`
      );
      if (!summaryRes.ok) throw new Error('Wiki summary failed');
      const summaryData = await summaryRes.json();
      
      setLoading(false);
      return summaryData as WikiInfo;
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Unknown error fetching wiki');
      setLoading(false);
      return null;
    }
  };

  return { searchWiki, loading, error };
}
