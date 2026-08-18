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

  const header = el('div', { class: 'deck-header' }, [
    conditionChip(`${peopleLabel(people)} · ${moodLabel(mood, people)}`),
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

  const undoButton = pillButton({
    label: '되돌리기',
    variant: 'pearl',
    leading: undoIcon(),
    disabled: true,
    onClick: () => poseDeck.undo(),
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
    el('div', { class: 'deck-actions' }, [
      pillButton({
        label: '조건 변경',
        variant: 'pearl',
        onClick: () => {
          trackEvent('change_condition', { people, mood });
          navigate('#/');
        },
      }),
      undoButton,
    ]),
    el('p', {
      class: 'deck-hint t-fine-print',
      text: '← 그저 그래요 · 좋아요 →',
    }),
  ]);

  return {
    element,
    tone: 'deck',
    destroy: () => poseDeck.destroy(),
  };
}
