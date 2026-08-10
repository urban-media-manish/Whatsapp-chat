import React, { useState } from 'react';
import { X, Send, Image as ImageIcon } from 'lucide-react';

interface PastedImageModalProps {
  file: File;
  previewUrl: string;
  onSend: (caption: string) => void;
  onCancel: () => void;
  isUploading?: boolean;
}

export const PastedImageModal: React.FC<PastedImageModalProps> = ({
  file,
  previewUrl,
  onSend,
  onCancel,
  isUploading
}) => {
  const [caption, setCaption] = useState('');

  const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSend(caption);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[#111b21] border border-gray-700/80 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 bg-[#202c33] border-b border-gray-700/60 flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-200">
            <ImageIcon className="w-5 h-5 text-[#00a884]" />
            <span className="text-sm font-bold">Pasted Screenshot Preview</span>
            <span className="text-xs text-gray-400 font-mono">({fileSizeMB} MB)</span>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Image Preview Canvas */}
        <div className="p-4 flex items-center justify-center bg-[#0b141a] min-h-[260px] max-h-[380px] overflow-hidden">
          <img
            src={previewUrl}
            alt="Pasted screenshot"
            className="max-h-[340px] w-auto max-w-full rounded-2xl object-contain shadow-md border border-gray-800"
          />
        </div>

        {/* Caption Input & Send Form */}
        <form onSubmit={handleSubmit} className="p-3 bg-[#202c33] border-t border-gray-700/60 flex items-center gap-2">
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Add a caption..."
            className="flex-1 bg-[#111b21] text-sm text-gray-100 placeholder-gray-400 rounded-full px-4 py-2.5 outline-none border border-transparent focus:border-[#00a884]"
            autoFocus
          />

          <button
            type="submit"
            disabled={isUploading}
            className="w-11 h-11 rounded-full bg-[#00a884] text-white hover:bg-[#008f70] transition-transform active:scale-95 flex items-center justify-center disabled:opacity-50 shadow-lg shrink-0"
            title="Send Image"
          >
            {isUploading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-5 h-5 ml-0.5" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
