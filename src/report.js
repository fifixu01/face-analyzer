import { faceShape } from './analyze.js';
import { LEGEND } from './draw.js';

const SHAPE_NOTES = {
  Oval: 'Longer than it is wide, with a jaw a little narrower than the cheekbones. Balanced, gently tapering outline.',
  Round: 'Width and length are close, with soft, full cheeks and a rounded jawline.',
  Square: 'Length and width are close, with a strong, wide jaw nearly as broad as the cheekbones.',
  Oblong: 'Noticeably longer than wide, with fairly straight sides from forehead to jaw.',
  Heart: 'Wider through the forehead and cheekbones, tapering to a narrower chin.',
  Diamond: 'Cheekbones are the widest point, with a narrower forehead and jaw.',
};

// [label, metric key, classical guide value, explanation]
const PROPORTIONS = [
  ['Eye spacing', 'eyeSpacing', 1.0, 'Gap between the eyes ÷ the width of one eye. The classical “rule of fifths” puts it at about 1.'],
  ['Nose width', 'noseToEyeGap', 1.0, 'Nose width ÷ the gap between the eyes. Classically about 1.'],
  ['Mouth width', 'mouthToNose', 1.5, 'Mouth width ÷ nose width. Classically about 1.5.'],
  ['Lip ratio', 'lipRatio', 1.6, 'Lower-lip height ÷ upper-lip height. Classically about 1.6.'],
  ['Jaw : cheekbones', 'jawToCheek', null, 'How wide the jaw is compared to the cheekbones.'],
  ['Forehead : cheekbones', 'foreheadToCheek', null, 'How wide the forehead is compared to the cheekbones.'],
];

const pct = (x) => `${Math.round(x * 100)}%`;
const fix = (x) => x.toFixed(2);

function closeness(value, guide) {
  const off = Math.abs(value - guide) / guide;
  if (off < 0.08) return ['close to the guide', 'good'];
  return [value > guide ? 'above the guide' : 'below the guide', 'note'];
}

function summary(m, shape, warning) {
  const parts = [];
  parts.push(
    `Your face reads as <strong>${shape.best.toLowerCase()}</strong>` +
      (shape.runnerUp ? `, with some ${shape.runnerUp.toLowerCase()} traits.` : '.'),
  );

  const regions = { eyes: m.symEyes, brows: m.symBrows, nose: m.symNose, mouth: m.symMouth, jaw: m.symJaw };
  const sorted = Object.entries(regions).sort((a, b) => b[1] - a[1]);
  parts.push(
    `Overall symmetry is <strong>${Math.round(m.symmetry)}/100</strong>. ` +
      `Your ${sorted[0][0]} are the most symmetric area, and your ${sorted.at(-1)[0]} show the most difference between sides.`,
  );

  const thirds = { upper: m.thirdUpper, middle: m.thirdMiddle, lower: m.thirdLower };
  const biggest = Object.entries(thirds).sort((a, b) => b[1] - a[1])[0];
  const spread = Math.max(...Object.values(thirds)) - Math.min(...Object.values(thirds));
  parts.push(
    spread < 0.06
      ? 'Your facial thirds are very evenly balanced.'
      : `Your ${biggest[0]} third is the longest of the three.`,
  );

  if (warning) parts.push(`<em>Heads up: ${warning.toLowerCase()}. That can skew these numbers, so try another capture.</em>`);
  return parts.map((p) => `<p>${p}</p>`).join('');
}

export function renderReport(el, m, { warning, expressions }) {
  const shape = faceShape(m);
  const symRows = [
    ['Eyes', m.symEyes], ['Brows', m.symBrows], ['Nose', m.symNose], ['Mouth', m.symMouth], ['Jaw', m.symJaw],
  ];

  el.innerHTML = `
    <div class="card summary">
      <h2>Summary</h2>
      ${summary(m, shape, warning)}
      ${expressions.length ? `<p class="muted">Expression detected: ${expressions.join(', ')}</p>` : ''}
    </div>

    <div class="card">
      <h3>Face shape: ${shape.best}</h3>
      <p>${SHAPE_NOTES[shape.best]}</p>
      <p class="muted">Length : width ${fix(m.lengthToWidth)} · runner-up: ${shape.runnerUp}</p>
    </div>

    <div class="card">
      <h3>Symmetry <span class="pill">${Math.round(m.symmetry)}/100</span></h3>
      ${symRows
        .map(
          ([name, v]) => `
        <div class="row">
          <span>${name}</span>
          <div class="bar"><div style="width:${v}%"></div></div>
          <span class="num">${Math.round(v)}</span>
        </div>`,
        )
        .join('')}
      <p class="muted">Nobody is perfectly symmetric. Scores in the 80s and 90s are typical. Lighting and expression move this a lot.</p>
    </div>

    <div class="card">
      <h3>Facial thirds</h3>
      <div class="thirds large">
        <div class="t1" style="flex:${m.thirdUpper}">${pct(m.thirdUpper)}</div>
        <div class="t2" style="flex:${m.thirdMiddle}">${pct(m.thirdMiddle)}</div>
        <div class="t3" style="flex:${m.thirdLower}">${pct(m.thirdLower)}</div>
      </div>
      <p class="muted">Upper (forehead to brows), middle (brows to nose base), lower (nose base to chin). The classical guide is equal thirds. The upper third reads short here because the mesh stops below the hairline.</p>
    </div>

    <div class="card">
      <h3>Proportions</h3>
      ${PROPORTIONS.map(([label, key, guide, why]) => {
        const v = m[key];
        const [note, cls] = guide ? closeness(v, guide) : ['', ''];
        return `
          <div class="prop">
            <div class="prop-head">
              <span>${label}</span>
              <span class="num">${fix(v)}${guide ? ` <span class="muted">/ ${guide}</span>` : ''}</span>
            </div>
            ${note ? `<span class="tag ${cls}">${note}</span>` : ''}
            <p class="muted">${why}</p>
          </div>`;
      }).join('')}
    </div>

    <div class="card legend">
      ${LEGEND.map(([c, l]) => `<span><i style="background:${c}"></i>${l}</span>`).join('')}
    </div>

    <p class="muted small">The “guides” are classical art and drawing proportions, not a measure of attractiveness. Real faces vary widely, and these are 2D estimates from a single photo.</p>
  `;
}
