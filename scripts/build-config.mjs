/**
 * 배포 빌드 중에 환경변수를 읽어 `src/config.js` 를 덮어쓴다.
 *
 * 왜 필요한가
 *   이 프로젝트는 빌드 없는 정적 사이트라서 브라우저가 process.env 를 볼 수 없다.
 *   Vercel 환경변수는 "빌드 시점"에만 존재하므로, 빌드할 때 값을 파일에 구워 넣어야 한다.
 *
 * Vercel 설정
 *   Project Settings → Environment Variables 에 아래 두 개를 추가한다.
 *     SUPABASE_URL        예) https://xxxxxxxx.supabase.co
 *     SUPABASE_ANON_KEY   anon public 키
 *   빌드 명령은 vercel.json 에 이미 걸려 있다.
 *
 * 로컬에서는 실행할 일이 없다. (src/config.js 가 빈 값이면 기록 전송이 생략될 뿐)
 */

import { writeFileSync } from 'node:fs';

const OUTPUT_PATH = new URL('../src/config.js', import.meta.url);

const supabaseUrl = (process.env.SUPABASE_URL ?? '').trim();
const supabaseAnonKey = (process.env.SUPABASE_ANON_KEY ?? '').trim();

if (supabaseUrl === '' || supabaseAnonKey === '') {
  console.warn(
    '[build-config] SUPABASE_URL / SUPABASE_ANON_KEY 가 비어 있습니다. ' +
      '기록 전송 없이 배포됩니다. Vercel 환경변수를 확인하세요.',
  );
} else {
  // 키는 로그에 남기지 않는다. URL 만으로도 어느 프로젝트에 붙었는지 확인할 수 있다.
  console.log(`[build-config] Supabase 설정 주입 완료 — ${supabaseUrl}`);
}

// JSON.stringify 로 문자열 리터럴을 만든다. 값에 따옴표·역슬래시가 들어와도 안전하다.
const contents = `/**
 * ⚠️ 이 파일은 배포 중 scripts/build-config.mjs 가 자동 생성한다.
 * 직접 고치지 말고 Vercel 환경변수(SUPABASE_URL / SUPABASE_ANON_KEY)를 수정할 것.
 */

export const SUPABASE_URL = ${JSON.stringify(supabaseUrl)};
export const SUPABASE_ANON_KEY = ${JSON.stringify(supabaseAnonKey)};
`;

writeFileSync(OUTPUT_PATH, contents, 'utf8');
