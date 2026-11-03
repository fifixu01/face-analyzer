// Plain-language readings of each measurement: a short verdict plus a few sentences.
//
// "typical" values come from MediaPipe's own average face model (the canonical face mesh), so an
// average face lands in the middle band for every measurement. "spread" is an estimate of how much
// faces vary, and sets how far from typical a value has to be before it's called out. Tune spreads
// against real photos.

const f2 = (x) => x.toFixed(2);
const pct = (x) => `${Math.round(x * 100)}%`;
const deg = (x) => `${x >= 0 ? '+' : ''}${x.toFixed(1)}°`;

/**
 * Builds an item whose reading depends on whether the value is below, near or above typical.
 * The middle band is typical ± 0.75 spread.
 */
const item = (label, key, { format = f2, measures, typical, spread, text }) => ({
  label,
  key,
  format,
  measures,
  typical,
  spread,
  read: (v) => {
    const b = v < typical - 0.75 * spread ? 'low' : v > typical + 0.75 * spread ? 'high' : 'mid';
    return [...text(v)[b], b];
  },
});

/** The band ('low' | 'mid' | 'high') an item lands in, for building headlines. */
const bandOf = (group, key, m) => group.items.find((i) => i.key === key).read(m[key])[2];
const pick = (band, words) => words[band];

const EYES = {
  title: 'Eyes',
  headline(m) {
    const shape = pick(bandOf(this, 'eyeAspect', m), { low: 'almond', mid: 'soft almond', high: 'round' });
    const tilt = pick(bandOf(this, 'canthalTilt', m), { low: 'Downturned ', mid: '', high: 'Upturned ' });
    const text = `${tilt}${shape} eyes`;
    return text[0].toUpperCase() + text.slice(1);
  },
  items: [
    item('Shape', 'eyeAspect', {
      format: pct,
      measures: 'Tallest point of the eye opening divided by the eye’s width.',
      typical: 0.26, spread: 0.035,
      text: (v) => ({
        low: ['Almond', `Your eyes are about ${pct(v)} as tall as they are wide: a long, narrow almond shape. Almond eyes look sleek and elongated.`],
        mid: ['Soft almond', `Your eyes are about ${pct(v)} as tall as they are wide, the most common shape: almond with a gentle curve to the lids.`],
        high: ['Round', `Your eyes are about ${pct(v)} as tall as they are wide: a round, open shape that shows more of the iris. Round eyes read as bright and expressive.`],
      }),
    }),
    item('Corner tilt', 'canthalTilt', {
      format: deg,
      measures: 'Angle from the inner corner to the outer corner. Positive means the outer corner sits higher.',
      typical: 1.7, spread: 3,
      text: (v) => ({
        low: ['Downturned', `Your outer corners sit lower than a typical eye (${deg(v)}). Downturned eyes read as soft, gentle and a little dreamy.`],
        mid: ['Neutral', `Your outer corners sit about level with your inner corners, with a slight lift (${deg(v)}). This is the most common tilt.`],
        high: ['Upturned', `Your outer corners sit clearly higher than your inner corners (${deg(v)}). This lifted, “cat eye” tilt reads as sharp and alert.`],
      }),
    }),
    item('Upper lid peak', 'eyeLidPeak', {
      format: pct,
      measures: 'Where the highest point of the upper lid sits, from the inner corner (0%) to the outer corner (100%).',
      typical: 0.4, spread: 0.07,
      text: (v) => ({
        low: ['Peaks toward the inner corner', `The highest point of your upper lid sits ${pct(v)} of the way out from the inner corner. The lid rises quickly near the nose, and the outer half slopes down, which gives a softer, rounder look.`],
        mid: ['Peaks near the center', `The highest point of your upper lid sits ${pct(v)} of the way out from the inner corner, near the middle. This gives the eye a balanced arch.`],
        high: ['Peaks toward the outer corner', `The highest point of your upper lid sits ${pct(v)} of the way out from the inner corner. A lid that peaks toward the outside makes the eye look lifted and elongated, like a natural winged shape.`],
      }),
    }),
    item('Lower lid curve', 'eyeLowerArc', {
      format: pct,
      measures: 'How far the lower lid dips below the corner-to-corner line, as a share of eye width.',
      typical: 0.128, spread: 0.02,
      text: (v) => ({
        low: ['Straight lower lid', `Your lower lid runs fairly flat between the corners (dips ${pct(v)} of eye width). A straight lower lid is a hallmark of almond and hunter eyes.`],
        mid: ['Gently curved', `Your lower lid has a typical gentle curve (dips ${pct(v)} of eye width).`],
        high: ['Curved lower lid', `Your lower lid dips noticeably below the corners (${pct(v)} of eye width). A rounded lower lid opens up the eye and makes it look bigger and rounder.`],
      }),
    }),
    item('Iris size', 'irisSize', {
      format: pct,
      measures: 'Iris width as a share of eye width. Pupils change with the light, so the iris is measured instead.',
      typical: 0.47, spread: 0.04,
      text: (v) => ({
        low: ['Less iris, more white', `Your iris spans about ${pct(v)} of the width of your eye, so more of the white shows around it. This can make the eyes look clear and bright.`],
        mid: ['Typical', `Your iris spans about ${pct(v)} of the width of your eye, a typical proportion.`],
        high: ['Large iris', `Your iris spans about ${pct(v)} of the width of your eye, so it fills more of the eye. Large irises read as soft and youthful, the “doe eye” look.`],
      }),
    }),
    item('White below iris', 'irisWhiteBelow', {
      format: pct,
      measures: 'Gap between the bottom of the iris and the lower lid, as a share of iris width. Negative means the lid covers the iris edge.',
      typical: -0.05, spread: 0.06,
      text: (v) => ({
        low: ['Lid covers the iris', `Your lower lid overlaps the bottom of your iris slightly (${pct(v)}). No white shows underneath, a look often linked with intense, “hunter” eyes.`],
        mid: ['Lid meets the iris', `Your lower lid sits right at the bottom edge of your iris (${pct(v)}), the most common position.`],
        high: ['White shows below', `A strip of white shows between your iris and lower lid (${pct(v)} of the iris width). This makes the eyes look rounder and more open. Looking slightly up during capture increases it.`],
      }),
    }),
    item('Size', 'eyeSize', {
      format: pct,
      measures: 'Eye width as a share of face width.',
      typical: 0.169, spread: 0.012,
      text: (v) => ({
        low: ['Smaller', `Each eye spans about ${pct(v)} of your face width, on the smaller side. Smaller eyes put more visual weight on the brows and cheekbones.`],
        mid: ['Average', `Each eye spans about ${pct(v)} of your face width, a typical size.`],
        high: ['Large', `Each eye spans about ${pct(v)} of your face width, on the larger side. Large eyes tend to become the focal point of the face.`],
      }),
    }),
    item('Spacing', 'eyeSpacing', {
      measures: 'Gap between the inner corners divided by the width of one eye.',
      typical: 1.43, spread: 0.09,
      text: (v) => ({
        low: ['Close-set', `The gap between your eyes is ${f2(v)} eye-widths, closer than typical. Close-set eyes draw focus toward the center of the face.`],
        mid: ['Evenly spaced', `The gap between your eyes is ${f2(v)} eye-widths, a typical spacing.`],
        high: ['Wide-set', `The gap between your eyes is ${f2(v)} eye-widths, wider than typical. Wide-set eyes give the middle of the face an open, youthful look.`],
      }),
    }),
  ],
};

const BROWS = {
  title: 'Brows',
  headline(m) {
    const arch = pick(bandOf(this, 'browArch', m), { low: 'Straight', mid: 'Soft arched', high: 'High arched' });
    const height = pick(bandOf(this, 'browHeight', m), { low: ', low-set', mid: '', high: ', high-set' });
    return `${arch}${height} brows`;
  },
  items: [
    item('Arch', 'browArch', {
      format: pct,
      measures: 'How high the top of the brow rises above a line from its head to its tail, as a share of brow length.',
      typical: 0.131, spread: 0.03,
      text: (v) => ({
        low: ['Straight', `Your brows run fairly flat, rising only ${pct(v)} of their length above a straight line. Straight brows read as calm and youthful.`],
        mid: ['Soft arch', `Your brows have a soft, natural arch (${pct(v)} of their length). This is the most common brow shape.`],
        high: ['High arch', `Your brows have a pronounced arch (${pct(v)} of their length), which reads as expressive and dramatic.`],
      }),
    }),
    item('Arch position', 'browPeak', {
      format: pct,
      measures: 'Where the highest point of the brow sits, from the inner end (0%) to the tail (100%).',
      typical: 0.63, spread: 0.08,
      text: (v) => ({
        low: ['Peaks early', `Your brow peaks ${pct(v)} of the way from the inner end, closer to the middle of the eye. This gives a rounded, curved brow.`],
        mid: ['Classic peak', `Your brow peaks ${pct(v)} of the way from the inner end, around the outer edge of the iris, which is the classic arch position.`],
        high: ['Peaks late', `Your brow peaks ${pct(v)} of the way along, toward the tail. A late peak gives a long, angled brow that lifts the outer eye.`],
      }),
    }),
    item('Tail direction', 'browTilt', {
      format: deg,
      measures: 'Angle from the inner end of the brow to the tail. Positive means the tail sits higher.',
      typical: -6.9, spread: 4,
      text: (v) => ({
        low: ['Tails drop', `Your brow tails sit lower than typical relative to the inner ends (${deg(v)}). Dropping tails give a soft, gentle or slightly sad look.`],
        mid: ['Typical', `Your brow tails sit a little below the inner ends (${deg(v)}), which is typical.`],
        high: ['Tails lift', `Your brow tails sit higher than typical (${deg(v)}), giving a lifted, upswept brow that reads as alert.`],
      }),
    }),
    item('Thickness', 'browThickness', {
      format: pct,
      measures: 'Average brow height, top edge to bottom edge, as a share of eye width. Estimate; the mesh follows brow shape more than hair.',
      typical: 0.26, spread: 0.05,
      text: (v) => ({
        low: ['Thin', `Your brows are slim, about ${pct(v)} of your eye width tall.`],
        mid: ['Medium', `Your brows are a medium thickness, about ${pct(v)} of your eye width tall.`],
        high: ['Thick', `Your brows are full, about ${pct(v)} of your eye width tall. Thick brows frame the eyes strongly.`],
      }),
    }),
    item('Height above eyes', 'browHeight', {
      measures: 'Gap from the underside of the brow to the upper eyelid, divided by eye width.',
      typical: 0.63, spread: 0.1,
      text: (v) => ({
        low: ['Low-set', `Your brows sit close to your eyes (${f2(v)} eye-widths above the lid). Low brows give a focused, intense look and can make the lids look hooded.`],
        mid: ['Balanced', `Your brows sit a typical distance above your eyes (${f2(v)} eye-widths).`],
        high: ['High-set', `Your brows sit high above your eyes (${f2(v)} eye-widths), showing more lid. High brows read as open and expressive. Raising your brows during capture also increases this.`],
      }),
    }),
  ],
};

const NOSE = {
  title: 'Nose',
  headline(m) {
    const width = pick(bandOf(this, 'noseToEyeGap', m), { low: 'Narrow', mid: 'Medium', high: 'Wide' });
    const tip = pick(bandOf(this, 'noseTipLift', m), { low: ', downturned tip', mid: '', high: ', upturned tip' });
    return `${width} nose${tip}`;
  },
  items: [
    item('Width', 'noseToEyeGap', {
      measures: 'Width across the nostril wings divided by the gap between the eyes.',
      typical: 0.96, spread: 0.08,
      text: (v) => ({
        low: ['Narrow', `Across the nostrils, your nose is ${pct(v)} as wide as the gap between your eyes, narrower than typical.`],
        mid: ['Medium', `Across the nostrils, your nose is about as wide as the gap between your eyes (${f2(v)}), a typical width.`],
        high: ['Wide', `Across the nostrils, your nose is ${pct(v)} as wide as the gap between your eyes, wider than typical. Nostril flare from smiling or breathing can push this up.`],
      }),
    }),
    item('Length', 'noseLength', {
      format: pct,
      measures: 'Top of the bridge to the base of the nose, as a share of face length (mesh top to chin).',
      typical: 0.303, spread: 0.02,
      text: (v) => ({
        low: ['Short', `Your nose takes up ${pct(v)} of your face length, on the shorter side, which keeps the middle of the face compact.`],
        mid: ['Average', `Your nose takes up ${pct(v)} of your face length, a typical proportion.`],
        high: ['Long', `Your nose takes up ${pct(v)} of your face length, on the longer side, giving the middle of the face more length.`],
      }),
    }),
    item('Bridge width', 'noseBridge', {
      format: pct,
      measures: 'Width of the upper bridge, between the eyes, as a share of nostril width.',
      typical: 0.315, spread: 0.04,
      text: (v) => ({
        low: ['Slim bridge', `The top of your bridge is ${pct(v)} as wide as your nostrils, so the nose narrows noticeably between the eyes. A slim bridge gives the nose a refined, defined line.`],
        mid: ['Medium bridge', `The top of your bridge is ${pct(v)} as wide as your nostrils, a typical taper.`],
        high: ['Wide bridge', `The top of your bridge is ${pct(v)} as wide as your nostrils, so the nose stays fairly even in width from top to bottom.`],
      }),
    }),
    item('Bridge profile', 'noseDorsum', {
      format: pct,
      measures: 'How far the bridge sits in front of (bump) or behind (scoop) a straight line from the top of the nose to the tip, as a share of nose length. Estimated from MediaPipe’s depth, which is less reliable than the front view.',
      typical: 0.023, spread: 0.015,
      text: (v) => ({
        low: ['Scooped', `Your bridge dips slightly inward between the top and the tip, a gently scooped or “ski slope” profile.`],
        mid: ['Straight', `Your bridge runs in a fairly straight line from top to tip.`],
        high: ['Slight bump', `Your bridge rises slightly outward partway down, a gentle bump or Roman profile.`],
      }),
    }),
    item('Tip direction', 'noseTipLift', {
      format: pct,
      measures: 'How far the tip sits above the base of the nose, as a share of nose length. Higher means the tip points up.',
      typical: 0.18, spread: 0.04,
      text: (v) => ({
        low: ['Downturned', `Your nose tip sits low, close to the base of the nose (${pct(v)} of nose length above it). A tip that points down reads as strong and classic.`],
        mid: ['Straight', `Your nose tip points straight ahead (${pct(v)} of nose length above the base), the most common angle.`],
        high: ['Upturned', `Your nose tip sits higher above the base (${pct(v)} of nose length), so it turns up slightly and shows a little more nostril. An upturned tip reads as cute and youthful. Tilting your head back during capture also raises this.`],
      }),
    }),
    item('Tip width', 'noseTipWidth', {
      format: pct,
      measures: 'Width of the tip as a share of nostril width.',
      typical: 0.278, spread: 0.03,
      text: (v) => ({
        low: ['Refined tip', `Your nose tip is narrow, ${pct(v)} of your nostril width, giving it a defined, pointed look.`],
        mid: ['Medium tip', `Your nose tip is a typical width, ${pct(v)} of your nostril width.`],
        high: ['Rounded tip', `Your nose tip is broad, ${pct(v)} of your nostril width, for a soft, rounded (bulbous) tip.`],
      }),
    }),
    item('Tip projection', 'noseProjection', {
      format: pct,
      measures: 'How far the tip sticks out in front of the nostril wings, as a share of nose width. Estimated from MediaPipe’s depth, which is less reliable than the front view.',
      typical: 0.735, spread: 0.08,
      text: (v) => ({
        low: ['Low projection', `Your nose tip sits fairly close to the face, so the nose looks flatter from the side.`],
        mid: ['Typical projection', `Your nose tip sticks out a typical amount from the face.`],
        high: ['High projection', `Your nose tip sticks out clearly from the face, giving a strong side profile.`],
      }),
    }),
    item('Straightness', 'noseCurve', {
      format: pct,
      measures: 'From the front: how far the bridge bows away from a straight line, as a share of nose length.',
      typical: 0.015, spread: 0.02,
      text: (v) => ({
        low: ['Straight', `From the front, your bridge runs straight from between the eyes to the tip.`],
        mid: ['Slight curve', `From the front, your bridge has a slight curve (${pct(v)} of its length). This is common and usually not noticeable.`],
        high: ['Curved', `From the front, your bridge bows to one side (${pct(v)} of its length). A slight head turn can exaggerate this.`],
      }),
    }),
  ],
};

const LIPS = {
  title: 'Lips & mouth',
  headline(m) {
    const full = pick(bandOf(this, 'lipFullness', m), { low: 'Thin', mid: 'Medium', high: 'Full' });
    const bow = pick(bandOf(this, 'bowDepth', m), { low: ', soft cupid’s bow', mid: '', high: ', defined cupid’s bow' });
    return `${full} lips${bow}`;
  },
  items: [
    item('Fullness', 'lipFullness', {
      format: pct,
      measures: 'Total lip height divided by mouth width.',
      typical: 0.4, spread: 0.06,
      text: (v) => ({
        low: ['Thin', `Your lips are ${pct(v)} as tall as your mouth is wide, on the thinner side.`],
        mid: ['Medium', `Your lips are ${pct(v)} as tall as your mouth is wide, a typical fullness.`],
        high: ['Full', `Your lips are ${pct(v)} as tall as your mouth is wide, on the fuller side.`],
      }),
    }),
    item('Upper vs lower', 'lipRatio', {
      measures: 'Lower lip height divided by upper lip height.',
      typical: 1.4, spread: 0.25,
      text: (v) => ({
        low: ['Fuller upper lip', `Your lower lip is ${f2(v)}× the height of your upper lip, so the two are close in size. That usually means a relatively full upper lip.`],
        mid: ['Balanced', `Your lower lip is ${f2(v)}× the height of your upper lip, a typical balance, with the lower lip a little fuller.`],
        high: ['Fuller lower lip', `Your lower lip is ${f2(v)}× the height of your upper lip, so most of the fullness is in the lower lip.`],
      }),
    }),
    item('Cupid’s bow', 'bowDepth', {
      format: pct,
      measures: 'How far the two peaks of the upper lip rise above its center dip, as a share of upper lip height.',
      typical: 0.13, spread: 0.05,
      text: (v) => ({
        low: ['Soft', `The peaks of your upper lip barely rise above the center (${pct(v)} of the lip’s height), so the top of the lip is a smooth, gentle curve.`],
        mid: ['Defined', `Your upper lip has a clear cupid’s bow, with peaks rising ${pct(v)} of the lip’s height above the center dip.`],
        high: ['Pronounced', `Your upper lip has a sharp, pronounced cupid’s bow, with peaks rising ${pct(v)} of the lip’s height above the center. A strong bow reads as defined and doll-like.`],
      }),
    }),
    item('Bow width', 'bowWidth', {
      format: pct,
      measures: 'Distance between the two peaks of the upper lip, as a share of mouth width.',
      typical: 0.29, spread: 0.035,
      text: (v) => ({
        low: ['Narrow peaks', `The peaks of your cupid’s bow sit close together (${pct(v)} of mouth width), concentrating the shape in the center of the lip.`],
        mid: ['Typical spacing', `The peaks of your cupid’s bow are a typical distance apart (${pct(v)} of mouth width).`],
        high: ['Wide peaks', `The peaks of your cupid’s bow sit far apart (${pct(v)} of mouth width), giving the upper lip a broad, flat top.`],
      }),
    }),
    item('Mouth corners', 'mouthCornerTilt', {
      format: deg,
      measures: 'Angle from the center of the lips to the corners. Positive means the corners sit higher.',
      typical: -1.7, spread: 2.5,
      text: (v) => ({
        low: ['Downturned', `Your mouth corners sit below the center line of your lips (${deg(v)}). At rest this can read as serious or pouty.`],
        mid: ['Neutral', `Your mouth corners sit about level with the center of your lips (${deg(v)}), a typical resting position.`],
        high: ['Upturned', `Your mouth corners sit above the center line of your lips (${deg(v)}), a naturally upturned, “smiley” resting mouth. Smiling during capture also raises this.`],
      }),
    }),
    item('Mouth width', 'mouthToNose', {
      measures: 'Mouth width divided by nose width.',
      typical: 1.375, spread: 0.12,
      text: (v) => ({
        low: ['Compact', `Your mouth is ${f2(v)}× the width of your nose, on the narrower side.`],
        mid: ['Balanced', `Your mouth is ${f2(v)}× the width of your nose, a typical proportion.`],
        high: ['Wide', `Your mouth is ${f2(v)}× the width of your nose, on the wider side. Even a slight smile widens the mouth.`],
      }),
    }),
    item('Philtrum', 'philtrum', {
      format: pct,
      measures: 'The groove from the base of the nose to the top of the upper lip, as a share of the lower face.',
      typical: 0.18, spread: 0.03,
      text: (v) => ({
        low: ['Short', `The space between your nose and upper lip is short (${pct(v)} of the lower face). A short philtrum tends to show more of the upper lip and reads as youthful.`],
        mid: ['Average', `The space between your nose and upper lip is a typical length (${pct(v)} of the lower face).`],
        high: ['Long', `The space between your nose and upper lip is on the longer side (${pct(v)} of the lower face).`],
      }),
    }),
  ],
};

const OUTLINE = {
  title: 'Face outline',
  headline(m) {
    const jaw = pick(bandOf(this, 'outlineJaw', m), { low: 'Tapered jaw', mid: 'Moderate jaw', high: 'Strong jaw' });
    const chin = pick(bandOf(this, 'outlineChin', m), { low: ', pointed chin', mid: '', high: ', broad chin' });
    return `${jaw}${chin}`;
  },
  items: [
    item('Forehead width', 'outlineForehead', {
      format: pct,
      measures: 'Forehead width as a share of the widest part of your face.',
      typical: 0.9, spread: 0.035,
      text: (v) => ({
        low: ['Narrow', `Your forehead is ${pct(v)} as wide as the widest part of your face, so the cheekbones clearly stand out. Typical of diamond shapes.`],
        mid: ['Balanced', `Your forehead is ${pct(v)} as wide as the widest part of your face, a typical relationship.`],
        high: ['Broad', `Your forehead is ${pct(v)} as wide as the widest part of your face, nearly matching it. Typical of heart and square shapes.`],
      }),
    }),
    item('Jaw width', 'outlineJaw', {
      format: pct,
      measures: 'Jaw width, at the jaw corners, as a share of the widest part of your face.',
      typical: 0.79, spread: 0.035,
      text: (v) => ({
        low: ['Tapered', `Your jaw is ${pct(v)} as wide as the widest part of your face, so the face narrows noticeably toward the chin. Typical of heart and diamond shapes.`],
        mid: ['Moderate', `Your jaw is ${pct(v)} as wide as the widest part of your face, a gentle taper. Typical of oval faces.`],
        high: ['Strong', `Your jaw is ${pct(v)} as wide as the widest part of your face, so the lower face stays broad. Typical of square shapes.`],
      }),
    }),
    item('Chin width', 'outlineChin', {
      format: pct,
      measures: 'Width just above the bottom of the chin, as a share of the widest part of your face.',
      typical: 0.58, spread: 0.05,
      text: (v) => ({
        low: ['Pointed', `Your chin is narrow, ${pct(v)} of your face width, coming to a defined point. Typical of heart and diamond shapes.`],
        mid: ['Medium', `Your chin is a typical width, ${pct(v)} of your face width.`],
        high: ['Broad', `Your chin is broad, ${pct(v)} of your face width, giving a flat, strong base. Typical of square and round shapes.`],
      }),
    }),
    item('Chin length', 'chinLength', {
      format: pct,
      measures: 'Bottom of the lower lip to the bottom of the chin, as a share of the lower face.',
      typical: 0.55, spread: 0.04,
      text: (v) => ({
        low: ['Short', `Your chin takes up ${pct(v)} of the lower face, on the shorter side, which keeps the lower face compact.`],
        mid: ['Average', `Your chin takes up ${pct(v)} of the lower face, a typical proportion.`],
        high: ['Long', `Your chin takes up ${pct(v)} of the lower face, on the longer side, which gives the jawline more presence.`],
      }),
    }),
  ],
};

export const FEATURE_GROUPS = [EYES, BROWS, NOSE, LIPS, OUTLINE];

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
