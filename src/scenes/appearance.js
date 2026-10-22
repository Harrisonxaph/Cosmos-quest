// Illustrative look of each body in the 3D scene. This is presentation, not science:
// colours and patterns are an artist's impression drawn by code (see docs/SCIENCE.md, "Measurements vs models").
// Ring sizes are in multiples of the body's scene radius.

export const APPEARANCE = {
  sun: { color: '#ffb340', style: 'star', palette: ['#fff1a8', '#ffc947', '#ff9a1f', '#e8650c'], seed: 11 },
  mercury: { color: '#9c9690', style: 'cratered', palette: ['#b9b3ab', '#8d8780', '#6f6a64', '#cfc9c0'], seed: 21 },
  venus: { color: '#e3c27f', style: 'clouds', palette: ['#f1d9a0', '#d9b26a', '#c99a50', '#f6e6bf'], seed: 31 },
  earth: { color: '#3d7fd1', style: 'earthlike', palette: ['#1f5fae', '#2f78c8', '#4f8f45', '#a08a5a', '#f2f6fa'], seed: 41 },
  mars: { color: '#c1532f', style: 'dusty', palette: ['#d0673d', '#b04a2a', '#8e3b22', '#e3a47c', '#f4efe9'], seed: 51 },
  jupiter: {
    color: '#d6b48c',
    style: 'banded',
    palette: ['#efe2c8', '#d9b88f', '#b98a62', '#a0704f', '#f6efe0'],
    bands: 14,
    spot: { latitude: -22, longitudeFraction: 0.62, widthFraction: 0.09, heightFraction: 0.07, color: '#c4593a' },
    seed: 61,
    ring: { inner: 1.4, outer: 1.8, color: '#8a7a6a', opacity: 0.12 },
  },
  saturn: {
    color: '#e2cf9b',
    style: 'banded',
    palette: ['#f1e3b9', '#e2cf9b', '#cdb37a', '#f6ecd2'],
    bands: 10,
    seed: 71,
    ring: { inner: 1.24, outer: 2.27, color: '#d9c79f', opacity: 0.85 },
  },
  uranus: {
    color: '#9fdde0',
    style: 'banded',
    palette: ['#a9e3e6', '#96d6da', '#b8ebee'],
    bands: 5,
    seed: 81,
    ring: { inner: 1.6, outer: 2.0, color: '#8fb3b8', opacity: 0.25 },
  },
  neptune: {
    color: '#3f66d6',
    style: 'banded',
    palette: ['#4a73e0', '#3a5fc9', '#5b84ea', '#3254b8'],
    bands: 7,
    seed: 91,
    ring: { inner: 1.7, outer: 2.5, color: '#7a88b0', opacity: 0.15 },
  },
};

export function appearanceFor(id) {
  const look = APPEARANCE[id];
  if (!look) throw new Error(`No appearance for ${id}`);
  return look;
}
