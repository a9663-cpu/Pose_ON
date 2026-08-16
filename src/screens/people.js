/** 1단계 — 인원 수 선택 */

import { PEOPLE_OPTIONS } from '../data/poses.js';
import { createChoiceScreen } from '../components/choiceScreen.js';
import { getPeople, setPeople } from '../state.js';
import { trackEvent } from '../lib/ga.js';
import { navigate } from '../router.js';

export function createPeopleScreen() {
  return createChoiceScreen({
    barTitle: '인원 수',
    step: 1,
    totalSteps: 2,
    question: '몇 명이 함께 찍나요?',
    hint: '인원에 맞춰 실제로 소화할 수 있는 포즈만 골라드려요.',
    choices: PEOPLE_OPTIONS,
    initialValue: getPeople(),
    ctaLabel: '다음',
    onBack: () => navigate('#/'),
    onSubmit: (people) => {
      setPeople(people);
      trackEvent('select_people', { people });
      navigate('#/mood');
    },
  });
}
