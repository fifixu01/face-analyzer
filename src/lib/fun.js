// "Just for fun": an animal face type, based on the popular fox / cat / puppy / deer / bunny / bear types.
// Not scientific. It's a playful read of the same measurements as the rest of the report.

// Each feature becomes a z-score: how far from a typical value, in "typical spreads".
// Typical values are rough estimates for MediaPipe measurements and can be tuned.
const FEATURES = {
  tilt: { key: 'canthalTilt', mean: 4, spread: 4, high: 'upturned outer eye corners', low: 'level or softly angled eye corners' },
  round: { key: 'eyeAspect', mean: 0.3, spread: 0.05, high: 'round, open eyes', low: 'almond-shaped eyes' },
  eyes: { key: 'eyeSize', mean: 0.21, spread: 0.02, high: 'large eyes for your face', low: 'smaller, refined eyes' },
  jaw: { key: 'outlineJaw', mean: 0.74, spread: 0.04, high: 'a broad, soft jaw', low: 'a tapered jaw and chin' },
  long: { key: 'outlineLength', mean: 1.08, spread: 0.06, high: 'a longer face', low: 'a shorter, rounder face' },
  lower: { key: 'thirdLower', mean: 0.34, spread: 0.03, high: 'a longer lower face', low: 'a compact lower face' },
  mouth: { key: 'mouthToNose', mean: 1.5, spread: 0.15, high: 'a wide mouth', low: 'a small mouth' },
};

// Weights: positive means "more of this feature fits the animal", negative means "less".
const ANIMALS = {
  Fox: {
    weights: { tilt: 1, round: -1, jaw: -0.7, long: 0.3 },
    blurb: 'Fox features are sharp and elegant: lifted, narrow eyes and a face that tapers to a defined chin. The look often reads as sly and alluring.',
  },
  Cat: {
    weights: { tilt: 1, round: 0.3, eyes: 0.3, jaw: -0.3 },
    blurb: 'Cat features pair lifted outer eye corners with larger, wider-open eyes than a fox. They read as striking and a little aloof.',
  },
  Puppy: {
    weights: { tilt: -1, round: 0.7, long: -0.5, jaw: 0.2 },
    blurb: 'Puppy features are soft and friendly: round eyes that sit level or turn slightly down at the corners, and a gentle, rounded face. Approachable and warm.',
  },
  Deer: {
    weights: { eyes: 1, round: 0.7, jaw: -0.5, long: 0.2 },
    blurb: 'Deer features center on big, clear eyes in a slim, gently tapered face. They read as calm and innocent.',
  },
  Bunny: {
    weights: { round: 0.6, lower: -0.8, mouth: -0.6, eyes: 0.3 },
    blurb: 'Bunny features are sweet and compact: round eyes, a small mouth and a short lower face. Playful and youthful.',
  },
  Bear: {
    weights: { jaw: 1, long: -0.7, eyes: -0.6 },
    blurb: 'Bear features are sturdy and soft: a broad jaw, a fuller, rounder face and smaller eyes relative to it. Comforting and dependable.',
  },
};

export function animalType(m) {
  const z = {};
  for (const [name, f] of Object.entries(FEATURES)) {
    z[name] = Math.max(-2.5, Math.min(2.5, (m[f.key] - f.mean) / f.spread));
  }

  const scored = Object.entries(ANIMALS).map(([animal, { weights, blurb }]) => {
    const contributions = Object.entries(weights).map(([feat, w]) => ({ feat, value: w * z[feat] }));
    const total = contributions.reduce((s, c) => s + c.value, 0) / Object.keys(weights).length;
    // The traits that pushed hardest toward this animal, described in your actual direction.
    const traits = contributions
      .filter((c) => c.value > 0.3)
      .sort((a, b) => b.value - a.value)
      .slice(0, 3)
      .map(({ feat }) => (z[feat] > 0 ? FEATURES[feat].high : FEATURES[feat].low));
    return { animal, total, blurb, traits };
  });

  scored.sort((a, b) => b.total - a.total);
  return { primary: scored[0], secondary: scored[1] };
}
