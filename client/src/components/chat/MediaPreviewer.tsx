import React, { useState, useRef, useEffect } from 'react';
import { FileText, Download, X, Play, Pause, Volume2 } from 'lucide-react';
import type { MessageType } from '../../types';

const WhatsAppAudioPlayer: React.FC<{ src: string }> = ({ src }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const speeds = [1, 1.5, 2];

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration || 0);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const cycleSpeed = () => {
    const nextIdx = (speeds.indexOf(speed) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    setSpeed(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="my-1.5 p-2.5 rounded-2xl bg-black/5 dark:bg-white/10 border border-black/5 dark:border-white/10 flex items-center gap-3 min-w-[220px] max-w-xs shadow-xs">
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Play/Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        className="w-9 h-9 rounded-full bg-[#00a884] text-white flex items-center justify-center hover:scale-105 transition-transform flex-shrink-0 shadow-sm"
      >
        {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
      </button>

      {/* Waveform & Duration Slider */}
      <div className="flex-1 flex flex-col justify-center gap-1">
        <div className="relative w-full h-1.5 bg-black/10 dark:bg-white/20 rounded-full overflow-hidden cursor-pointer"
             onClick={(e) => {
               if (!audioRef.current || !duration) return;
               const rect = e.currentTarget.getBoundingClientRect();
               const clickX = e.clientX - rect.left;
               const newTime = (clickX / rect.width) * duration;
               audioRef.current.currentTime = newTime;
               setCurrentTime(newTime);
             }}>
          <div
            className="h-full bg-[#00a884] rounded-full transition-all duration-100"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="flex justify-between items-center text-[10px] text-gray-500 dark:text-gray-400 font-medium">
          <span>{formatTime(currentTime)}</span>
          <span className="flex items-center gap-1">
            <Volume2 className="w-3 h-3 text-[#00a884]" />
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Speed Multiplier Pill (1x / 1.5x / 2x) */}
      <button
        type="button"
        onClick={cycleSpeed}
        title="Playback Speed"
        className="px-2 py-1 rounded-full bg-[#00a884]/15 text-[#00a884] dark:text-emerald-400 text-[11px] font-bold hover:bg-[#00a884]/25 transition-colors flex-shrink-0"
      >
        {speed}x
      </button>
    </div>
  );
};

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
    return <WhatsAppAudioPlayer src={fileUrl} />;
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
