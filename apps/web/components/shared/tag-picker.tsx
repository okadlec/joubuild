'use client';

import { useState, useCallback } from 'react';
import { X, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface TagPickerProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
}

export function TagPicker({ tags, onChange, suggestions = [], placeholder = 'Nový tag...' }: TagPickerProps) {
  const [newTag, setNewTag] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredSuggestions = suggestions.filter(
    s => s.toLowerCase().includes(newTag.toLowerCase()) && !tags.includes(s)
  );

  const handleAdd = useCallback(() => {
    const tag = newTag.trim();
    if (tag && !tags.includes(tag)) {
      onChange([...tags, tag]);
    }
    setNewTag('');
    setShowSuggestions(false);
  }, [newTag, tags, onChange]);

  const handleRemove = useCallback((tag: string) => {
    onChange(tags.filter(t => t !== tag));
  }, [tags, onChange]);

  const handleSelectSuggestion = useCallback((suggestion: string) => {
    if (!tags.includes(suggestion)) {
      onChange([...tags, suggestion]);
    }
    setNewTag('');
    setShowSuggestions(false);
  }, [tags, onChange]);

  return (
    <div>
      {tags.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {tags.map(tag => (
            <Badge key={tag} variant="secondary" className="gap-1">
              {tag}
              <button onClick={() => handleRemove(tag)} className="ml-0.5 hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <div className="relative">
        <div className="flex gap-1">
          <Input
            value={newTag}
            onChange={(e) => { setNewTag(e.target.value); setShowSuggestions(true); }}
            placeholder={placeholder}
            className="h-8 flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); handleAdd(); }
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          />
          <Button variant="outline" size="sm" className="h-8" onClick={handleAdd} disabled={!newTag.trim()}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
        {showSuggestions && newTag && filteredSuggestions.length > 0 && (
          <div className="absolute top-9 left-0 z-10 w-full rounded-md border bg-popover shadow-md">
            {filteredSuggestions.slice(0, 5).map(s => (
              <button
                key={s}
                className="w-full px-3 py-1.5 text-left text-sm hover:bg-accent"
                onMouseDown={() => handleSelectSuggestion(s)}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
