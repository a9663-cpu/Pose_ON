/**
 * 포즈 카드 덱 — Tinder 형태의 스와이프 UX.
 *
 * - 맨 앞 카드만 드래그된다. 뒤 카드 2장은 위쪽으로 살짝 삐져나와 "다음 카드"를 예고한다.
 * - 손을 떼면 임계값/속도에 따라 날려보내거나(fly out) 스프링으로 제자리에 돌아온다.
 * - 카드가 떨어지면 즉시 새 카드를 뒤에 채워서 덱이 비지 않는다. 끝까지 가면 처음으로 순환한다.
 * - 좌우 어느 쪽으로 넘겨도 결과는 "다음 포즈"로 같다. 찜은 화면의 버튼이 담당하고
 *   덱은 탐색만 책임진다.
 */

import { el, clamp } from '../lib/dom.js';
import { runSpring } from '../lib/spring.js';
import { poseImageSrc } from '../data/poses.js';

/** 화면에 동시에 존재하는 카드 수 (맨 앞 1장 + 뒤 2장) */
const VISIBLE_CARDS = 3;
/** 이 거리를 넘겨서 놓으면 카드가 넘어간다 (px) */
const SWIPE_DISTANCE_THRESHOLD = 96;
/** 짧게 튕겨도 넘어가도록 하는 속도 임계값 (px/s) */
const SWIPE_VELOCITY_THRESHOLD = 550;
/** 카드가 화면 밖으로 날아가는 시간 (ms) */
const FLY_OUT_DURATION_MS = 300;
/**
 * 속도를 계산할 때 쓰는 최소 샘플 간격 (ms).
 * 1ms도 안 되는 구간으로 나누면 속도가 수만 px/s 로 튀어서 스프링이 폭주한다.
 */
const MIN_VELOCITY_SAMPLE_MS = 8;
/** 마지막 움직임 이후 이만큼 지나서 손을 뗐다면 "멈춘 상태"로 본다 (ms) */
const STALE_VELOCITY_MS = 120;
/** 속도 상한 (px/s) */
const MAX_VELOCITY = 4000;

/**
 * 깊이별 정지 상태 transform. index 0 이 맨 앞.
 * scale 을 줄이면 카드가 안쪽으로 수축해 위로 올린 만큼을 상쇄하므로,
 * "뒤에서 살짝 보이는" 높이를 확보하려면 축소는 최소로 하고 위로 더 올린다.
 */
const DEPTH_LAYOUT = [
  { offsetY: 0, scale: 1 },
  { offsetY: -24, scale: 0.98 },
  { offsetY: -42, scale: 0.96 },
];

/**
 * @typedef {import('../data/poses.js').Pose} Pose
 * @typedef {{ pose: Pose, element: HTMLElement, dragRightStamp: HTMLElement, dragLeftStamp: HTMLElement }} DeckCard
 */

/**
 * @param {Pose} pose
 * @param {(poseId: string) => boolean} isSaved
 * @returns {DeckCard}
 */
function createCard(pose, isSaved) {
  const source = poseImageSrc(pose);

  // 사진 비율이 제각각이라 뒤에는 같은 사진을 블러 처리해 깔고, 위에 원본을 통째로 보여준다.
  // (DESIGN_apple.md — 분위기는 CSS 그라디언트가 아니라 사진 자체에서 나온다)
  const backdrop = el('img', {
    class: 'pose-card__backdrop',
    src: source,
    alt: '',
    'aria-hidden': 'true',
    draggable: 'false',
    decoding: 'async',
  });

  const photo = el('img', {
    class: 'pose-card__photo',
    src: source,
    alt: `${pose.title} 포즈 예시 사진`,
    draggable: 'false',
    decoding: 'async',
  });

  const media = el('div', { class: 'pose-card__media' }, [
    backdrop,
    photo,
    el('p', { class: 'pose-card__fallback t-caption', text: '이미지를 불러오지 못했어요' }),
    // 배지는 항상 만들어 두고 카드의 is-saved 클래스로만 보였다 숨겼다 한다.
    // (찜 버튼을 눌러도 카드가 넘어가지 않으므로 그 자리에서 바로 반응해야 한다)
    el('span', { class: 'pose-card__saved-badge t-caption-strong', text: '♥ 찜한 포즈' }),
  ]);

  // 좌우 둘 다 "다음 포즈"라서 색은 중립(흰색)으로 두고 방향만 화살표로 알려준다.
  const dragRightStamp = el('span', {
    class: 'pose-card__stamp pose-card__stamp--drag-right t-body-strong',
    text: '다음 →',
  });
  const dragLeftStamp = el('span', {
    class: 'pose-card__stamp pose-card__stamp--drag-left t-body-strong',
    text: '← 다음',
  });

  const footer = el('div', { class: 'pose-card__footer' }, [
    el('p', { class: 'pose-card__title t-body-strong', text: pose.title }),
    el('p', { class: 'pose-card__tip t-caption', text: pose.tip }),
  ]);

  const element = el('article', { class: 'pose-card' }, [media, dragRightStamp, dragLeftStamp, footer]);
  element.classList.toggle('is-saved', isSaved(pose.id));

  // 이미지가 없거나 깨져도 카드 레이아웃이 무너지지 않도록 폴백 상태로 전환한다.
  const markMissing = () => element.classList.add('is-missing');
  photo.addEventListener('error', markMissing);
  backdrop.addEventListener('error', markMissing);

  return { pose, element, dragRightStamp, dragLeftStamp };
}

/**
 * @param {object} options
 * @param {Pose[]} options.poses                          이미 원하는 순서로 섞여 있는 목록
 * @param {(poseId: string) => boolean} options.isSaved   찜 배지를 그릴 때 참조한다
 * @param {(pose: Pose, position: number, total: number) => void} [options.onTopChange]
 * @returns {{
 *   element: HTMLElement,
 *   getTopPose: () => Pose | null,
 *   syncSavedState: () => void,
 *   destroy: () => void,
 * }}
 */
export function createPoseDeck({ poses, isSaved, onTopChange }) {
  const deck = el('div', { class: 'deck' });

  /** @type {DeckCard[]} */
  const layers = [];
  /** 다음에 뒤에 채워 넣을 포즈의 인덱스 */
  let cursor = 0;
  /** 지금까지 넘긴 장수 — "3 / 12" 표시에 쓴다 */
  let position = 0;
  let isAnimating = false;

  /** @type {(() => void) | null} */
  let cancelSpring = null;
  /** fly-out 안전장치 타이머 (동시에 한 장만 날아가므로 하나면 충분하다) */
  let flyOutTimerId = 0;
  /** @type {number | null} */
  let activePointerId = null;
  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let lastTimestamp = 0;
  let velocityX = 0;

  function pushCard() {
    if (poses.length === 0) return;
    const pose = poses[cursor % poses.length];
    cursor += 1;
    const card = createCard(pose, isSaved);
    deck.append(card.element);
    layers.push(card);
  }

  /** 각 카드의 찜 배지를 현재 저장 상태에 맞춘다. */
  function syncSavedState() {
    layers.forEach((card) => card.element.classList.toggle('is-saved', isSaved(card.pose.id)));
  }

  function applyLayout() {
    syncSavedState();
    layers.forEach((card, depth) => {
      const layout = DEPTH_LAYOUT[Math.min(depth, DEPTH_LAYOUT.length - 1)];
      card.element.style.transform = `translate3d(0, ${layout.offsetY}px, 0) scale(${layout.scale})`;
      card.element.style.zIndex = String(VISIBLE_CARDS - depth);
      card.element.classList.toggle('is-top', depth === 0);
      card.element.setAttribute('aria-hidden', depth === 0 ? 'false' : 'true');
      setStampOpacity(card, 0);
    });
  }

  /**
   * @param {DeckCard} card
   * @param {number} dx
   */
  function setStampOpacity(card, dx) {
    card.dragRightStamp.style.opacity = String(clamp(dx / SWIPE_DISTANCE_THRESHOLD, 0, 1));
    card.dragLeftStamp.style.opacity = String(clamp(-dx / SWIPE_DISTANCE_THRESHOLD, 0, 1));
  }

  /**
   * @param {DeckCard} card
   * @param {number} dx
   * @param {number} dy
   */
  function applyDragTransform(card, dx, dy) {
    const rotation = clamp(dx / 14, -18, 18);
    card.element.style.transform = `translate3d(${dx}px, ${dy * 0.18}px, 0) rotate(${rotation}deg)`;
    setStampOpacity(card, dx);
  }

  function notifyTopChange() {
    const top = layers[0];
    if (!top || !onTopChange) return;
    onTopChange(top.pose, (position % poses.length) + 1, poses.length);
  }

  /** 맨 앞 카드를 떼어내고 뒤를 한 칸씩 당긴다. */
  function advance() {
    window.clearTimeout(flyOutTimerId);
    const leaving = layers.shift();
    leaving?.element.remove();
    position += 1;
    pushCard();
    applyLayout();
    isAnimating = false;
    notifyTopChange();
  }

  /**
   * 카드를 날려보내고 다음 포즈로 넘어간다. 방향은 애니메이션 방향일 뿐 결과는 같다.
   * @param {'left' | 'right'} direction
   * @param {number} [dy] 손을 뗀 순간의 세로 이동량
   */
  function flyOut(direction, dy = 0) {
    const top = layers[0];
    if (!top || isAnimating) return;

    isAnimating = true;

    const distance = (window.innerWidth || 420) * 1.35;
    const endX = direction === 'right' ? distance : -distance;
    const endRotation = direction === 'right' ? 22 : -22;
    const from = top.element.style.transform || 'translate3d(0, 0, 0) scale(1)';
    const to = `translate3d(${endX}px, ${dy * 0.18 + 40}px, 0) rotate(${endRotation}deg)`;

    setStampOpacity(top, direction === 'right' ? SWIPE_DISTANCE_THRESHOLD : -SWIPE_DISTANCE_THRESHOLD);

    // 애니메이션 완료 신호는 한 번만 처리한다.
    let hasAdvanced = false;
    const finish = () => {
      if (hasAdvanced) return;
      hasAdvanced = true;
      advance();
    };

    if (typeof top.element.animate !== 'function') {
      finish();
      return;
    }

    const animation = top.element.animate(
      [
        { transform: from, opacity: 1 },
        { transform: to, opacity: 0 },
      ],
      { duration: FLY_OUT_DURATION_MS, easing: 'cubic-bezier(0.32, 0.72, 0, 1)', fill: 'forwards' },
    );
    animation.addEventListener('finish', finish, { once: true });

    // finish 이벤트가 오지 않는 환경(백그라운드 탭, 애니메이션 미지원 등)에서도
    // 덱이 멈춰버리지 않도록 안전장치를 둔다.
    flyOutTimerId = window.setTimeout(finish, FLY_OUT_DURATION_MS + 80);
  }

  /**
   * 임계값을 못 넘겼을 때 — 손을 뗀 속도를 그대로 이어받아 제자리로 튕겨 돌아온다.
   * @param {number} dx
   * @param {number} dy
   */
  function springBack(dx, dy) {
    const top = layers[0];
    if (!top) return;

    cancelSpring?.();
    cancelSpring = runSpring({
      from: dx,
      velocity: velocityX,
      onFrame: (x) => {
        const ratio = dx === 0 ? 0 : x / dx;
        applyDragTransform(top, x, dy * ratio);
      },
      onRest: () => {
        cancelSpring = null;
        applyLayout();
      },
    });
  }

  /** @param {PointerEvent} event */
  function handlePointerDown(event) {
    const top = layers[0];
    if (!top || isAnimating || activePointerId !== null) return;

    cancelSpring?.();
    cancelSpring = null;

    activePointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    lastX = event.clientX;
    lastTimestamp = event.timeStamp;
    velocityX = 0;

    top.element.classList.add('is-dragging');
    try {
      deck.setPointerCapture(event.pointerId);
    } catch {
      // 포인터 캡처를 못 잡아도 드래그 자체는 계속 동작한다.
    }
  }

  /** @param {PointerEvent} event */
  function handlePointerMove(event) {
    if (event.pointerId !== activePointerId) return;
    const top = layers[0];
    if (!top) return;

    const elapsed = event.timeStamp - lastTimestamp;
    if (elapsed >= MIN_VELOCITY_SAMPLE_MS) {
      velocityX = clamp(((event.clientX - lastX) / elapsed) * 1000, -MAX_VELOCITY, MAX_VELOCITY);
      lastX = event.clientX;
      lastTimestamp = event.timeStamp;
    }

    applyDragTransform(top, event.clientX - startX, event.clientY - startY);
  }

  /** @param {PointerEvent} event */
  function handlePointerUp(event) {
    if (event.pointerId !== activePointerId) return;

    const top = layers[0];
    activePointerId = null;
    if (deck.hasPointerCapture(event.pointerId)) deck.releasePointerCapture(event.pointerId);
    if (!top) return;

    top.element.classList.remove('is-dragging');

    // 한참 멈춰 있다가 손을 뗐으면 직전에 재던 속도는 의미가 없다.
    if (event.timeStamp - lastTimestamp > STALE_VELOCITY_MS) velocityX = 0;

    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    const passedDistance = Math.abs(dx) > SWIPE_DISTANCE_THRESHOLD;
    const passedVelocity = Math.abs(velocityX) > SWIPE_VELOCITY_THRESHOLD;

    if (passedDistance || passedVelocity) {
      const signal = passedDistance ? dx : velocityX;
      flyOut(signal > 0 ? 'right' : 'left', dy);
    } else {
      springBack(dx, dy);
    }
  }

  /** 데스크톱에서 방향키로도 넘길 수 있게. @param {KeyboardEvent} event */
  function handleKeyDown(event) {
    if (event.key === 'ArrowRight') flyOut('right');
    else if (event.key === 'ArrowLeft') flyOut('left');
  }

  deck.addEventListener('pointerdown', handlePointerDown);
  deck.addEventListener('pointermove', handlePointerMove);
  deck.addEventListener('pointerup', handlePointerUp);
  deck.addEventListener('pointercancel', handlePointerUp);
  window.addEventListener('keydown', handleKeyDown);

  for (let i = 0; i < VISIBLE_CARDS; i += 1) pushCard();
  applyLayout();
  notifyTopChange();

  return {
    element: deck,
    getTopPose: () => layers[0]?.pose ?? null,
    syncSavedState,
    destroy: () => {
      cancelSpring?.();
      window.clearTimeout(flyOutTimerId);
      window.removeEventListener('keydown', handleKeyDown);
      deck.replaceChildren();
      layers.length = 0;
    },
  };
}
