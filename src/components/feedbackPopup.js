/**
 * 화면 하단에서 올라오는 1문항 마이크로 피드백 팝업.
 *
 * 언제 뜨나: 포즈 카드를 MIN_VIEWED_POSES_BEFORE_ASKING 장 이상 본 방문자에게만.
 *   들어오자마자 물으면 "실제 촬영에 도움이 되었나"에 답할 근거가 없다.
 *   서비스를 실제로 써 본 사람에게만 묻도록 최소 탐색량을 조건으로 둔다.
 * 몇 번 뜨나: 방문자당 한 번. 답했거나 닫았으면 다시 뜨지 않는다.
 */

import { el } from '../lib/dom.js';
import { trackEvent } from '../lib/ga.js';
import {
  getFeedbackState,
  setFeedbackState,
  getViewedPoseCount,
  trackFeedback,
} from '../lib/analytics.js';

/** 이만큼 포즈를 본 뒤에 묻는다. (기록하는 "3장 이상 탐색" 지표와 같은 기준) */
const MIN_VIEWED_POSES_BEFORE_ASKING = 3;
const SCORES = [1, 2, 3, 4, 5];
const THANKS_VISIBLE_MS = 1600;

/** @type {{ element: HTMLElement, open: () => void } | null} */
let popup = null;

/**
 * `?feedback=force` 를 붙여 접속하면 조건을 무시하고 즉시 띄운다.
 * 배포 후 "팝업이 아예 안 뜬다" 는 상황에서, 렌더링 문제인지 조건 문제인지 가르는 용도다.
 *   https://사이트/?feedback=force
 *   https://사이트/#/deck?feedback=force   ← 해시 뒤에 붙여도 인식한다
 */
function isForcedOpen() {
  try {
    const target = `${window.location.search}&${window.location.hash}`;
    return /[?&]feedback=force\b/.test(target);
  } catch {
    return false;
  }
}

function createPopup() {
  const element = el('section', {
    class: 'feedback',
    role: 'dialog',
    'aria-label': '피드백',
    'aria-hidden': 'true',
  });

  let hideTimerId = 0;

  function open() {
    element.classList.add('is-open');
    element.setAttribute('aria-hidden', 'false');
    document.documentElement.dataset.feedback = 'open';
    // 팝업이 아래쪽 버튼을 가리지 않도록 실제 높이만큼 화면 자리를 비워준다.
    document.documentElement.style.setProperty('--feedback-height', `${element.offsetHeight}px`);
  }

  function close() {
    element.classList.remove('is-open');
    element.setAttribute('aria-hidden', 'true');
    delete document.documentElement.dataset.feedback;
    document.documentElement.style.setProperty('--feedback-height', '0px');
  }

  function dismiss() {
    trackEvent('dismiss_feedback');
    setFeedbackState('dismissed');
    close();
  }

  /** @param {number} score */
  function submit(score) {
    trackFeedback(score);
    trackEvent('submit_feedback', { score });
    setFeedbackState('submitted');
    element.classList.add('is-thanks');
    window.clearTimeout(hideTimerId);
    hideTimerId = window.setTimeout(close, THANKS_VISIBLE_MS);
  }

  const scoreButtons = SCORES.map((score) =>
    el('button', {
      class: 'feedback__score',
      type: 'button',
      'aria-label': `${score}점`,
      text: String(score),
      onClick: () => submit(score),
    }),
  );

  element.append(
    el('div', { class: 'feedback__head' }, [
      el('p', {
        class: 'feedback__question t-body-strong',
        text: '오늘 실제 촬영에 도움이 되었나요?',
      }),
      el('button', {
        class: 'feedback__close',
        type: 'button',
        'aria-label': '피드백 닫기',
        text: '✕',
        onClick: dismiss,
      }),
    ]),

    el('div', { class: 'feedback__form' }, [
      el('div', { class: 'feedback__scores', role: 'group', 'aria-label': '1점부터 5점까지' }, scoreButtons),
      el('div', { class: 'feedback__scale' }, [
        el('span', { class: 't-fine-print', text: '전혀 아니에요' }),
        el('span', { class: 't-fine-print', text: '매우 도움됐어요' }),
      ]),
    ]),

    el('p', {
      class: 'feedback__thanks t-body-strong',
      text: '고마워요! 더 좋은 포즈로 보답할게요.',
    }),
  );

  return { element, open };
}

/** 앱이 뜰 때 한 번 호출한다. 화면 전환과 무관하게 body 에 붙어 있는다. */
export function mountFeedbackPopup() {
  if (popup !== null) return;
  popup = createPopup();
  document.body.append(popup.element);

  if (isForcedOpen()) {
    console.log('[feedback] ?feedback=force 로 강제 노출합니다. 조건과 응답 기록을 무시합니다.');
    popup.open();
  }
}

/** 조건이 되면 팝업을 띄운다. 조건이 아니면 아무 일도 하지 않는다. */
export function requestFeedbackPopup() {
  if (popup === null) return;
  if (isForcedOpen()) {
    popup.open();
    return;
  }
  if (getFeedbackState() !== 'pending') return;
  if (getViewedPoseCount() < MIN_VIEWED_POSES_BEFORE_ASKING) return;
  popup.open();
}
