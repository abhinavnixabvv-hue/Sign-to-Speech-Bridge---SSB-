import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

export interface GestureData {
  name: string;
  emoji: string;
  category: string;
  language?: 'ASL' | 'ISL' | 'Custom';
  landmarks: NormalizedLandmark[];
}

/**
 * Normalizes landmarks by centering on the wrist and scaling by hand size.
 * Also calculates finger angles for better posture recognition.
 */
export function normalizeLandmarks(landmarks: NormalizedLandmark[]): NormalizedLandmark[] {
  if (!landmarks || landmarks.length === 0) return [];

  const wrist = landmarks[0];
  
  // 1. Center: Subtract wrist coordinates from all landmarks
  const centered = landmarks.map(l => ({
    ...l,
    x: l.x - wrist.x,
    y: l.y - wrist.y,
    z: l.z - wrist.z
  }));

  // 2. Scale & Rotate: Calculate distance from wrist to middle finger base (index 9)
  const middleBase = centered[9];
  const scale = Math.sqrt(
    Math.pow(middleBase.x, 2) + 
    Math.pow(middleBase.y, 2) + 
    Math.pow(middleBase.z, 2)
  );

  // 3. Rotation Normalization: Align wrist-to-middle-base vector with Y-axis
  // This makes the model invariant to hand tilt.
  const angle = Math.atan2(middleBase.x, middleBase.y);
  const cos = Math.cos(-angle);
  const sin = Math.sin(-angle);

  // 4. Normalize & Rotate: Divide all coordinates by the scale and apply rotation
  return centered.map(l => {
    const rx = l.x * cos - l.y * sin;
    const ry = l.x * sin + l.y * cos;
    return {
      ...l,
      x: rx / (scale || 1),
      y: ry / (scale || 1),
      z: l.z / (scale || 1)
    };
  });
}

/**
 * Calculates the angle between three points (in degrees)
 */
function calculateAngle(a: NormalizedLandmark, b: NormalizedLandmark, c: NormalizedLandmark): number {
  const ab = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
  const cb = { x: b.x - c.x, y: b.y - c.y, z: b.z - c.z };
  
  const dotProduct = ab.x * cb.x + ab.y * cb.y + ab.z * cb.z;
  const magAB = Math.sqrt(ab.x * ab.x + ab.y * ab.y + ab.z * ab.z);
  const magCB = Math.sqrt(cb.x * cb.x + cb.y * cb.y + cb.z * cb.z);
  
  const cosTheta = dotProduct / (magAB * magCB);
  return Math.acos(Math.max(-1, Math.min(1, cosTheta))) * (180 / Math.PI);
}

/**
 * Extracts a high-dimensional feature vector including:
 * 1. Normalized Coordinates (63 features)
 * 2. Finger Joint Angles (15 features)
 * 3. Relative Tip-to-Joint Distances (105 features) - This solves the "posture" accuracy problem.
 */
function getFeatureVector(landmarks: NormalizedLandmark[]): number[] {
  const normalized = normalizeLandmarks(landmarks);
  const features: number[] = [];
  
  // 1. Coordinates
  normalized.forEach(l => features.push(l.x, l.y, l.z));
  
  // 2. Finger joint angles
  const fingerJoints = [
    [0, 1, 2, 3, 4], [0, 5, 6, 7, 8], [0, 9, 10, 11, 12], 
    [0, 13, 14, 15, 16], [0, 17, 18, 19, 20]
  ];
  
  fingerJoints.forEach(joints => {
    // Normalize angles to 0-1 range (dividing by 180)
    features.push(calculateAngle(normalized[joints[0]], normalized[joints[1]], normalized[joints[2]]) / 180);
    features.push(calculateAngle(normalized[joints[1]], normalized[joints[2]], normalized[joints[3]]) / 180);
    features.push(calculateAngle(normalized[joints[2]], normalized[joints[3]], normalized[joints[4]]) / 180);
  });

  // 3. Relative Distances (Already in 0-1 range approx)
  const tips = [4, 8, 12, 16, 20];
  tips.forEach(tipIdx => {
    for (let i = 0; i < 21; i++) {
      if (tipIdx === i) continue;
      const dx = normalized[tipIdx].x - normalized[i].x;
      const dy = normalized[tipIdx].y - normalized[i].y;
      const dz = normalized[tipIdx].z - normalized[i].z;
      features.push(Math.sqrt(dx*dx + dy*dy + dz*dz));
    }
  });

  // 4. Finger Spread (Distance between adjacent fingertips)
  for (let i = 0; i < tips.length - 1; i++) {
    const dx = normalized[tips[i]].x - normalized[tips[i+1]].x;
    const dy = normalized[tips[i]].y - normalized[tips[i+1]].y;
    const dz = normalized[tips[i]].z - normalized[tips[i+1]].z;
    features.push(Math.sqrt(dx*dx + dy*dy + dz*dz));
  }

  // 5. Palm Normal (Captures the 3D orientation of the palm)
  // Using wrist (0), index base (5), and pinky base (17) to define the plane
  const v1 = { x: normalized[5].x - normalized[0].x, y: normalized[5].y - normalized[0].y, z: normalized[5].z - normalized[0].z };
  const v2 = { x: normalized[17].x - normalized[0].x, y: normalized[17].y - normalized[0].y, z: normalized[17].z - normalized[0].z };
  
  // Cross product
  const normal = {
    x: v1.y * v2.z - v1.z * v2.y,
    y: v1.z * v2.x - v1.x * v2.z,
    z: v1.x * v2.y - v1.y * v2.x
  };
  
  const mag = Math.sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z);
  features.push(normal.x / (mag || 1), normal.y / (mag || 1), normal.z / (mag || 1));
  
  return features;
}

/**
 * Generates synthetic variations of a gesture to augment the dataset.
 * Includes jitter, rotation, and scaling variations.
 */
export function augmentGesture(gesture: GestureData): GestureData[] {
  const variations: GestureData[] = [gesture];
  
  // Create 8 synthetic variations (increased from 4 for better coverage)
  for (let i = 0; i < 8; i++) {
    // 1. Random Rotation (±15 degrees)
    const angle = (Math.random() - 0.5) * 0.26; // ~15 degrees in radians
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    
    // 2. Random Scaling (±10%)
    const scale = 0.9 + Math.random() * 0.2;
    
    const augmentedLandmarks = gesture.landmarks.map(l => {
      // Rotate around the wrist (landmark 0)
      const dx = l.x - gesture.landmarks[0].x;
      const dy = l.y - gesture.landmarks[0].y;
      
      const rx = (dx * cos - dy * sin) * scale;
      const ry = (dx * sin + dy * cos) * scale;
      
      return {
        ...l,
        x: gesture.landmarks[0].x + rx + (Math.random() - 0.5) * 0.01, // Add slight jitter
        y: gesture.landmarks[0].y + ry + (Math.random() - 0.5) * 0.01,
        z: l.z + (Math.random() - 0.5) * 0.01,
      };
    });
    
    variations.push({
      ...gesture,
      landmarks: augmentedLandmarks
    });
  }
  
  return variations;
}

/**
 * Calculates the Euclidean distance between two feature vectors.
 */
function calculateDistance(v1: number[], v2: number[]): number {
  let sum = 0;
  for (let i = 0; i < v1.length; i++) {
    sum += Math.pow(v1[i] - v2[i], 2);
  }
  return Math.sqrt(sum);
}

/**
 * ML Classifier using Distance-Weighted KNN with high-dimensional feature vectors.
 */
export function classifyML(
  currentLandmarks: NormalizedLandmark[], 
  dataset: GestureData[]
): { gesture: GestureData; confidence: number } | null {
  if (dataset.length === 0) return null;

  const currentFeatures = getFeatureVector(currentLandmarks);
  
  // Find K nearest neighbors (K=5 for better voting stability)
  const K = 5;
  const neighbors = dataset.map(item => ({
    item,
    distance: calculateDistance(currentFeatures, getFeatureVector(item.landmarks))
  })).sort((a, b) => a.distance - b.distance).slice(0, K);

  // Weighted Voting: Closer neighbors have more influence
  const votes: Record<string, { score: number; gesture: GestureData; minDistance: number }> = {};
  
  neighbors.forEach((n, index) => {
    const name = n.item.name;
    // Weight is inverse of distance (plus small epsilon to avoid div by zero)
    const weight = 1 / (n.distance + 0.001);
    
    if (!votes[name]) {
      votes[name] = { score: 0, gesture: n.item, minDistance: n.distance };
    }
    votes[name].score += weight;
    votes[name].minDistance = Math.min(votes[name].minDistance, n.distance);
  });

  // Find the winner
  let winner = Object.values(votes).sort((a, b) => b.score - a.score)[0];
  
  // Confidence calculation based on distance and vote strength
  const confidence = Math.max(0, 1 - (winner.minDistance / 180));

  if (winner && confidence > 0.60) {
    return { gesture: winner.gesture, confidence };
  }

  return null;
}
