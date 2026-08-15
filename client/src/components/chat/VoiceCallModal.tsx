import React, { useState, useEffect, useRef } from 'react';
import { PhoneOff, Mic, MicOff, Volume2, VolumeX, X, Shield, PhoneCall } from 'lucide-react';

interface VoiceCallModalProps {
  contactName: string;
  contactImage?: string;
  phoneNumber?: string;
  onClose: () => void;
}

export const VoiceCallModal: React.FC<VoiceCallModalProps> = ({
  contactName,
  contactImage,
  phoneNumber,
  onClose
}) => {
  const [callStatus, setCallStatus] = useState<'calling' | 'ringing' | 'connected' | 'ended'>('calling');
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(true);

  const audioContextRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<any>(null);

  // Synthesize realistic call ringing tone using Web Audio API
  useEffect(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioContextRef.current = new AudioCtx();
      }
    } catch (e) {
      console.warn('AudioContext error:', e);
    }

    const playRingtone = () => {
      if (!audioContextRef.current) return;
      try {
        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 1.2);
      } catch (err) {
        // ignore audio play restriction errors
      }
    };

    // Transition from calling -> ringing -> connected
    playRingtone();
    const t1 = setTimeout(() => {
      setCallStatus('ringing');
      playRingtone();
    }, 2000);

    const t2 = setTimeout(() => {
      setCallStatus('connected');
    }, 5500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Connected Timer
  useEffect(() => {
    if (callStatus === 'connected') {
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callStatus]);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleEndCall = () => {
    setCallStatus('ended');
    setTimeout(() => {
      onClose();
    }, 600);
  };

  const handleDirectDial = () => {
    if (phoneNumber) {
      window.open(`tel:${phoneNumber}`, '_self');
    } else {
      window.open('tel:+919876543210', '_self');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#000000]/90 backdrop-blur-3xl text-white flex flex-col justify-between p-6 sm:p-8 select-none animate-in fade-in duration-300">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/15 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Bar */}
      <div className="flex items-center justify-between z-10 pt-2 max-w-lg w-full mx-auto">
        <button
          onClick={handleEndCall}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 transition-colors backdrop-blur-md"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-3.5 py-1.5 rounded-full border border-emerald-500/20 backdrop-blur-md">
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          <span>FaceTime Audio • Encrypted</span>
        </div>

        <button
          onClick={handleDirectDial}
          title="Direct Phone Call"
          className="w-10 h-10 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 flex items-center justify-center text-emerald-400 transition-colors backdrop-blur-md border border-emerald-500/20"
        >
          <PhoneCall className="w-4 h-4" />
        </button>
      </div>

      {/* Main Avatar & Call Info */}
      <div className="flex flex-col items-center justify-center my-auto text-center z-10">
        <div className="relative mb-7">
          {(callStatus === 'ringing' || callStatus === 'calling') && (
            <>
              <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping duration-1000" />
              <div className="absolute -inset-4 rounded-full border border-blue-400/30 animate-pulse" />
            </>
          )}

          <img
            src={
              contactImage ||
              'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80'
            }
            alt={contactName}
            className="w-28 h-28 sm:w-36 sm:h-36 rounded-full object-cover border-2 border-white/20 shadow-[0_12px_40px_rgba(0,0,0,0.8)] relative z-10 ring-4 ring-white/10"
          />
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
          {contactName}
        </h2>

        <p className="text-sm font-medium tracking-wide text-white/70">
          {callStatus === 'calling' && 'Connecting...'}
          {callStatus === 'ringing' && 'Ringing...'}
          {callStatus === 'connected' && (
            <span className="text-emerald-400 font-mono tracking-wider font-semibold">
              {formatTimer(duration)}
            </span>
          )}
          {callStatus === 'ended' && 'Call Ended'}
        </p>

        {phoneNumber && (
          <p className="text-xs text-white/40 font-mono mt-1 tracking-wider">{phoneNumber}</p>
        )}
      </div>

      {/* iOS Call Control Floating Capsule */}
      <div className="flex flex-col items-center gap-5 z-10 max-w-sm w-full mx-auto pb-4">
        <div className="w-full bg-white/10 backdrop-blur-2xl p-4 rounded-[28px] border border-white/10 flex items-center justify-around shadow-2xl">
          {/* Mute Button */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`w-14 h-14 rounded-full flex flex-col items-center justify-center transition-all ${
              isMuted
                ? 'bg-white text-black shadow-lg scale-105'
                : 'bg-white/10 hover:bg-white/20 text-white active:scale-95'
            }`}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* End Call Button */}
          <button
            onClick={handleEndCall}
            className="w-16 h-16 rounded-full bg-[#ff3b30] hover:bg-[#ff453a] text-white flex items-center justify-center shadow-lg shadow-red-600/40 active:scale-95 transition-all"
          >
            <PhoneOff className="w-7 h-7" />
          </button>

          {/* Speaker Button */}
          <button
            onClick={() => setIsSpeaker(!isSpeaker)}
            className={`w-14 h-14 rounded-full flex flex-col items-center justify-center transition-all ${
              isSpeaker
                ? 'bg-white text-black shadow-lg scale-105'
                : 'bg-white/10 hover:bg-white/20 text-white active:scale-95'
            }`}
          >
            {isSpeaker ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
        </div>

        {/* Direct Phone Dial */}
        <button
          onClick={handleDirectDial}
          className="text-[12px] font-medium text-white/50 hover:text-white transition-colors"
        >
          Switch to cellular line 📞
        </button>
      </div>
    </div>
  );
};
