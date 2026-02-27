import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

export interface GestureResult {
  name: string;
  emoji: string;
  category: string;
}

export function classifyTwoHandGesture(hand1: NormalizedLandmark[], hand2: NormalizedLandmark[]): GestureResult | null {
  if (!hand1 || !hand2 || hand1.length < 21 || hand2.length < 21) return null;

  const getDist = (p1: any, p2: any) => 
    Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));

  // ISL A: Index of one hand touches thumb of other
  const distH1IndexH2Thumb = getDist(hand1[8], hand2[4]);
  const distH2IndexH1Thumb = getDist(hand2[8], hand1[4]);
  if (distH1IndexH2Thumb < 0.05 || distH2IndexH1Thumb < 0.05) {
    return { name: "A (ISL)", emoji: "🅰️", category: "alphabet" };
  }

  // ISL B: Both hands form circles and touch
  const isH1Circle = getDist(hand1[4], hand1[8]) < 0.06;
  const isH2Circle = getDist(hand2[4], hand2[8]) < 0.06;
  const distHands = getDist(hand1[8], hand2[8]);
  if (isH1Circle && isH2Circle && distHands < 0.1) {
    return { name: "B (ISL)", emoji: "🇧", category: "alphabet" };
  }

  // ISL C: One hand forms C, other hand index touches it
  // (Simplified)

  return null;
}

class MotionTracker {
  private history: { x: number; y: number; time: number }[] = [];
  private readonly maxAge = 1000; // 1 second buffer

  add(point: { x: number; y: number }) {
    const now = Date.now();
    this.history.push({ ...point, time: now });
    this.history = this.history.filter(p => now - p.time < this.maxAge);
  }

  isDrawingJ(): boolean {
    if (this.history.length < 10) return false;
    
    // Check for a 'J' shape: starts high, goes down, then curves left/up
    const start = this.history[0];
    const mid = this.history[Math.floor(this.history.length / 2)];
    const end = this.history[this.history.length - 1];

    const verticalDrop = mid.y - start.y;
    const horizontalCurve = end.x - mid.x; // Mirroring might affect this
    const endRise = mid.y - end.y;

    // J curve: down then left-up (mirrored: right-up)
    return verticalDrop > 0.05 && Math.abs(horizontalCurve) > 0.03 && endRise > 0.02;
  }

  clear() {
    this.history = [];
  }
}

const pinkyTracker = new MotionTracker();
const indexTracker = new MotionTracker();

export function classifyGesture(landmarks: NormalizedLandmark[]): GestureResult | null {
  if (!landmarks || landmarks.length < 21) {
    pinkyTracker.clear();
    indexTracker.clear();
    return null;
  }

  // Basic heuristic-based classification
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const middleTip = landmarks[12];
  const ringTip = landmarks[16];
  const pinkyTip = landmarks[20];
  
  const indexBase = landmarks[5];
  const middleBase = landmarks[9];
  const ringBase = landmarks[13];
  const pinkyBase = landmarks[17];

  // Track pinky for dynamic 'J'
  pinkyTracker.add({ x: pinkyTip.x, y: pinkyTip.y });
  // Track index for dynamic 'Z'
  indexTracker.add({ x: indexTip.x, y: indexTip.y });

  // Helper to calculate Euclidean distance
  const getDist = (p1: any, p2: any) => 
    Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));

  // Check if fingers are extended
  const isIndexUp = indexTip.y < indexBase.y - 0.05;
  const isMiddleUp = middleTip.y < middleBase.y - 0.05;
  const isRingUp = ringTip.y < ringBase.y - 0.05;
  const isPinkyUp = pinkyTip.y < pinkyBase.y - 0.05;
  
  // Thumb states
  const isThumbUp = thumbTip.y < landmarks[2].y - 0.03;
  const isThumbOut = Math.abs(thumbTip.x - landmarks[2].x) > 0.12;

  // Distances for "touching" gestures
  const distThumbIndex = getDist(thumbTip, indexTip);
  const distThumbMiddle = getDist(thumbTip, middleTip);
  const distThumbRing = getDist(thumbTip, ringTip);
  const distThumbPinky = getDist(thumbTip, pinkyTip);

  // Helper to check if hand is upright (not sideways)
  const isUpright = Math.abs(landmarks[0].y - landmarks[9].y) > Math.abs(landmarks[0].x - landmarks[9].x) * 1.2;

  // 0. DYNAMIC: J
  if (isPinkyUp && !isIndexUp && !isMiddleUp && !isRingUp && pinkyTracker.isDrawingJ()) {
    return { name: "J", emoji: "🇯", category: "alphabet" };
  }

  // DYNAMIC: Z (Drawing a Z shape with index)
  const isDrawingZ = () => {
    const history = (indexTracker as any).history;
    if (history.length < 20) return false; // More points for stability
    const start = history[0];
    const mid = history[Math.floor(history.length / 2)];
    const end = history[history.length - 1];
    
    // Stricter Z shape: horizontal, diagonal, horizontal
    // Check for significant horizontal movement at start and end, and vertical movement overall
    const dx = Math.abs(start.x - end.x);
    const dy = Math.abs(start.y - end.y);
    const midDx = Math.abs(start.x - mid.x);
    
    return dx > 0.15 && dy > 0.1 && midDx > 0.08;
  };
  if (isIndexUp && !isMiddleUp && !isRingUp && !isPinkyUp && isDrawingZ()) {
    return { name: "Z", emoji: "🇿", category: "alphabet" };
  }

  // 1. L (Index up, Thumb out)
  // Ensure thumb is significantly out and index is clearly up
  if (isIndexUp && isThumbOut && !isMiddleUp && !isRingUp && !isPinkyUp) {
    return { name: "L", emoji: "🇱", category: "alphabet" };
  }

  // R vs U vs V
  if (isIndexUp && isMiddleUp && !isRingUp && !isPinkyUp) {
    const distTips = getDist(indexTip, middleTip);
    // R: Crossed (Middle tip usually moves to the other side of index tip)
    // In mirrored view, index is usually on the right (smaller x)
    const isCrossed = middleTip.x < indexTip.x; 
    if (isCrossed || distTips < 0.02) return { name: "R", emoji: "🇷", category: "alphabet" };
    // U: Together
    if (distTips < 0.05) return { name: "U", emoji: "🇺", category: "alphabet" };
    // V: Spread
    return { name: "V / 2", emoji: "✌️", category: "alphabet" };
  }

  // 2. D (Index up, others touching thumb)
  if (isIndexUp && !isMiddleUp && !isRingUp && !isPinkyUp && distThumbMiddle < 0.08) {
    return { name: "D", emoji: "🇩", category: "alphabet" };
  }

  // 3. F / 9 / OK (Thumb and Index touching, others up)
  if (distThumbIndex < 0.06 && isMiddleUp && isRingUp && isPinkyUp) {
    return { name: "F", emoji: "🇫", category: "alphabet" };
  }

  // 5. W / 6 (Index, Middle, Ring up)
  if (isIndexUp && isMiddleUp && isRingUp && !isPinkyUp && !isThumbOut) {
    return { name: "W", emoji: "🇼", category: "alphabet" };
  }

  // 6. Y (Thumb and Pinky out)
  if (isThumbOut && isPinkyUp && !isIndexUp && !isMiddleUp && !isRingUp) {
    return { name: "Y", emoji: "🇾", category: "alphabet" };
  }

  // 7. I (Pinky up)
  if (isPinkyUp && !isIndexUp && !isMiddleUp && !isRingUp && !isThumbOut) {
    return { name: "I", emoji: "🇮", category: "alphabet" };
  }

  // 8. B (All fingers up and together)
  if (isIndexUp && isMiddleUp && isRingUp && isPinkyUp) {
    return { name: "B", emoji: "🇧", category: "alphabet" };
  }

  // 9. C (Curved hand)
  const isCurved = !isIndexUp && !isMiddleUp && !isRingUp && !isPinkyUp && 
                   indexTip.y < indexBase.y && thumbTip.y < landmarks[2].y &&
                   distThumbIndex > 0.1 && distThumbIndex < 0.2;
  if (isCurved) {
    return { name: "C", emoji: "🇨", category: "alphabet" };
  }

  // 10. O (All fingers touching thumb)
  if (distThumbIndex < 0.06 && distThumbMiddle < 0.06 && distThumbRing < 0.06 && distThumbPinky < 0.06) {
    return { name: "O", emoji: "🇴", category: "alphabet" };
  }

  // 11. G / H (Pointing forward)
  // G: Index and thumb forward
  const isPointingForward = Math.abs(indexTip.y - indexBase.y) < 0.08 && Math.abs(indexTip.z - indexBase.z || 0) < 0.1;
  if (isPointingForward && indexTip.x < indexBase.x - 0.06) {
    if (middleTip.x < middleBase.x - 0.06) return { name: "H", emoji: "🇭", category: "alphabet" };
    return { name: "G", emoji: "🇬", category: "alphabet" };
  }

  // 12. P / Q (Pointing down)
  if (indexTip.y > indexBase.y + 0.08) {
    if (middleTip.y > middleBase.y + 0.08) return { name: "P", emoji: "🇵", category: "alphabet" };
    return { name: "Q", emoji: "🇶", category: "alphabet" };
  }

  // 10. Thumbs Up
  if (isUpright && isThumbUp && !isIndexUp && !isMiddleUp && !isRingUp && !isPinkyUp) {
    return { name: "Thumbs Up", emoji: "👍", category: "response" };
  }

  // 15. Thumbs Down
  const isThumbDown = thumbTip.y > landmarks[2].y + 0.03;
  if (isUpright && isThumbDown && !isIndexUp && !isMiddleUp && !isRingUp && !isPinkyUp) {
    return { name: "Thumbs Down", emoji: "👎", category: "response" };
  }

  // 13. FIST ALPHABETS (A, E, M, N, S, T)
  if (!isIndexUp && !isMiddleUp && !isRingUp && !isPinkyUp) {
    // A: Thumb on side
    if (isThumbOut || thumbTip.x > indexTip.x + 0.02) return { name: "A", emoji: "🅰️", category: "alphabet" };
    
    // E: Fingers curled down, thumb tucked in front
    if (thumbTip.y > indexTip.y + 0.01 && thumbTip.y > middleTip.y + 0.01 && !isThumbOut) return { name: "E", emoji: "🇪", category: "alphabet" };

    const isBetween = (val: number, a: number, b: number) => val > Math.min(a, b) - 0.01 && val < Math.max(a, b) + 0.01;

    // M: Thumb under 3 fingers (between ring and pinky)
    if (thumbTip.x > ringBase.x - 0.02 && thumbTip.x < pinkyBase.x + 0.02 && thumbTip.y > ringBase.y) 
      return { name: "M", emoji: "🇲", category: "alphabet" };
    
    // N: Thumb under 2 fingers (between middle and ring)
    if (thumbTip.x > middleBase.x - 0.02 && thumbTip.x < ringBase.x + 0.02 && thumbTip.y > middleBase.y) 
      return { name: "N", emoji: "🇳", category: "alphabet" };
    
    // T: Thumb under 1 finger (between index and middle)
    if (thumbTip.x > indexBase.x - 0.02 && thumbTip.x < middleBase.x + 0.02 && thumbTip.y > indexBase.y) 
      return { name: "T", emoji: "🇹", category: "alphabet" };
    
    // S: Thumb over fingers (centered)
    if (thumbTip.y < indexTip.y && thumbTip.x > indexBase.x && thumbTip.x < ringBase.x)
      return { name: "S", emoji: "🇸", category: "alphabet" };
      
    return { name: "A", emoji: "🅰️", category: "alphabet" };
  }

  // 14. X (Index hooked)
  const isIndexHooked = indexTip.y > indexBase.y && indexTip.y < landmarks[6].y;
  if (isIndexHooked && !isMiddleUp && !isRingUp && !isPinkyUp && !isThumbOut) {
     return { name: "X", emoji: "🇽", category: "alphabet" };
  }

  // 9. I Love You / Y
  if (isThumbOut && isPinkyUp && !isIndexUp && !isMiddleUp && !isRingUp) {
    return { name: "Y", emoji: "🇾", category: "alphabet" };
  }
  
  if (isThumbOut && isIndexUp && isPinkyUp && !isMiddleUp && !isRingUp) {
    return { name: "I Love You", emoji: "🤟", category: "expression" };
  }

  return null;
}

/**
 * Specialized classifier for numbers 0-9 for the Calculator mode.
 */
export function classifyNumber(landmarks: NormalizedLandmark[]): string | null {
  if (!landmarks || landmarks.length < 21) return null;

  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const middleTip = landmarks[12];
  const ringTip = landmarks[16];
  const pinkyTip = landmarks[20];
  
  const indexBase = landmarks[5];
  const middleBase = landmarks[9];
  const ringBase = landmarks[13];
  const pinkyBase = landmarks[17];

  const getDist = (p1: any, p2: any) => 
    Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));

  const isIndexUp = indexTip.y < indexBase.y - 0.05;
  const isMiddleUp = middleTip.y < middleBase.y - 0.05;
  const isRingUp = ringTip.y < ringBase.y - 0.05;
  const isPinkyUp = pinkyTip.y < pinkyBase.y - 0.05;
  const isThumbUp = thumbTip.y < landmarks[2].y - 0.03;

  // 1: Index up
  if (isIndexUp && !isMiddleUp && !isRingUp && !isPinkyUp) return "1";
  // 2: Index, Middle up
  if (isIndexUp && isMiddleUp && !isRingUp && !isPinkyUp) return "2";
  // 3: Thumb, Index, Middle up
  if (isThumbUp && isIndexUp && isMiddleUp && !isRingUp && !isPinkyUp) return "3";
  // 4: 4 fingers up
  if (isIndexUp && isMiddleUp && isRingUp && isPinkyUp && !isThumbUp) return "4";
  // 5: 5 fingers up
  if (isIndexUp && isMiddleUp && isRingUp && isPinkyUp && isThumbUp) return "5";
  
  // 6: Thumb touching pinky
  if (getDist(thumbTip, pinkyTip) < 0.06 && isIndexUp && isMiddleUp && isRingUp) return "6";
  // 7: Thumb touching ring
  if (getDist(thumbTip, ringTip) < 0.06 && isIndexUp && isMiddleUp && isPinkyUp) return "7";
  // 8: Thumb touching middle
  if (getDist(thumbTip, middleTip) < 0.06 && isIndexUp && isRingUp && isPinkyUp) return "8";
  // 9: Thumb touching index
  if (getDist(thumbTip, indexTip) < 0.06 && isMiddleUp && isRingUp && isPinkyUp) return "9";
  
  // 0: O shape
  if (getDist(thumbTip, indexTip) < 0.06 && getDist(thumbTip, middleTip) < 0.06) return "0";

  return null;
}
