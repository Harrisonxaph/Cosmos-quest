// Independent answer key for the Planet Quiz, written by hand from the NASA sources in docs/SCIENCE.md.
// It deliberately does NOT read src/data/quiz.json, so changing a correct answer in the data
// (for example Earth's air from nitrogen to oxygen) makes the tests fail instead of passing silently.
//
// answer:   the text of the answer that must be marked correct.
// evidence: words the app's own data must contain to support that answer (checked in quiz.test.js).
//           For measurements it is the measured value; for rankings it is the field and direction.

export const ANSWER_KEY = {
  'sun-what-is-it': { answer: 'A star: a huge ball of hot, glowing gas', evidence: 'The Sun is a star' },
  'sun-made-of': { answer: 'Hydrogen and helium gas', evidence: 'hydrogen and helium' },
  'sun-fill-with-earths': { answer: 'About 1.3 million', evidence: '1.3 million Earths' },
  'mercury-smallest': { answer: 'Mercury', evidence: 'Mercury is the smallest planet' },
  'mercury-closest': { answer: 'Mercury', evidence: { field: 'meanDistanceFromSunE6Km', order: 'min' } },
  'mercury-year': { answer: '88 Earth days', evidence: { field: 'orbitalPeriodDays', value: 88 } },
  'venus-hottest': { answer: 'Venus', evidence: 'Venus is the hottest planet' },
  'venus-spin-direction': { answer: 'Backwards', evidence: 'spins backwards' },
  'venus-spin-or-year': { answer: 'One spin', evidence: '243 Earth days to spin around once, which is longer than its whole year' },
  'earth-life': { answer: 'Earth', evidence: 'Earth is the only planet known to support life' },
  'earth-ocean': { answer: 'About 71%', evidence: 'about 71%' },
  'earth-air': { answer: 'Nitrogen', evidence: '78% nitrogen' },
  'mars-red': { answer: 'Iron in its dust has rusted', evidence: 'rusted' },
  'mars-moon-names': { answer: 'Phobos and Deimos', evidence: 'Phobos and Deimos' },
  'mars-olympus-mons': { answer: 'Volcano', evidence: 'Olympus Mons, a volcano' },
  'jupiter-largest': { answer: 'Jupiter', evidence: 'Jupiter is the largest planet' },
  'jupiter-no-surface': { answer: 'No: Jupiter is a gas giant with no solid surface', evidence: 'no true surface' },
  'jupiter-red-spot': { answer: 'A giant storm', evidence: 'giant storm' },
  'saturn-rings': { answer: 'Billions of chunks of ice and rock', evidence: 'chunks of ice and rock' },
  'saturn-float': { answer: 'Saturn', evidence: 'Saturn is the only planet in our solar system with an average density less than water' },
  'saturn-titan': { answer: 'Mercury', evidence: 'bigger than the planet Mercury' },
  'uranus-on-its-side': { answer: 'Uranus', evidence: 'Uranus rotates on its side' },
  'uranus-colour': { answer: 'Methane gas in its air', evidence: 'Methane gas in its air gives it a blue-green colour' },
  'uranus-telescope': { answer: 'Uranus', evidence: 'Uranus was the first planet found with a telescope' },
  'neptune-farthest': { answer: 'Neptune', evidence: { field: 'meanDistanceFromSunE6Km', order: 'max' } },
  'neptune-found-by-maths': { answer: 'By using maths to predict where it was', evidence: 'mathematical predictions' },
  'neptune-not-naked-eye': { answer: 'Neptune', evidence: 'Neptune is the only planet in our solar system not visible to the naked eye' },
};
