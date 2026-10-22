// Discovery Missions: progress and completion rules. No DOM here; the mission panel renders this state.
// Progress is kept per mission, in memory only, and is completely separate from the quiz.
//
// Completion rules:
// - A "find" step is never completed by opening a world. Opening the target only makes
//   "I've found it" available; the child must then press it.
// - A "question" step is completed only by choosing the correct answer. Wrong answers are
//   remembered so they can't be chosen twice, and the child can keep trying.
// - A question step with `visitRequired` accepts answers only after its `explore` world has been
//   opened during that step. Answering is still the separate, deliberate action.

export function initialMissionState() {
  return { activeMissionId: null, progress: {} };
}

function freshProgress(mission, status) {
  return {
    status,
    stepIndex: 0,
    phase: 'task',
    steps: Object.fromEntries(mission.steps.map(step => [step.id, { visited: false, done: false, tried: [], last: null }])),
  };
}

const updateStep = (progress, stepId, patch) => ({ ...progress, steps: { ...progress.steps, [stepId]: { ...progress.steps[stepId], ...patch } } });

/** Pure transition function. `missions` is the list from src/data/missions.json. */
export function reduceMissions(state, action, missions) {
  const mission = missions.find(m => m.id === action.missionId);
  const progress = mission ? state.progress[mission.id] : null;
  const step = progress ? mission.steps[progress.stepIndex] : null;
  const withProgress = next => ({ ...state, progress: { ...state.progress, [mission.id]: next } });

  switch (action.type) {
    case 'open':
      if (action.missionId === null) return state.activeMissionId === null ? state : { ...state, activeMissionId: null };
      if (!mission) return state;
      return {
        activeMissionId: mission.id,
        progress: progress ? state.progress : { ...state.progress, [mission.id]: freshProgress(mission, 'intro') },
      };
    case 'start':
    case 'restart':
      if (!mission) return state;
      return { activeMissionId: mission.id, progress: { ...state.progress, [mission.id]: freshProgress(mission, 'active') } };
    case 'visit': {
      // Opening a world records the visit for any mission waiting to find something there.
      let changed = false;
      const next = { ...state.progress };
      for (const m of missions) {
        const p = next[m.id];
        if (!p || p.status !== 'active' || p.phase !== 'task') continue;
        const current = m.steps[p.stepIndex];
        const waitingFor = current.type === 'find' ? current.target : current.visitRequired ? current.explore : null;
        if (waitingFor === action.target && !p.steps[current.id].visited) {
          next[m.id] = updateStep(p, current.id, { visited: true });
          changed = true;
        }
      }
      return changed ? { ...state, progress: next } : state;
    }
    case 'found':
      if (!step || progress.status !== 'active' || progress.phase !== 'task' || step.type !== 'find') return state;
      if (!progress.steps[step.id].visited) return state; // must explore the world first
      return withProgress({ ...updateStep(progress, step.id, { done: true }), phase: 'feedback' });
    case 'answer': {
      if (!step || progress.status !== 'active' || progress.phase !== 'task' || step.type !== 'question') return state;
      const stepProgress = progress.steps[step.id];
      if (step.visitRequired && !stepProgress.visited) return state; // explore the world first
      if (!step.answers.some(a => a.id === action.answerId) || stepProgress.tried.includes(action.answerId)) return state;
      const correct = action.answerId === step.correctAnswerId;
      const last = { answerId: action.answerId, correct };
      if (correct) return withProgress({ ...updateStep(progress, step.id, { done: true, last }), phase: 'feedback' });
      return withProgress(updateStep(progress, step.id, { tried: [...stepProgress.tried, action.answerId], last }));
    }
    case 'next':
      if (!step || progress.status !== 'active' || progress.phase !== 'feedback') return state;
      if (progress.stepIndex + 1 >= mission.steps.length) return withProgress({ ...progress, status: 'complete' });
      return withProgress({ ...progress, stepIndex: progress.stepIndex + 1, phase: 'task' });
    default:
      return state;
  }
}

export const missionProgress = (state, missionId) => state.progress[missionId] ?? null;

/** 'not-started' | 'intro' | 'in-progress' | 'complete' for a mission. */
export function missionStatus(state, missionId) {
  const progress = state.progress[missionId];
  if (!progress) return 'not-started';
  return progress.status === 'active' ? 'in-progress' : progress.status;
}

export function currentStep(state, mission) {
  const progress = state.progress[mission.id];
  return progress && progress.status === 'active' ? mission.steps[progress.stepIndex] : null;
}

/**
 * Identifies the mission screen being shown: which mission, its status, step and phase. A saved
 * reading position or a delayed announcement only applies while this stays the same.
 */
export function screenKey(state) {
  const progress = state.progress[state.activeMissionId];
  return progress ? [state.activeMissionId, progress.status, progress.stepIndex, progress.phase].join('|') : 'list';
}

export const stepLabel = (index, total) => `Step ${index + 1} of ${total}`;

/** The mission to offer a "Back to the mission" bar for: the one last opened, if unfinished. */
export function resumableMission(state, missions) {
  const mission = missions.find(m => m.id === state.activeMissionId);
  return mission && state.progress[mission.id]?.status === 'active' ? mission : null;
}

/** Plain-language completion criteria, shown with every task. */
export function completionCriteria(step, place) {
  if (step.type === 'find') {
    return `To complete this step: explore ${place}, look for ${step.lookFor}, then press “I’ve found it”. Just opening ${place} doesn’t count.`;
  }
  const choose = 'choose the right answer. If your first choice isn’t right, you can have another go.';
  if (step.visitRequired) return `To complete this step: explore ${place}, come back here, then ${choose}`;
  return `To complete this step: ${choose}`;
}

/**
 * What assistive technology hears after an action. `status` joins the visible heading in the
 * focused heading's accessible name; `detail` is read afterwards through the live region.
 */
export function stepAnnouncement(step, stepProgress, index, total) {
  const progressText = stepLabel(index, total);
  if (step.type === 'find') {
    return { heading: 'Great find!', status: `${progressText} complete.`, detail: step.reveal };
  }
  const chosen = step.answers.find(a => a.id === stepProgress.last?.answerId);
  if (stepProgress.last?.correct) {
    return { heading: 'That’s right!', status: `You chose ${chosen.text}. That is correct. ${progressText} complete.`, detail: step.explanation };
  }
  return { heading: 'Not quite yet', status: `You chose ${chosen.text}. That isn’t it, so have another go.`, detail: step.hint };
}

/** Small store so the panel, the mission bar and the explorer react to the same state. */
export function createMissionStore(missions) {
  let state = initialMissionState();
  const listeners = new Set();
  return {
    missions,
    getState: () => state,
    dispatch(action) {
      const previous = state;
      state = reduceMissions(state, action, missions);
      if (state !== previous) for (const listener of listeners) listener(state, previous, action);
      return state;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
