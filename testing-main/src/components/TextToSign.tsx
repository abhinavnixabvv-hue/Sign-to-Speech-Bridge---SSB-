import React, { useState, useCallback, useRef } from 'react';
import { Type, Play, RefreshCw, Volume2, Square } from 'lucide-react';
import { Button } from './ui/button';
import { motion, AnimatePresence } from 'motion/react';

export const TextToSign: React.FC = () => {
  const [text, setText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [currentSignIndex, setCurrentSignIndex] = useState(-1);
  const cancelRef = useRef(false);

  const speakText = useCallback((customText?: string) => {
    const textToSpeak = customText || text;
    if (!textToSpeak) return;
    
    // Cancel any ongoing speech to avoid queuing
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = 0.9; // Slightly slower for clarity
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }, [text]);

  const handleTranslate = async () => {
    if (!text) return;
    setIsTranslating(true);
    cancelRef.current = false;
    
    const words = text.split(' ').filter(w => w.length > 0);
    
    for (let i = 0; i < words.length; i++) {
      if (cancelRef.current) break;
      
      const word = words[i].toLowerCase();
      const isKnown = ['hello', 'hi', 'love', 'help', 'yes', 'no', 'thank', 'please'].some(k => word.includes(k));

      if (isKnown) {
        setCurrentSignIndex(i);
        const wordUtterance = new SpeechSynthesisUtterance(words[i]);
        wordUtterance.rate = 1.1; 
        window.speechSynthesis.speak(wordUtterance);
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        // Spell it out letter by letter
        for (const char of words[i]) {
          if (cancelRef.current) break;
          setCurrentSignIndex(i); // Keep the word index but we'll show the letter
          (words[i] as any)._currentChar = char; // Hacky way to pass current char to UI
          
          const charUtterance = new SpeechSynthesisUtterance(char);
          charUtterance.rate = 1.5;
          window.speechSynthesis.speak(charUtterance);
          
          // Force re-render by updating state
          setCurrentSignIndex(-1);
          await new Promise(resolve => setTimeout(resolve, 50));
          setCurrentSignIndex(i);
          
          await new Promise(resolve => setTimeout(resolve, 600));
        }
      }
    }
    
    setIsTranslating(false);
    setCurrentSignIndex(-1);
    cancelRef.current = false;
  };

  const handleStop = () => {
    cancelRef.current = true;
    window.speechSynthesis.cancel();
    setIsTranslating(false);
    setCurrentSignIndex(-1);
  };

  const words = text.split(' ').filter(w => w.length > 0);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm min-h-[400px]">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Type className="text-emerald-600" />
            Text to Sign
          </h2>
          <p className="text-slate-500">Convert written text into sign language animations</p>
        </div>
        <Button variant="outline" onClick={speakText} disabled={!text} className="gap-2">
          <Volume2 size={18} /> Speak
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type something here..."
            className="w-full h-40 p-4 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none font-medium"
          />
          <div className="flex gap-2">
            {isTranslating ? (
              <Button 
                className="flex-1 gap-2" 
                variant="destructive" 
                onClick={handleStop}
              >
                <Square size={18} /> Stop
              </Button>
            ) : (
              <Button 
                className="flex-1 gap-2" 
                variant="hero" 
                onClick={handleTranslate}
                disabled={!text}
              >
                <Play size={18} /> Translate
              </Button>
            )}
            <Button variant="outline" onClick={() => { setText(''); setCurrentSignIndex(-1); window.speechSynthesis.cancel(); }}>
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
                    const wordObj = words[currentSignIndex] as any;
                    if (wordObj._currentChar) return wordObj._currentChar.toUpperCase();

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
                  {(words[currentSignIndex] as any)._currentChar && (
                    <span className="text-white ml-2">({(words[currentSignIndex] as any)._currentChar.toUpperCase()})</span>
                  )}
                </p>
              </motion.div>
            ) : (
              <div className="text-slate-500 text-center p-8">
                <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-xl border border-slate-700">
                  <Type size={48} className="text-slate-600" />
                </div>
                <p className="text-lg font-bold text-slate-400">Sign animation will appear here</p>
                <p className="text-xs text-slate-600 mt-2">Type text and click Translate to begin</p>
              </div>
            )}
          </AnimatePresence>
          
          <div className="absolute bottom-6 left-6 right-6 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-emerald-500"
              initial={{ width: 0 }}
              animate={{ width: isTranslating ? `${((currentSignIndex + 1) / words.length) * 100}%` : 0 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
