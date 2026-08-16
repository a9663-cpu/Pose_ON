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

/**
 * Supabase 대시보드에서 URL 을 복사하면 끝에 `/` 가 붙어 오는 경우가 많다.
 * 그대로 두면 `https://xxx.supabase.co//rest/v1/events` 처럼 슬래시가 겹쳐 404 가 난다.
 * 공백과 끝 슬래시를 여기서 한 번에 정리한다.
 */
const baseUrl = SUPABASE_URL.trim().replace(/\/+$/, '');
const anonKey = SUPABASE_ANON_KEY.trim();

const isConfigured = baseUrl.length > 0 && anonKey.length > 0;

/** 실제로 요청이 날아가는 주소. 문제 생겼을 때 이 값부터 확인하면 된다. */
const endpoint = `${baseUrl}${EVENTS_ENDPOINT}`;

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
function requestHeaders() {
  return {
    'Content-Type': 'application/json',
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    // 응답 본문을 요구하지 않는다. RLS 가 INSERT 만 허용하므로 필수 설정이다.
    Prefer: 'return=minimal',
  };
}

function sendEvent(event) {
  if (!isConfigured) return;

  const row = { visitor_id: getVisitorId(), session_id: sessionId, ...event };

  try {
    fetch(endpoint, {
      method: 'POST',
      headers: requestHeaders(),
      body: JSON.stringify(row),
      keepalive: true,
    })
      .then(async (response) => {
        if (response.ok) return;
        // 서비스 동작은 그대로 두되, 왜 안 쌓이는지는 콘솔에서 볼 수 있어야 한다.
        const detail = await response.text().catch(() => '');
        console.warn(
          `[analytics] 기록 실패 ${response.status} ${response.statusText} — ${endpoint}\n${detail}`,
        );
      })
      .catch((error) => {
        console.warn(`[analytics] 요청 자체가 실패했습니다 — ${endpoint}`, error);
      });
  } catch (error) {
    console.warn('[analytics] fetch 를 시작하지 못했습니다.', error);
  }
}

/**
 * 실패 응답을 사람이 바로 조치할 수 있는 문장으로 바꾼다.
 * PostgREST 는 원인을 code 로 알려준다. (PGRST205 = 테이블 못 찾음, 42501 = RLS 거부)
 * @param {number} status
 * @param {string} detail 응답 본문
 */
function explainFailure(status, detail) {
  if (detail.includes('PGRST205') || status === 404) {
    return (
      'events 테이블을 찾지 못했습니다. 아래를 순서대로 확인하세요.\n' +
      '  1) supabase/schema.sql 을 SQL Editor 에서 실행했는가\n' +
      '  2) 실행한 프로젝트와 위 엔드포인트 주소의 프로젝트가 같은가\n' +
      "  3) 실행했는데도 404 라면 스키마 캐시 문제다. SQL Editor 에서: notify pgrst, 'reload schema';"
    );
  }
  if (detail.includes('42501') || status === 403) {
    return (
      'RLS 정책이 INSERT 를 막고 있습니다.\n' +
      '  schema.sql 의 "anon can insert events" 정책이 만들어졌는지 확인하세요.\n' +
      '  (Supabase → Authentication → Policies → events)'
    );
  }
  if (status === 401) {
    return 'anon 키가 잘못됐습니다. Project Settings → API 의 anon public 키를 다시 확인하세요.';
  }
  if (status === 400) {
    return '테이블 제약조건에 걸렸습니다. 응답 본문의 message 를 확인하세요.';
  }
  return '응답 본문의 message 를 확인하세요.';
}

/**
 * 브라우저 콘솔에서 `poseOnDiagnose()` 로 실행하는 진단 도구.
 * 설정값과 테스트 전송 결과(HTTP 상태 + 응답 본문 + 원인 설명)를 보여준다.
 * @returns {Promise<Record<string, unknown>>}
 */
export async function diagnose() {
  /** @type {Record<string, unknown>} */
  const report = {
    설정됨: isConfigured,
    SUPABASE_URL: SUPABASE_URL === '' ? '(비어 있음)' : SUPABASE_URL,
    보정된_엔드포인트: isConfigured ? endpoint : '(설정 없음)',
    anon키_길이: anonKey.length,
  };

  if (!isConfigured) {
    console.warn(
      '[analytics] config.js 가 비어 있습니다.\n' +
        '  → Vercel 환경변수(SUPABASE_URL / SUPABASE_ANON_KEY)를 등록했는지,\n' +
        '  → 등록 "후에" 다시 배포했는지 확인하세요. 환경변수는 다음 빌드부터 반영됩니다.',
      report,
    );
    return report;
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: requestHeaders(),
      body: JSON.stringify({ visitor_id: getVisitorId(), session_id: sessionId, type: 'session_start' }),
    });
    const detail = await response.text().catch(() => '');

    report.status = `${response.status} ${response.statusText}`;
    report.응답본문 = detail === '' ? '(없음)' : detail;
    report.성공 = response.ok;

    if (response.ok) {
      console.log('[analytics] 테스트 전송 성공. 대시보드 events 테이블을 확인하세요.', report);
    } else {
      report.해결방법 = explainFailure(response.status, detail);
      console.error(
        `[analytics] 테스트 전송 실패 ${report.status}\n${report.해결방법}`,
        report,
      );
    }
  } catch (error) {
    report.성공 = false;
    report.오류 = String(error);
    console.error('[analytics] 요청이 아예 나가지 못했습니다 (CORS / 네트워크 / 차단기 의심)', report, error);
  }

  return report;
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
