/** 앱 진입점 — 라우트를 등록하고 첫 화면을 그린다. */

import { startRouter } from './router.js';
import { trackSessionStart } from './lib/analytics.js';
import { mountFeedbackPopup } from './components/feedbackPopup.js';
import { createHomeScreen } from './screens/home.js';
import { createPeopleScreen } from './screens/people.js';
import { createMoodScreen, guardMoodScreen } from './screens/mood.js';
import { createDeckScreen, guardDeckScreen } from './screens/deck.js';
import { createSavedScreen } from './screens/saved.js';

const root = document.getElementById('app');

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
