/**
 * 앱 전역 상태. 선택한 조건과 찜한 포즈만 들고 있으면 되므로 스토어 라이브러리 없이 간다.
 */

import { loadPersistedState, persistState, clearLegacyLocalState } from './lib/storage.js';
import { findPoseById, MOOD_IDS, PEOPLE_OPTIONS } from './data/poses.js';

/**
 * @typedef {import('./data/poses.js').PeopleCount} PeopleCount
 * @typedef {import('./data/poses.js').MoodId} MoodId
 * @typedef {import('./data/poses.js').Pose} Pose
 * @typedef {{ people: PeopleCount | null, mood: MoodId | null, savedIds: string[] }} AppState
 */

/** @type {AppState} */
const DEFAULT_STATE = { people: null, mood: null, savedIds: [] };

// 이전 버전이 localStorage 에 저장해둔 값이 남아 있으면 방문마다 초기화가 안 된다.
clearLegacyLocalState();

/** @type {AppState} */
const state = loadPersistedState(DEFAULT_STATE);

// 저장된 데이터가 오래돼서 지금은 없는 값을 갖고 있을 수 있다. 여기서 한 번 걸러둔다.
state.savedIds = Array.isArray(state.savedIds)
  ? state.savedIds.filter((id) => findPoseById(id) !== undefined)
  : [];

if (!PEOPLE_OPTIONS.some((option) => option.value === state.people)) state.people = null;
if (!MOOD_IDS.includes(state.mood)) state.mood = null;

function save() {
  persistState(state);
}

/** @returns {PeopleCount | null} */
export function getPeople() {
  return state.people;
}

/** @param {PeopleCount} people */
export function setPeople(people) {
  state.people = people;
  save();
}

/** @returns {MoodId | null} */
export function getMood() {
  return state.mood;
}

/** @param {MoodId} mood */
export function setMood(mood) {
  state.mood = mood;
  save();
}

/** 포즈 추천 화면에 들어갈 수 있는 상태인지. */
export function hasCompleteCondition() {
  return state.people !== null && state.mood !== null;
}

/** @param {string} poseId */
export function isSaved(poseId) {
  return state.savedIds.includes(poseId);
}

/**
 * 찜 추가. 이미 찜한 포즈면 아무 것도 하지 않는다.
 * @param {string} poseId
 * @returns {boolean} 이번 호출로 새로 저장됐는지
 */
export function addSaved(poseId) {
  if (isSaved(poseId)) return false;
  state.savedIds = [poseId, ...state.savedIds];
  save();
  return true;
}

/** @param {string} poseId */
export function removeSaved(poseId) {
  state.savedIds = state.savedIds.filter((id) => id !== poseId);
  save();
}

export function getSavedCount() {
  return state.savedIds.length;
}

/**
 * 찜한 순서(최신순)를 유지한 채 포즈 객체로 돌려준다.
 * @returns {Pose[]}
 */
export function getSavedPoses() {
  return state.savedIds
    .map((id) => findPoseById(id))
    .filter((pose) => pose !== undefined);
}
