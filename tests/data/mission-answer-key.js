// Independent answer key for Discovery Missions, written by hand from the NASA sources and the
// app's existing true-scale comparisons. It never reads src/data/missions.json.
//
// Question steps: `answer` is the text that must be marked correct.
// Find steps: `learn` is the fact the child must be shown after "I've found it".

export const MISSION_ANSWER_KEY = {
  'rocky-neighbours': {
    'find-mercury': { learn: 'Mercury is the smallest planet in our solar system.' },
    'find-venus': { learn: 'Venus is the hottest planet in our solar system.' },
    'find-earth': { learn: 'Earth is the only planet known to support life.' },
    'find-mars': { learn: 'Olympus Mons on Mars is more than 40 km tall' },
    'compare-size': { answer: 'Venus' },
  },
  'giants-without-ground': {
    'find-jupiter': { learn: 'Jupiter is a gas giant' },
    'find-neptune': { learn: 'Neptune is an ice giant' },
    'saturn-kind': { answer: 'A gas giant' },
    'uranus-kind': { answer: 'Uranus' },
    'no-ground': { answer: 'No: none of them has a solid surface' },
  },
  'understanding-space': {
    'find-not-to-scale': { learn: 'a true-scale picture would show only tiny dots' },
    'fourth-planet': { answer: 'Mars' },
    'sun-size': { answer: 'About 1.1 metres' },
    'neptune-distance': { answer: 'About 3.5 km' },
    'why-not-to-scale': { answer: 'So we can see them: at true scale they would be tiny dots' },
  },
};
