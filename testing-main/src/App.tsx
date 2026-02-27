import React, { useState } from 'react';
import { 
  Hand, 
  Mic2, 
  Cpu, 
  Globe, 
  Stethoscope, 
  ArrowRight, 
  Github, 
  ExternalLink,
  CheckCircle2,
  Zap,
  Layers,
  Users,
  MessageSquare,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { RecognitionTool } from './components/RecognitionTool';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const Navbar = ({ onOpenTool }: { onOpenTool: () => void }) => (
  <nav className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-200 bg-white/80 backdrop-blur-md">
    <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white">
          <Hand size={18} />
        </div>
        <span className="font-bold text-zinc-900 tracking-tight">SSB Bridge</span>
      </div>
      <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-600">
        <a href="#overview" className="hover:text-emerald-600 transition-colors">Overview</a>
        <a href="#technology" className="hover:text-emerald-600 transition-colors">Technology</a>
        <button onClick={onOpenTool} className="hover:text-emerald-600 transition-colors">Recognition Tool</button>
        <a href="#roadmap" className="hover:text-emerald-600 transition-colors">Roadmap</a>
      </div>
      <button 
        onClick={onOpenTool}
        className="bg-zinc-900 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-zinc-800 transition-colors"
      >
        Launch Tool
      </button>
    </div>
  </nav>
);

const Hero = ({ onOpenTool }: { onOpenTool: () => void }) => (
  <section className="relative pt-32 pb-20 overflow-hidden">
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-emerald-50/50 rounded-full blur-3xl -z-10" />
    <div className="max-w-7xl mx-auto px-4 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-8"
      >
        <Zap size={14} /> Assistive Technology / Accessibility
      </motion.div>
      <motion.h1 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-5xl md:text-7xl font-bold text-zinc-900 tracking-tight mb-6"
      >
        Sign-to-Speech <br />
        <span className="text-emerald-600 italic font-serif">Bridge (SSB)</span>
      </motion.h1>
      <motion.p 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-xl text-zinc-600 max-w-2xl mx-auto mb-10 leading-relaxed"
      >
        Empowering the deaf and hard-of-hearing community with real-time Indian Sign Language (ISL) recognition for healthcare and emergency scenarios.
      </motion.p>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex flex-wrap items-center justify-center gap-4"
      >
        <button 
          onClick={onOpenTool}
          className="bg-zinc-900 text-white px-8 py-4 rounded-full font-semibold hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-200 flex items-center gap-2"
        >
          Recognition Tool <ArrowRight size={18} />
        </button>
        <a href="#overview" className="bg-white border border-zinc-200 text-zinc-900 px-8 py-4 rounded-full font-semibold hover:bg-zinc-50 transition-all">
          View Project Abstract
        </a>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 border-t border-zinc-100 pt-12"
      >
        <div className="text-center">
          <div className="text-3xl font-bold text-zinc-900 mb-1">21</div>
          <div className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Hand Landmarks</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-zinc-900 mb-1">ISL</div>
          <div className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Sign Language</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-zinc-900 mb-1">TTS</div>
          <div className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Voice Output</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-zinc-900 mb-1">ML</div>
          <div className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Neural Network</div>
        </div>
      </motion.div>
    </div>
  </section>
);

const TechSection = () => (
  <section id="technology" className="py-24">
    <div className="max-w-7xl mx-auto px-4">
      <div className="flex flex-col md:flex-row gap-16 items-center">
        <div className="flex-1 space-y-8">
          <h2 className="text-4xl font-bold text-zinc-900 tracking-tight">Core Technologies</h2>
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="w-10 h-10 shrink-0 rounded-lg bg-zinc-900 text-white flex items-center justify-center">
                <Cpu size={20} />
              </div>
              <div>
                <h4 className="font-bold text-zinc-900 mb-1">MediaPipe Hands</h4>
                <p className="text-zinc-600 text-sm">Efficient 21-point hand landmark detection for precise gesture tracking on standard webcams.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-10 h-10 shrink-0 rounded-lg bg-zinc-900 text-white flex items-center justify-center">
                <Layers size={20} />
              </div>
              <div>
                <h4 className="font-bold text-zinc-900 mb-1">Custom Neural Network</h4>
                <p className="text-zinc-600 text-sm">Lightweight ML model optimized for real-time performance on low-resource devices.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-10 h-10 shrink-0 rounded-lg bg-zinc-900 text-white flex items-center justify-center">
                <Mic2 size={20} />
              </div>
              <div>
                <h4 className="font-bold text-zinc-900 mb-1">Text-to-Speech (TTS)</h4>
                <p className="text-zinc-600 text-sm">Instant audio feedback to bridge the communication gap for non-signing individuals.</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 grid grid-cols-2 gap-4">
          <div className="space-y-4 pt-12">
            <div className="aspect-square bg-emerald-50 rounded-3xl flex items-center justify-center p-8">
              <img src="https://picsum.photos/seed/tech1/400/400" alt="Tech" className="rounded-2xl grayscale opacity-50 mix-blend-multiply" referrerPolicy="no-referrer" />
            </div>
            <div className="aspect-[3/4] bg-zinc-900 rounded-3xl flex flex-col justify-end p-6 text-white">
              <Globe className="text-emerald-400 mb-4" size={32} />
              <h4 className="font-bold text-lg">Regional Support</h4>
              <p className="text-zinc-400 text-xs mt-2">Including Malayalam and English character recognition.</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="aspect-[3/4] bg-zinc-100 rounded-3xl flex flex-col justify-end p-6">
              <Stethoscope className="text-zinc-900 mb-4" size={32} />
              <h4 className="font-bold text-lg">Healthcare Ready</h4>
              <p className="text-zinc-500 text-xs mt-2">Designed for emergency room and hospital communication.</p>
            </div>
            <div className="aspect-square bg-emerald-600 rounded-3xl flex items-center justify-center">
              <Hand className="text-white" size={64} />
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const Roadmap = () => (
  <section id="roadmap" className="py-24 bg-white">
    <div className="max-w-7xl mx-auto px-4">
      <div className="text-center mb-16">
        <h2 className="text-4xl font-bold text-zinc-900 tracking-tight mb-4">Future Roadmap</h2>
        <p className="text-zinc-600 max-w-2xl mx-auto">Our vision for the next phase of the Sign-to-Speech Bridge.</p>
      </div>
      <div className="grid md:grid-cols-3 gap-8">
        {[
          {
            title: "Advanced NLP",
            desc: "Implementing Natural Language Processing for full sentence generation and context awareness.",
            icon: MessageSquare
          },
          {
            title: "Mobile Deployment",
            desc: "Cross-platform mobile application for on-the-go assistive communication.",
            icon: Globe
          },
          {
            title: "Edge Optimization",
            desc: "Using TensorFlow Lite for ultra-low latency on edge devices and wearables.",
            icon: Zap
          }
        ].map((item, i) => (
          <div key={i} className="group p-8 rounded-3xl border border-zinc-100 bg-zinc-50 hover:bg-zinc-900 hover:text-white transition-all duration-500">
            <div className="w-12 h-12 rounded-2xl bg-white group-hover:bg-emerald-500 flex items-center justify-center mb-6 text-zinc-900 group-hover:text-white transition-colors">
              <item.icon size={24} />
            </div>
            <h3 className="text-xl font-bold mb-3">{item.title}</h3>
            <p className="text-zinc-500 group-hover:text-zinc-400 text-sm leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const Team = () => (
  <section className="py-24 border-t border-zinc-100">
    <div className="max-w-7xl mx-auto px-4">
      <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-8">
        <div>
          <h2 className="text-4xl font-bold text-zinc-900 tracking-tight mb-4">Project Team</h2>
          <p className="text-zinc-600">Vidya Academy of Science and Technology</p>
        </div>
        <div className="flex gap-4">
          <button className="p-3 rounded-full border border-zinc-200 hover:bg-zinc-50 transition-colors">
            <Github size={20} />
          </button>
          <button className="p-3 rounded-full border border-zinc-200 hover:bg-zinc-50 transition-colors">
            <ExternalLink size={20} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          "Aaron Thalakkottor Sooraj",
          "Abhinav N",
          "Adithya Binesh",
          "Alwin Thomas V"
        ].map((name, i) => (
          <div key={i} className="p-6 rounded-2xl border border-zinc-100 bg-white text-center">
            <div className="w-16 h-16 rounded-full bg-zinc-100 mx-auto mb-4 flex items-center justify-center text-zinc-400">
              <Users size={32} />
            </div>
            <h4 className="font-bold text-zinc-900 text-sm">{name}</h4>
            <p className="text-xs text-zinc-500 mt-1">Team Member</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const Footer = () => (
  <footer className="py-12 bg-zinc-900 text-white">
    <div className="max-w-7xl mx-auto px-4">
      <div className="flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white">
            <Hand size={18} />
          </div>
          <span className="font-bold tracking-tight">SSB Bridge</span>
        </div>
        <div className="text-zinc-500 text-sm">
          © {new Date().getFullYear()} Vidya Academy of Science and Technology. All rights reserved.
        </div>
        <div className="flex gap-6 text-sm text-zinc-400">
          <a href="#" className="hover:text-white transition-colors">Privacy</a>
          <a href="#" className="hover:text-white transition-colors">Terms</a>
          <a href="#" className="hover:text-white transition-colors">Contact</a>
        </div>
      </div>
    </div>
  </footer>
);

export default function App() {
  const [view, setView] = useState<'landing' | 'tool'>('landing');

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-emerald-100 selection:text-emerald-900">
      <AnimatePresence mode="wait">
        {view === 'landing' ? (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Navbar onOpenTool={() => setView('tool')} />
            <main>
              <Hero onOpenTool={() => setView('tool')} />
              <section id="overview" className="py-24 bg-zinc-50 border-y border-zinc-100">
                <div className="max-w-7xl mx-auto px-4">
                  <div className="grid md:grid-cols-3 gap-12">
                    <div className="md:col-span-1">
                      <h2 className="text-sm font-bold text-emerald-600 uppercase tracking-widest mb-4">Project Overview</h2>
                      <h3 className="text-3xl font-bold text-zinc-900 tracking-tight">Bridging the Gap</h3>
                    </div>
                    <div className="md:col-span-2 space-y-6 text-zinc-600 leading-relaxed">
                      <p>
                        The Sign-to-Speech Bridge (SSB) is a real-time assistive communication system specifically designed for Indian Sign Language (ISL) users. Our primary focus is on healthcare and emergency communication scenarios where rapid, accurate translation is critical.
                      </p>
                      <p>
                        By leveraging standard webcams and lightweight machine learning models, we provide a foundation for deaf individuals to communicate their needs to non-signing people without the need for specialized, expensive hardware.
                      </p>
                      <div className="grid sm:grid-cols-2 gap-4 pt-4">
                        <div className="flex items-center gap-2 text-zinc-900 font-medium">
                          <CheckCircle2 size={18} className="text-emerald-500" />
                          Real-time ISL Recognition
                        </div>
                        <div className="flex items-center gap-2 text-zinc-900 font-medium">
                          <CheckCircle2 size={18} className="text-emerald-500" />
                          Emergency Sentence Generation
                        </div>
                        <div className="flex items-center gap-2 text-zinc-900 font-medium">
                          <CheckCircle2 size={18} className="text-emerald-500" />
                          Malayalam & English Support
                        </div>
                        <div className="flex items-center gap-2 text-zinc-900 font-medium">
                          <CheckCircle2 size={18} className="text-emerald-500" />
                          Lightweight ML Architecture
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
              
              <TechSection />
              <Roadmap />
              <Team />
            </main>
            <Footer />
          </motion.div>
        ) : (
          <motion.div
            key="tool"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <RecognitionTool onBack={() => setView('landing')} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
