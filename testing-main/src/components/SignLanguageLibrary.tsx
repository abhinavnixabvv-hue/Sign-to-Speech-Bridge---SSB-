import React, { useState } from 'react';
import { Search, Book, Filter, X, Info, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { aslSigns, islSigns } from '../constants/signs';

interface SignLanguageLibraryProps {
  language: 'ASL' | 'ISL';
  customSigns?: any[];
}

interface SignItem {
  sign: string;
  emoji: string;
  description: string;
  category: string;
}

export const SignLanguageLibrary: React.FC<SignLanguageLibraryProps> = ({ 
  language: initialLanguage,
  customSigns = []
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<'ASL' | 'ISL' | 'Custom'>(initialLanguage);
  const [selectedSign, setSelectedSign] = useState<SignItem | null>(null);

  const getSigns = () => {
    const baseSigns = selectedLanguage === 'ASL' ? aslSigns : 
                     selectedLanguage === 'ISL' ? islSigns : [];
    
    // Only show signs that are actually implemented in gestureClassifier.ts
    const workingSignNames = [
      "J", "L", "D", "F", "V / 2", "U", "K", "W", "Y", "I", "B", "C", "O", "G", "H", "P", "Q", 
      "A", "E", "M", "N", "T", "S", "X", "I Love You", "Thumbs Up", "Thumbs Down"
    ];

    const filteredBaseSigns = baseSigns.filter(s => 
      workingSignNames.includes(s.sign) || 
      workingSignNames.some(name => s.sign.includes(name))
    );

    const mappedCustom = customSigns
      .filter(s => s.language === selectedLanguage || (selectedLanguage === 'Custom' && (!s.language || s.language === 'Custom')))
      .map(s => ({
        sign: s.name,
        emoji: s.emoji,
        description: `This is a custom gesture you trained for ${s.language || 'Custom'} using the AI Trainer.`,
        category: "Custom"
      }));

    return [...filteredBaseSigns, ...mappedCustom];
  };

  const currentSigns = getSigns();
  
  const filteredSigns = currentSigns.filter(item => 
    item.sign.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm min-h-[400px] relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Book className="text-emerald-600" />
            Sign Library
          </h2>
          <p className="text-slate-500">Browse and learn common signs in {selectedLanguage}</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Language Filter */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setSelectedLanguage('ASL')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedLanguage === 'ASL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              ASL
            </button>
            <button
              onClick={() => setSelectedLanguage('ISL')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedLanguage === 'ISL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              ISL
            </button>
            <button
              onClick={() => setSelectedLanguage('Custom')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedLanguage === 'Custom' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Custom
            </button>
          </div>

          <div className="relative flex-1 md:flex-none min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
            <input 
              type="text" 
              placeholder="Search signs..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>
        </div>
      </div>
      
      {filteredSigns.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredSigns.map((item, i) => (
            <motion.div 
              key={`${item.sign}-${i}`} 
              layoutId={`${selectedLanguage}-${item.sign}-${i}`}
              onClick={() => setSelectedSign(item)}
              className="aspect-square rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center p-4 hover:bg-emerald-50 hover:border-emerald-100 transition-all cursor-pointer group"
            >
              <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">{item.emoji}</div>
              <span className="text-xs font-bold text-slate-700 text-center line-clamp-2 group-hover:text-emerald-700">{item.sign}</span>
              <span className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-semibold">{item.category}</span>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Filter size={48} className="mb-4 opacity-20" />
          <p>No signs found matching your search.</p>
        </div>
      )}

      {/* Sign Detail Modal */}
      <AnimatePresence>
        {selectedSign && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedSign(null)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden"
              >
                <div className="relative p-8 flex flex-col items-center text-center">
                  <button 
                    onClick={() => setSelectedSign(null)}
                    className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-colors"
                  >
                    <X size={20} />
                  </button>

                  <div className="w-32 h-32 rounded-full bg-emerald-50 flex items-center justify-center text-7xl mb-6 shadow-inner">
                    {selectedSign.emoji}
                  </div>

                  <div className="mb-2">
                    <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
                      {selectedSign.category}
                    </span>
                  </div>

                  <h3 className="text-3xl font-bold text-slate-900 mb-4">{selectedSign.sign}</h3>
                  
                  <div className="bg-slate-50 rounded-2xl p-6 w-full text-left border border-slate-100">
                    <div className="flex items-start gap-3">
                      <Info className="text-emerald-600 shrink-0 mt-0.5" size={18} />
                      <div>
                        <h4 className="text-sm font-bold text-slate-700 mb-1">How to sign:</h4>
                        <p className="text-slate-600 text-sm leading-relaxed">
                          {selectedSign.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 w-full">
                    <button 
                      onClick={() => setSelectedSign(null)}
                      className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200"
                    >
                      Got it
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <div className="mt-12 pt-8 border-t border-slate-100">
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <BookOpen className="text-emerald-600" size={20} />
          Visual Reference Guide
        </h3>
        <div className="rounded-2xl overflow-hidden border-2 border-slate-100 shadow-sm">
          <img 
            src="https://ais-pre-pwnp7ad6kictcnscrfvwht-385229874735.asia-southeast1.run.app/api/files/ais-pre-pwnp7ad6kictcnscrfvwht-385229874735.asia-southeast1.run.app/sign_language_reference.png" 
            alt="Sign Language Reference" 
            className="w-full h-auto"
            referrerPolicy="no-referrer"
            onError={(e) => {
              // Fallback to the provided direct link if the relative one fails
              (e.target as HTMLImageElement).src = "https://ais-pre-pwnp7ad6kictcnscrfvwht-385229874735.asia-southeast1.run.app/api/files/ais-pre-pwnp7ad6kictcnscrfvwht-385229874735.asia-southeast1.run.app/sign_language_reference.png";
            }}
          />
        </div>
        <p className="mt-4 text-sm text-slate-500 text-center italic">
          Use this chart as a quick reference for common ASL/ISL signs and numbers.
        </p>
      </div>
    </div>
  );
};
