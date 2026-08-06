import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useChatStore } from '../../store/useChatStore';

export const ThemeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { theme, toggleTheme } = useChatStore();

  return (
    <button
      onClick={toggleTheme}
      title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
      className={`p-2 rounded-full transition-colors hover:bg-black/10 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 ${className}`}
    >
      {theme === 'dark' ? (
        <Sun className="w-5 h-5 text-amber-400 hover:rotate-45 transition-transform duration-300" />
      ) : (
        <Moon className="w-5 h-5 text-indigo-600 hover:-rotate-12 transition-transform duration-300" />
      )}
    </button>
  );
};
