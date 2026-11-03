import { useEffect, useState } from 'react';
import { getLandmarker } from '../lib/landmarker.js';

// Start loading both models as soon as the app loads, so the camera is ready by the time it's needed.
const ready = Promise.all([getLandmarker('VIDEO'), getLandmarker('IMAGE')]);

export type ModelStatus = 'loading' | 'ready' | 'error';

export function useModelStatus(): ModelStatus {
  const [status, setStatus] = useState<ModelStatus>('loading');
  useEffect(() => {
    let active = true;
    ready.then(
      () => active && setStatus('ready'),
      (e) => {
        console.error(e);
        if (active) setStatus('error');
      },
    );
    return () => {
      active = false;
    };
  }, []);
  return status;
}
