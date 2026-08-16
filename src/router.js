/**
 * 해시 기반 라우터. 화면 전환마다 이전 화면의 destroy 를 호출해 리스너를 정리한다.
 *
 * @typedef {{ element: HTMLElement, tone: string, destroy?: () => void }} Screen
 * @typedef {{ create: () => Screen, guard?: () => string | null, title: string }} Route
 */

import { trackScreenView } from './lib/ga.js';

const DEFAULT_PATH = '#/';

/** @type {Map<string, Route>} */
const routes = new Map();

/** @type {HTMLElement | null} */
let rootElement = null;
/** @type {Screen | null} */
let currentScreen = null;

/**
 * @param {string} path
 * @param {{ replace?: boolean }} [options]
 */
export function navigate(path, { replace = false } = {}) {
  if (window.location.hash === path) return;
  if (replace) window.location.replace(path);
  else window.location.hash = path;
}

function renderCurrentRoute() {
  if (!rootElement) return;

  const path = window.location.hash || DEFAULT_PATH;
  const route = routes.get(path) ?? routes.get(DEFAULT_PATH);
  if (!route) return;

  const redirectPath = route.guard?.();
  if (redirectPath) {
    navigate(redirectPath, { replace: true });
    return;
  }

  currentScreen?.destroy?.();
  currentScreen = route.create();

  document.documentElement.dataset.screen = currentScreen.tone;
  rootElement.replaceChildren(currentScreen.element);
  window.scrollTo(0, 0);

  // 해시만 바뀌면 GA 가 스스로 알아채지 못하므로 화면 조회를 직접 알린다.
  trackScreenView(route.title);
}

/**
 * @param {HTMLElement} root
 * @param {Record<string, Route>} routeMap
 */
export function startRouter(root, routeMap) {
  rootElement = root;
  for (const [path, route] of Object.entries(routeMap)) routes.set(path, route);

  window.addEventListener('hashchange', renderCurrentRoute);

  if (!window.location.hash) window.location.replace(DEFAULT_PATH);
  renderCurrentRoute();
}
