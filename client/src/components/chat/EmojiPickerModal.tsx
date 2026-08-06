import React from 'react';
import { motion } from 'framer-motion';

const EMOJI_CATEGORIES = [
  { name: 'Frequently Used', emojis: ['👍', '❤️', '😂', '🔥', '🙏', '😍', '🎉', '😊', '😭', '😮'] },
  { name: 'Smileys', emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😋'] },
  { name: 'Gestures', emojis: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎'] },
  { name: 'Hearts & Symbols', emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '⭐', '✨'] }
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export const EmojiPickerModal: React.FC<EmojiPickerProps> = ({ onSelect, onClose }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      className="absolute bottom-16 left-4 z-50 w-80 max-h-96 overflow-y-auto rounded-2xl bg-white dark:bg-[#202c33] shadow-2xl border border-gray-200 dark:border-gray-700/60 p-4"
    >
      <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-700 mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Select Emoji</span>
        <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕ Close</button>
      </div>

      {EMOJI_CATEGORIES.map((cat) => (
        <div key={cat.name} className="mb-3">
          <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 mb-1.5">{cat.name}</p>
          <div className="grid grid-cols-7 gap-1">
            {cat.emojis.map((emoji, idx) => (
              <button
                key={idx}
                onClick={() => {
                  onSelect(emoji);
                  onClose();
                }}
                className="w-9 h-9 flex items-center justify-center text-xl rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-transform active:scale-125"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      ))}
    </motion.div>
  );
};
