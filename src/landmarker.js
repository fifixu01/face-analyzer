import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.0/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

let filesetPromise;
const instances = {};

/** Returns a FaceLandmarker for 'VIDEO' (live) or 'IMAGE' (stills). Created once, then cached. */
export function getLandmarker(runningMode) {
  filesetPromise ??= FilesetResolver.forVisionTasks(WASM_URL);
  instances[runningMode] ??= filesetPromise.then((fileset) =>
    FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
      runningMode,
      numFaces: 1,
      outputFaceBlendshapes: runningMode === 'IMAGE',
    }),
  );
  return instances[runningMode];
}

export const TESSELATION = FaceLandmarker.FACE_LANDMARKS_TESSELATION;
