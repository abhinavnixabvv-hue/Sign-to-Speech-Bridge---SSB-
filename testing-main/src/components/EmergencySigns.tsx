import React, { useCallback } from 'react';
import { Siren, AlertTriangle, PhoneCall, Volume2 } from 'lucide-react';
import { Button } from './ui/button';

export const EmergencySigns: React.FC = () => {
  const playAlert = useCallback((type?: string) => {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = 'sine';
    
    // Speak the emergency
    if (type) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(`Emergency alert: ${type}`);
      utterance.rate = 1;
      utterance.pitch = 0.8;
      window.speechSynthesis.speak(utterance);
    }

    // Custom frequencies for different emergency types
    let freq = 440;
    let duration = 1;
    
    if (type === "Medical Emergency") {
      freq = 660;
      oscillator.type = 'triangle';
    } else if (type === "Fire / Smoke") {
      freq = 880;
      oscillator.type = 'sawtooth';
    } else if (type === "Police / Security") {
      freq = 550;
    } else if (type === "Help Needed") {
      freq = 440;
      duration = 2;
    }

    oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(freq * 1.5, audioCtx.currentTime + 0.5);
    oscillator.frequency.exponentialRampToValueAtTime(freq, audioCtx.currentTime + duration);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + duration);
  }, []);

  const emergencySigns = [
    { label: "Medical Emergency", icon: "🚑", color: "bg-red-50 border-red-100 text-red-700", desc: "Immediate medical help needed" },
    { label: "Fire / Smoke", icon: "🔥", color: "bg-orange-50 border-orange-100 text-orange-700", desc: "Fire or smoke detected" },
    { label: "Police / Security", icon: "👮", color: "bg-blue-50 border-blue-100 text-blue-700", desc: "Security or police assistance" },
    { label: "Help Needed", icon: "🆘", color: "bg-red-50 border-red-100 text-red-700", desc: "General distress signal" },
    { label: "Danger / Hazard", icon: "⚠️", color: "bg-yellow-50 border-yellow-100 text-yellow-700", desc: "Dangerous situation ahead" },
    { label: "Allergy / Medicine", icon: "💊", color: "bg-emerald-50 border-emerald-100 text-emerald-700", desc: "Medical condition alert" },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm min-h-[400px]">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Siren className="text-red-600 animate-pulse" />
            Emergency Quick Signs
          </h2>
          <p className="text-slate-500">Critical signs for rapid communication in emergencies</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => playAlert()} className="gap-2 border-red-200 text-red-600 hover:bg-red-50">
            <Volume2 size={18} /> Test Alarm
          </Button>
          <Button variant="destructive" className="gap-2 shadow-lg shadow-red-200" onClick={() => playAlert("Help Needed")}>
            <PhoneCall size={18} /> Call 911
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {emergencySigns.map((sign, i) => (
          <div 
            key={i} 
            onClick={() => playAlert(sign.label)}
            className={`p-6 rounded-2xl border flex items-center gap-6 cursor-pointer hover:scale-[1.02] transition-all active:scale-[0.98] shadow-sm hover:shadow-md ${sign.color}`}
          >
            <div className="text-5xl drop-shadow-sm">{sign.icon}</div>
            <div>
              <h3 className="font-bold text-lg">{sign.label}</h3>
              <p className="text-xs opacity-80">{sign.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 p-6 rounded-2xl bg-slate-900 text-white flex items-center gap-6 border border-slate-800">
        <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center shrink-0 shadow-lg shadow-red-900/20">
          <AlertTriangle size={24} />
        </div>
        <div>
          <h4 className="font-bold">Emergency Mode Active</h4>
          <p className="text-sm text-slate-400 leading-relaxed">In this mode, the recognition engine prioritizes high-confidence emergency gestures and provides instant audio alerts to nearby people.</p>
        </div>
      </div>
    </div>
  );
};
