-- ============================================================
--  Pose ON — Supabase 스키마
--  대시보드 → SQL Editor 에 통째로 붙여넣고 실행하면 된다.
--  (여러 번 실행해도 안전하도록 작성했다)
-- ============================================================
--
--  구조: 방문자 한 명당 한 행.
--    visitor_id  브라우저에서 만든 익명 UUID (개인정보 아님)
--    liked       찜하기를 한 번이라도 눌렀는가 (true / false)
--    score       피드백 점수 1~5 (안 했으면 null)
--
--  행동할 때마다 행이 쌓이는 게 아니라, 같은 방문자의 행을 계속 덮어쓴다.
--  그래서 "몇 명이 썼는지"는 그냥 행 개수를 세면 된다.
-- ============================================================


-- ── 방문자 테이블 ────────────────────────────────────────────
create table if not exists public.visitors (
  visitor_id uuid        primary key,
  liked      boolean     not null default false,
  score      smallint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint visitors_score_range check (score is null or score between 1 and 5)
);


-- ── 보안 ────────────────────────────────────────────────────
-- RLS 를 켜고 정책은 하나도 만들지 않는다.
--   → anon 키를 아는 사람도 이 테이블을 직접 읽거나 쓰거나 지울 수 없다.
--   → 기록은 아래 record_visit 함수를 통해서만 들어간다.
--   → 본인은 대시보드(service_role)로 보면 된다. service_role 은 RLS 를 우회한다.
alter table public.visitors enable row level security;


-- ── 기록 함수 ────────────────────────────────────────────────
-- security definer 라서 RLS 를 우회해 이 함수 안의 동작만 허용된다.
-- 같은 visitor_id 가 다시 오면 새 행을 만들지 않고 기존 행을 갱신한다.
--   liked : 한 번 true 가 되면 계속 true (찜을 해제해도 "누른 적 있음"은 유지)
--   score : 새 점수가 오면 갱신, null 이면 기존 값 유지
create or replace function public.record_visit(
  p_visitor_id uuid,
  p_liked      boolean  default null,
  p_score      smallint default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.visitors as v (visitor_id, liked, score)
  values (p_visitor_id, coalesce(p_liked, false), p_score)
  on conflict (visitor_id) do update
    set liked      = v.liked or coalesce(excluded.liked, false),
        score      = coalesce(excluded.score, v.score),
        updated_at = now();
end;
$$;

revoke all     on function public.record_visit(uuid, boolean, smallint) from public;
grant  execute on function public.record_visit(uuid, boolean, smallint) to anon;


-- ── 실행 직후 확인 ──────────────────────────────────────────
-- 아래 결과가 1, 1 이면 테이블과 함수가 제대로 만들어진 것이다.
select
  (select count(*) from information_schema.tables
    where table_schema = 'public' and table_name = 'visitors')   as 테이블_생성됨,
  (select count(*) from information_schema.routines
    where routine_schema = 'public' and routine_name = 'record_visit') as 함수_생성됨;

-- 앱에서 404(PGRST202 = 함수 못 찾음)가 나면 스키마 캐시가 낡은 것이다.
notify pgrst, 'reload schema';


-- ============================================================
--  지표 조회 — 필요할 때 SQL Editor 에서 실행
-- ============================================================

-- 1) 전체 사용자 수 / 찜하기를 누른 사용자 수 / 비율
--
-- select
--   count(*)                                   as 전체_사용자,
--   count(*) filter (where liked)              as 찜한_사용자,
--   count(*) filter (where not liked)          as 안누른_사용자,
--   round(100.0 * count(*) filter (where liked) / nullif(count(*), 0), 1) as 찜_비율_퍼센트
-- from public.visitors;


-- 2) 피드백 점수 분포와 평균
--
-- select
--   score                as 점수,
--   count(*)             as 응답수
-- from public.visitors
-- where score is not null
-- group by score
-- order by score;
--
-- select
--   round(avg(score), 2) as 평균점수,
--   count(*)             as 응답수
-- from public.visitors
-- where score is not null;


-- 3) 한 줄씩 O / X 로 보기
--
-- select
--   visitor_id,
--   case when liked then 'O' else 'X' end as 찜하기,
--   coalesce(score::text, '-')            as 피드백,
--   created_at
-- from public.visitors
-- order by created_at desc;


-- ============================================================
--  이전 버전(events 테이블)을 쓰고 있었다면
--  아래 두 줄의 주석을 풀고 실행해서 정리한다.
-- ============================================================
-- drop table if exists public.events;
