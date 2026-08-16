/** 앱 진입점 — 라우트를 등록하고 첫 화면을 그린다. */

import { startRouter } from './router.js';
import { trackSessionStart, diagnose, resetFeedbackState } from './lib/analytics.js';
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
window.poseOnDiagnose = diagnose;
window.poseOnResetFeedback = resetFeedbackState;

if (root) {
  trackSessionStart();
  mountFeedbackPopup();

  startRouter(root, {
    '#/': { create: createHomeScreen },
    '#/people': { create: createPeopleScreen },
    '#/mood': { create: createMoodScreen, guard: guardMoodScreen },
    '#/deck': { create: createDeckScreen, guard: guardDeckScreen },
    '#/saved': { create: createSavedScreen },
  });
}
