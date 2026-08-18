/**
 * Google Analytics(gtag.js) 로 화면 조회와 버튼 클릭을 보낸다.
 *
 * 왜 따로 보내야 하나
 *  - 이 앱은 HTML 파일 하나에 해시 라우팅(`#/mood`)이라, GA 는 기본적으로
 *    접속 순간의 page_view 딱 한 번만 잡는다. 화면을 옮겨도 문서가 바뀌지 않기 때문이다.
 *    그래서 화면이 바뀔 때마다 page_view 를 직접 쏴야 한다.
 *  - GA 의 향상된 측정은 바깥 링크·파일 다운로드 같은 것만 자동으로 잡는다.
 *    앱 안의 버튼 클릭은 자동으로 잡히지 않으므로 직접 이벤트를 보내야 한다.
 *
 * gtag 가 없어도(광고 차단기·오프라인·태그 로드 실패) 아무 일도 일어나지 않게 만든다.
 * 분석 때문에 서비스가 멈추는 일은 없어야 한다.
 */

/** @returns {((...args: unknown[]) => void) | null} */
function getGtag() {
  const gtag = /** @type {any} */ (window).gtag;
  return typeof gtag === 'function' ? gtag : null;
}

/**
 * 버튼 클릭 같은 사용자 행동 1건.
 * @param {string} name GA 이벤트 이름 (소문자 + 밑줄)
 * @param {Record<string, string | number | boolean>} [params]
 */
export function trackEvent(name, params = {}) {
  const gtag = getGtag();
  if (gtag === null) return;

  try {
    gtag('event', name, params);
  } catch {
    // 무시. 기록이 안 될 뿐이다.
  }
}

/**
 * 화면 조회 1건. 브라우저 탭 제목도 함께 바꾼다.
 * 제목을 바꾸지 않으면 GA 보고서의 "페이지 제목"이 전부 Pose ON 으로만 나온다.
 *
 * @param {string} screenTitle 예: '인원 선택'
 */
export function trackScreenView(screenTitle) {
  const title = screenTitle === 'Pose ON' ? 'Pose ON' : `${screenTitle} | Pose ON`;
  document.title = title;

  const gtag = getGtag();
  if (gtag === null) return;

  try {
    gtag('event', 'page_view', {
      page_title: title,
      page_location: window.location.href,
    });
  } catch {
    // 무시
  }
}
