import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Mic, MicOff, RefreshCw, Type, Play } from 'lucide-react';
import { Button } from './ui/button';
import { motion, AnimatePresence } from 'motion/react';

export const SpeechToSign: React.FC = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [currentSignIndex, setCurrentSignIndex] = useState(-1);
  const [isAnimating, setIsAnimating] = useState(false);
  const recognitionRef = useRef<any>(null);
  const cancelRef = useRef(false);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setTranscript('');
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const handleAnimate = async () => {
    if (!transcript) return;
    setIsAnimating(true);
    cancelRef.current = false;
    
    const words = transcript.split(' ').filter(w => w.length > 0);
    
    for (let i = 0; i < words.length; i++) {
      if (cancelRef.current) break;
      setCurrentSignIndex(i);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    setIsAnimating(false);
    setCurrentSignIndex(-1);
  };

  const handleStop = () => {
    cancelRef.current = true;
    setIsAnimating(false);
    setCurrentSignIndex(-1);
  };

  const words = transcript.split(' ').filter(w => w.length > 0);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm min-h-[400px]">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Mic className="text-emerald-600" />
            Speech to Sign
          </h2>
          <p className="text-slate-500">Speak to see sign language animations</p>
        </div>
        {!recognitionRef.current && (
          <p className="text-red-500 text-xs font-medium">Speech recognition not supported in this browser</p>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="relative">
            <div className="w-full h-40 p-4 rounded-2xl border border-slate-200 bg-slate-50 overflow-y-auto font-medium text-slate-700">
              {transcript || <span className="text-slate-400 italic">Your speech will appear here...</span>}
            </div>
            {isListening && (
              <div className="absolute top-4 right-4 flex gap-1">
                <motion.div animate={{ height: [4, 12, 4] }} transition={{ repeat: Infinity, duration: 0.5 }} className="w-1 bg-emerald-500 rounded-full" />
                <motion.div animate={{ height: [8, 16, 8] }} transition={{ repeat: Infinity, duration: 0.5, delay: 0.1 }} className="w-1 bg-emerald-500 rounded-full" />
                <motion.div animate={{ height: [4, 12, 4] }} transition={{ repeat: Infinity, duration: 0.5, delay: 0.2 }} className="w-1 bg-emerald-500 rounded-full" />
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button 
              className={`flex-1 gap-2 ${isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-600 hover:bg-emerald-700'}`}
              onClick={toggleListening}
              disabled={!recognitionRef.current || isAnimating}
            >
              {isListening ? <MicOff size={18} /> : <Mic size={18} />}
              {isListening ? 'Stop Listening' : 'Start Listening'}
            </Button>
            
            {isAnimating ? (
              <Button variant="destructive" onClick={handleStop} className="gap-2">
                Stop Animation
              </Button>
            ) : (
              <Button 
                variant="hero" 
                onClick={handleAnimate} 
                disabled={!transcript || isListening}
                className="gap-2"
              >
                <Play size={18} /> Animate
              </Button>
            )}
            
            <Button variant="outline" onClick={() => { setTranscript(''); setCurrentSignIndex(-1); }}>
              <RefreshCw size={18} />
            </Button>
          </div>
        </div>
        
        <div className="aspect-video rounded-3xl bg-slate-900 flex items-center justify-center relative overflow-hidden group border-4 border-slate-800 shadow-inner">
          <AnimatePresence mode="wait">
            {currentSignIndex >= 0 ? (
              <motion.div
                key={currentSignIndex}
                initial={{ opacity: 0, scale: 0.5, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 1.5, y: -20 }}
                className="flex flex-col items-center"
              >
                <div className="text-9xl mb-6 drop-shadow-[0_0_20px_rgba(16,185,129,0.5)] animate-bounce">
                  {(() => {
                    const word = words[currentSignIndex].toLowerCase();
                    if (word.includes('hello') || word.includes('hi')) return '👋';
                    if (word.includes('love')) return '🤟';
                    if (word.includes('help')) return '🆘';
                    if (word.includes('yes')) return '👍';
                    if (word.includes('no')) return '👎';
                    if (word.includes('thank')) return '🙏';
                    if (word.includes('please')) return '🤲';
                    return '✨';
                  })()}
                </div>
                <p className="text-emerald-400 font-black text-4xl tracking-[0.2em] uppercase drop-shadow-md">
                  {words[currentSignIndex]}
                </p>
              </motion.div>
            ) : (
              <div className="text-slate-500 text-center p-8">
                <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-xl border border-slate-700">
                  <Mic size={48} className="text-slate-600" />
                </div>
                <p className="text-lg font-bold text-slate-400">Sign animation will appear here</p>
                <p className="text-xs text-slate-600 mt-2">Speak and click Animate to begin</p>
              </div>
            )}
          </AnimatePresence>
          
          <div className="absolute bottom-6 left-6 right-6 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-emerald-500"
              initial={{ width: 0 }}
              animate={{ width: isAnimating ? `${((currentSignIndex + 1) / words.length) * 100}%` : 0 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
