# Face Analyzer

A browser app that maps your face with [MediaPipe Face Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker) (478 landmarks) and analyzes its geometry. Everything runs on your device, and no images are uploaded.

- **Live webcam:** a face mesh drawn over the video, with symmetry, face shape, facial thirds and eye spacing updating in real time
- **See my full results:** freezes the frame and opens a detailed report with an annotated photo, symmetry by region, proportions vs. classical guides and a written summary
- **Upload:** the same detailed report for a photo

## Run

```sh
npm install
npm run dev
```

Open the printed localhost URL. Camera access requires `localhost` or HTTPS.

## Code map

- `src/analyze.js`: landmark indices, metrics, face-shape heuristic, smoothing
- `src/main.js`: webcam loop, capture, upload, view switching
- `src/report.js`: detailed results page
- `src/draw.js`: mesh and measurement overlays
- `src/landmarker.js`: MediaPipe model loading

## Known limitations

- The face-shape thresholds in `faceShape()` are a starting point and need tuning on real photos.
- Landmark 10 (top of the mesh) sits below the real hairline, so face length and the upper third read short.
- These are 2D measurements from a single image. Head turn, lens distortion and expression all affect them.
