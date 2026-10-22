// Science Experiments: activity settings and results. No DOM here; the experiment panel renders this state.
// Settings are kept per activity, in memory only, for this visit, separate from the quiz and missions.
//
// Rules:
// - Typing, choosing a planet or moving the slider changes the settings only. A result appears only
//   after the deliberate "Show the result" / "Calculate my model" action, and any later change hides
//   it again so a result never shows values that are no longer on screen.
// - A prediction is optional and never scored. It is stored with the result it was made for.
import { parseMeasurement } from '../utils/experiments.js';

function defaults(experiment) {
  return {
    text: String(experiment.input.default),
    worldId: experiment.defaultWorld ?? null,
    prediction: null,
    revealed: null,
    error: null,
  };
}

export function initialExperimentState(experiments) {
  return { activeId: null, activities: Object.fromEntries(experiments.map(e => [e.id, defaults(e)])) };
}

/** Pure transition function. `experiments` is the list from src/data/experiments.json. */
export function reduceExperiments(state, action, experiments) {
  const experiment = experiments.find(e => e.id === action.id);
  const activity = experiment ? state.activities[experiment.id] : null;
  const update = patch => ({ ...state, activities: { ...state.activities, [experiment.id]: { ...activity, ...patch } } });

  switch (action.type) {
    case 'open':
      if (action.id === null) return state.activeId === null ? state : { ...state, activeId: null };
      return experiment && state.activeId !== experiment.id ? { ...state, activeId: experiment.id } : state;
    case 'input': {
      if (!experiment) return state;
      const text = String(action.text ?? '');
      return text === activity.text ? state : update({ text, revealed: null, error: null });
    }
    case 'world':
      if (!experiment?.worlds?.includes(action.worldId) || action.worldId === activity.worldId) return state;
      return update({ worldId: action.worldId, revealed: null });
    case 'predict': {
      if (!experiment) return state;
      const valid = action.optionId === null || experiment.prediction.options.some(o => o.id === action.optionId);
      return valid && action.optionId !== activity.prediction ? update({ prediction: action.optionId, revealed: null }) : state;
    }
    case 'reveal': {
      if (!experiment) return state;
      const parsed = parseMeasurement(activity.text, experiment.input);
      if (!parsed.ok) return update({ revealed: null, error: { code: parsed.code, message: parsed.message } });
      return update({ error: null, revealed: { value: parsed.value, worldId: activity.worldId, prediction: activity.prediction } });
    }
    case 'reset':
      return experiment ? update(defaults(experiment)) : state;
    default:
      return state;
  }
}

/** Identifies what is on screen; a saved reading position or a delayed announcement only applies while it stays the same. */
export function experimentScreenKey(state) {
  const activity = state.activities[state.activeId];
  if (!activity) return 'list';
  return [state.activeId, activity.revealed ? 'result' : activity.error ? 'error' : 'form'].join('|');
}

/** Small store so the panel and the explorer react to the same state. */
export function createExperimentStore(experiments) {
  let state = initialExperimentState(experiments);
  const listeners = new Set();
  return {
    experiments,
    getState: () => state,
    dispatch(action) {
      const previous = state;
      state = reduceExperiments(state, action, experiments);
      if (state !== previous) for (const listener of listeners) listener(state, previous, action);
      return state;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
