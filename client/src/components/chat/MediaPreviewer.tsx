import React, { useState } from 'react';
import { FileText, Download, X } from 'lucide-react';
import type { MessageType } from '../../types';

interface MediaPreviewerProps {
  type: MessageType;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
}

export const MediaPreviewer: React.FC<MediaPreviewerProps> = ({ type, fileUrl, fileName, fileSize }) => {
  const [showLightbox, setShowLightbox] = useState(false);

  if (!fileUrl) return null;

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (type === 'image') {
    return (
      <div className="mt-1 relative group rounded-lg overflow-hidden border border-black/5 dark:border-white/10 max-w-sm">
        <img
          src={fileUrl}
          alt={fileName || 'Attached Image'}
          className="w-full max-h-72 object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
          onClick={() => setShowLightbox(true)}
        />
        {showLightbox && (
          <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setShowLightbox(false)}>
            <button className="absolute top-4 right-4 text-white p-2 rounded-full bg-white/20 hover:bg-white/40">
              <X className="w-6 h-6" />
            </button>
            <img src={fileUrl} alt={fileName} className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" />
          </div>
        )}
      </div>
    );
  }

  if (type === 'video') {
    return (
      <div className="mt-1 rounded-lg overflow-hidden max-w-sm border border-black/10 dark:border-white/10">
        <video controls src={fileUrl} className="w-full max-h-72 object-cover rounded-lg" />
      </div>
    );
  }

  if (type === 'audio') {
    return (
      <div className="mt-1 flex items-center gap-3 p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 min-w-[240px]">
        <audio controls src={fileUrl} className="w-full h-8 accent-[#00a884]" />
      </div>
    );
  }

  if (type === 'pdf') {
    return (
      <div className="mt-1 flex items-center justify-between p-3 rounded-xl bg-red-500/10 border border-red-500/20 max-w-sm">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="p-2 rounded-lg bg-red-500 text-white font-bold text-xs uppercase">PDF</div>
          <div className="truncate">
            <p className="text-xs font-semibold truncate text-gray-800 dark:text-gray-200">{fileName || 'Document.pdf'}</p>
            <p className="text-[10px] text-gray-500">{formatBytes(fileSize)}</p>
          </div>
        </div>
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          download={fileName}
          className="p-2 rounded-lg bg-white/80 dark:bg-white/10 text-red-600 dark:text-red-400 hover:scale-105 transition-transform"
        >
          <Download className="w-4 h-4" />
        </a>
      </div>
    );
  }

  return (
    <div className="mt-1 flex items-center justify-between p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 max-w-sm">
      <div className="flex items-center gap-3 overflow-hidden">
        <div className="p-2 rounded-lg bg-emerald-600 text-white">
          <FileText className="w-4 h-4" />
        </div>
        <div className="truncate">
          <p className="text-xs font-semibold truncate text-gray-800 dark:text-gray-200">{fileName || 'Attachment'}</p>
          <p className="text-[10px] text-gray-500">{formatBytes(fileSize)}</p>
        </div>
      </div>
      <a
        href={fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        download={fileName}
        className="p-2 rounded-lg bg-white/80 dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:scale-105 transition-transform"
      >
        <Download className="w-4 h-4" />
      </a>
    </div>
  );
};
