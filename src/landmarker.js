import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.0/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

let filesetPromise;
const instances = {};

/** Returns a FaceLandmarker for 'VIDEO' (camera preview) or 'IMAGE' (stills). Created once, then cached. */
export function getLandmarker(runningMode) {
  filesetPromise ??= FilesetResolver.forVisionTasks(WASM_URL);
  instances[runningMode] ??= filesetPromise.then((fileset) =>
    FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
      runningMode,
      numFaces: 1,
      outputFaceBlendshapes: true, // expression checks (eyes open, neutral face)
      outputFacialTransformationMatrixes: true, // head angle checks
    }),
  );
  return instances[runningMode];
}

// Visual only: per-feature outlines. Analysis still uses all 478 landmarks.
export const FEATURES = {
  oval: FaceLandmarker.FACE_LANDMARKS_FACE_OVAL,
  brows: [...FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW, ...FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW],
  eyes: [...FaceLandmarker.FACE_LANDMARKS_LEFT_EYE, ...FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE],
  lips: FaceLandmarker.FACE_LANDMARKS_LIPS,
};
