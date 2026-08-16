/**
 * 조건(인원·무드)과 찜 목록을 담아두는 저장소 래퍼.
 *
 * localStorage 가 아니라 **sessionStorage** 를 쓴다.
 *   - 화면을 옮기거나 새로고침해도 유지된다 (한 번의 방문 안에서는 안 잃어버린다)
 *   - 탭이나 브라우저를 닫으면 사라진다 → 다시 접속하면 처음부터 시작한다
 *   - 탭마다 분리된다
 * 포토부스 앞에서 여러 사람이 번갈아 쓰는 상황을 생각하면, 앞사람의 찜 목록과
 * 인원 수 선택이 다음 사람에게 남아 있으면 안 된다.
 *
 * 참고: 익명 방문자 id 와 피드백 응답 여부는 이 저장소가 아니라
 * `lib/analytics.js` 가 localStorage 에 따로 보관한다. 그건 방문을 건너 유지돼야
 * "방문자 수"를 셀 수 있고, 피드백 팝업이 매번 다시 뜨지도 않는다.
 *
 * 사파리 시크릿 모드처럼 저장소 접근 자체가 예외를 던지는 환경이 있어서
 * 항상 try/catch 로 감싸고, 실패하면 조용히 메모리 전용으로 동작한다.
 */

const STORAGE_KEY = 'pose-on:v1';

/**
 * @template T
 * @param {T} fallback
 * @returns {T}
 */
export function loadPersistedState(fallback) {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object') return fallback;

    return { ...fallback, ...parsed };
  } catch {
    return fallback;
  }
}

/**
 * @param {unknown} value
 */
export function persistState(value) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // 저장 실패는 치명적이지 않다. 이번 방문 동안은 메모리 상태로 계속 동작한다.
  }
}

/**
 * 예전 버전이 localStorage 에 남겨둔 조건·찜 목록을 지운다.
 * 이걸 안 지우면 "닫았다 다시 열어도 그대로"인 상태가 계속 남는다.
 */
export function clearLegacyLocalState() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 지우지 못해도 sessionStorage 를 읽으므로 동작에는 영향이 없다.
  }
}
