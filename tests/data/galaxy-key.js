// Hand-written expectations for the galaxy collection, typed in from the NASA pages listed in docs/SCIENCE.md.
// Never derive this from src/data/galaxies.json: the tests compare the data against this key.
// distanceLy is the value the data should use; null for the Milky Way, which we observe from inside.
export const GALAXY_KEY = {
  'milky-way': { name: 'Milky Way', classification: 'barred-spiral', viewpoint: 'inside', distanceLy: null, messier: null, imageKind: 'artist-concept' },
  'large-magellanic-cloud': { name: 'Large Magellanic Cloud', classification: 'irregular', viewpoint: 'outside', distanceLy: 163000, messier: null, imageKind: 'composite' },
  'small-magellanic-cloud': { name: 'Small Magellanic Cloud', classification: 'irregular', viewpoint: 'outside', distanceLy: 200000, messier: null, imageKind: 'composite' },
  andromeda: { name: 'Andromeda Galaxy', classification: 'spiral', viewpoint: 'outside', distanceLy: 2500000, messier: 'M31', imageKind: 'composite' },
  triangulum: { name: 'Triangulum Galaxy', classification: 'spiral', viewpoint: 'outside', distanceLy: 3000000, messier: 'M33', imageKind: 'composite' },
  'messier-81': { name: 'Messier 81', classification: 'spiral', viewpoint: 'outside', distanceLy: 11600000, messier: 'M81', imageKind: 'composite' },
  cigar: { name: 'Cigar Galaxy', classification: 'spiral', viewpoint: 'outside', distanceLy: 12000000, messier: 'M82', imageKind: 'composite' },
  pinwheel: { name: 'Pinwheel Galaxy', classification: 'spiral', viewpoint: 'outside', distanceLy: 21800000, messier: 'M101', imageKind: 'composite' },
  sombrero: { name: 'Sombrero Galaxy', classification: 'spiral', viewpoint: 'outside', distanceLy: 28000000, messier: 'M104', imageKind: 'composite' },
  whirlpool: { name: 'Whirlpool Galaxy', classification: 'spiral', viewpoint: 'outside', distanceLy: 31000000, messier: 'M51', imageKind: 'composite' },
  'messier-87': { name: 'Messier 87', classification: 'elliptical', viewpoint: 'outside', distanceLy: 54000000, messier: 'M87', imageKind: 'photograph' },
  'ngc-1300': { name: 'NGC 1300', classification: 'barred-spiral', viewpoint: 'outside', distanceLy: 69000000, messier: null, imageKind: 'composite' },
};

// Where NASA pages disagree, the other values the data must keep (in light-years).
export const OTHER_NASA_ESTIMATES = {
  'large-magellanic-cloud': [179000],
  'small-magellanic-cloud': [210000],
  pinwheel: [25000000],
};
