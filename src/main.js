import planets from './data/planets.json';
import sun from './data/sun.json';
import sources from './data/sources.json';
import quizQuestions from './data/quiz.json';
import missions from './data/missions.json';
import experiments from './data/experiments.json';
import galaxiesUrl from './data/galaxies.json?url';
import { startExplorer } from './features/explorer.js';
import './style.css';

const bodies = [sun, ...planets];
const earth = planets.find(planet => planet.id === 'earth');
const sourcesById = Object.fromEntries(sources.map(source => [source.id, source]));
const byId = id => document.getElementById(id);

startExplorer({
  elements: {
    stage: byId('stage'),
    sceneContainer: byId('scene'),
    canvas: byId('scene-canvas'),
    labels: byId('scene-labels'),
    card: byId('scene-card'),
    sceneStatus: byId('scene-status'),
    selector: byId('body-selector'),
    controls: byId('controls'),
    status: byId('explorer-status'),
    panel: byId('info-panel'),
    planetList: byId('planets'),
    quizEntry: byId('quiz-entry'),
    exploreEntry: byId('explore-entry'),
    missionsEntry: byId('missions-entry'),
    experimentsEntry: byId('experiments-entry'),
    exploreSwitch: byId('explore-switch'),
    cosmos: byId('cosmos'),
    cosmosMap: byId('cosmos-map'),
    cosmosSelected: byId('cosmos-selected'),
  },
  bodies,
  planets,
  earth,
  sourcesById,
  quizQuestions,
  missions,
  experiments,
  // The galaxy collection is downloaded only when Cosmos is first opened. It is fetched rather than imported
  // because browsers remember a failed import() and never retry it, which would break "Try again".
  loadGalaxies: async () => {
    const response = await fetch(galaxiesUrl);
    if (!response.ok) throw new Error(`Galaxy collection: HTTP ${response.status}`);
    return response.json();
  },
});
