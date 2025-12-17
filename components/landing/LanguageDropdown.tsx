import React, { useState, useRef, useEffect } from 'react';

const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिंदी' },
  { code: 'bn', label: 'Bengali', native: 'বাংলা' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
];

interface LanguageDropdownProps {
  language: string;
  onChange: (code: string) => void;
}

export const LanguageDropdown: React.FC<LanguageDropdownProps> = ({ language, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedLang = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Select language"
        className="group flex h-12 min-w-[140px] cursor-pointer items-center justify-between rounded-full border-2 border-white/30 dark:border-gray-700/50 bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl px-4 transition-all duration-300 hover:border-primary hover:shadow-lg hover:shadow-primary/10 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">language</span>
          <span className="text-base font-bold text-text-main dark:text-white group-hover:text-primary transition-colors">
            {selectedLang.label}
          </span>
        </div>
        <span className={`material-symbols-outlined text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
          expand_more
        </span>
      </button>

      {isOpen && (
        <div 
          role="listbox"
          aria-label="Language options"
          className="absolute right-0 mt-2 w-48 rounded-2xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-white/30 dark:border-gray-700/50 shadow-xl shadow-black/10 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              role="option"
              aria-selected={lang.code === language}
              onClick={() => {
                onChange(lang.code);
                setIsOpen(false);
              }}
              className={`w-full px-4 py-3 text-left flex items-center justify-between transition-colors ${
                lang.code === language
                  ? 'bg-primary/10 text-primary'
                  : 'text-text-main dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700/50'
              }`}
            >
              <span className="font-medium">{lang.label}</span>
              <span className="text-sm text-text-muted dark:text-gray-400">{lang.native}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
