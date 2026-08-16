/**
 * localStorage 래퍼.
 * 사파리 시크릿 모드처럼 localStorage 접근 자체가 예외를 던지는 환경이 있어서
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
    const raw = window.localStorage.getItem(STORAGE_KEY);
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
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // 저장 실패는 치명적이지 않다. 이번 세션 동안은 메모리 상태로 계속 동작한다.
  }
}
