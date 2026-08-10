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
    }, 800);
  };

  const handleDirectDial = () => {
    if (phoneNumber) {
      window.open(`tel:${phoneNumber}`, '_self');
    } else {
      window.open('tel:+919876543210', '_self');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#075e54] text-white flex flex-col justify-between p-6 select-none animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex items-center justify-between z-10 pt-2">
        <button
          onClick={handleEndCall}
          className="p-2 rounded-full hover:bg-white/10 text-white/80 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-1 text-xs font-semibold text-emerald-200 bg-white/10 px-3 py-1 rounded-full border border-white/10">
          <Shield className="w-3.5 h-3.5 text-emerald-400" /> End-to-end encrypted
        </div>
        <button
          onClick={handleDirectDial}
          title="Direct Phone Call"
          className="p-2 rounded-full hover:bg-white/10 text-emerald-300 transition-colors"
        >
          <PhoneCall className="w-5 h-5" />
        </button>
      </div>

      {/* Main Avatar & Call Info */}
      <div className="flex flex-col items-center justify-center my-auto text-center z-10">
        <div className="relative mb-6">
          {callStatus === 'ringing' || callStatus === 'calling' ? (
            <>
              <div className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping" />
              <div className="absolute -inset-4 rounded-full border-2 border-emerald-400/30 animate-pulse" />
            </>
          ) : null}

          <img
            src={
              contactImage ||
              'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80'
            }
            alt={contactName}
            className="w-32 h-32 md:w-36 md:h-36 rounded-full object-cover border-4 border-emerald-400/80 shadow-2xl relative z-10"
          />
        </div>

        <h2 className="text-2xl md:text-3xl font-extrabold tracking-wide text-white mb-2">
          {contactName}
        </h2>

        <p className="text-sm md:text-base font-semibold text-emerald-200 tracking-wider">
          {callStatus === 'calling' && 'WhatsApp Voice Call • Calling...'}
          {callStatus === 'ringing' && 'Ringing...'}
          {callStatus === 'connected' && formatTimer(duration)}
          {callStatus === 'ended' && 'Call Ended'}
        </p>

        {phoneNumber && (
          <p className="text-xs text-white/60 font-mono mt-1">{phoneNumber}</p>
        )}
      </div>

      {/* Control Buttons */}
      <div className="flex flex-col gap-6 z-10 pb-6">
        <div className="flex items-center justify-center gap-8">
          {/* Mute Button */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`w-14 h-14 rounded-full flex flex-col items-center justify-center text-xs font-medium transition-all ${
              isMuted ? 'bg-white text-gray-900 shadow-lg' : 'bg-white/15 text-white hover:bg-white/25'
            }`}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>

          {/* End Call Button */}
          <button
            onClick={handleEndCall}
            className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-xl active:scale-95 transition-all"
          >
            <PhoneOff className="w-7 h-7" />
          </button>

          {/* Speaker Button */}
          <button
            onClick={() => setIsSpeaker(!isSpeaker)}
            className={`w-14 h-14 rounded-full flex flex-col items-center justify-center text-xs font-medium transition-all ${
              isSpeaker ? 'bg-white text-gray-900 shadow-lg' : 'bg-white/15 text-white hover:bg-white/25'
            }`}
          >
            {isSpeaker ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
          </button>
        </div>

        {/* Option to dial phone directly */}
        <div className="text-center">
          <button
            onClick={handleDirectDial}
            className="text-xs font-medium text-emerald-200 hover:text-white underline transition-colors"
          >
            Or click here to dial phone directly 📞
          </button>
        </div>
      </div>
    </div>
  );
};
