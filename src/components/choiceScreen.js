/**
 * "질문 하나 + 큼직한 선택 카드 + 하단 CTA" 구조의 설정 화면.
 * 인원 수 화면과 무드 화면이 구조가 같아서 하나로 묶었다.
 */

import { el } from '../lib/dom.js';
import { topBar, optionCard, pillButton, progressSteps } from './ui.js';

/**
 * @template T
 * @param {object} options
 * @param {string} options.barTitle
 * @param {number} options.step
 * @param {number} options.totalSteps
 * @param {string} options.question
 * @param {string} options.hint
 * @param {{ value: T, label: string, hint: string }[]} options.choices
 * @param {T | null} options.initialValue
 * @param {string} options.ctaLabel
 * @param {boolean} [options.submitOnSelect] 고르는 즉시 다음으로 (하단 CTA 없음)
 * @param {() => void} options.onBack
 * @param {(value: T) => void} options.onSubmit
 * @returns {{ element: HTMLElement, tone: string }}
 */
export function createChoiceScreen({
  barTitle,
  step,
  totalSteps,
  question,
  hint,
  choices,
  initialValue,
  ctaLabel,
  submitOnSelect = false,
  onBack,
  onSubmit,
}) {
  let selectedValue = initialValue;

  const submitButton = pillButton({
    label: ctaLabel,
    variant: 'primary',
    block: true,
    disabled: selectedValue === null,
    onClick: () => {
      if (selectedValue !== null) onSubmit(selectedValue);
    },
  });

  /** @type {HTMLElement[]} */
  const cards = choices.map((choice) =>
    optionCard({
      label: choice.label,
      hint: choice.hint,
      selected: choice.value === selectedValue,
      onSelect: () => select(choice.value),
    }),
  );

  /** @param {T} value */
  function select(value) {
    selectedValue = value;
    cards.forEach((card, index) => {
      const isSelected = choices[index].value === value;
      card.classList.toggle('is-selected', isSelected);
      card.setAttribute('aria-checked', isSelected ? 'true' : 'false');
    });
    submitButton.disabled = false;

    // 선택 표시가 한 프레임 보인 뒤 넘어가야 "눌렸다"는 느낌이 난다.
    if (submitOnSelect) window.setTimeout(() => onSubmit(value), 140);
  }

  const element = el('section', { class: 'screen screen--setup' }, [
    topBar({ title: barTitle, onBack }),
    progressSteps(step, totalSteps),

    el('div', { class: 'setup__body' }, [
      el('h2', { class: 'setup__question t-display-md', text: question }),
      el('p', { class: 'setup__hint t-body', text: hint }),
      el('div', { class: 'setup__options', role: 'radiogroup', 'aria-label': question }, cards),
    ]),

    submitOnSelect ? null : el('div', { class: 'setup__footer' }, [submitButton]),
  ]);

  return { element, tone: 'setup' };
}
