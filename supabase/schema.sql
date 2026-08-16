-- ============================================================
--  Pose ON — Supabase 스키마
--  대시보드 → SQL Editor 에 통째로 붙여넣고 실행하면 된다.
--  (여러 번 실행해도 안전하도록 작성했다)
-- ============================================================

-- ── 이벤트 테이블 ────────────────────────────────────────────
-- 저장하는 것은 세 종류뿐이다.
--   session_start  방문 1건        → "전체 방문자 수" 분모
--   like / unlike  찜 버튼 클릭    → "한 번이라도 찜한 방문자 수"
--   feedback       1~5점           → 피드백 데이터
create table if not exists public.events (
  id         bigint generated always as identity primary key,

  -- 브라우저에서 만든 익명 UUID. 개인정보가 아니다.
  visitor_id uuid        not null,   -- 방문자(브라우저) 단위, localStorage 에 유지
  session_id uuid        not null,   -- 방문 1회(페이지 로드) 단위

  type       text        not null,
  pose_id    text,                   -- 어떤 포즈를 찜했는지 (like / unlike)
  people     smallint,               -- 그때 고른 인원 수 (1 | 2 | 3)
  mood       text,                   -- 그때 고른 무드 (hip | meme | sweet)
  score      smallint,               -- 피드백 점수 1~5

  created_at timestamptz not null default now(),

  constraint events_type_check
    check (type in ('session_start', 'like', 'unlike', 'feedback')),
  constraint events_score_range
    check (score is null or score between 1 and 5),
  -- 피드백인데 점수가 없거나, 피드백이 아닌데 점수가 있는 행을 막는다.
  constraint events_score_only_for_feedback
    check ((type = 'feedback') = (score is not null))
);

create index if not exists events_visitor_type_idx on public.events (visitor_id, type);
create index if not exists events_type_created_idx on public.events (type, created_at desc);


-- ── 보안 (중요) ──────────────────────────────────────────────
-- anon 키는 브라우저에 그대로 노출된다. 데이터를 지키는 건 키가 아니라 아래 정책이다.
-- INSERT 만 허용하고 SELECT / UPDATE / DELETE 정책은 만들지 않는다.
--   → 누구나 기록을 남길 수는 있지만, 남이 남긴 기록을 읽거나 지울 수는 없다.
--   → 본인은 대시보드(service_role)로 보면 되고, service_role 은 RLS 를 우회한다.
alter table public.events enable row level security;

drop policy if exists "anon can insert events" on public.events;
create policy "anon can insert events"
  on public.events
  for insert
  to anon
  with check (true);


-- ============================================================
--  지표 조회 쿼리 — 필요할 때 SQL Editor 에서 실행
-- ============================================================

-- 1) 한 번이라도 마음에 들어요를 누른 방문자 수 (+ 전체 방문자 대비 비율)
--
-- select
--   count(distinct visitor_id) filter (where type = 'like') as visitors_who_liked,
--   count(distinct visitor_id)                              as total_visitors,
--   round(
--     100.0 * count(distinct visitor_id) filter (where type = 'like')
--     / nullif(count(distinct visitor_id), 0), 1
--   ) as percent
-- from public.events;


-- 2) 피드백 점수 분포
--
-- select score, count(*) as responses
-- from public.events
-- where type = 'feedback'
-- group by score
-- order by score;


-- 3) 피드백 평균 점수와 응답 수
--
-- select round(avg(score), 2) as avg_score, count(*) as responses
-- from public.events
-- where type = 'feedback';


-- 4) 어떤 포즈가 많이 찜됐는지 (보너스 — like 이벤트에 pose_id 가 함께 담긴다)
--
-- select pose_id, people, mood, count(*) as likes
-- from public.events
-- where type = 'like'
-- group by pose_id, people, mood
-- order by likes desc
-- limit 20;
