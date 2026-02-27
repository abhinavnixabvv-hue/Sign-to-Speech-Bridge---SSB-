import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, Camera, CameraOff, Info, Hand, Loader2, Trash2, BookOpen, Type, Siren, BrainCircuit, Mic, Volume2, VolumeX } from "lucide-react";
import { Button } from "./ui/button";
import { useHandLandmarker } from "../hooks/useHandLandmarker";
import { classifyGesture, classifyTwoHandGesture, type GestureResult } from "../lib/gestureClassifier";
import { SignLanguageLibrary } from "./SignLanguageLibrary";
import { TextToSign } from "./TextToSign";
import { SpeechToSign } from "./SpeechToSign";
import { EmergencySigns } from "./EmergencySigns";
import { GestureTrainer } from "./GestureTrainer";
import { LandmarkSmoother } from "../lib/smoothing";
import { HandLandmarker, DrawingUtils, type NormalizedLandmark } from "@mediapipe/tasks-vision";
import { classifyML, type GestureData, augmentGesture } from "../lib/mlClassifier";

import { aslSigns, islSigns } from "../constants/signs";

type SignLanguage = 'ASL' | 'ISL';

type SignTab = "camera" | "library" | "textToSign" | "speechToSign" | "emergency" | "train";

interface RecognitionToolProps {
  onBack: () => void;
}

export function RecognitionTool({ onBack }: RecognitionToolProps) {
  const [activeTab, setActiveTab] = useState<SignTab>("camera");
  const [language, setLanguage] = useState<SignLanguage>("ASL");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [detectedSign, setDetectedSign] = useState<GestureResult | null>(null);
  const [detectionLog, setDetectionLog] = useState<{ gesture: GestureResult; time: string }[]>([]);
  const [customDataset, setCustomDataset] = useState<GestureData[]>([]);
  const [isHandDetected, setIsHandDetected] = useState(false);
  const [typedText, setTypedText] = useState("");
  const [isTypingEnabled, setIsTypingEnabled] = useState(false);
  const [isCameraLarge, setIsCameraLarge] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const predictionBufferRef = useRef<string[]>([]);
  const cooldownUntilRef = useRef<number>(0);
  const lastDetectedRef = useRef<string | null>(null);
  const lastAlphabetRef = useRef<string | null>(null);
  const isThumbDownActiveRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const smoothersRef = useRef<LandmarkSmoother[]>([]);

  const commonSigns = language === 'ASL' ? aslSigns : islSigns;

  const { initModel, detect, isModelLoading, isModelReady } = useHandLandmarker();

  const playDetectionSound = useCallback(() => {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.1);
  }, []);

  const speakSign = useCallback((text: string) => {
    if (!text || !isVoiceEnabled) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.2;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }, []);

  const playEmergencySound = useCallback(() => {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.5);
    oscillator.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 1);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 1);
  }, []);

  const runDetectionLoop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !streamRef.current || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawingUtils = new DrawingUtils(ctx);
    const result = detect(video);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (result && result.landmarks.length > 0) {
      setIsHandDetected(true);
      // Ensure we have enough smoothers
      while (smoothersRef.current.length < result.landmarks.length) {
        smoothersRef.current.push(new LandmarkSmoother(2)); // Even lower window for faster response
      }

      // Apply smoothing and draw
      const smoothedLandmarks = result.landmarks.map((handLandmarks, i) => {
        const smoothed = smoothersRef.current[i].add(handLandmarks);
        
        // Draw directly to canvas for zero-latency visual feedback
        drawingUtils.drawConnectors(smoothed, HandLandmarker.HAND_CONNECTIONS, {
          color: "#10b981",
          lineWidth: 5
        });
        drawingUtils.drawLandmarks(smoothed, {
          color: "#ffffff",
          lineWidth: 2,
          radius: 3
        });
        
        return smoothed;
      });

      // Check for two-hand Thumbs Down trigger for Emergency
      if (smoothedLandmarks.length >= 2) {
        const g1 = classifyGesture(smoothedLandmarks[0]);
        const g2 = classifyGesture(smoothedLandmarks[1]);
        if (g1?.name === "Thumbs Down" && g2?.name === "Thumbs Down" && activeTab !== "emergency") {
          setActiveTab("emergency");
          playEmergencySound();
        }
      }

      // Skip processing if in cooldown
      if (Date.now() < cooldownUntilRef.current) {
        setIsHandDetected(true);
        // We don't return early here, we just skip the classification part
        // but we still want to draw the landmarks
      } else {
        // Classify the first detected hand using smoothed data
        const smoothedHand = smoothedLandmarks[0];
        
        // Try two-hand classification if two hands are present
        let gesture: GestureResult | null = null;
        if (smoothedLandmarks.length >= 2) {
          gesture = classifyTwoHandGesture(smoothedLandmarks[0], smoothedLandmarks[1]);
        }

        // Try ML classification first if dataset exists, fallback to heuristic
        if (!gesture && customDataset.length > 0) {
          // Filter dataset to only include signs for current language or "Custom"
          const relevantDataset = customDataset.filter(d => 
            !d.language || d.language === 'Custom' || d.language === language
          );
          
          const mlResult = classifyML(smoothedHand, relevantDataset);
          if (mlResult) {
            gesture = {
              name: mlResult.gesture.name,
              emoji: mlResult.gesture.emoji,
              category: mlResult.gesture.category
            };
          }
        }

        if (!gesture) {
          gesture = classifyGesture(smoothedHand);
        }

        // 1. Add current prediction to buffer for temporal smoothing
        if (gesture) {
          predictionBufferRef.current.push(gesture.name);
        } else {
          predictionBufferRef.current.push("none");
        }
        
        // Keep buffer size small for low latency (5 frames = ~150ms)
        if (predictionBufferRef.current.length > 5) {
          predictionBufferRef.current.shift();
        }

        // 2. Voting: Find the most frequent prediction in the buffer
        const counts: Record<string, number> = {};
        predictionBufferRef.current.forEach(name => {
          counts[name] = (counts[name] || 0) + 1;
        });
        
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        const consensusName = sorted[0][0];
        const consensusCount = sorted[0][1];

        // 3. Update UI only if consensus is strong (e.g., 3/5 frames)
        if (consensusName !== "none" && consensusCount >= 3) {
          // Cooldown for J and Z
          if (consensusName === "J" || consensusName === "Z") {
            cooldownUntilRef.current = Date.now() + 2000;
          }

          // Typing Logic: If Thumbs Up is detected, type the LAST seen alphabet sign
          if (consensusName === "Thumbs Up") {
            if (isTypingEnabled && !isThumbDownActiveRef.current && lastAlphabetRef.current) {
              setTypedText(prev => prev + lastAlphabetRef.current);
              isThumbDownActiveRef.current = true;
              playDetectionSound(); // Feedback for typing
              speakSign(lastAlphabetRef.current);
            }
          } else {
            isThumbDownActiveRef.current = false;
            // Remember this sign if it's typable (length 1 or special)
            if (consensusName.length === 1 || consensusName === "Hello" || consensusName === "I Love You") {
              let char = consensusName;
              if (consensusName === "Hello") char = " ";
              if (consensusName === "I Love You") char = "❤️";
              lastAlphabetRef.current = char;
            }
          }

          // Find the actual gesture object for the consensus name
          // If it was a heuristic gesture, we might need to re-classify or just use the name
          const finalGesture = gesture?.name === consensusName ? gesture : { name: consensusName, emoji: "✨", category: "alphabet" };
          
          setDetectedSign(finalGesture);
          
          if (consensusName !== lastDetectedRef.current) {
            lastDetectedRef.current = consensusName;
            playDetectionSound();
            speakSign(consensusName);
            setDetectionLog((prev) => {
              const updated = [{ gesture: finalGesture, time: new Date().toLocaleTimeString() }, ...prev];
              return updated.slice(0, 20);
            });
          }
        } else if (consensusName === "none" && consensusCount >= 3) {
          setDetectedSign(null);
          lastDetectedRef.current = null;
        }
      }
    } else {
      setIsHandDetected(false);
      setDetectedSign(null);
      predictionBufferRef.current = []; // Reset buffer when no hand is seen
      // Clear smoothers when no hands are detected to avoid "ghost" smoothing on re-entry
      smoothersRef.current.forEach(s => s.clear());
    }

    animFrameRef.current = requestAnimationFrame(runDetectionLoop);
  }, [detect]);

  const startCamera = async () => {
    try {
      // getUserMedia MUST be called first to preserve user gesture context
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 1280, height: 720 },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraActive(true);
      setHasPermission(true);

      // Init model after camera is running
      await initModel();
    } catch (error) {
      console.error("Camera access denied:", error);
      setHasPermission(false);
    }
  };

  // Start detection loop once camera is active and model ready
  useEffect(() => {
    if (isCameraActive && isModelReady) {
      animFrameRef.current = requestAnimationFrame(runDetectionLoop);
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isCameraActive, isModelReady, runDetectionLoop]);

  const stopCamera = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setDetectedSign(null);
    smoothersRef.current.forEach(s => s.clear());
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="min-h-screen bg-slate-50 px-4 py-8"
    >
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Sign Language</h1>
            <p className="text-slate-600">Recognition & Library</p>
          </div>
        </div>

        {/* Tab Switcher & Language Selector */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex gap-2 rounded-xl bg-slate-200 p-1 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab("camera")}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                activeTab === "camera"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Camera className="h-4 w-4" />
              Live Recognition
            </button>
            <button
              onClick={() => setActiveTab("library")}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                activeTab === "library"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <BookOpen className="h-4 w-4" />
              Sign Library
            </button>
            <button
              onClick={() => setActiveTab("textToSign")}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                activeTab === "textToSign"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Type className="h-4 w-4" />
              Text to Sign
            </button>
            <button
              onClick={() => setActiveTab("speechToSign")}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                activeTab === "speechToSign"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Mic className="h-4 w-4" />
              Speech to Sign
            </button>
            <button
              onClick={() => setActiveTab("emergency")}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                activeTab === "emergency"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Siren className="h-4 w-4" />
              Emergency
            </button>
            <button
              onClick={() => setActiveTab("train")}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                activeTab === "train"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <BrainCircuit className="h-4 w-4" />
              Train
            </button>
          </div>

          <div className="flex gap-2 bg-emerald-100/50 p-1 rounded-xl border border-emerald-200 w-full sm:w-auto">
            <button
              onClick={() => setLanguage('ASL')}
              className={`flex-1 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                language === 'ASL' ? 'bg-emerald-600 text-white shadow-sm' : 'text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              ASL
            </button>
            <button
              onClick={() => setLanguage('ISL')}
              className={`flex-1 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                language === 'ISL' ? 'bg-emerald-600 text-white shadow-sm' : 'text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              ISL
            </button>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-12">
          {/* Camera View - Persistent across tabs */}
          <div className={`${activeTab === "camera" ? (isCameraLarge ? "lg:col-span-12" : "lg:col-span-8") : "lg:col-span-4"}`}>
            <div className="sticky top-8 space-y-4">
              <div className={`relative overflow-hidden rounded-2xl border-2 border-slate-200 bg-slate-900 shadow-lg transition-all duration-500 ${isCameraLarge ? 'aspect-[21/9]' : 'aspect-video'}`}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`h-full w-full object-cover scale-x-[-1] ${isCameraActive ? '' : 'hidden'}`}
                />
                {isCameraActive && (
                  <>
                    <canvas
                      ref={canvasRef}
                      width={1280}
                      height={720}
                      className="absolute inset-0 h-full w-full object-cover pointer-events-none scale-x-[-1]"
                    />

                    {/* Detection overlay */}
                    <AnimatePresence>
                      {detectedSign && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-xl bg-emerald-600 px-4 py-2 text-white shadow-xl whitespace-nowrap"
                        >
                          <p className="text-sm font-semibold">{detectedSign.emoji} {detectedSign.name}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Recording indicator */}
                    <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 backdrop-blur-sm">
                      <div className={`h-2.5 w-2.5 rounded-full ${isHandDetected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                      <span className="text-xs font-medium text-slate-900">
                        {isHandDetected ? 'Hand Detected' : 'Scanning...'}
                      </span>
                    </div>
                  </>
                )}
                {!isCameraActive && (
                  <div className="absolute inset-0 flex h-full flex-col items-center justify-center gap-4 p-8">
                    {isModelLoading ? (
                      <>
                        <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
                        <p className="text-center text-xs text-slate-400">
                          Loading AI model...
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="rounded-full bg-slate-800 p-4">
                          <Camera className="h-8 w-8 text-slate-600" />
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-slate-400 mb-4 max-w-[200px]">
                            {hasPermission === false
                              ? "Camera access denied. Check settings."
                              : "Enable camera to start"}
                          </p>
                          {hasPermission === false && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => {
                                setHasPermission(null);
                                startCamera();
                              }}
                              className="text-emerald-600 border-emerald-600 hover:bg-emerald-50 h-8 text-xs"
                            >
                              Try Again
                            </Button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Camera Controls */}
              <div className="flex flex-col gap-3">
                <div className="flex gap-2">
                  <Button
                    variant={isCameraActive ? "destructive" : "hero"}
                    size="sm"
                    onClick={isCameraActive ? stopCamera : startCamera}
                    className="gap-2 flex-1"
                    disabled={isModelLoading}
                  >
                    {isModelLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : isCameraActive ? (
                      <>
                        <CameraOff className="h-4 w-4" />
                        Stop Camera
                      </>
                    ) : (
                      <>
                        <Camera className="h-4 w-4" />
                        Start Camera
                      </>
                    )}
                  </Button>
                  {isCameraActive && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsCameraLarge(!isCameraLarge)}
                      className="gap-2"
                    >
                      {isCameraLarge ? "Normal View" : "Wide View"}
                    </Button>
                  )}
                  {isCameraActive && (
                    <Button
                      variant={isTypingEnabled ? "hero" : "outline"}
                      size="sm"
                      onClick={() => setIsTypingEnabled(!isTypingEnabled)}
                      className={`gap-2 ${isTypingEnabled ? 'bg-emerald-600 text-white' : ''}`}
                    >
                      <Type className="h-4 w-4" />
                      {isTypingEnabled ? "Typing On" : "Typing Off"}
                    </Button>
                  )}
                  {isCameraActive && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
                      className="gap-2"
                    >
                      {isVoiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                      {isVoiceEnabled ? "Voice On" : "Voice Off"}
                    </Button>
                  )}
                  {typedText && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setTypedText(prev => prev.slice(0, -1))}
                        className="gap-2"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Backspace
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setTypedText("")}
                        className="gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Clear
                      </Button>
                    </div>
                  )}
                </div>

                {/* Typed Text Display */}
                <AnimatePresence>
                  {typedText && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="rounded-2xl border-2 border-emerald-100 bg-emerald-50 p-4 shadow-inner"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Typed Message</span>
                        <Type className="h-3 w-3 text-emerald-400" />
                      </div>
                      <p className="text-xl font-bold text-slate-800 break-all">
                        {typedText}
                        <motion.span
                          animate={{ opacity: [1, 0] }}
                          transition={{ duration: 0.8, repeat: Infinity }}
                          className="inline-block w-0.5 h-6 bg-emerald-500 ml-1 align-middle"
                        />
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Detection Log - Mini Version when not in camera tab */}
              {activeTab !== "camera" && activeTab !== "train" && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Hand className="h-4 w-4 text-emerald-600" />
                    Recent Detections
                  </h2>
                  <div className="max-h-[150px] overflow-y-auto space-y-2">
                    {detectionLog.length > 0 ? (
                      detectionLog.slice(0, 5).map((entry, i) => (
                        <div key={i} className="flex items-center gap-2 rounded-lg bg-slate-50 p-2 border border-slate-100">
                          <span className="text-lg">{entry.gesture.emoji}</span>
                          <span className="text-xs font-medium text-slate-700">{entry.gesture.name}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] text-slate-400 text-center py-4">No signs detected yet</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tab Content Area */}
          <div className={`${activeTab === "camera" ? "lg:col-span-4" : "lg:col-span-8"}`}>
            {activeTab === "camera" ? (
              <div className="space-y-6">
                {/* Detection Log - Full Version */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                      <Hand className="h-5 w-5 text-emerald-600" />
                      Recognition Log
                    </h2>
                    {detectionLog.length > 0 && (
                      <Button variant="ghost" size="sm" onClick={() => setDetectionLog([])} className="h-7 gap-1 text-xs text-slate-500">
                        <Trash2 className="h-3 w-3" /> Clear
                      </Button>
                    )}
                  </div>
                  <div className="min-h-[120px] max-h-[280px] overflow-y-auto rounded-xl bg-slate-50 p-3">
                    {detectionLog.length > 0 ? (
                      <ul className="space-y-2">
                        {detectionLog.map((entry, i) => (
                          <motion.li
                            key={`${entry.gesture.name}-${entry.time}-${i}`}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-3 rounded-lg bg-white p-2.5 shadow-sm border border-slate-100"
                          >
                            <span className="text-xl">{entry.gesture.emoji}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-900">{entry.gesture.name}</p>
                              <p className="text-xs text-slate-500">{entry.gesture.category}</p>
                            </div>
                            <span className="text-xs text-slate-400 whitespace-nowrap">{entry.time}</span>
                          </motion.li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-slate-400 text-sm text-center py-8">
                        {isCameraActive
                          ? "Show a hand gesture to the camera..."
                          : "Start the camera to begin recognition"}
                      </p>
                    )}
                  </div>
                </div>

                {/* Common Signs Reference */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
                    <Info className="h-5 w-5 text-emerald-600" />
                    Supported Gestures
                  </h2>
                  <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {commonSigns.map((item) => (
                      <div
                        key={item.sign}
                        className="flex items-center gap-3 rounded-lg bg-slate-50 p-2.5 border border-slate-100"
                      >
                        <span className="text-xl">{item.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900">{item.sign}</p>
                          <p className="text-xs text-slate-500">{item.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : activeTab === "library" ? (
              <SignLanguageLibrary language={language} customSigns={customDataset} />
            ) : activeTab === "textToSign" ? (
              <TextToSign />
            ) : activeTab === "speechToSign" ? (
              <SpeechToSign />
            ) : activeTab === "train" ? (
              <GestureTrainer 
                currentLandmarks={smoothersRef.current[0]?.getLast() || null}
                dataset={customDataset}
                onSave={(g) => {
                  const augmented = augmentGesture(g);
                  setCustomDataset(prev => [...prev, ...augmented]);
                }}
                onClear={() => setCustomDataset([])}
              />
            ) : (
              <EmergencySigns />
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
