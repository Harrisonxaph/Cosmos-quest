import { test } from 'node:test';
import assert from 'node:assert/strict';
import missions from '../../src/data/missions.json' with { type: 'json' };
import quizQuestions from '../../src/data/quiz.json' with { type: 'json' };
import {
  initialMissionState, reduceMissions, createMissionStore, missionStatus, currentStep, resumableMission,
  completionCriteria, stepAnnouncement, stepLabel,
} from '../../src/features/missions.js';
import { createQuizStore, currentQuestion } from '../../src/features/quiz.js';
import { MISSION_ANSWER_KEY } from '../data/mission-answer-key.js';

const run = (state, ...actions) => actions.reduce((s, action) => reduceMissions(s, action, missions), state);
const rocky = missions.find(m => m.id === 'rocky-neighbours');
const giants = missions.find(m => m.id === 'giants-without-ground');
const keyAnswerId = (mission, step) => step.answers.find(a => a.text === MISSION_ANSWER_KEY[mission.id][step.id].answer).id;

/** Complete every step of a mission the way a child would: visit, press found, or answer from the key. */
function completeMission(state, mission, { wrongFirst = false } = {}) {
  let s = run(state, { type: 'start', missionId: mission.id });
  for (const step of mission.steps) {
    if (step.type === 'find') {
      s = run(s, { type: 'visit', target: step.target }, { type: 'found', missionId: mission.id });
    } else {
      const right = keyAnswerId(mission, step);
      if (wrongFirst) s = run(s, { type: 'answer', missionId: mission.id, answerId: step.answers.find(a => a.id !== right).id });
      s = run(s, { type: 'answer', missionId: mission.id, answerId: right });
    }
    s = run(s, { type: 'next', missionId: mission.id });
  }
  return s;
}

test('opening a mission shows its introduction without starting it', () => {
  const s = run(initialMissionState(), { type: 'open', missionId: 'rocky-neighbours' });
  assert.equal(s.activeMissionId, 'rocky-neighbours');
  assert.equal(missionStatus(s, 'rocky-neighbours'), 'intro');
  assert.equal(currentStep(s, rocky), null);
  assert.equal(missionStatus(s, 'giants-without-ground'), 'not-started');
});

test('starting a mission begins at step 1 with one task at a time', () => {
  const s = run(initialMissionState(), { type: 'start', missionId: 'rocky-neighbours' });
  assert.equal(missionStatus(s, 'rocky-neighbours'), 'in-progress');
  assert.equal(currentStep(s, rocky).id, 'find-mercury');
  assert.equal(stepLabel(0, rocky.steps.length), 'Step 1 of 5');
});

test('opening a world never completes a find step by itself', () => {
  let s = run(initialMissionState(), { type: 'start', missionId: 'rocky-neighbours' });
  s = run(s, { type: 'visit', target: 'mercury' });
  assert.equal(s.progress['rocky-neighbours'].steps['find-mercury'].visited, true);
  assert.equal(s.progress['rocky-neighbours'].steps['find-mercury'].done, false);
  assert.equal(s.progress['rocky-neighbours'].phase, 'task');
  assert.equal(currentStep(s, rocky).id, 'find-mercury');
});

test('“I’ve found it” only works after exploring the right world', () => {
  let s = run(initialMissionState(), { type: 'start', missionId: 'rocky-neighbours' });
  assert.equal(run(s, { type: 'found', missionId: 'rocky-neighbours' }), s, 'cannot claim before exploring');
  s = run(s, { type: 'visit', target: 'venus' });
  assert.equal(run(s, { type: 'found', missionId: 'rocky-neighbours' }), s, 'the wrong world does not count');
  s = run(s, { type: 'visit', target: 'mercury' }, { type: 'found', missionId: 'rocky-neighbours' });
  assert.equal(s.progress['rocky-neighbours'].steps['find-mercury'].done, true);
  assert.equal(s.progress['rocky-neighbours'].phase, 'feedback');
});

test('question steps complete only with the right answer, and wrong answers can be retried once each', () => {
  let s = run(initialMissionState(), { type: 'start', missionId: 'giants-without-ground' });
  for (const step of giants.steps.slice(0, 2)) s = run(s, { type: 'visit', target: step.target }, { type: 'found', missionId: giants.id }, { type: 'next', missionId: giants.id });
  const step = currentStep(s, giants);
  assert.equal(step.id, 'saturn-kind');
  const right = keyAnswerId(giants, step);
  const wrong = step.answers.find(a => a.id !== right).id;
  s = run(s, { type: 'answer', missionId: giants.id, answerId: wrong });
  assert.equal(s.progress[giants.id].steps['saturn-kind'].done, false);
  assert.deepEqual(s.progress[giants.id].steps['saturn-kind'].tried, [wrong]);
  assert.equal(s.progress[giants.id].phase, 'task', 'still on the task, with a hint');
  assert.equal(run(s, { type: 'answer', missionId: giants.id, answerId: wrong }), s, 'the same wrong answer is not counted twice');
  assert.equal(run(s, { type: 'next', missionId: giants.id }), s, 'cannot skip an unfinished step');
  s = run(s, { type: 'answer', missionId: giants.id, answerId: right });
  assert.equal(s.progress[giants.id].steps['saturn-kind'].done, true);
  assert.equal(s.progress[giants.id].phase, 'feedback');
  assert.equal(run(s, { type: 'answer', missionId: giants.id, answerId: wrong }), s, 'answers after completion are ignored');
});

test('every mission can be completed, ending with a recap', () => {
  for (const mission of missions) {
    const s = completeMission(initialMissionState(), mission, { wrongFirst: true });
    assert.equal(missionStatus(s, mission.id), 'complete', mission.id);
    assert.ok(mission.steps.every(step => s.progress[mission.id].steps[step.id].done), mission.id);
    assert.equal(resumableMission(s, missions), null, 'a finished mission has no resume bar');
  }
});

test('replaying a mission starts again from step 1 with nothing done', () => {
  const finished = completeMission(initialMissionState(), rocky);
  const replay = run(finished, { type: 'restart', missionId: rocky.id });
  assert.equal(missionStatus(replay, rocky.id), 'in-progress');
  assert.equal(replay.progress[rocky.id].stepIndex, 0);
  assert.ok(rocky.steps.every(step => !replay.progress[rocky.id].steps[step.id].done && !replay.progress[rocky.id].steps[step.id].visited));
});

test('leaving and switching missions keeps each mission’s progress', () => {
  let s = run(initialMissionState(), { type: 'start', missionId: rocky.id }, { type: 'visit', target: 'mercury' }, { type: 'found', missionId: rocky.id }, { type: 'next', missionId: rocky.id });
  s = run(s, { type: 'open', missionId: null });
  assert.equal(s.progress[rocky.id].stepIndex, 1, 'closing the mission panel keeps progress');
  s = run(s, { type: 'start', missionId: giants.id }, { type: 'visit', target: 'jupiter' });
  s = run(s, { type: 'open', missionId: rocky.id });
  assert.equal(currentStep(s, rocky).id, 'find-venus', 'back where we left off');
  assert.equal(s.progress[giants.id].steps['find-jupiter'].visited, true, 'the other mission is untouched');
  assert.equal(resumableMission(s, missions).id, rocky.id);
});

test('a visit only counts for the step waiting for that world', () => {
  let s = run(initialMissionState(), { type: 'start', missionId: rocky.id }, { type: 'visit', target: 'venus' });
  assert.equal(s.progress[rocky.id].steps['find-venus'].visited, false, 'visiting a later step’s world early does not count');
  s = run(s, { type: 'visit', target: 'mercury' }, { type: 'found', missionId: rocky.id }, { type: 'next', missionId: rocky.id });
  assert.equal(s.progress[rocky.id].steps['find-venus'].visited, false, 'it must be visited during its own step');
});

test('mission progress and quiz progress are independent', () => {
  const missionsStore = createMissionStore(missions);
  const quiz = createQuizStore(quizQuestions);
  missionsStore.dispatch({ type: 'start', missionId: rocky.id });
  quiz.startRound();
  const question = currentQuestion(quiz.getState());
  quiz.dispatch({ type: 'answer', answerId: question.correctAnswerId });
  missionsStore.dispatch({ type: 'visit', target: 'mercury' });
  missionsStore.dispatch({ type: 'found', missionId: rocky.id });
  assert.equal(quiz.getState().status, 'feedback', 'missions do not move the quiz');
  assert.equal(quiz.getState().index, 0);
  quiz.dispatch({ type: 'reset' });
  assert.equal(missionsStore.getState().progress[rocky.id].phase, 'feedback', 'resetting the quiz does not touch missions');
  missionsStore.dispatch({ type: 'restart', missionId: rocky.id });
  assert.equal(quiz.getState().status, 'idle');
});

test('completion criteria and announcements are explicit', () => {
  assert.match(completionCriteria(rocky.steps[0], 'Mercury'), /press “I’ve found it”.*Just opening Mercury doesn’t count/);
  assert.match(completionCriteria(rocky.steps[4]), /choose the right answer/);
  const find = stepAnnouncement(rocky.steps[0], { last: null }, 0, 5);
  assert.equal(find.status, 'Step 1 of 5 complete.');
  assert.equal(find.detail, rocky.steps[0].reveal);
  const question = rocky.steps[4];
  const right = stepAnnouncement(question, { last: { answerId: 'venus', correct: true } }, 4, 5);
  assert.equal(right.status, 'You chose Venus. That is correct. Step 5 of 5 complete.');
  assert.equal(right.detail, question.explanation);
  const wrong = stepAnnouncement(question, { last: { answerId: 'mars', correct: false } }, 4, 5);
  assert.equal(wrong.status, 'You chose Mars. That isn’t it, so have another go.');
  assert.equal(wrong.detail, question.hint);
  assert.doesNotMatch(wrong.heading, /wrong|incorrect/i);
});

test('the store notifies listeners and ignores unknown missions', () => {
  const store = createMissionStore(missions);
  const seen = [];
  store.subscribe((state, previous, action) => seen.push(action.type));
  store.dispatch({ type: 'open', missionId: 'not-a-mission' });
  store.dispatch({ type: 'start', missionId: rocky.id });
  store.dispatch({ type: 'found', missionId: rocky.id }); // ignored: not visited
  assert.deepEqual(seen, ['start']);
});
