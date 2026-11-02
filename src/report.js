import { faceShape } from './analyze.js';
import { LEGEND } from './draw.js';
import { PROPORTION_EXPLAINERS, readSymmetry, readThirds } from './explain.js';
import { animalType } from './fun.js';

const SHAPE_NOTES = {
  Oval: 'Longer than it is wide, with a jaw a little narrower than the cheekbones. A balanced, gently tapering outline.',
  Round: 'Width and length are close, with soft, full cheeks and a rounded jawline.',
  Square: 'Length and width are close, with a strong jaw nearly as wide as the cheekbones.',
  Oblong: 'Noticeably longer than wide, with fairly straight sides from forehead to jaw.',
  Heart: 'Wider through the forehead and cheekbones, tapering to a narrower chin.',
  Diamond: 'Cheekbones are the widest point, with a narrower forehead and jaw.',
};

const pct = (x) => `${Math.round(x * 100)}%`;
const fix = (x) => x.toFixed(2);

function summary(m, shape) {
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

function funSection(m) {
  const { primary, secondary } = animalType(m);
  return `
    <section class="fun">
      <p class="eyebrow">Just for fun</p>
      <div class="fun-head">
        <div>
          <p class="fun-label">Your animal type</p>
          <p class="hero-value">${primary.animal}</p>
        </div>
        <p class="muted small">with a touch of ${secondary.animal.toLowerCase()}</p>
      </div>
      <p>${primary.blurb}</p>
      ${primary.traits.length ? `
      <ul class="traits">${primary.traits.map((t) => `<li>${t}</li>`).join('')}</ul>` : ''}
      <p class="muted small">Based on eye tilt, eye shape and size, jaw taper and face proportions. Not scientific.</p>
    </section>`;
}

export function renderLegend(el) {
  el.innerHTML = LEGEND.map(([c, l]) => `<span><i style="background:${c}"></i>${l}</span>`).join('');
}

/** Summary goes under the photo; detailed sections go in the side column. */
export function renderReport({ summaryEl, detailsEl }, m, { issues, expressions }) {
  const shape = faceShape(m);
  const symRows = [
    ['Eyes', m.symEyes], ['Brows', m.symBrows], ['Nose', m.symNose], ['Mouth', m.symMouth], ['Jaw', m.symJaw],
  ];

  summaryEl.innerHTML = `
    ${issues.length ? `
    <div class="notice">
      <p class="notice-title">This shot may affect accuracy</p>
      <ul>${issues.map((i) => `<li>${i}</li>`).join('')}</ul>
    </div>` : ''}

    <div class="hero">
      <div>
        <p class="eyebrow">Face shape</p>
        <p class="hero-value">${shape.best}</p>
      </div>
      <div>
        <p class="eyebrow">Symmetry</p>
        <p class="hero-value">${Math.round(m.symmetry)}<span class="of">/100</span></p>
      </div>
    </div>

    <p class="lede">${summary(m, shape)}</p>
    ${expressions.length ? `<p class="muted small">Expression detected: ${expressions.join(', ')}</p>` : ''}
    ${funSection(m)}
  `;

  detailsEl.innerHTML = `
    <section class="block">
      <h3>Face shape</h3>
      <p>${SHAPE_NOTES[shape.best]}</p>
      <dl class="facts">
        <div><dt>Length to width</dt><dd>${fix(m.lengthToWidth)}</dd></div>
        <div><dt>Second closest</dt><dd>${shape.runnerUp}</dd></div>
      </dl>
    </section>

    <section class="block">
      <h3>Symmetry by region</h3>
      ${symRows.map(([name, v]) => {
        const [verdict, text] = readSymmetry(name, v);
        return `
        <details class="expand">
          <summary class="meter-row">
            <span>${name}</span>
            <div class="meter"><div style="width:${v}%"></div></div>
            <span class="num">${Math.round(v)}</span>
            <i class="chev"></i>
          </summary>
          <div class="expand-body"><p class="verdict">${verdict}</p><p>${text}</p></div>
        </details>`;
      }).join('')}
      <p class="muted small">No face is perfectly symmetric. Scores in the 80s and 90s are typical, and lighting and expression shift them.</p>
    </section>

    <section class="block">
      <h3>Facial thirds</h3>
      <div class="thirds">
        <div class="t1" style="flex:${m.thirdUpper}"></div>
        <div class="t2" style="flex:${m.thirdMiddle}"></div>
        <div class="t3" style="flex:${m.thirdLower}"></div>
      </div>
      <dl class="facts three">
        <div><dt><i class="t1"></i>Upper</dt><dd>${pct(m.thirdUpper)}</dd></div>
        <div><dt><i class="t2"></i>Middle</dt><dd>${pct(m.thirdMiddle)}</dd></div>
        <div><dt><i class="t3"></i>Lower</dt><dd>${pct(m.thirdLower)}</dd></div>
      </dl>
      ${(() => {
        const [verdict, text] = readThirds(m);
        return `
        <details class="expand">
          <summary class="expand-row"><span>${verdict}</span><i class="chev"></i></summary>
          <div class="expand-body"><p>${text}</p></div>
        </details>`;
      })()}
      <p class="muted small">Hairline to brows, brows to nose base, nose base to chin. The classical guide is equal thirds. ${m.hairlineFound
        ? 'The hairline was detected from the photo.'
        : 'No clear hairline was found (hair pulled back, bangs or a hat can cause this), so the upper third is measured from partway up the forehead and reads short.'}</p>
    </section>

    <section class="block">
      <h3>Proportions</h3>
      <p class="muted small">Select a row for what it means.</p>
      ${PROPORTION_EXPLAINERS.map(({ label, key, guide, measures, read }) => {
        const [verdict, text] = read(m[key]);
        return `
        <details class="expand prop">
          <summary class="prop-row">
            <div>
              <p class="prop-label">${label}</p>
              <p class="muted small">${verdict}</p>
            </div>
            <div class="prop-value">
              <span class="num">${fix(m[key])}</span>
              ${guide ? `<span class="muted small">guide ${guide.toFixed(1)}</span>` : ''}
            </div>
            <i class="chev"></i>
          </summary>
          <div class="expand-body"><p>${text}</p><p class="muted small">${measures}</p></div>
        </details>`;
      }).join('')}
    </section>

    <p class="muted small footnote">Guides are classical drawing proportions, not a measure of attractiveness. Faces vary widely, and these are 2D estimates from a single photo.</p>
  `;
}
