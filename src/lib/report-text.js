// Text for the results summary.

export const SHAPE_NOTES = {
  Oval: 'Longer than it is wide, with a jaw a little narrower than the cheekbones. A balanced, gently tapering outline.',
  Round: 'Width and length are close, with soft, full cheeks and a rounded jawline.',
  Square: 'Length and width are close, with a strong jaw nearly as wide as the cheekbones.',
  Oblong: 'Noticeably longer than wide, with fairly straight sides from forehead to jaw.',
  Heart: 'Wider through the forehead and cheekbones, tapering to a narrower chin.',
  Diamond: 'Cheekbones are the widest point, with a narrower forehead and jaw.',
};

/** One-paragraph summary of the main results. */
export function summaryText(m, shape) {
  const regions = { eyes: m.symEyes, brows: m.symBrows, nose: m.symNose, mouth: m.symMouth, jaw: m.symJaw };
  const sorted = Object.entries(regions).sort((a, b) => b[1] - a[1]);
  const thirds = { upper: m.thirdUpper, middle: m.thirdMiddle, lower: m.thirdLower };
  const longest = Object.entries(thirds).sort((a, b) => b[1] - a[1])[0][0];
  const spread = Math.max(...Object.values(thirds)) - Math.min(...Object.values(thirds));

  return [
    `Your face reads as ${shape.best.toLowerCase()}, with some ${shape.runnerUp.toLowerCase()} traits.`,
    `The most symmetric area is your ${sorted[0][0]}, and the least is your ${sorted.at(-1)[0]}.`,
    spread < 0.06 ? 'Your facial thirds are evenly balanced.' : `Your ${longest} third is the longest of the three.`,
  ].join(' ');
}
