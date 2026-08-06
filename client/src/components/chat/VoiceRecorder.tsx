import React, { useState, useRef, useEffect } from 'react';
import { Mic, Trash2, Send } from 'lucide-react';
import { api } from '../../services/api';

interface VoiceRecorderProps {
  onRecorded: (fileData: { fileUrl: string; fileName: string; fileSize: number; mimeType: string; type: string }) => void;
  onCancel: () => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onRecorded, onCancel }) => {
  const [timerSec, setTimerSec] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);

  useEffect(() => {
    startRecording();
    return () => {
      stopTimer();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startTimer = () => {
    setTimerSec(0);
    timerIntervalRef.current = setInterval(() => {
      setTimerSec((prev) => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([audioBlob], `voice-note-${Date.now()}.webm`, { type: 'audio/webm' });

        setIsUploading(true);
        try {
          const res = await api.uploadFile(file);
          onRecorded(res);
        } catch (err) {
          console.error('Audio upload error:', err);
        } finally {
          setIsUploading(false);
        }
      };

      mediaRecorder.start();
      startTimer();
    } catch (err) {
      console.error('Microphone access denied:', err);
      alert('Microphone permission is required to record voice notes.');
      onCancel();
    }
  };

  const handleStopAndSend = () => {
    stopTimer();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="flex items-center gap-3 w-full bg-emerald-500/10 dark:bg-emerald-500/20 px-4 py-2 rounded-xl border border-emerald-500/30">
      <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold animate-pulse">
        <Mic className="w-5 h-5 animate-bounce" />
        <span className="text-sm font-mono">{formatTime(timerSec)}</span>
      </div>

      <div className="flex-1 flex items-center gap-1">
        <span className="text-xs text-gray-500 dark:text-gray-400">Recording voice note...</span>
      </div>

      <button
        onClick={onCancel}
        title="Discard Voice Note"
        className="p-2 rounded-full text-red-500 hover:bg-red-500/10 transition-colors"
      >
        <Trash2 className="w-5 h-5" />
      </button>

      <button
        onClick={handleStopAndSend}
        disabled={isUploading}
        title="Send Voice Note"
        className="flex items-center gap-1 bg-[#00a884] text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-[#008f70] transition-colors shadow-md disabled:opacity-50"
      >
        {isUploading ? 'Sending...' : <><Send className="w-4 h-4" /> Send</>}
      </button>
    </div>
  );
};
