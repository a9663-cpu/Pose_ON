/**
 * 포즈 카드 덱 — Tinder 형태의 스와이프 UX.
 *
 * - 맨 앞 카드만 드래그된다. 뒤 카드 2장은 위쪽으로 살짝 삐져나와 "다음 카드"를 예고한다.
 * - 손을 떼면 임계값/속도에 따라 날려보내거나(fly out) 스프링으로 제자리에 돌아온다.
 * - 카드가 떨어지면 즉시 새 카드를 뒤에 채워서 덱이 비지 않는다. 끝까지 가면 처음으로 순환한다.
 * - 오른쪽으로 넘기면 좋아요(찜), 왼쪽으로 넘기면 그저 그래요다.
 *   실수로 넘겨도 되돌릴 수 있어야 마음 편히 스와이프하므로 undo 를 함께 제공한다.
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
/**
 * 손으로 넘겼을 때 카드가 마저 날아가는 시간 (ms).
 * 이미 손가락이 카드를 끌어다 놓은 뒤라 짧아야 손에 붙는 느낌이 난다.
 */
const FLY_OUT_DURATION_MS = 300;

/**
 * 버튼으로 넘겼을 때 (ms).
 * 버튼은 "끄는 동작"이 없어서 같은 길이로 날리면 카드가 그냥 사라져 보인다.
 * 끌었다가 놓는 두 구간을 애니메이션이 대신 보여줘야 해서 더 길다.
 */
const BUTTON_FLY_OUT_DURATION_MS = 520;

/** 버튼으로 넘길 때 "끄는 구간"에서 카드가 먼저 나가는 거리 (px) */
const BUTTON_PULL_DISTANCE = 84;
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

  // 오른쪽은 저장으로 이어지므로 유일한 액션 컬러를 쓰고, 왼쪽은 중립(흰색)으로 둔다.
  const dragRightStamp = el('span', {
    class: 'pose-card__stamp pose-card__stamp--drag-right t-body-strong',
    text: '좋아요',
  });
  const dragLeftStamp = el('span', {
    class: 'pose-card__stamp pose-card__stamp--drag-left t-body-strong',
    text: '그저 그래요',
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
 * @param {(pose: Pose) => void} options.onLike           오른쪽으로 넘겼을 때 (좋아요)
 * @param {(pose: Pose) => void} options.onPass           왼쪽으로 넘겼을 때 (그저 그래요)
 * @param {(pose: Pose, wasLiked: boolean) => void} options.onUndo  되돌렸을 때
 * @param {(pose: Pose, position: number, total: number) => void} [options.onTopChange]
 * @param {(canUndo: boolean) => void} [options.onHistoryChange]
 * @returns {{
 *   element: HTMLElement,
 *   getTopPose: () => Pose | null,
 *   syncSavedState: () => void,
 *   undo: () => void,
 *   likeTopCard: () => void,
 *   passTopCard: () => void,
 *   playSwipeHint: () => void,
 *   destroy: () => void,
 * }}
 */
export function createPoseDeck({ poses, isSaved, onLike, onPass, onUndo, onTopChange, onHistoryChange }) {
  const deck = el('div', { class: 'deck' });

  /** @type {DeckCard[]} */
  const layers = [];
  /** 다음에 뒤에 채워 넣을 포즈의 인덱스 */
  let cursor = 0;
  /** 지금까지 넘긴 장수 — "3 / 12" 표시에 쓴다 */
  let position = 0;
  /** 되돌리기용 기록. 넘긴 방향과, 그때 새로 찜된 것인지를 남긴다. */
  /** @type {{ pose: Pose, direction: 'left' | 'right' }[]} */
  const history = [];
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

  function notifyHistoryChange() {
    onHistoryChange?.(history.length > 0);
  }

  /**
   * 맨 앞 카드를 떼어내고 뒤를 한 칸씩 당긴다.
   * @param {'left' | 'right'} direction
   */
  function advance(direction) {
    window.clearTimeout(flyOutTimerId);
    const leaving = layers.shift();
    leaving?.element.remove();
    if (leaving) history.push({ pose: leaving.pose, direction });
    position += 1;
    pushCard();
    applyLayout();
    isAnimating = false;
    notifyTopChange();
    notifyHistoryChange();
  }

  /**
   * 방금 넘긴 카드를 되돌린다. 오른쪽으로 넘긴 카드였다면 찜도 함께 취소한다.
   * 맨 뒤 카드를 하나 버리고, 되돌린 카드를 맨 앞에 끼워 넣은 뒤 밖에서 날아 들어오게 한다.
   */
  function undo() {
    if (isAnimating || history.length === 0) return;

    const previous = history.pop();
    if (!previous) return;

    isAnimating = true;

    layers.pop()?.element.remove();
    cursor -= 1;
    position -= 1;

    // DOM 순서는 layers 순서와 같게 유지한다. append 하면 어긋난다.
    const restored = createCard(previous.pose, isSaved);
    deck.prepend(restored.element);
    layers.unshift(restored);

    // 나갔던 방향에서 다시 들어오도록 시작 위치를 잡는다.
    const distance = (window.innerWidth || 420) * 1.35;
    const startXOffset = previous.direction === 'right' ? distance : -distance;
    const startRotation = previous.direction === 'right' ? 22 : -22;
    restored.element.style.transform = `translate3d(${startXOffset}px, 40px, 0) rotate(${startRotation}deg)`;

    // 시작값을 브라우저가 실제로 반영하게 만든 뒤 제자리 transform 을 줘야 트랜지션이 걸린다.
    // requestAnimationFrame 을 쓰면 탭이 백그라운드일 때 콜백이 안 와서 덱이 잠길 수 있다.
    void restored.element.offsetWidth;

    onUndo(previous.pose, previous.direction === 'right');
    notifyHistoryChange();

    applyLayout();
    isAnimating = false;
    notifyTopChange();
  }

  /**
   * 카드를 날려보내고 다음 포즈로 넘어간다.
   * 오른쪽은 좋아요(찜), 왼쪽은 그저 그래요다.
   * @param {'left' | 'right'} direction
   * @param {number} [dy] 손을 뗀 순간의 세로 이동량
   */
  function flyOut(direction, { dy = 0, fromButton = false } = {}) {
    const top = layers[0];
    if (!top || isAnimating) return;

    isAnimating = true;
    if (direction === 'right') onLike(top.pose);
    else onPass(top.pose);

    const sign = direction === 'right' ? 1 : -1;
    const distance = (window.innerWidth || 420) * 1.35;
    const from = top.element.style.transform || 'translate3d(0, 0, 0) scale(1)';
    const to = `translate3d(${sign * distance}px, ${dy * 0.18 + 40}px, 0) rotate(${sign * 22}deg)`;
    // 움직임을 줄여달라는 설정이면 끄는 구간을 길게 보여주지 않는다.
    const wantsLessMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const useButtonMotion = fromButton && !wantsLessMotion;
    const duration = useButtonMotion ? BUTTON_FLY_OUT_DURATION_MS : FLY_OUT_DURATION_MS;
    const stamp = direction === 'right' ? top.dragRightStamp : top.dragLeftStamp;

    // 애니메이션 완료 신호는 한 번만 처리한다.
    let hasAdvanced = false;
    const finish = () => {
      if (hasAdvanced) return;
      hasAdvanced = true;
      advance(direction);
    };

    if (typeof top.element.animate !== 'function') {
      setStampOpacity(top, sign * SWIPE_DISTANCE_THRESHOLD);
      finish();
      return;
    }

    if (useButtonMotion) {
      // 손으로 넘기는 것과 같은 두 구간을 만든다.
      //   1) 끄는 구간 — 천천히 밀려 나가면서 도장이 떠오른다
      //   2) 놓는 구간 — 가속이 붙어 화면 밖으로 빠진다
      top.element.animate(
        [
          { transform: from, opacity: 1, offset: 0, easing: 'cubic-bezier(0.25, 0.7, 0.4, 1)' },
          {
            transform: `translate3d(${sign * BUTTON_PULL_DISTANCE}px, 10px, 0) rotate(${sign * 6}deg)`,
            opacity: 1,
            offset: 0.42,
            easing: 'cubic-bezier(0.5, 0, 1, 0.5)',
          },
          { transform: to, opacity: 0, offset: 1 },
        ],
        { duration, fill: 'forwards' },
      ).addEventListener('finish', finish, { once: true });

      // 도장도 끄는 구간에 맞춰 떠오르게 한다. 즉시 켜면 툭 튀어나온 것처럼 보인다.
      stamp.animate(
        [
          { opacity: 0, offset: 0 },
          { opacity: 1, offset: 0.42 },
          { opacity: 1, offset: 1 },
        ],
        { duration, fill: 'forwards' },
      );
    } else {
      // 손으로 이미 끌어다 놓은 뒤라 남은 거리만 이어서 날린다.
      setStampOpacity(top, sign * SWIPE_DISTANCE_THRESHOLD);
      top.element
        .animate(
          [
            { transform: from, opacity: 1 },
            { transform: to, opacity: 0 },
          ],
          { duration, easing: 'cubic-bezier(0.32, 0.72, 0, 1)', fill: 'forwards' },
        )
        .addEventListener('finish', finish, { once: true });
    }

    // finish 이벤트가 오지 않는 환경(백그라운드 탭, 애니메이션 미지원 등)에서도
    // 덱이 멈춰버리지 않도록 안전장치를 둔다.
    flyOutTimerId = window.setTimeout(finish, duration + 80);
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
      flyOut(signal > 0 ? 'right' : 'left', { dy });
    } else {
      springBack(dx, dy);
    }
  }

  /** 데스크톱에서 방향키로도 넘길 수 있게. @param {KeyboardEvent} event */
  function handleKeyDown(event) {
    // 끄는 동작이 없다는 점은 버튼과 같으므로 같은 애니메이션을 쓴다.
    if (event.key === 'ArrowRight') flyOut('right', { fromButton: true });
    else if (event.key === 'ArrowLeft') flyOut('left', { fromButton: true });
  }

  deck.addEventListener('pointerdown', handlePointerDown);
  deck.addEventListener('pointermove', handlePointerMove);
  deck.addEventListener('pointerup', handlePointerUp);
  deck.addEventListener('pointercancel', handlePointerUp);
  window.addEventListener('keydown', handleKeyDown);

  for (let i = 0; i < VISIBLE_CARDS; i += 1) pushCard();
  applyLayout();
  notifyTopChange();

  /**
   * 카드가 좌우로 살짝 흔들리며 양쪽 스탬프를 차례로 보여준다.
   * 하단에 작은 글씨로 안내해봐야 잘 읽히지 않는다. 카드가 직접 움직여 보이는 편이
   * "이건 좌우로 넘기는 것"이라는 걸 훨씬 빨리 알려준다.
   * 사용자가 화면을 건드리면 즉시 멈춘다.
   */
  function playSwipeHint() {
    const top = layers[0];
    if (!top || isAnimating) return;
    if (typeof top.element.animate !== 'function') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const nudge = 44;
    const animation = top.element.animate(
      [
        { transform: 'translate3d(0, 0, 0) rotate(0deg)', offset: 0 },
        { transform: `translate3d(${nudge}px, 0, 0) rotate(3deg)`, offset: 0.3 },
        { transform: 'translate3d(0, 0, 0) rotate(0deg)', offset: 0.5 },
        { transform: `translate3d(${-nudge}px, 0, 0) rotate(-3deg)`, offset: 0.8 },
        { transform: 'translate3d(0, 0, 0) rotate(0deg)', offset: 1 },
      ],
      { duration: 1600, easing: 'ease-in-out' },
    );

    const stampFrames = [
      { opacity: 0, offset: 0 },
      { opacity: 1, offset: 0.3 },
      { opacity: 0, offset: 0.5 },
    ];
    const rightStamp = top.dragRightStamp.animate(stampFrames, { duration: 1600 });
    const leftStamp = top.dragLeftStamp.animate(
      [
        { opacity: 0, offset: 0 },
        { opacity: 0, offset: 0.5 },
        { opacity: 1, offset: 0.8 },
        { opacity: 0, offset: 1 },
      ],
      { duration: 1600 },
    );

    const stop = () => {
      for (const item of [animation, rightStamp, leftStamp]) item.cancel();
    };
    animation.addEventListener('finish', () => deck.removeEventListener('pointerdown', stop), { once: true });
    deck.addEventListener('pointerdown', stop, { once: true });
  }

  return {
    element: deck,
    getTopPose: () => layers[0]?.pose ?? null,
    syncSavedState,
    undo,
    likeTopCard: () => flyOut('right', { fromButton: true }),
    passTopCard: () => flyOut('left', { fromButton: true }),
    playSwipeHint,
    destroy: () => {
      cancelSpring?.();
      window.clearTimeout(flyOutTimerId);
      window.removeEventListener('keydown', handleKeyDown);
      deck.replaceChildren();
      layers.length = 0;
    },
  };
}
