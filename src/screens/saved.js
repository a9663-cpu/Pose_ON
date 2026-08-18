/**
 * 찜한 포즈 화면 — 저장한 포즈를 격자로 모아 보고, 개별 해제할 수 있다.
 */

import { el, showToast } from '../lib/dom.js';
import { topBar, pillButton, emptyState } from '../components/ui.js';
import { poseImageSrc, poseThumbSrc } from '../data/poses.js';
import { getSavedPoses, removeSaved, hasCompleteCondition } from '../state.js';
import { navigate } from '../router.js';

/**
 * @param {import('../data/poses.js').Pose} pose
 * @param {() => void} onRemove
 */
function savedCard(pose, onRemove) {
  // 목록에서는 작게 보이므로 썸네일이면 충분하다. (원본 평균 67KB → 8KB)
  const thumbnail = el('img', {
    class: 'saved-card__image',
    src: poseThumbSrc(pose),
    alt: `${pose.title} 포즈 예시 사진`,
    loading: 'lazy',
    decoding: 'async',
    draggable: 'false',
  });

  const card = el('li', { class: 'saved-card' }, [
    el('div', { class: 'saved-card__media' }, [thumbnail]),
    el('div', { class: 'saved-card__text' }, [
      el('p', { class: 'saved-card__title t-body-strong', text: pose.title }),
      el('p', { class: 'saved-card__tip t-caption', text: pose.tip }),
    ]),
    el('button', {
      class: 'saved-card__remove t-caption',
      type: 'button',
      text: '찜 해제',
      'aria-label': `${pose.title} 찜 해제`,
      onClick: onRemove,
    }),
  ]);

  // 썸네일이 없으면 원본으로 한 번 더 시도하고, 원본까지 없을 때만 빈 상태로 둔다.
  let hasTriedOriginal = false;
  thumbnail.addEventListener('error', () => {
    if (hasTriedOriginal) {
      card.classList.add('is-missing');
      return;
    }
    hasTriedOriginal = true;
    thumbnail.src = poseImageSrc(pose);
  });

  return card;
}

export function createSavedScreen() {
  const backPath = hasCompleteCondition() ? '#/deck' : '#/';
  const list = el('ul', { class: 'saved-list' });

  function renderList() {
    const poses = getSavedPoses();

    if (poses.length === 0) {
      list.replaceChildren(
        el('li', { class: 'saved-list__empty' }, [
          emptyState({
            title: '아직 찜한 포즈가 없어요',
            description: '포즈 카드에서 마음에 들어요를 누르면 여기에 모여요.',
            // 찜이 하나도 없는 상태라 조건부터 다시 고르는 게 자연스럽다.
            action: pillButton({
              label: '포즈 보러 가기',
              variant: 'primary',
              onClick: () => navigate('#/'),
            }),
          }),
        ]),
      );
      return;
    }

    list.replaceChildren(
      ...poses.map((pose) =>
        savedCard(pose, () => {
          removeSaved(pose.id);
          showToast('찜을 해제했어요');
          renderList();
        }),
      ),
    );
  }

  renderList();

  const element = el('section', { class: 'screen screen--saved' }, [
    topBar({ title: '찜한 포즈', onBack: () => navigate(backPath) }),
    el('div', { class: 'saved__body' }, [list]),
  ]);

  return { element, tone: 'saved' };
}
