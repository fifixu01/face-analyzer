// Draws a shareable summary card (no photo) onto a canvas, in one of several themes.
import { faceShape } from './analyze.js';
import { animalType } from './fun.js';
import { FEATURE_GROUPS, readThirds } from './explain.js';

type Metrics = Record<string, number>;

export type CardTheme = {
  id: string;
  name: string;
  swatch: string[];
  paintBackground: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
  tile: string;
  tileBorder: string;
  dashedTiles?: boolean;
  ink: string;
  strong: string;
  muted: string;
  accent: string;
  meter: string;
  chipBg: string;
  chipInk: string;
  thirds: [string, string, string];
  art: { oval: string; brow: string; eye: string; nose: string; lips: string };
  titleFont: [weight: number, family: string];
  displayFont: [weight: number, family: string];
  bodyFont: [weight: number, family: string];
  boldFont: [weight: number, family: string];
  displayScale?: number; // handwriting fonts run small
  upperLabels: boolean;
};

/** Deterministic pseudo-random numbers so decorations don't change between re-renders. */
function seeded(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}

export const THEMES: CardTheme[] = [
  {
    id: 'midnight',
    name: 'Midnight',
    swatch: ['#191817', '#8fa898', '#b296d6'],
    paintBackground(ctx, w, h) {
      ctx.fillStyle = '#191817';
      ctx.fillRect(0, 0, w, h);
      for (const [x, y, r, c] of [
        [0.2, 0.15, 520, 'rgba(143,168,152,0.14)'],
        [0.85, 0.45, 560, 'rgba(178,150,214,0.11)'],
        [0.3, 0.9, 520, 'rgba(217,138,124,0.08)'],
      ] as const) {
        const g = ctx.createRadialGradient(x * w, y * h, 0, x * w, y * h, r);
        g.addColorStop(0, c);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }
    },
    tile: 'rgba(33,31,30,0.85)',
    tileBorder: '#2f2d2b',
    ink: '#d3cec6',
    strong: '#e6e1d9',
    muted: '#847e76',
    accent: '#8fa898',
    meter: '#302e2b',
    chipBg: '#2a2826',
    chipInk: '#d3cec6',
    thirds: ['#7fa3d6', '#b296d6', '#d98a7c'],
    art: { oval: 'rgba(211,206,198,0.5)', brow: '#e0b66e', eye: '#6cc4b6', nose: 'rgba(211,206,198,0.55)', lips: '#de867a' },
    titleFont: [700, 'Fredoka'],
    displayFont: [600, 'Fredoka'],
    bodyFont: [400, 'Nunito'],
    boldFont: [700, 'Nunito'],
    upperLabels: true,
  },
  {
    id: 'strawberry',
    name: 'Strawberry Milk',
    swatch: ['#ffdbe5', '#f08aa5', '#fff7f9'],
    paintBackground(ctx, w, h) {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, '#ffe6ee');
      g.addColorStop(1, '#ffd3df');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      // sprinkles
      const rand = seeded(7);
      const colors = ['#f7a1b8', '#ffd38a', '#b9a3e8', '#9fd8c8', '#ffffff'];
      for (let i = 0; i < 70; i++) {
        ctx.save();
        ctx.translate(rand() * w, rand() * h);
        ctx.rotate(rand() * Math.PI);
        ctx.fillStyle = colors[i % colors.length];
        ctx.globalAlpha = 0.55;
        ctx.beginPath();
        ctx.roundRect(-9, -3, 18, 6, 3);
        ctx.fill();
        ctx.restore();
      }
    },
    tile: 'rgba(255,248,250,0.92)',
    tileBorder: '#f6c3d1',
    ink: '#6b3f4c',
    strong: '#5a2d3a',
    muted: '#b47f8e',
    accent: '#f08aa5',
    meter: '#fbdbe4',
    chipBg: '#ffe1e9',
    chipInk: '#7a3d50',
    thirds: ['#f4a3b8', '#f7c59f', '#b9a3e8'],
    art: { oval: '#d495a5', brow: '#e0a35e', eye: '#e47c98', nose: '#d495a5', lips: '#f06b8a' },
    titleFont: [800, 'Baloo 2'],
    displayFont: [800, 'Baloo 2'],
    bodyFont: [600, 'Nunito'],
    boldFont: [700, 'Nunito'],
    upperLabels: true,
  },
  {
    id: 'matcha',
    name: 'Matcha',
    swatch: ['#eef1e4', '#8aa66b', '#c9a38a'],
    paintBackground(ctx, w, h) {
      ctx.fillStyle = '#eef1e4';
      ctx.fillRect(0, 0, w, h);
      const g = ctx.createRadialGradient(w * 0.9, h * 0.05, 0, w * 0.9, h * 0.05, 700);
      g.addColorStop(0, 'rgba(160,190,130,0.25)');
      g.addColorStop(1, 'rgba(160,190,130,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    },
    tile: '#f8f9f2',
    tileBorder: '#d9dfc8',
    ink: '#3f4a36',
    strong: '#2f3a28',
    muted: '#8a9479',
    accent: '#8aa66b',
    meter: '#e2e8d3',
    chipBg: '#e3ebd3',
    chipInk: '#44533a',
    thirds: ['#9fb98a', '#d8c58f', '#c9a38a'],
    art: { oval: '#9aa88a', brow: '#b08a5c', eye: '#6f8f5a', nose: '#9aa88a', lips: '#c98a74' },
    titleFont: [400, 'DM Serif Display'],
    displayFont: [400, 'DM Serif Display'],
    bodyFont: [400, 'DM Sans'],
    boldFont: [700, 'DM Sans'],
    upperLabels: true,
  },
  {
    id: 'notebook',
    name: 'Notebook',
    swatch: ['#fbf8f1', '#2b3a55', '#fff1a8'],
    paintBackground(ctx, w, h) {
      ctx.fillStyle = '#fbf8f1';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(127,163,214,0.28)';
      ctx.lineWidth = 2;
      for (let y = 46; y < h; y += 46) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(226,114,91,0.45)';
      ctx.beginPath();
      ctx.moveTo(40, 0);
      ctx.lineTo(40, h);
      ctx.stroke();
    },
    tile: 'rgba(255,255,255,0.7)',
    tileBorder: 'rgba(43,58,85,0.35)',
    dashedTiles: true,
    ink: '#2b3a55',
    strong: '#1f2b42',
    muted: '#7c8597',
    accent: '#e2725b',
    meter: '#ebe5d6',
    chipBg: '#fff1a8',
    chipInk: '#2b3a55',
    thirds: ['#7fa3d6', '#e2725b', '#8fc19a'],
    art: { oval: '#2b3a55', brow: '#2b3a55', eye: '#2b3a55', nose: '#2b3a55', lips: '#e2725b' },
    titleFont: [700, 'Caveat'],
    displayFont: [700, 'Caveat'],
    bodyFont: [400, 'Patrick Hand'],
    boldFont: [400, 'Patrick Hand'],
    displayScale: 1.2,
    upperLabels: false,
  },
];

/** Waits for a theme's fonts so the canvas doesn't fall back to a system font. */
export async function loadThemeFonts(t: CardTheme) {
  await Promise.all(
    [t.titleFont, t.displayFont, t.bodyFont, t.boldFont].map(([w, f]) => document.fonts.load(`${w} 40px "${f}"`)),
  );
}

export function cardData(m: Metrics) {
  const shape = faceShape(m);
  const animal = animalType(m);
  const [thirdsVerdict] = readThirds(m);
  return {
    shape: shape.best as string,
    runnerUp: shape.runnerUp as string,
    symmetry: Math.round(m.symmetry),
    animal: animal.primary.animal as string,
    secondaryAnimal: animal.secondary.animal as string,
    traits: animal.primary.traits as string[],
    regions: [
      ['Eyes', m.symEyes],
      ['Brows', m.symBrows],
      ['Nose', m.symNose],
      ['Mouth', m.symMouth],
      ['Jaw', m.symJaw],
    ] as [string, number][],
    thirds: [m.thirdUpper, m.thirdMiddle, m.thirdLower] as [number, number, number],
    thirdsVerdict: thirdsVerdict as string,
    groups: FEATURE_GROUPS.map((g) => ({
      title: g.title,
      labels: [g.headline(m) as string],
    })),
    date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
  };
}

const W = 1080;
const P = 64;
const GAP = 22;

// Same face as the app's FaceArt illustration (160 x 200 viewBox).
const ART = {
  brows: ['M46 74 Q58 66 70 72', 'M90 72 Q102 66 114 74'],
  eyes: ['M48 88 Q58 80 68 88 Q58 94 48 88 Z', 'M92 88 Q102 80 112 88 Q102 94 92 88 Z'],
  nose: 'M80 92 L80 116 Q80 121 74 120',
  lips: 'M64 138 Q72 132 80 136 Q88 132 96 138 Q80 150 64 138 Z',
};

export function renderCard(data: ReturnType<typeof cardData>, t: CardTheme): HTMLCanvasElement {
  // Draw onto a tall canvas, then crop to the content height.
  const work = Object.assign(document.createElement('canvas'), { width: W, height: 2400 });
  const ctx = work.getContext('2d')!;
  const font = ([w, f]: [number, string], size: number) => `${w} ${size}px "${f}"`;
  const ds = t.displayScale ?? 1;
  const label = (text: string) => (t.upperLabels ? text.toUpperCase() : text);
  const spacing = (px: number) => {
    if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${px}px`;
  };

  // Background is painted last-size-known, so collect drawing steps and replay them after measuring.
  const steps: ((c: CanvasRenderingContext2D) => void)[] = [];
  const draw = (fn: (c: CanvasRenderingContext2D) => void) => steps.push(fn);

  const tile = (x: number, y: number, w: number, h: number) =>
    draw((c) => {
      c.beginPath();
      c.roundRect(x, y, w, h, 28);
      c.fillStyle = t.tile;
      c.fill();
      c.lineWidth = 2;
      c.strokeStyle = t.tileBorder;
      if (t.dashedTiles) c.setLineDash([10, 8]);
      c.stroke();
      c.setLineDash([]);
    });

  const text = (s: string, x: number, y: number, f: string, color: string, align: CanvasTextAlign = 'left', ls = 0) =>
    draw((c) => {
      c.font = f;
      c.fillStyle = color;
      c.textAlign = align;
      c.textBaseline = 'alphabetic';
      if ('letterSpacing' in c) (c as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${ls}px`;
      c.fillText(s, x, y);
      if ('letterSpacing' in c) (c as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0px';
    });

  const wrap = (s: string, f: string, maxW: number) => {
    ctx.font = f;
    spacing(0);
    const words = s.split(' ');
    const lines: string[] = [];
    let line = '';
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width > maxW && line) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    if (line) lines.push(line);
    return lines;
  };

  const labelFont = font(t.boldFont, t.upperLabels ? 20 : 26);
  const labelSpacing = t.upperLabels ? 2.5 : 0;
  let y = P;

  // Header: face art + title + date
  const artScale = 0.42;
  const headerY = y; // capture now: draw steps run later, after y has moved on
  draw((c) => {
    c.save();
    c.translate(P, headerY);
    c.scale(artScale, artScale);
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.lineWidth = 5;
    c.strokeStyle = t.art.oval;
    c.beginPath();
    c.ellipse(80, 100, 58, 78, 0, 0, Math.PI * 2);
    c.stroke();
    c.lineWidth = 7;
    c.strokeStyle = t.art.brow;
    ART.brows.forEach((d) => c.stroke(new Path2D(d)));
    c.lineWidth = 6;
    c.strokeStyle = t.art.eye;
    ART.eyes.forEach((d) => c.stroke(new Path2D(d)));
    c.lineWidth = 5;
    c.strokeStyle = t.art.nose;
    c.stroke(new Path2D(ART.nose));
    c.lineWidth = 6;
    c.strokeStyle = t.art.lips;
    c.stroke(new Path2D(ART.lips));
    c.restore();
  });
  text('Face Analyzer', P + 92, y + 62, font(t.titleFont, Math.round(58 * ds)), t.strong);
  text(data.date, W - P, y + 58, font(t.bodyFont, 24), t.muted, 'right');
  y += 84 + 34;

  // Hero tiles: face shape + symmetry
  const half = (W - 2 * P - GAP) / 2;
  tile(P, y, half, 180);
  tile(P + half + GAP, y, half, 180);
  text(label('Face shape'), P + 32, y + 50, labelFont, t.muted, 'left', labelSpacing);
  text(data.shape, P + 32, y + 145, font(t.displayFont, Math.round(78 * ds)), t.strong);
  text(label('Symmetry'), P + half + GAP + 32, y + 50, labelFont, t.muted, 'left', labelSpacing);
  {
    const f = font(t.displayFont, Math.round(78 * ds));
    ctx.font = f;
    spacing(0);
    const wNum = ctx.measureText(String(data.symmetry)).width;
    text(String(data.symmetry), P + half + GAP + 32, y + 145, f, t.strong);
    text('/100', P + half + GAP + 40 + wNum, y + 145, font(t.bodyFont, 30), t.muted);
  }
  y += 180 + GAP;

  // Animal tile with trait chips
  {
    const chipFont = font(t.bodyFont, 24);
    ctx.font = chipFont;
    spacing(0);
    const innerW = W - 2 * P - 64;
    const chips: { x: number; y: number; w: number; s: string }[] = [];
    let cx = 0;
    let cy = 0;
    for (const s of data.traits) {
      const w = ctx.measureText(s).width + 32;
      if (cx + w > innerW && cx > 0) {
        cx = 0;
        cy += 52;
      }
      chips.push({ x: cx, y: cy, w, s });
      cx += w + 10;
    }
    const chipsH = chips.length ? cy + 42 : 0;
    const h = 150 + (chipsH ? chipsH + 22 : 0) + 30;
    tile(P, y, W - 2 * P, h);
    text(label('Just for fun · your animal type'), P + 32, y + 50, labelFont, t.muted, 'left', labelSpacing);
    text(data.animal, P + 32, y + 130, font(t.displayFont, Math.round(72 * ds)), t.strong);
    text(`with a touch of ${data.secondaryAnimal.toLowerCase()}`, W - P - 32, y + 126, font(t.bodyFont, 26), t.muted, 'right');
    const top = y + 162;
    for (const chip of chips) {
      draw((c) => {
        c.beginPath();
        c.roundRect(P + 32 + chip.x, top + chip.y, chip.w, 42, 21);
        c.fillStyle = t.chipBg;
        c.fill();
      });
      text(chip.s, P + 32 + chip.x + 16, top + chip.y + 29, chipFont, t.chipInk);
    }
    y += h + GAP;
  }

  // Symmetry by region + facial thirds, side by side
  {
    const h = 310;
    const lx = P;
    const rx = P + half + GAP;
    tile(lx, y, half, h);
    tile(rx, y, half, h);

    text(label('Symmetry by region'), lx + 32, y + 50, labelFont, t.muted, 'left', labelSpacing);
    data.regions.forEach(([name, v], i) => {
      const ry = y + 100 + i * 42;
      text(name, lx + 32, ry + 8, font(t.bodyFont, 24), t.ink);
      const bx = lx + 130;
      const bw = half - 130 - 90;
      draw((c) => {
        c.beginPath();
        c.roundRect(bx, ry - 4, bw, 10, 5);
        c.fillStyle = t.meter;
        c.fill();
        c.beginPath();
        c.roundRect(bx, ry - 4, (bw * Math.max(0, Math.min(100, v))) / 100, 10, 5);
        c.fillStyle = t.accent;
        c.fill();
      });
      text(String(Math.round(v)), lx + half - 32, ry + 8, font(t.boldFont, 24), t.muted, 'right');
    });

    text(label('Facial thirds'), rx + 32, y + 50, labelFont, t.muted, 'left', labelSpacing);
    const barW = half - 64;
    const total = data.thirds.reduce((a, b) => a + b, 0);
    let bx = rx + 32;
    const rowY = y; // capture now: draw steps run later, after y has moved on
    data.thirds.forEach((v, i) => {
      const w = (barW - 12) * (v / total);
      const x0 = bx;
      draw((c) => {
        c.beginPath();
        c.roundRect(x0, rowY + 82, w, 14, 7);
        c.fillStyle = t.thirds[i];
        c.fill();
      });
      bx += w + 6;
    });
    const colW = barW / 3;
    ['Upper', 'Middle', 'Lower'].forEach((name, i) => {
      const x0 = rx + 32 + i * colW;
      draw((c) => {
        c.beginPath();
        c.arc(x0 + 7, rowY + 140, 7, 0, Math.PI * 2);
        c.fillStyle = t.thirds[i];
        c.fill();
      });
      text(name, x0 + 22, y + 148, font(t.bodyFont, 22), t.muted);
      text(`${Math.round(data.thirds[i] * 100)}%`, x0, y + 200, font(t.displayFont, Math.round(44 * ds)), t.strong);
    });
    wrap(data.thirdsVerdict, font(t.boldFont, 26), barW).forEach((line, i) =>
      text(line, rx + 32, y + 256 + i * 32, font(t.boldFont, 26), t.ink),
    );
    y += h + GAP;
  }

  // Features: one row per group with its labels
  {
    const titleW = 230;
    const bodyF = font(t.bodyFont, 25);
    const textW = W - 2 * P - 64 - titleW;
    const rows = data.groups.map((g) => ({ title: g.title, lines: wrap(g.labels.join(' · '), bodyF, textW) }));
    const rowH = (n: number) => Math.max(1, n) * 34;
    const h = 80 + rows.reduce((s, r) => s + rowH(r.lines.length) + 20, 0) + 14;
    tile(P, y, W - 2 * P, h);
    text(label('Features'), P + 32, y + 50, labelFont, t.muted, 'left', labelSpacing);
    let ry = y + 96;
    for (const r of rows) {
      text(r.title, P + 32, ry + 4, font(t.displayFont, Math.round(30 * ds)), t.strong);
      r.lines.forEach((line, i) => text(line, P + 32 + titleW, ry + i * 34, bodyF, t.ink));
      ry += rowH(r.lines.length) + 20;
    }
    y += h;
  }

  // Footer
  y += 54;
  text('see how much you mog!', P, y, font(t.displayFont, Math.round(32 * ds)), t.accent);
  text('just for fun · not a measure of attractiveness', W - P, y - 4, font(t.bodyFont, 20), t.muted, 'right');
  const H = Math.ceil(y + P - 10);

  const out = Object.assign(document.createElement('canvas'), { width: W, height: H });
  const octx = out.getContext('2d')!;
  t.paintBackground(octx, W, H);
  steps.forEach((s) => s(octx));
  return out;
}
