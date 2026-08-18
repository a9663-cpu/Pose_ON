/**
 * 화면 여러 곳에서 재사용하는 UI 조각들.
 * 모두 DESIGN_apple.md 의 컴포넌트 문법(pill CTA / utility card / frosted sub-nav)을 따른다.
 */

import { el } from '../lib/dom.js';

/**
 * SVG 아이콘. 문자열이 아니라 노드로 만들어서 innerHTML 을 쓰지 않는다.
 * @param {string} pathData
 * @param {{ filled?: boolean, size?: number }} [options]
 */
function icon(pathData, { filled = false, size = 20 } = {}) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', pathData);
  path.setAttribute('fill', filled ? 'currentColor' : 'none');
  path.setAttribute('stroke', filled ? 'none' : 'currentColor');
  path.setAttribute('stroke-width', '1.8');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');

  svg.append(path);
  return svg;
}

const HEART_PATH =
  'M12 20.5s-7.5-4.7-7.5-9.7a4.3 4.3 0 0 1 7.5-2.8 4.3 4.3 0 0 1 7.5 2.8c0 5-7.5 9.7-7.5 9.7Z';
const BACK_PATH = 'M15 5 8 12l7 7';

const UNDO_PATH = 'M9 14 4 9l5-5M4 9h8a7 7 0 1 1 0 14h-3';
const CLOSE_PATH = 'M6 6l12 12M18 6L6 18';
const CHEVRON_PATH = 'M9 6l6 6-6 6';

/** @param {{ filled?: boolean, size?: number }} [options] */
export function heartIcon(options) {
  return icon(HEART_PATH, options);
}

/** 되돌리기(반시계 화살표) @param {{ size?: number }} [options] */
export function undoIcon({ size = 16 } = {}) {
  return icon(UNDO_PATH, { size });
}

/** 그저 그래요(✕) @param {{ size?: number }} [options] */
export function passIcon({ size = 18 } = {}) {
  return icon(CLOSE_PATH, { size });
}

/**
 * 상단 바 — `sub-nav-frosted` 문법 (파치먼트 80% + backdrop blur, 높이 52px).
 * @param {object} options
 * @param {string} options.title
 * @param {() => void} [options.onBack]
 * @param {HTMLElement} [options.action] 오른쪽 액션 슬롯
 * @param {'light' | 'dark'} [options.tone]
 */
export function topBar({ title, onBack, action, tone = 'light' }) {
  const left = onBack
    ? el(
        'button',
        {
          class: 'topbar__back',
          type: 'button',
          'aria-label': '뒤로 가기',
          onClick: onBack,
        },
        icon(BACK_PATH, { size: 22 }),
      )
    : el('span', { class: 'topbar__spacer' });

  return el('header', { class: `topbar topbar--${tone}` }, [
    left,
    el('h1', { class: 'topbar__title t-tagline', text: title }),
    action ?? el('span', { class: 'topbar__spacer' }),
  ]);
}

/**
 * 상단 바 오른쪽에 들어가는 "찜 n" 버튼.
 * @param {{ count: number, onClick: () => void }} options
 */
export function savedCountButton({ count, onClick }) {
  return el(
    'button',
    {
      class: 'topbar__action',
      type: 'button',
      'aria-label': `찜한 포즈 ${count}개 보기`,
      onClick,
    },
    [heartIcon({ filled: count > 0, size: 18 }), el('span', { class: 't-caption', text: String(count) })],
  );
}

/**
 * pill CTA — 시스템의 유일한 액션 컬러(Action Blue)를 쓰는 기본 버튼.
 * @param {object} options
 * @param {string} options.label
 * @param {() => void} options.onClick
 * @param {'primary' | 'ghost' | 'pearl'} [options.variant]
 * @param {boolean} [options.disabled]
 * @param {boolean} [options.block] 가로 꽉 채우기
 * @param {HTMLElement} [options.leading] 라벨 앞 아이콘
 */
export function pillButton({
  label,
  onClick,
  variant = 'primary',
  disabled = false,
  block = false,
  leading,
}) {
  return el(
    'button',
    {
      class: `pill pill--${variant}${block ? ' pill--block' : ''}`,
      type: 'button',
      disabled,
      onClick,
    },
    [leading, el('span', { class: 'pill__label', text: label })],
  );
}

/**
 * 인원 수 / 무드를 고르는 큼직한 선택 카드.
 * `store-utility-card`(흰 배경 + 헤어라인 + 18px 라운드) 위에
 * 선택 시 `configurator-option-chip-selected`(2px Action Blue 테두리) 를 얹은 형태.
 *
 * @param {object} options
 * @param {string} options.label
 * @param {string} options.hint
 * @param {boolean} options.selected
 * @param {() => void} options.onSelect
 */
export function optionCard({ label, hint, selected, onSelect }) {
  return el(
    'button',
    {
      class: `option-card${selected ? ' is-selected' : ''}`,
      type: 'button',
      role: 'radio',
      'aria-checked': selected ? 'true' : 'false',
      onClick: onSelect,
    },
    [
      el('span', { class: 'option-card__text' }, [
        el('span', { class: 'option-card__label t-display-md', text: label }),
        el('span', { class: 'option-card__hint t-caption', text: hint }),
      ]),
      el('span', { class: 'option-card__mark', 'aria-hidden': 'true' }),
    ],
  );
}

/**
 * 현재 조건을 보여주는 pill. (예: "2명 · 힙한")
 * onClick 을 주면 눌러서 조건을 바꿀 수 있는 버튼이 된다.
 * 조건을 보여주는 자리와 바꾸는 자리를 하나로 합치면 하단이 그만큼 비고,
 * "여기가 지금 조건"이라는 것도 더 잘 읽힌다.
 *
 * @param {string} text
 * @param {() => void} [onClick]
 */
export function conditionChip(text, onClick) {
  if (!onClick) return el('span', { class: 'condition-chip t-caption-strong', text });

  return el(
    'button',
    {
      class: 'condition-chip condition-chip--button t-caption-strong',
      type: 'button',
      'aria-label': `현재 조건 ${text}. 눌러서 바꾸기`,
      onClick,
    },
    [el('span', { text }), icon(CHEVRON_PATH, { size: 14 })],
  );
}

/**
 * 설정 화면 상단의 진행 표시. 헤어라인 두 칸.
 * @param {number} step 1부터 시작
 * @param {number} total
 */
export function progressSteps(step, total) {
  const bars = Array.from({ length: total }, (_, index) =>
    el('span', { class: `progress__bar${index < step ? ' is-done' : ''}` }),
  );

  return el(
    'div',
    { class: 'progress', role: 'progressbar', 'aria-valuenow': step, 'aria-valuemin': 1, 'aria-valuemax': total },
    bars,
  );
}

/**
 * 내용이 없을 때 보여주는 안내.
 * @param {{ title: string, description: string, action?: HTMLElement }} options
 */
export function emptyState({ title, description, action }) {
  return el('div', { class: 'empty-state' }, [
    el('p', { class: 'empty-state__title t-display-md', text: title }),
    el('p', { class: 'empty-state__desc t-body', text: description }),
    action,
  ]);
}
