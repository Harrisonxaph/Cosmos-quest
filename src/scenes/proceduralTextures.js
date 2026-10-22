// Artist's-impression surface textures drawn with the Canvas 2D API.
// Generated at runtime: no image files are downloaded, so nothing needs a licence and phones save data.
// Uses cheap shapes (circles, bands, strokes) rather than per-pixel noise so generation stays fast.

/** Small deterministic random number generator, so each world looks the same on every visit. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(random, list) {
  return list[Math.floor(random() * list.length)];
}

/** Draw a circle, repeating it across the left/right seam of the equirectangular map. */
function wrappedCircle(ctx, width, x, y, r) {
  for (const offset of [-width, 0, width]) {
    if (x + offset + r < 0 || x + offset - r > width) continue;
    ctx.beginPath();
    ctx.arc(x + offset, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function blobs(ctx, random, width, height, { count, minR, maxR, colors, alpha, yMin = 0, yMax = 1 }) {
  for (let i = 0; i < count; i++) {
    ctx.globalAlpha = alpha * (0.6 + random() * 0.4);
    ctx.fillStyle = pick(random, colors);
    const r = (minR + random() * (maxR - minR)) * width;
    wrappedCircle(ctx, width, random() * width, (yMin + random() * (yMax - yMin)) * height, r);
  }
  ctx.globalAlpha = 1;
}

function craters(ctx, random, width, height, count, dark, light, maxR) {
  for (let i = 0; i < count; i++) {
    const r = (0.002 + random() ** 3 * maxR) * width;
    const x = random() * width;
    const y = (0.08 + random() * 0.84) * height;
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = dark;
    wrappedCircle(ctx, width, x, y, r);
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = light;
    wrappedCircle(ctx, width, x - r * 0.25, y - r * 0.25, r * 0.55);
  }
  ctx.globalAlpha = 1;
}

function polarCaps(ctx, random, width, height, color, north, south) {
  ctx.fillStyle = color;
  for (const [edge, size] of [['top', north], ['bottom', south]]) {
    ctx.beginPath();
    const base = edge === 'top' ? size * height : height - size * height;
    ctx.moveTo(0, edge === 'top' ? 0 : height);
    for (let x = 0; x <= width; x += width / 32) {
      ctx.lineTo(x, base + (random() - 0.5) * size * height * 0.6);
    }
    ctx.lineTo(width, edge === 'top' ? 0 : height);
    ctx.closePath();
    ctx.fill();
  }
}

function bands(ctx, random, width, height, look) {
  const count = look.bands ?? 8;
  let y = 0;
  const heights = Array.from({ length: count }, () => 0.5 + random());
  const total = heights.reduce((sum, h) => sum + h, 0);
  heights.forEach((h, index) => {
    const bandHeight = (h / total) * height;
    ctx.fillStyle = look.palette[index % look.palette.length];
    const amplitude = bandHeight * 0.18;
    const frequency = (2 + Math.floor(random() * 4)) * ((Math.PI * 2) / width);
    const phase = random() * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= width; x += width / 64) ctx.lineTo(x, y + Math.sin(x * frequency + phase) * amplitude);
    for (let x = width; x >= 0; x -= width / 64) ctx.lineTo(x, y + bandHeight + Math.sin(x * frequency + phase + 1) * amplitude + 1);
    ctx.closePath();
    ctx.fill();
    y += bandHeight;
  });
  // Fine streaks give the bands some texture.
  ctx.lineWidth = Math.max(1, height / 256);
  for (let i = 0; i < count * 10; i++) {
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = pick(random, look.palette);
    const sy = random() * height;
    const length = (0.1 + random() * 0.4) * width;
    const sx = random() * width;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.bezierCurveTo(sx + length * 0.3, sy - 3, sx + length * 0.6, sy + 3, sx + length, sy);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  if (look.spot) {
    const s = look.spot;
    const cy = (0.5 - s.latitude / 180) * height;
    const cx = s.longitudeFraction * width;
    ctx.fillStyle = '#f3dcc0';
    ctx.beginPath();
    ctx.ellipse(cx, cy, s.widthFraction * width * 0.62, s.heightFraction * height * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.ellipse(cx, cy, s.widthFraction * width * 0.5, s.heightFraction * height * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Paint one world's surface onto a 2:1 equirectangular canvas context. */
export function drawSurface(ctx, width, height, look) {
  const random = mulberry32(look.seed);
  const [first, second, third] = look.palette;
  ctx.fillStyle = second ?? first;
  ctx.fillRect(0, 0, width, height);

  switch (look.style) {
    case 'star':
      blobs(ctx, random, width, height, { count: 40, minR: 0.03, maxR: 0.08, colors: [first, third], alpha: 0.18 });
      blobs(ctx, random, width, height, { count: 1800, minR: 0.001, maxR: 0.004, colors: [first, third], alpha: 0.35 });
      break;
    case 'cratered':
      blobs(ctx, random, width, height, { count: 60, minR: 0.02, maxR: 0.07, colors: [first, third], alpha: 0.15 });
      craters(ctx, random, width, height, 420, third, look.palette[3], 0.02);
      break;
    case 'clouds':
      ctx.lineCap = 'round';
      for (let i = 0; i < 60; i++) {
        ctx.globalAlpha = 0.16;
        ctx.strokeStyle = pick(random, look.palette);
        ctx.lineWidth = (0.01 + random() * 0.04) * height;
        const y = random() * height;
        ctx.beginPath();
        ctx.moveTo(-0.1 * width, y);
        ctx.bezierCurveTo(width * 0.3, y + (random() - 0.5) * height * 0.2, width * 0.7, y + (random() - 0.5) * height * 0.2, width * 1.1, y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      break;
    case 'earthlike': {
      const ocean = ctx.createLinearGradient(0, 0, 0, height);
      ocean.addColorStop(0, first);
      ocean.addColorStop(0.5, second);
      ocean.addColorStop(1, first);
      ctx.fillStyle = ocean;
      ctx.fillRect(0, 0, width, height);
      for (let c = 0; c < 7; c++) {
        const cx = random() * width;
        const cy = (0.2 + random() * 0.6) * height;
        for (let i = 0; i < 40; i++) {
          ctx.fillStyle = random() < 0.7 ? third : look.palette[3];
          wrappedCircle(ctx, width, cx + (random() - 0.5) * width * 0.16, cy + (random() - 0.5) * height * 0.28, (0.006 + random() * 0.022) * width);
        }
      }
      polarCaps(ctx, random, width, height, look.palette[4], 0.07, 0.09);
      blobs(ctx, random, width, height, { count: 120, minR: 0.004, maxR: 0.02, colors: [look.palette[4]], alpha: 0.35 });
      break;
    }
    case 'dusty':
      ctx.fillStyle = first;
      ctx.fillRect(0, 0, width, height);
      blobs(ctx, random, width, height, { count: 40, minR: 0.02, maxR: 0.07, colors: [third], alpha: 0.3, yMin: 0.2, yMax: 0.8 });
      blobs(ctx, random, width, height, { count: 30, minR: 0.02, maxR: 0.06, colors: [look.palette[3]], alpha: 0.18 });
      craters(ctx, random, width, height, 120, third, look.palette[3], 0.012);
      polarCaps(ctx, random, width, height, look.palette[4], 0.04, 0.03);
      break;
    case 'banded':
      bands(ctx, random, width, height, look);
      break;
    default:
      throw new Error(`Unknown surface style: ${look.style}`);
  }
}

/** Ring brightness from inner (0) to outer (1) edge; Saturn gets a Cassini-style gap. */
export function ringProfile(look, samples = 256) {
  const random = mulberry32(look.seed + 7);
  const gap = look.ring && look.ring.inner < 1.3 ? [0.66, 0.7] : null;
  return Array.from({ length: samples }, (_, i) => {
    const t = i / (samples - 1);
    if (gap && t > gap[0] && t < gap[1]) return 0.05;
    const edgeFade = Math.min(1, t * 12, (1 - t) * 12);
    return Math.max(0, Math.min(1, (0.55 + 0.35 * Math.sin(t * 40 + random() * 2) + (random() - 0.5) * 0.3) * edgeFade));
  });
}

export function createCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export function createSurfaceTexture(THREE, look, width) {
  const canvas = createCanvas(width, width / 2);
  drawSurface(canvas.getContext('2d'), canvas.width, canvas.height, look);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function createRingTexture(THREE, look) {
  const profile = ringProfile(look);
  const canvas = createCanvas(profile.length, 4);
  const ctx = canvas.getContext('2d');
  profile.forEach((value, x) => {
    ctx.globalAlpha = value;
    ctx.fillStyle = look.ring.color;
    ctx.fillRect(x, 0, 1, canvas.height);
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createGlowTexture(THREE) {
  const size = 256;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255, 220, 140, 0.85)');
  gradient.addColorStop(0.35, 'rgba(255, 170, 60, 0.35)');
  gradient.addColorStop(1, 'rgba(255, 140, 40, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
