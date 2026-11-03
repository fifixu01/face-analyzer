# Face Analyzer

A browser app that maps your face with [MediaPipe Face Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker) (478 landmarks) and analyzes its geometry. Everything runs on your device, and no images are uploaded.

- **Webcam:** a guide oval and checklist (distance, centering, head angle, lighting, neutral expression) make sure the shot is right, then it auto-captures
- **Results:** analysis runs on the frozen frame: a detailed report with an annotated photo, symmetry by region, proportions vs. classical guides and a written summary

## Run

```sh
npm install
npm run dev
```

Open the printed localhost URL. Camera access requires `localhost` or HTTPS.

## Stack

React 19 + TypeScript, [Motion](https://motion.dev) for animation, Tailwind CSS v4, Vite. Face tracking runs locally with MediaPipe.

Preview the results screen without a camera: run `npm run dev` and open `http://localhost:5173/?demo`.

## Code map

- `src/App.tsx`: screens (home, camera, analyzing, results) and transitions
- `src/components/`: `Home`, `CameraView` (preview loop, checklist, auto-capture), `Results`, `AnimalCard`, `FaceArt`, shared `ui`
- `src/lib/`: framework-free logic
  - `analyze.js`: landmark indices, metrics, face-shape heuristic
  - `quality.js`: capture checks (head pose, lighting, expression, framing)
  - `hairline.js`: hairline detection
  - `explain.js`: plain-language readings for each measurement
  - `fun.js`: animal face type
  - `draw.js`: mesh and measurement overlays
  - `analyzeStill.js`: full analysis of a captured frame
- `src/index.css`: Tailwind theme (colors, fonts)

## Known limitations

- The face-shape thresholds in `faceShape()` are a starting point and need tuning on real photos.
- The hairline is found by scanning the photo for the skin-to-hair color change (`src/hairline.js`). With no clear hairline (bald, hat, hair close to skin tone), it falls back to the top of the mesh, which sits partway up the forehead.
- These are 2D measurements from a single image. Head turn, lens distortion and expression all affect them.
