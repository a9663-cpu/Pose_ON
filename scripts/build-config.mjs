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
 *     SUPABASE_ANON_KEY   Project Settings → API 의 anon public 키
 *   Vercel 의 Supabase 연동을 쓴 경우 NEXT_PUBLIC_* 이름으로 자동 등록되는데,
 *   아래 후보 목록이 그 이름들도 함께 찾아준다.
 *
 * 로컬에서는 실행할 일이 없다. (src/config.js 가 빈 값이면 기록 전송이 생략될 뿐)
 */

import { writeFileSync } from 'node:fs';

const OUTPUT_PATH = new URL('../src/config.js', import.meta.url);

// 이름을 조금 다르게 등록했거나 Vercel 연동이 자동으로 넣어준 경우까지 커버한다.
const URL_ENV_NAMES = [
  'SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'VITE_SUPABASE_URL',
  'PUBLIC_SUPABASE_URL',
];
const KEY_ENV_NAMES = [
  'SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'VITE_SUPABASE_ANON_KEY',
  'PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_KEY',
];

/**
 * 후보 이름을 순서대로 확인해서 처음으로 값이 있는 것을 쓴다.
 * @param {string[]} names
 * @returns {{ name: string | null, value: string }}
 */
function pickEnv(names) {
  for (const name of names) {
    const value = (process.env[name] ?? '').trim();
    if (value !== '') return { name, value };
  }
  return { name: null, value: '' };
}

const picked = { url: pickEnv(URL_ENV_NAMES), key: pickEnv(KEY_ENV_NAMES) };

// 대시보드에서 복사하면 끝에 슬래시가 붙어 오는 경우가 많아 여기서 정리한다.
const supabaseUrl = picked.url.value.replace(/\/+$/, '');
const supabaseAnonKey = picked.key.value;

if (supabaseUrl === '' || supabaseAnonKey === '') {
  console.warn('[build-config] ⚠ Supabase 환경변수를 찾지 못했습니다. 기록 전송 없이 배포됩니다.');
  console.warn(`[build-config]   URL 후보: ${URL_ENV_NAMES.join(', ')}`);
  console.warn(`[build-config]   KEY 후보: ${KEY_ENV_NAMES.join(', ')}`);
  console.warn('[build-config]   Vercel → Settings → Environment Variables 를 확인하세요.');
} else {
  // 키는 로그에 남기지 않는다. 어떤 이름을 썼는지와 URL 만 남긴다.
  console.log(`[build-config] ✓ URL  ← ${picked.url.name} = ${supabaseUrl}`);
  console.log(`[build-config] ✓ KEY  ← ${picked.key.name} (${supabaseAnonKey.length}자)`);

  if (!/^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/i.test(supabaseUrl)) {
    console.warn(
      '[build-config] ⚠ URL 형태가 이상합니다. https://<프로젝트ref>.supabase.co 여야 합니다.\n' +
        '[build-config]   대시보드 주소(https://supabase.com/dashboard/...)를 넣으면 404 가 납니다.\n' +
        '[build-config]   Project Settings → API 의 "Project URL" 값을 넣으세요.',
    );
  }
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
console.log('[build-config] src/config.js 생성 완료');
