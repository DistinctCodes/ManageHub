'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { useGlobalSearch } from '@/lib/react-query/hooks/search/useGlobalSearch';
import { useDebounce } from '@/hooks/useDebounce';
import Link from 'next/link';

const GlobalSearch = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const { data, isLoading } = useGlobalSearch(debouncedQuery, '');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    const storedRecents = localStorage.getItem('recent_searches');
    if (storedRecents) {
      setRecentSearches(JSON.parse(storedRecents));
    }
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        setIsOpen((prev) => !prev);
      } else if (event.key === 'Escape') {
        setIsOpen(false);
      }
    },
    [],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const handleSelect = (href: string) => {
    setIsOpen(false);
    const updatedRecents = [query, ...recentSearches.filter((s) => s !== query)].slice(0, 5);
    setRecentSearches(updatedRecents);
    localStorage.setItem('recent_searches', JSON.stringify(updatedRecents));
  };

  if (!isOpen) {
    return null;
  }

  const results = data?.results || [];
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) {
      acc[result.type] = [];
    }
    acc[result.type].push(result);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center pt-20">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-xl">
        <div className="p-4 border-b">
          <div className="flex items-center">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search for anything..."
              className="w-full ml-2 bg-transparent focus:outline-none"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            <button onClick={() => setIsOpen(false)}>
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>
        <div className="p-4 max-h-96 overflow-y-auto">
          {query === '' && recentSearches.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Recent Searches</h3>
              <ul>
                {recentSearches.map((search, i) => (
                  <li key={i}>
                    <button
                      className="w-full text-left p-2 hover:bg-gray-100 rounded-md"
                      onClick={() => setQuery(search)}
                    >
                      {search}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {isLoading && <div className="text-center p-4">Searching...</div>}
          {Object.keys(groupedResults).map((type) => (
            <div key={type}>
              <h3 className="text-xs font-semibold text-gray-500 uppercase mt-4 mb-2">{type}</h3>
              <ul>
                {groupedResults[type].map((item) => (
                  <li key={item.id}>
                    <Link href={item.href} onClick={() => handleSelect(item.href)}>
                      <div className="p-2 hover:bg-gray-100 rounded-md">
                        <div className="font-medium">{item.title}</div>
                        <div className="text-sm text-gray-500">{item.subtitle}</div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GlobalSearch;