/** 앱 진입점 — 라우트를 등록하고 첫 화면을 그린다. */

import { startRouter } from './router.js';
import { trackSessionStart, diagnose, resetFeedbackState, startNewVisit } from './lib/analytics.js';
import { mountFeedbackPopup } from './components/feedbackPopup.js';
import { createHomeScreen } from './screens/home.js';
import { createPeopleScreen } from './screens/people.js';
import { createMoodScreen, guardMoodScreen } from './screens/mood.js';
import { createDeckScreen, guardDeckScreen } from './screens/deck.js';
import { createSavedScreen } from './screens/saved.js';

const root = document.getElementById('app');

// 브라우저 콘솔에서 쓰는 확인용 도구.
//   poseOnDiagnose()      기록 전송 상태 + 피드백 팝업이 안 뜨는 이유
//   poseOnResetFeedback() 피드백 응답 기록을 지워 팝업을 다시 뜨게 함
//   poseOnNewVisit()      탭을 닫았다 연 것처럼 새 방문 시작 (DB 행이 하나 더 생긴다)
window.poseOnDiagnose = diagnose;
window.poseOnResetFeedback = resetFeedbackState;
window.poseOnNewVisit = startNewVisit;

if (root) {
  trackSessionStart();
  mountFeedbackPopup();

  // title 은 브라우저 탭 제목이자 GA 보고서의 "페이지 제목"이 된다.
  startRouter(root, {
    '#/': { create: createHomeScreen, title: 'Pose ON' },
    '#/people': { create: createPeopleScreen, title: '인원 선택' },
    '#/mood': { create: createMoodScreen, guard: guardMoodScreen, title: '무드 선택' },
    '#/deck': { create: createDeckScreen, guard: guardDeckScreen, title: '포즈 추천' },
    '#/saved': { create: createSavedScreen, title: '찜한 포즈' },
  });
}
