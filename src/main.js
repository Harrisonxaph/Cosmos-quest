import planets from './data/planets.json';
import sun from './data/sun.json';
import sources from './data/sources.json';
import quizQuestions from './data/quiz.json';
import missions from './data/missions.json';
import experiments from './data/experiments.json';
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
  },
  bodies,
  planets,
  earth,
  sourcesById,
  quizQuestions,
  missions,
  experiments,
});
