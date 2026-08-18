/**
 * 포즈 추천 화면 — 상단에 조건, 가운데에 스와이프 카드 덱, 하단에 액션.
 */

import { el, shuffle, showToast } from '../lib/dom.js';
import {
  topBar,
  savedCountButton,
  pillButton,
  conditionChip,
  emptyState,
  undoIcon,
  passIcon,
  heartIcon,
} from '../components/ui.js';
import { createPoseDeck } from '../components/poseDeck.js';
import { requestFeedbackPopup } from '../components/feedbackPopup.js';
import { countPoseView, trackLike } from '../lib/analytics.js';
import { trackEvent } from '../lib/ga.js';
import { filterPoses, peopleLabel, moodLabel } from '../data/poses.js';
import {
  getPeople,
  getMood,
  isSaved,
  addSaved,
  removeSaved,
  getSavedCount,
  hasCompleteCondition,
} from '../state.js';
import { navigate } from '../router.js';

/** 조건이 없으면 설정 화면으로 되돌린다. */
export function guardDeckScreen() {
  return hasCompleteCondition() ? null : '#/';
}

export function createDeckScreen() {
  const people = /** @type {import('../data/poses.js').PeopleCount} */ (getPeople());
  const mood = /** @type {import('../data/poses.js').MoodId} */ (getMood());
  const { poses: matched, isExactMatch } = filterPoses(people, mood);
  const poses = shuffle(matched);

  function openSaved() {
    trackEvent('open_saved', { from: 'deck' });
    navigate('#/saved');
  }

  let savedAction = savedCountButton({ count: getSavedCount(), onClick: openSaved });

  function refreshSavedAction() {
    const next = savedCountButton({ count: getSavedCount(), onClick: openSaved });
    savedAction.replaceWith(next);
    savedAction = next;
  }

  const bar = topBar({
    title: 'Pose ON',
    tone: 'dark',
    onBack: () => navigate('#/mood'),
    action: savedAction,
  });

  const counter = el('span', { class: 'deck-header__counter t-caption' });

  // 조건 표시와 조건 변경을 한 자리로 합쳤다. 하단은 좌우 구분에만 쓴다.
  const header = el('div', { class: 'deck-header' }, [
    conditionChip(`${peopleLabel(people)} · ${moodLabel(mood, people)}`, () => {
      trackEvent('change_condition', { people, mood });
      navigate('#/');
    }),
    counter,
  ]);

  // 포즈가 아예 없을 때 (데이터를 다 비운 경우) — 덱을 만들지 않고 안내만 보여준다.
  if (poses.length === 0) {
    const element = el('section', { class: 'screen screen--deck' }, [
      bar,
      header,
      emptyState({
        title: '보여드릴 포즈가 없어요',
        description: 'src/data/poses.js 에 포즈를 추가하면 바로 여기에 나타나요.',
        action: pillButton({ label: '조건 변경', variant: 'pearl', onClick: () => navigate('#/') }),
      }),
    ]);
    return { element, tone: 'deck' };
  }

  const undoButton = el(
    'button',
    {
      class: 'deck-undo',
      type: 'button',
      'aria-label': '방금 넘긴 포즈 되돌리기',
      disabled: true,
      onClick: () => poseDeck.undo(),
    },
    [undoIcon({ size: 18 })],
  );

  // 하단 버튼을 누르면 카드가 그 방향으로 날아간다.
  // 누르는 것과 넘기는 것이 같은 결과라는 걸 눈으로 보여줘야 스와이프 방향이 학습된다.
  const passButton = pillButton({
    label: '그저 그래요',
    variant: 'pearl',
    leading: passIcon(),
    onClick: () => poseDeck.passTopCard(),
  });

  const likeButton = pillButton({
    label: '좋아요',
    variant: 'primary',
    leading: heartIcon({ filled: true, size: 18 }),
    onClick: () => poseDeck.likeTopCard(),
  });

  /** 오른쪽으로 넘김 = 좋아요. 이미 찜한 포즈면 그대로 두고 넘어간다. */
  function likeTopPose(pose) {
    const isNewlySaved = addSaved(pose.id);
    showToast(isNewlySaved ? '찜한 포즈에 담았어요' : '이미 찜한 포즈예요');

    if (isNewlySaved) trackLike(true);
    trackEvent('like_pose', { pose_id: pose.id, people, mood });
    refreshSavedAction();
  }

  /** 왼쪽으로 넘김 = 그저 그래요. 저장은 하지 않고 어떤 포즈가 넘겨지는지만 GA 로 본다. */
  function passTopPose(pose) {
    trackEvent('pass_pose', { pose_id: pose.id, people, mood });
  }

  /** @param {import('../data/poses.js').Pose} pose @param {boolean} wasLiked */
  function undoSwipe(pose, wasLiked) {
    if (wasLiked) {
      removeSaved(pose.id);
      refreshSavedAction();
    }
    showToast('되돌렸어요');
    trackEvent('undo_swipe', { pose_id: pose.id, was_liked: wasLiked });
  }

  const poseDeck = createPoseDeck({
    poses,
    isSaved,
    onLike: likeTopPose,
    onPass: passTopPose,
    onUndo: undoSwipe,
    onHistoryChange: (canUndo) => {
      undoButton.disabled = !canUndo;
    },
    onTopChange: (pose, position, total) => {
      counter.textContent = `${position} / ${total}`;

      // 서비스를 충분히 써 본 뒤에만 피드백을 묻는다. 조건이 안 되면 아무 일도 없다.
      countPoseView(pose);
      requestFeedbackPopup();
    },
  });

  const element = el('section', { class: 'screen screen--deck' }, [
    bar,
    header,
    !isExactMatch
      ? el('p', {
          class: 'deck-notice t-caption',
          text: '이 조합에 딱 맞는 포즈가 아직 적어서 비슷한 포즈를 함께 보여드려요.',
        })
      : null,
    poseDeck.element,
    el('div', { class: 'deck-actions' }, [undoButton, passButton, likeButton]),
    el('p', {
      class: 'deck-hint t-fine-print',
      text: '카드를 좌우로 넘겨도 돼요',
    }),
  ]);

  // 방문당 한 번, 카드가 좌우로 살짝 흔들려 "넘기는 것"임을 보여준다.
  // 라우터가 화면을 붙인 뒤에 실행돼야 해서 한 박자 늦춘다.
  let hintTimerId = 0;
  if (!hasSeenSwipeHint()) {
    markSwipeHintSeen();
    hintTimerId = window.setTimeout(() => poseDeck.playSwipeHint(), 700);
  }

  return {
    element,
    tone: 'deck',
    destroy: () => {
      window.clearTimeout(hintTimerId);
      poseDeck.destroy();
    },
  };
}

const SWIPE_HINT_KEY = 'pose-on:swipe-hint:v1';

function hasSeenSwipeHint() {
  try {
    return window.sessionStorage.getItem(SWIPE_HINT_KEY) === '1';
  } catch {
    return false;
  }
}

function markSwipeHintSeen() {
  try {
    window.sessionStorage.setItem(SWIPE_HINT_KEY, '1');
  } catch {
    // 저장이 막혀도 안내가 한 번 더 나올 뿐이다.
  }
}
