/**
 * Supabase 연결 정보.
 *
 * ── 배포(Vercel)에서는 이 파일을 건드리지 않는다 ─────────
 *  Vercel Project Settings → Environment Variables 에 두 개를 넣으면,
 *  빌드할 때 `scripts/build-config.mjs` 가 이 파일을 값이 채워진 상태로 덮어쓴다.
 *
 *      SUPABASE_URL        예) https://xxxxxxxx.supabase.co
 *      SUPABASE_ANON_KEY   Project Settings → API 의 anon public 키
 *
 *  저장소에는 계속 빈 값으로 남아 있는 게 정상이다.
 *
 * ── 로컬에서 기록까지 테스트하고 싶다면 ───────────────────
 *  아래 두 값을 잠깐 채웠다가, 커밋 전에 반드시 다시 비운다.
 *
 * ── 그 전에 반드시 ───────────────────────────────────────
 *  Supabase 대시보드 → SQL Editor 에서 `supabase/schema.sql` 을 먼저 실행할 것.
 *  anon 키는 원래 브라우저에 노출되도록 설계된 공개 키다. 데이터를 지키는 건 키가
 *  아니라 그 SQL 이 만드는 RLS 정책이고, 정책은 익명 사용자에게 INSERT 만 허용한다.
 *
 * ── 비워두면? ────────────────────────────────────────────
 *  기록 전송이 전부 조용히 생략된다. 피드백 팝업을 포함한 서비스 동작은 그대로다.
 */

export const SUPABASE_URL = '';
export const SUPABASE_ANON_KEY = '';
