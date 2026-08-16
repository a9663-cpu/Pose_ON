/** 2단계 — 무드 선택 */

import { getMoodOptions } from '../data/poses.js';
import { createChoiceScreen } from '../components/choiceScreen.js';
import { getMood, setMood, getPeople } from '../state.js';
import { navigate } from '../router.js';

export function createMoodScreen() {
  // 선택한 인원 수에 맞는 무드 이름을 쓴다. (2명일 때만 '커플')
  const moods = getMoodOptions(getPeople());

  return createChoiceScreen({
    barTitle: '무드',
    step: 2,
    totalSteps: 2,
    question: '어떤 느낌으로 찍고 싶나요?',
    hint: '하나만 골라주세요. 나중에 언제든 바꿀 수 있어요.',
    choices: moods.map((mood) => ({ value: mood.id, label: mood.label, hint: mood.hint })),
    initialValue: getMood(),
    ctaLabel: '포즈 보기',
    onBack: () => navigate('#/people'),
    onSubmit: (mood) => {
      setMood(mood);
      navigate('#/deck');
    },
  });
}

/** 인원 수를 안 고르고 바로 들어온 경우 1단계로 되돌린다. */
export function guardMoodScreen() {
  return getPeople() === null ? '#/people' : null;
}
