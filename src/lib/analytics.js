/**
 * 익명 사용 기록 + 피드백 저장 (Supabase REST API).
 *
 * 서버에 저장하는 것은 딱 세 가지다.
 *   session_start   방문 1건        → "전체 방문자 수" 분모
 *   like / unlike   찜 버튼 클릭    → "한 번이라도 찜한 방문자 수"
 *   feedback        1~5점           → 피드백 데이터
 * 포즈를 몇 장 봤는지는 피드백 팝업 타이밍 판단용으로 브라우저 안에서만 센다.
 *
 * 설계 원칙
 *  - 절대 서비스 동작을 방해하지 않는다. 네트워크 실패·설정 누락·저장소 차단 모두
 *    조용히 무시하고 넘어간다. 기록이 안 남을 뿐 앱은 그대로 돌아간다.
 *  - 개인정보를 모으지 않는다. 방문자 식별은 브라우저에서 만든 무작위 UUID 하나뿐이다.
 *  - supabase-js 라이브러리를 쓰지 않는다. PostgREST 엔드포인트에 fetch 한 번이면 끝이고,
 *    빌드 도구가 없는 이 프로젝트 구조와도 맞는다.
 */

import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config.js';

const STORAGE_KEY = 'pose-on:analytics:v1';
const EVENTS_ENDPOINT = '/rest/v1/events';

/** @typedef {import('../data/poses.js').Pose} Pose */
/** @typedef {{ people: number | null, mood: string | null }} Condition */

const isConfigured = SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;

/**
 * crypto.randomUUID 는 보안 컨텍스트(https 또는 localhost)에서만 존재한다.
 * 폰에서 http://192.168.x.x 로 접속하면 없기 때문에 직접 만들어 쓴다.
 * (getRandomValues 는 보안 컨텍스트가 아니어도 쓸 수 있다)
 */
function createUuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function readStore() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw === null ? null : JSON.parse(raw);
    return parsed !== null && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/** @param {Record<string, unknown>} patch */
function updateStore(patch) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readStore(), ...patch }));
  } catch {
    // 저장이 막힌 브라우저(시크릿 모드 등)에서는 이번 세션 동안만 유지된다.
  }
}

/** 브라우저에 한 번만 만들어 두고 계속 재사용하는 익명 방문자 id */
function getVisitorId() {
  const stored = readStore().visitorId;
  if (typeof stored === 'string' && stored.length > 0) return stored;

  const visitorId = createUuid();
  updateStore({ visitorId });
  return visitorId;
}

/** 이번 방문(페이지 로드) 단위 id */
const sessionId = createUuid();

/**
 * 이번 세션에 본 포즈. 순환해서 같은 포즈를 다시 만나도 한 번만 센다.
 * 이 값은 피드백 팝업을 언제 띄울지 판단하는 데만 쓰고 서버로 보내지 않는다.
 * (저장하는 건 찜과 피드백 두 가지뿐이다)
 */
const viewedPoseIds = new Set();

/**
 * @param {Record<string, unknown>} event
 */
function sendEvent(event) {
  if (!isConfigured) return;

  const row = { visitor_id: getVisitorId(), session_id: sessionId, ...event };

  try {
    fetch(`${SUPABASE_URL}${EVENTS_ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        // 응답 본문을 요구하지 않는다. RLS 가 INSERT 만 허용하므로 필수 설정이다.
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(row),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // fetch 자체가 막힌 환경이어도 여기서 끝낸다.
  }
}

export function isAnalyticsConfigured() {
  return isConfigured;
}

/** 앱이 뜰 때 한 번 호출한다. */
export function trackSessionStart() {
  sendEvent({ type: 'session_start' });
}

/**
 * 포즈 카드가 맨 앞에 올라왔을 때. 브라우저 안에서만 세고 서버로는 보내지 않는다.
 * @param {Pose} pose
 */
export function countPoseView(pose) {
  viewedPoseIds.add(pose.id);
}

/** 이번 세션에 본 서로 다른 포즈 수 */
export function getViewedPoseCount() {
  return viewedPoseIds.size;
}

/**
 * 마음에 들어요 버튼을 눌렀을 때.
 * @param {Pose} pose
 * @param {Condition} condition
 * @param {boolean} isSavedNow true 면 찜, false 면 해제
 */
export function trackLike(pose, condition, isSavedNow) {
  sendEvent({
    type: isSavedNow ? 'like' : 'unlike',
    pose_id: pose.id,
    people: condition.people,
    mood: condition.mood,
  });
}

/**
 * 피드백 점수 제출.
 * @param {number} score 1~5
 */
export function trackFeedback(score) {
  sendEvent({ type: 'feedback', score });
}

/** @returns {'pending' | 'submitted' | 'dismissed'} */
export function getFeedbackState() {
  const state = readStore().feedbackState;
  return state === 'submitted' || state === 'dismissed' ? state : 'pending';
}

/** @param {'submitted' | 'dismissed'} state */
export function setFeedbackState(state) {
  updateStore({ feedbackState: state });
}
