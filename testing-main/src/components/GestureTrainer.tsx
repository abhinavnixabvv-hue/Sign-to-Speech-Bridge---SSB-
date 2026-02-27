import React, { useState } from 'react';
import { Save, Trash2, Play, Target, BrainCircuit } from 'lucide-react';
import { Button } from './ui/button';
import { motion, AnimatePresence } from 'motion/react';
import { normalizeLandmarks, type GestureData } from '../lib/mlClassifier';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

interface GestureTrainerProps {
  currentLandmarks: NormalizedLandmark[] | null;
  onSave: (gesture: GestureData) => void;
  onClear: () => void;
  dataset: GestureData[];
}

export const GestureTrainer: React.FC<GestureTrainerProps> = ({ 
  currentLandmarks, 
  onSave, 
  onClear,
  dataset 
}) => {
  const [gestureName, setGestureName] = useState('');
  const [emoji, setEmoji] = useState('👋');
  const [targetLanguage, setTargetLanguage] = useState<'ASL' | 'ISL' | 'Custom'>('Custom');

  const handleSave = () => {
    if (!currentLandmarks || !gestureName) return;

    const normalized = normalizeLandmarks(currentLandmarks);
    onSave({
      name: gestureName,
      emoji: emoji,
      category: targetLanguage === 'Custom' ? 'custom' : targetLanguage,
      language: targetLanguage,
      landmarks: normalized
    });
    setGestureName('');
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-xl bg-emerald-100 p-2">
          <BrainCircuit className="text-emerald-600 h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Training Mode</h2>
          <p className="text-xs text-slate-500">Record custom gestures to improve accuracy</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Gesture Name</label>
            <input 
              type="text" 
              placeholder="e.g. Hello"
              value={gestureName}
              onChange={(e) => setGestureName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Emoji</label>
            <input 
              type="text" 
              placeholder="👋"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Add to Target Library</label>
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            {(['ASL', 'ISL', 'Custom'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setTargetLanguage(lang)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  targetLanguage === lang ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {lang === 'ASL' && <Target size={12} className="text-blue-500" />}
                {lang === 'ISL' && <Target size={12} className="text-orange-500" />}
                {lang === 'Custom' && <BrainCircuit size={12} className="text-emerald-500" />}
                {lang}
              </button>
            ))}
          </div>
        </div>

        <Button 
          onClick={handleSave} 
          disabled={!currentLandmarks || !gestureName}
          className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 h-11"
        >
          <Save size={18} />
          Record Current Hand Pose
        </Button>

        <div className="pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Trained Dataset ({dataset.length})</h3>
            {dataset.length > 0 && (
              <button 
                onClick={onClear}
                className="text-[10px] font-bold text-red-500 hover:text-red-600 flex items-center gap-1"
              >
                <Trash2 size={12} /> Clear All
              </button>
            )}
          </div>

          <div className="grid grid-cols-4 gap-2 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
            <AnimatePresence>
              {dataset.map((item, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="aspect-square rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center p-2"
                >
                  <span className="text-xl">{item.emoji}</span>
                  <span className="text-[8px] font-bold text-slate-500 truncate w-full text-center">{item.name}</span>
                </motion.div>
              ))}
            </AnimatePresence>
            {dataset.length === 0 && (
              <div className="col-span-4 py-8 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                <Target className="mx-auto text-slate-200 mb-2" size={24} />
                <p className="text-[10px] text-slate-400">No custom gestures trained yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
