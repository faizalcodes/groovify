import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Search, X, Clock, Music } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchSuggestion {
  type: 'track' | 'artist';
  text: string;
  track_name?: string;
  artist?: string;
  song_id?: string;
}

interface SearchBarProps {
  onSearch: (query: string) => void;
  suggestions?: SearchSuggestion[];
  isLoading?: boolean;
  onSuggestionClick?: (suggestion: SearchSuggestion) => void;
  placeholder?: string;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  suggestions = [],
  isLoading = false,
  onSuggestionClick,
  placeholder = "Search for songs, artists, or albums...",
  className
}) => {
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load recent searches from localStorage
    const saved = localStorage.getItem('groovify-recent-searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load recent searches:', e);
      }
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (searchQuery: string) => {
    if (searchQuery.trim()) {
      // Add to recent searches
      const newRecentSearches = [
        searchQuery,
        ...recentSearches.filter(s => s !== searchQuery)
      ].slice(0, 5);
      
      setRecentSearches(newRecentSearches);
      localStorage.setItem('groovify-recent-searches', JSON.stringify(newRecentSearches));
      
      onSearch(searchQuery);
      setShowSuggestions(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setShowSuggestions(value.length > 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch(query);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      inputRef.current?.blur();
    }
  };

  const clearQuery = () => {
    setQuery('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('groovify-recent-searches');
  };

  return (
    <div ref={containerRef} className={cn("relative w-full max-w-2xl mx-auto", className)}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(query.length > 0 || recentSearches.length > 0)}
          className={cn(
            "pl-10 pr-12 h-12 bg-background-secondary border-border/50",
            "focus:border-primary/50 focus:ring-primary/20 focus:shadow-primary/20",
            "placeholder:text-muted-foreground transition-all duration-200"
          )}
        />
        
        {query && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearQuery}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
          </div>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && (
        <Card className="absolute top-full left-0 right-0 mt-2 z-50 bg-background-secondary/95 backdrop-blur-lg border border-border/50 shadow-card overflow-hidden">
          <div className="max-h-80 overflow-y-auto">
            {/* Recent Searches */}
            {query.length === 0 && recentSearches.length > 0 && (
              <div className="p-4 border-b border-border/30">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Recent Searches
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearRecentSearches}
                    className="text-muted-foreground hover:text-foreground text-xs"
                  >
                    Clear
                  </Button>
                </div>
                <div className="space-y-1">
                  {recentSearches.map((search, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setQuery(search);
                        handleSearch(search);
                      }}
                      className="w-full text-left px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                    >
                      {search}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Live Suggestions */}
            {query.length > 0 && suggestions.length > 0 && (
              <div className="p-2">
                <h4 className="text-sm font-medium text-foreground px-2 py-2 flex items-center gap-2">
                  <Music className="h-4 w-4" />
                  Suggestions
                </h4>
                <div className="space-y-1">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        if (onSuggestionClick) {
                          onSuggestionClick(suggestion);
                        } else {
                          setQuery(suggestion.text);
                          handleSearch(suggestion.text);
                        }
                      }}
                      className="w-full text-left px-3 py-2 rounded-md hover:bg-accent/50 transition-colors group"
                    >
                      <div className="flex items-center space-x-3">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-xs",
                          suggestion.type === 'track' 
                            ? "bg-primary/20 text-primary" 
                            : "bg-secondary/20 text-secondary"
                        )}>
                          {suggestion.type === 'track' ? '♪' : '👤'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground group-hover:text-primary transition-colors truncate">
                            {suggestion.type === 'track' ? suggestion.track_name : suggestion.artist}
                          </p>
                          {suggestion.type === 'track' && suggestion.artist && (
                            <p className="text-xs text-muted-foreground truncate">
                              by {suggestion.artist}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* No Results */}
            {query.length > 0 && suggestions.length === 0 && !isLoading && (
              <div className="p-4 text-center text-muted-foreground">
                <Music className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No suggestions found</p>
                <p className="text-xs">Try searching for something else</p>
              </div>
            )}

            {/* Search Action */}
            {query.length > 0 && (
              <div className="border-t border-border/30 p-2">
                <button
                  onClick={() => handleSearch(query)}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-primary/10 transition-colors group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <Search className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                      Search for "<span className="font-medium">{query}</span>"
                    </span>
                  </div>
                </button>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};