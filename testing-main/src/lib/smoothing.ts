import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

export class LandmarkSmoother {
  private history: NormalizedLandmark[][] = [];
  private windowSize: number;

  constructor(windowSize: number = 5) {
    this.windowSize = windowSize;
  }

  add(landmarks: NormalizedLandmark[]): NormalizedLandmark[] {
    this.history.push(landmarks);
    if (this.history.length > this.windowSize) {
      this.history.shift();
    }

    if (this.history.length === 1) return landmarks;

    // Weighted average smoothing
    const smoothed: NormalizedLandmark[] = landmarks.map((_, index) => {
      let sumX = 0;
      let sumY = 0;
      let sumZ = 0;
      let totalWeight = 0;

      this.history.forEach((frame, i) => {
        const weight = i + 1; // More weight to recent frames
        sumX += frame[index].x * weight;
        sumY += frame[index].y * weight;
        sumZ += frame[index].z * weight;
        totalWeight += weight;
      });

      return {
        ...landmarks[index],
        x: sumX / totalWeight,
        y: sumY / totalWeight,
        z: sumZ / totalWeight,
      };
    });

    return smoothed;
  }

  clear() {
    this.history = [];
  }

  getLast(): NormalizedLandmark[] | null {
    if (this.history.length === 0) return null;
    return this.history[this.history.length - 1];
  }
}
