'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';

interface MentionUser {
  id: string;
  name: string;
  email?: string;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  users: MentionUser[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function MentionInput({
  value,
  onChange,
  onSubmit,
  users,
  placeholder = 'Napište komentář...',
  className = '',
  disabled = false,
}: MentionInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<MentionUser[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStart, setMentionStart] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const updateSuggestions = useCallback((query: string) => {
    const q = query.toLowerCase();
    const filtered = users.filter(u =>
      u.name.toLowerCase().includes(q) || (u.email && u.email.toLowerCase().includes(q))
    );
    setSuggestions(filtered.slice(0, 5));
    setSelectedIndex(0);
  }, [users]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newValue = e.target.value;
    onChange(newValue);

    // Detect @ trigger
    const cursorPos = e.target.selectionStart || 0;
    const textBeforeCursor = newValue.slice(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf('@');

    if (atIndex >= 0 && (atIndex === 0 || textBeforeCursor[atIndex - 1] === ' ')) {
      const query = textBeforeCursor.slice(atIndex + 1);
      if (!query.includes(' ')) {
        setMentionStart(atIndex);
        setMentionQuery(query);
        updateSuggestions(query);
        setShowSuggestions(true);
        return;
      }
    }

    setShowSuggestions(false);
  }

  function handleSelect(user: MentionUser) {
    if (mentionStart < 0) return;
    const before = value.slice(0, mentionStart);
    const cursorPos = inputRef.current?.selectionStart || value.length;
    const after = value.slice(cursorPos);
    const newValue = `${before}@${user.name} ${after}`;
    onChange(newValue);
    setShowSuggestions(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, suggestions.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        handleSelect(suggestions[selectedIndex]);
        return;
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      onSubmit();
    }
  }

  return (
    <div className="relative flex-1">
      <Input
        ref={inputRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
      />

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute bottom-full left-0 z-50 mb-1 w-full rounded-md border bg-popover shadow-md">
          {suggestions.map((user, i) => (
            <div
              key={user.id}
              className={`cursor-pointer px-3 py-2 text-sm ${
                i === selectedIndex ? 'bg-accent' : 'hover:bg-muted'
              }`}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(user); }}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              <span className="font-medium">{user.name}</span>
              {user.email && (
                <span className="ml-2 text-xs text-muted-foreground">{user.email}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
