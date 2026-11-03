// Plain-language readings of each measurement: a short verdict plus a few sentences.
// Bands are loose, descriptive ranges, not judgments. Ranges for the newer measurements
// (marked "estimate") are educated guesses and should be tuned against real photos.

const f2 = (x) => x.toFixed(2);
const pct = (x) => `${Math.round(x * 100)}%`;
const deg = (x) => `${x >= 0 ? '+' : ''}${x.toFixed(1)}°`;

function band(value, low, high) {
  return value < low ? 'low' : value > high ? 'high' : 'mid';
}

/** Builds an item whose reading depends on which of three bands the value falls in. */
const item = (label, key, { guide = null, format = f2, measures, low, high, text }) => ({
  label,
  key,
  guide,
  format,
  measures,
  read: (v) => text(v)[band(v, low, high)],
});

export const FEATURE_GROUPS = [
  {
    title: 'Eyes',
    items: [
      item('Roundness', 'eyeAspect', {
        measures: 'Eye opening height divided by eye width. Estimate.',
        low: 0.27, high: 0.34,
        text: (v) => ({
          low: ['Almond', `Your eyes are about ${pct(v)} as tall as they are wide, a longer, almond shape. Almond eyes look sleek and are the most common shape.`],
          mid: ['Balanced', `Your eyes are about ${pct(v)} as tall as they are wide, between almond and round.`],
          high: ['Round', `Your eyes are about ${pct(v)} as tall as they are wide, a rounder, more open shape. Round eyes show more of the iris and white and read as bright and expressive.`],
        }),
      }),
      item('Size', 'eyeSize', {
        format: pct,
        measures: 'Eye width as a share of face width (cheekbone to cheekbone). Estimate.',
        low: 0.19, high: 0.23,
        text: (v) => ({
          low: ['Smaller', `Each eye spans about ${pct(v)} of your face width, on the smaller side. Smaller eyes put more visual weight on the brows and cheekbones.`],
          mid: ['Average', `Each eye spans about ${pct(v)} of your face width, a typical size.`],
          high: ['Large', `Each eye spans about ${pct(v)} of your face width, on the larger side. Large eyes tend to become the focal point of the face.`],
        }),
      }),
      item('Corner tilt', 'canthalTilt', {
        format: deg,
        measures: 'Angle from the inner to the outer eye corner. Positive means the outer corner sits higher. Estimate.',
        low: 0, high: 6,
        text: (v) => ({
          low: ['Downturned', `Your outer eye corners sit slightly lower than the inner corners (${deg(v)}). Downturned eyes read as soft and gentle.`],
          mid: ['Slight lift', `Your outer eye corners sit a little higher than the inner corners (${deg(v)}), which is the most common tilt.`],
          high: ['Lifted', `Your outer eye corners sit noticeably higher than the inner corners (${deg(v)}). This upturned, “cat eye” tilt reads as sharp and alert.`],
        }),
      }),
      item('Spacing', 'eyeSpacing', {
        guide: 1.0,
        measures: 'Gap between the eyes divided by the width of one eye.',
        low: 0.9, high: 1.1,
        text: (v) => ({
          low: ['Close-set', `The gap between your eyes is about ${f2(v)} eye-widths, a bit less than the classical one eye-width. Close-set eyes draw focus toward the center of the face.`],
          mid: ['Evenly spaced', `The gap between your eyes is about ${f2(v)} eye-widths, very close to the classical one eye-width (the “rule of fifths”).`],
          high: ['Wide-set', `The gap between your eyes is about ${f2(v)} eye-widths, a bit more than the classical one eye-width. Wide-set eyes give the middle of the face a more open look.`],
        }),
      }),
      item('Brow height', 'browHeight', {
        measures: 'Gap from the underside of the brow to the upper eyelid, divided by eye width. Estimate.',
        low: 0.4, high: 0.7,
        text: (v) => ({
          low: ['Low-set brows', `Your brows sit close to your eyes (${f2(v)} eye-widths above the lid). Low brows give a more intense, focused look and can make the lids look hooded.`],
          mid: ['Balanced', `Your brows sit a typical distance above your eyes (${f2(v)} eye-widths).`],
          high: ['High brows', `Your brows sit high above your eyes (${f2(v)} eye-widths), showing more lid. High brows read as open and expressive. Raising your brows during capture also increases this.`],
        }),
      }),
    ],
  },
  {
    title: 'Nose',
    items: [
      item('Width', 'noseToEyeGap', {
        guide: 1.0,
        measures: 'Nose width at the nostrils divided by the gap between the eyes.',
        low: 0.9, high: 1.12,
        text: (v) => ({
          low: ['Narrow', `Your nose is about ${pct(v)} as wide as the gap between your eyes, narrower than the classical guide, where the two match.`],
          mid: ['Balanced', `Your nose is about as wide as the gap between your eyes (${f2(v)}), matching the classical guide closely.`],
          high: ['Broad', `Your nose is about ${pct(v)} as wide as the gap between your eyes, broader than the classical guide. Nostril flare from smiling or breathing can push this up.`],
        }),
      }),
      item('Bridge width', 'noseBridge', {
        format: pct,
        measures: 'Width of the upper nose bridge as a share of nostril width. Estimate.',
        low: 0.5, high: 0.7,
        text: (v) => ({
          low: ['Slim bridge', `The top of your nose bridge is about ${pct(v)} as wide as your nostrils, so the nose narrows noticeably between the eyes. A slim bridge gives the nose a refined, defined line.`],
          mid: ['Medium bridge', `The top of your nose bridge is about ${pct(v)} as wide as your nostrils, a typical taper from top to bottom.`],
          high: ['Wide bridge', `The top of your nose bridge is about ${pct(v)} as wide as your nostrils, so the nose stays fairly even in width from top to bottom.`],
        }),
      }),
      item('Length', 'noseLength', {
        format: pct,
        measures: 'Top of the bridge to the base of the nose, as a share of face length. Estimate.',
        low: 0.27, high: 0.33,
        text: (v) => ({
          low: ['Short', `Your nose takes up about ${pct(v)} of your face length, on the shorter side. A short nose gives the middle of the face a compact look.`],
          mid: ['Average', `Your nose takes up about ${pct(v)} of your face length, a typical proportion.`],
          high: ['Long', `Your nose takes up about ${pct(v)} of your face length, on the longer side, giving the middle of the face more length.`],
        }),
      }),
      item('Bridge line', 'noseCurve', {
        format: pct,
        measures: 'How far the bridge bows away from a straight line, as a share of nose length (front view).',
        low: 0.025, high: 0.05,
        text: (v) => ({
          low: ['Straight', `From the front, your nose bridge runs in a straight line from between the eyes to the tip.`],
          mid: ['Slight curve', `From the front, your nose bridge has a slight curve (${pct(v)} of its length). This is common and usually not noticeable.`],
          high: ['Curved', `From the front, your nose bridge bows noticeably to one side (${pct(v)} of its length). A slight head turn can exaggerate this.`],
        }),
      }),
      item('Tip position', 'noseTipOffset', {
        format: pct,
        measures: 'How far the nose tip sits from the center line between the eyes, as a share of face width.',
        low: 0.015, high: 0.03,
        text: (v) => ({
          low: ['Centered', `Your nose tip sits right on the center line of your face.`],
          mid: ['Nearly centered', `Your nose tip sits slightly off the center line (${pct(v)} of face width). Most noses lean a little.`],
          high: ['Off-center', `Your nose tip sits off to one side of the center line (${pct(v)} of face width). Check that your head was facing straight on, since turning shifts this a lot.`],
        }),
      }),
    ],
  },
  {
    title: 'Mouth & lips',
    items: [
      item('Mouth width', 'mouthToNose', {
        guide: 1.5,
        measures: 'Mouth width divided by nose width.',
        low: 1.35, high: 1.65,
        text: (v) => ({
          low: ['Compact', `Your mouth is about ${f2(v)}× the width of your nose, narrower than the classical 1.5×.`],
          mid: ['Balanced', `Your mouth is about ${f2(v)}× the width of your nose, close to the classical 1.5×.`],
          high: ['Wide', `Your mouth is about ${f2(v)}× the width of your nose, wider than the classical 1.5×. Even a slight smile widens the mouth.`],
        }),
      }),
      item('Lip fullness', 'lipFullness', {
        format: pct,
        measures: 'Total lip height divided by mouth width. Estimate.',
        low: 0.28, high: 0.42,
        text: (v) => ({
          low: ['Thin', `Your lips are about ${pct(v)} as tall as your mouth is wide, on the thinner side.`],
          mid: ['Medium', `Your lips are about ${pct(v)} as tall as your mouth is wide, a typical fullness.`],
          high: ['Full', `Your lips are about ${pct(v)} as tall as your mouth is wide, on the fuller side.`],
        }),
      }),
      item('Lip ratio', 'lipRatio', {
        guide: 1.6,
        measures: 'Lower lip height divided by upper lip height.',
        low: 1.3, high: 1.9,
        text: (v) => ({
          low: ['Even lips', `Your lower lip is about ${f2(v)}× the height of your upper lip, closer in fullness than the classical 1.6×. That usually means a relatively full upper lip.`],
          mid: ['Classic ratio', `Your lower lip is about ${f2(v)}× the height of your upper lip, close to the classical 1.6×.`],
          high: ['Fuller lower lip', `Your lower lip is about ${f2(v)}× the height of your upper lip, more than the classical 1.6×, so most of the fullness is in the lower lip.`],
        }),
      }),
      item('Philtrum', 'philtrum', {
        format: pct,
        measures: 'The groove from the base of the nose to the top of the upper lip, as a share of the lower third. Estimate.',
        low: 0.18, high: 0.28,
        text: (v) => ({
          low: ['Short', `The space between your nose and upper lip is short (${pct(v)} of the lower face). A short philtrum tends to show more of the upper lip and reads as youthful.`],
          mid: ['Average', `The space between your nose and upper lip is a typical length (${pct(v)} of the lower face).`],
          high: ['Long', `The space between your nose and upper lip is on the longer side (${pct(v)} of the lower face).`],
        }),
      }),
    ],
  },
  {
    title: 'Face outline',
    items: [
      item('Forehead width', 'outlineForehead', {
        format: pct,
        measures: 'Forehead width as a share of the widest part of your face.',
        low: 0.77, high: 0.83,
        text: (v) => ({
          low: ['Narrow', `Your forehead is about ${pct(v)} as wide as your cheekbones, so the cheekbones are clearly the widest point. Typical of diamond shapes.`],
          mid: ['Balanced', `Your forehead is about ${pct(v)} as wide as your cheekbones, a common, balanced relationship.`],
          high: ['Broad', `Your forehead is about ${pct(v)} as wide as your cheekbones, nearly matching them. Typical of heart and square shapes.`],
        }),
      }),
      item('Jaw width', 'outlineJaw', {
        format: pct,
        measures: 'Jaw width as a share of the widest part of your face.',
        low: 0.71, high: 0.77,
        text: (v) => ({
          low: ['Tapered', `Your jaw is about ${pct(v)} as wide as your cheekbones, so the face narrows noticeably toward the chin. Typical of heart and diamond shapes.`],
          mid: ['Moderate', `Your jaw is about ${pct(v)} as wide as your cheekbones, a gentle taper. Typical of oval faces.`],
          high: ['Strong', `Your jaw is about ${pct(v)} as wide as your cheekbones, so the lower face stays broad. Typical of square and oblong shapes.`],
        }),
      }),
      item('Chin length', 'chinLength', {
        format: pct,
        measures: 'Bottom of the lower lip to the bottom of the chin, as a share of the lower third. Estimate.',
        low: 0.36, high: 0.46,
        text: (v) => ({
          low: ['Short', `Your chin takes up about ${pct(v)} of the lower face, on the shorter side, which keeps the lower face compact.`],
          mid: ['Average', `Your chin takes up about ${pct(v)} of the lower face, a typical proportion.`],
          high: ['Long', `Your chin takes up about ${pct(v)} of the lower face, on the longer side, which gives the jawline more presence.`],
        }),
      }),
    ],
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
