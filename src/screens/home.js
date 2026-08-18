/**
 * 첫 화면 — 서비스명 + 포즈 미리보기 + 인원 수 선택.
 *
 * 예전에는 카피와 버튼 하나뿐이라 "포즈 서비스인데 포즈가 한 장도 안 보이는" 화면이었고
 * 포즈를 보기까지 탭이 3번 필요했다. 지금은 들어오자마자 실제 포즈가 흐르고,
 * 인원 카드를 누르면 곧바로 다음으로 넘어간다. (탭 3회 → 2회)
 */

import { el, shuffle } from '../lib/dom.js';
import { optionCard, heartIcon } from '../components/ui.js';
import { PEOPLE_OPTIONS, POSES, poseThumbSrc, poseImageSrc } from '../data/poses.js';
import { getSavedCount, setPeople } from '../state.js';
import { trackEvent } from '../lib/ga.js';
import { navigate } from '../router.js';

/** 미리보기 줄에 띄울 사진 수. 늘릴수록 첫 화면이 무거워진다. */
const PREVIEW_COUNT = 10;

/**
 * 포즈 사진이 가로로 천천히 흐르는 띠.
 * 끊기지 않게 같은 목록을 두 벌 이어 붙이고 절반만큼 움직인다.
 */
function createPreviewStrip() {
  const picked = shuffle(POSES).slice(0, PREVIEW_COUNT);

  /** @param {import('../data/poses.js').Pose} pose */
  function thumbnail(pose) {
    const image = el('img', {
      class: 'preview__image',
      src: poseThumbSrc(pose),
      alt: '',
      'aria-hidden': 'true',
      draggable: 'false',
      decoding: 'async',
      loading: 'lazy',
    });

    // 썸네일이 아직 없으면(스크립트 미실행) 원본으로 대신한다. 한 번만 시도한다.
    image.addEventListener(
      'error',
      () => {
        image.src = poseImageSrc(pose);
      },
      { once: true },
    );

    return el('div', { class: 'preview__item' }, [image]);
  }

  const items = picked.map(thumbnail);
  const loop = [...items, ...picked.map(thumbnail)];

  return el('div', { class: 'preview', 'aria-hidden': 'true' }, [
    el('div', { class: 'preview__track' }, loop),
  ]);
}

export function createHomeScreen() {
  const savedCount = getSavedCount();

  /** @param {import('../data/poses.js').PeopleCount} people */
  function choosePeople(people) {
    setPeople(people);
    trackEvent('select_people', { people });
    navigate('#/mood');
  }

  const options = PEOPLE_OPTIONS.map((choice) =>
    optionCard({
      label: choice.label,
      hint: choice.hint,
      selected: false,
      onSelect: () => choosePeople(choice.value),
    }),
  );

  const savedLink =
    savedCount > 0
      ? el(
          'button',
          {
            class: 'home__saved-link t-caption',
            type: 'button',
            onClick: () => {
              trackEvent('open_saved', { from: 'home' });
              navigate('#/saved');
            },
          },
          [heartIcon({ filled: true, size: 15 }), el('span', { text: `찜한 포즈 ${savedCount}개` })],
        )
      : null;

  const element = el('section', { class: 'screen screen--home' }, [
    el('div', { class: 'home__head' }, [
      el('h1', { class: 'home__wordmark t-display-lg' }, [
        el('span', { text: 'Pose ' }),
        el('span', { class: 'home__wordmark-accent', text: 'ON' }),
      ]),
      el('p', { class: 'home__copy t-body', text: '어떤 포즈 할까?' }),
    ]),

    createPreviewStrip(),

    el('div', { class: 'home__picker' }, [
      el('h2', { class: 'home__question t-display-md', text: '몇 명이 함께 찍나요?' }),
      el('div', { class: 'home__options', role: 'group', 'aria-label': '몇 명이 함께 찍나요?' }, options),
      savedLink,
    ]),
  ]);

  return { element, tone: 'home' };
}
