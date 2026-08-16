/**
 * 첫 화면 — 서비스명 · 짧은 카피 · CTA.
 * 다크 타일 위에 액션 블루 pill 하나만 놓는 구성. (DESIGN_apple.md 의 product-tile-dark)
 */

import { el } from '../lib/dom.js';
import { pillButton, heartIcon } from '../components/ui.js';
import { getSavedCount } from '../state.js';
import { navigate } from '../router.js';

export function createHomeScreen() {
  const savedCount = getSavedCount();

  const savedLink =
    savedCount > 0
      ? el(
          'button',
          {
            class: 'home__saved-link t-body',
            type: 'button',
            onClick: () => navigate('#/saved'),
          },
          [heartIcon({ filled: true, size: 16 }), el('span', { text: `찜한 포즈 ${savedCount}개` })],
        )
      : null;

  const element = el('section', { class: 'screen screen--home' }, [
    el('div', { class: 'home__body' }, [
      el('p', { class: 'home__eyebrow t-caption-strong', text: '포토부스 들어가기 전에' }),
      el('h1', { class: 'home__wordmark t-hero' }, [
        el('span', { text: 'Pose ' }),
        el('span', { class: 'home__wordmark-accent', text: 'ON' }),
      ]),
      el('p', {
        class: 'home__copy t-lead',
        text: '어떤 포즈 할까?',
      }),
    ]),

    el('div', { class: 'home__actions' }, [
      pillButton({
        label: '포즈 추천받기',
        variant: 'primary',
        block: true,
        onClick: () => navigate('#/people'),
      }),
      savedLink,
    ]),
  ]);

  return { element, tone: 'home' };
}
