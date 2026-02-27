import { useState, useCallback, useRef } from 'react';
import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

export function useHandLandmarker() {
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);
  const landmarkerRef = useRef<HandLandmarker | null>(null);

  const initModel = useCallback(async () => {
    if (landmarkerRef.current) return;
    
    setIsModelLoading(true);
    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );
      
      landmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numHands: 2,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      
      setIsModelReady(true);
    } catch (error) {
      console.error("Failed to initialize HandLandmarker:", error);
    } finally {
      setIsModelLoading(false);
    }
  }, []);

  const detect = useCallback((video: HTMLVideoElement) => {
    if (!landmarkerRef.current || video.readyState < 2) return null;
    
    const startTimeMs = performance.now();
    const results = landmarkerRef.current.detectForVideo(video, startTimeMs);
    return results;
  }, []);

  return { initModel, detect, isModelLoading, isModelReady };
}
