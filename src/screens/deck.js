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
  heartIcon,
} from '../components/ui.js';
import { createPoseDeck } from '../components/poseDeck.js';
import { requestFeedbackPopup } from '../components/feedbackPopup.js';
import { countPoseView, trackLike } from '../lib/analytics.js';
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
  return hasCompleteCondition() ? null : '#/people';
}

export function createDeckScreen() {
  const people = /** @type {import('../data/poses.js').PeopleCount} */ (getPeople());
  const mood = /** @type {import('../data/poses.js').MoodId} */ (getMood());
  const { poses: matched, isExactMatch } = filterPoses(people, mood);
  const poses = shuffle(matched);

  let savedAction = savedCountButton({ count: getSavedCount(), onClick: () => navigate('#/saved') });

  function refreshSavedAction() {
    const next = savedCountButton({ count: getSavedCount(), onClick: () => navigate('#/saved') });
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
        action: pillButton({ label: '조건 변경', variant: 'pearl', onClick: () => navigate('#/people') }),
      }),
    ]);
    return { element, tone: 'deck' };
  }

  // 찜은 이 버튼만 담당한다. 눌러도 카드는 넘어가지 않고 그 자리에서 상태만 바뀐다.
  let likeIcon = heartIcon({ filled: false, size: 18 });
  const likeButton = pillButton({
    label: '마음에 들어요',
    variant: 'primary',
    leading: likeIcon,
    onClick: () => toggleSaveCurrentPose(),
  });
  const likeLabel = likeButton.querySelector('.pill__label');

  /** @param {import('../data/poses.js').Pose | null} pose */
  function syncLikeButton(pose) {
    const saved = pose !== null && isSaved(pose.id);
    const nextIcon = heartIcon({ filled: saved, size: 18 });
    likeIcon.replaceWith(nextIcon);
    likeIcon = nextIcon;
    if (likeLabel) likeLabel.textContent = saved ? '찜했어요' : '마음에 들어요';
  }

  function toggleSaveCurrentPose() {
    const pose = poseDeck.getTopPose();
    if (pose === null) return;

    const isSavedNow = !isSaved(pose.id);
    if (isSavedNow) {
      addSaved(pose.id);
      showToast('찜한 포즈에 담았어요');
    } else {
      removeSaved(pose.id);
      showToast('찜을 해제했어요');
    }

    trackLike(isSavedNow);
    poseDeck.syncSavedState();
    syncLikeButton(pose);
    refreshSavedAction();
  }

  const poseDeck = createPoseDeck({
    poses,
    isSaved,
    onTopChange: (pose, position, total) => {
      counter.textContent = `${position} / ${total}`;
      syncLikeButton(pose);

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
        onClick: () => navigate('#/people'),
      }),
      likeButton,
    ]),
    el('p', {
      class: 'deck-hint t-fine-print',
      text: '← 좌우 어느 쪽으로 넘겨도 다음 포즈 →',
    }),
  ]);

  return {
    element,
    tone: 'deck',
    destroy: () => poseDeck.destroy(),
  };
}
