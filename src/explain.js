// Plain-language readings of each measurement: a short verdict plus a few sentences.
// Bands are loose, descriptive ranges around classical drawing guides, not judgments.

const f2 = (x) => x.toFixed(2);
const pct = (x) => `${Math.round(x * 100)}%`;

function band(value, low, high) {
  return value < low ? 'low' : value > high ? 'high' : 'mid';
}

export const PROPORTION_EXPLAINERS = [
  {
    label: 'Eye spacing',
    key: 'eyeSpacing',
    guide: 1.0,
    measures: 'Gap between the eyes divided by the width of one eye.',
    read(v) {
      return {
        low: ['Close-set', `The gap between your eyes is about ${f2(v)} eye-widths, a bit less than the classical one eye-width. Close-set eyes draw focus toward the center of the face and the bridge of the nose.`],
        mid: ['Evenly spaced', `The gap between your eyes is about ${f2(v)} eye-widths, very close to the classical one eye-width. This is the spacing used in the “rule of fifths,” where the face is about five eyes wide.`],
        high: ['Wide-set', `The gap between your eyes is about ${f2(v)} eye-widths, a bit more than the classical one eye-width. Wide-set eyes give the middle of the face a more open look.`],
      }[band(v, 0.9, 1.1)];
    },
  },
  {
    label: 'Nose width',
    key: 'noseToEyeGap',
    guide: 1.0,
    measures: 'Nose width divided by the gap between the eyes.',
    read(v) {
      return {
        low: ['Narrow', `Your nose is about ${pct(v)} as wide as the gap between your eyes, narrower than the classical guide, where the two match.`],
        mid: ['Balanced', `Your nose is about as wide as the gap between your eyes (${f2(v)}), which matches the classical guide closely.`],
        high: ['Broad', `Your nose is about ${pct(v)} as wide as the gap between your eyes, broader than the classical guide, where the two match. Nostril flare from smiling or breathing can push this up.`],
      }[band(v, 0.9, 1.12)];
    },
  },
  {
    label: 'Mouth width',
    key: 'mouthToNose',
    guide: 1.5,
    measures: 'Mouth width divided by nose width.',
    read(v) {
      return {
        low: ['Compact', `Your mouth is about ${f2(v)}× the width of your nose, narrower than the classical 1.5×. A compact mouth keeps the lower face looking narrow.`],
        mid: ['Balanced', `Your mouth is about ${f2(v)}× the width of your nose, close to the classical 1.5×. In drawing terms, the mouth corners line up roughly under the inner edges of the irises.`],
        high: ['Wide', `Your mouth is about ${f2(v)}× the width of your nose, wider than the classical 1.5×. Even a slight smile widens the mouth, so a neutral expression gives the truest reading.`],
      }[band(v, 1.35, 1.65)];
    },
  },
  {
    label: 'Lip ratio',
    key: 'lipRatio',
    guide: 1.6,
    measures: 'Lower lip height divided by upper lip height.',
    read(v) {
      return {
        low: ['Even lips', `Your lower lip is about ${f2(v)}× the height of your upper lip, so your lips are closer in fullness than the classical 1.6×. That usually means a relatively full upper lip.`],
        mid: ['Classic ratio', `Your lower lip is about ${f2(v)}× the height of your upper lip, close to the classical 1.6×, where the lower lip is noticeably fuller.`],
        high: ['Fuller lower lip', `Your lower lip is about ${f2(v)}× the height of your upper lip, more than the classical 1.6×, so most of the lip fullness is in the lower lip.`],
      }[band(v, 1.3, 1.9)];
    },
  },
  {
    label: 'Jaw to cheekbones',
    key: 'jawToCheek',
    guide: null,
    measures: 'Jaw width relative to cheekbone width.',
    read(v) {
      return {
        low: ['Tapered jaw', `Your jaw is about ${pct(v)} as wide as your cheekbones, so the face narrows noticeably toward the chin. This is typical of heart and diamond shapes.`],
        mid: ['Moderate jaw', `Your jaw is about ${pct(v)} as wide as your cheekbones, a gentle taper from cheeks to chin. This is typical of oval faces.`],
        high: ['Strong jaw', `Your jaw is about ${pct(v)} as wide as your cheekbones, so the lower face stays broad down to the jaw angle. This is typical of square and oblong shapes.`],
      }[band(v, 0.78, 0.88)];
    },
  },
  {
    label: 'Forehead to cheekbones',
    key: 'foreheadToCheek',
    guide: null,
    measures: 'Forehead width relative to cheekbone width.',
    read(v) {
      return {
        low: ['Narrow forehead', `Your forehead is about ${pct(v)} as wide as your cheekbones, so the cheekbones are clearly the widest point of the face. This is typical of diamond shapes.`],
        mid: ['Balanced forehead', `Your forehead is about ${pct(v)} as wide as your cheekbones, a common, balanced relationship between the upper and middle face.`],
        high: ['Broad forehead', `Your forehead is about ${pct(v)} as wide as your cheekbones, nearly matching them. This is typical of heart and square shapes.`],
      }[band(v, 0.75, 0.9)];
    },
  },
];

const REGION_NOTES = {
  Eyes: 'Compares the corners and lids of each eye: height, size and distance from the center line.',
  Brows: 'Compares the height and arch of each eyebrow. Brows are very expressive, so a slight raise on one side lowers this quickly.',
  Nose: 'Compares the nostrils on each side of the center line. A nose that leans slightly to one side shows up here.',
  Mouth: 'Compares the mouth corners and lip outline on each side. A lopsided smile or relaxed corner lowers it.',
  Jaw: 'Compares the jaw angles and cheek edges. Turning your head even slightly affects this region the most.',
};

export function readSymmetry(name, v) {
  const verdict = v >= 92 ? 'Very closely matched' : v >= 84 ? 'Typical' : 'Noticeable difference';
  const detail =
    v >= 92
      ? 'The two sides line up almost exactly here.'
      : v >= 84
        ? 'There’s a small difference between sides, which is normal. Most faces score in this range.'
        : 'One side differs more clearly here. Some of this is natural, but a head turn, uneven light or expression can exaggerate it, so it’s worth comparing with a second capture.';
  return [verdict, `${detail} ${REGION_NOTES[name]}`];
}

export function readThirds(m) {
  const thirds = [
    ['upper', m.thirdUpper, 'The forehead takes up more of the face, which tends to emphasize the brow and eyes.'],
    ['middle', m.thirdMiddle, 'The span from brows to the base of the nose is the longest, giving the middle of the face more presence.'],
    ['lower', m.thirdLower, 'The lips, chin and jaw take up more of the face, giving the lower face more weight.'],
  ];
  const spread = Math.max(m.thirdUpper, m.thirdMiddle, m.thirdLower) - Math.min(m.thirdUpper, m.thirdMiddle, m.thirdLower);
  if (spread < 0.06) {
    return ['Evenly balanced', `Your three sections are within ${Math.round(spread * 100)} points of each other, very close to the classical equal thirds.`];
  }
  const [name, v, meaning] = thirds.sort((a, b) => b[1] - a[1])[0];
  return [`Longer ${name} third`, `Your ${name} third is ${pct(v)} of your face length, the largest of the three (equal would be 33%). ${meaning}`];
}
