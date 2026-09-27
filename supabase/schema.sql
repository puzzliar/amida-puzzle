-- 削減アミダクジ PUZZLE オンラインランキング
-- ※ 未適用。適用する場合は Supabase のSQLエディタ等で実行し、続けて stages_seed.sql を実行する。
--
-- stage_id: 削除モード 'cut-<Lv>-<No>' / スタート探しモード 'start-<Stage>'
-- score   : 削除モード=消した横線の本数 / スタート探しモード=失敗回数（少ないほど上位）
-- official: 削除モードの2回目以降の挑戦は false（参考記録。順位に含めない）

create table if not exists public.puzzle_scores (
  id          bigint generated always as identity primary key,
  stage_id    text        not null check (stage_id ~ '^(cut-([1-9]|10)-[1-5]|start-([1-9]|10))$'),
  player_id   uuid        not null,
  player_name text        not null check (char_length(player_name) between 1 and 12),
  score       smallint    not null check (score between 0 and 99),
  time_ms     integer     not null check (time_ms between 500 and 86400000),
  official    boolean     not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists puzzle_scores_rank_idx on public.puzzle_scores (stage_id, score, time_ms) where official;
-- 削除モードの公式記録は1プレイヤー1ステージ1回まで
create unique index if not exists puzzle_scores_cut_official_once
  on public.puzzle_scores (stage_id, player_id) where official and stage_id like 'cut-%';

-- 公式記録のステージ別自己ベスト（1プレイヤー1行）
create or replace view public.puzzle_best with (security_invoker = true) as
select distinct on (stage_id, player_id)
  stage_id, player_id, player_name, score, time_ms, created_at
from public.puzzle_scores
where official
order by stage_id, player_id, score, time_ms, created_at;

-- 削除モードのステージ定義（stages_seed.sql で投入）。理論上ありえない本数の記録を弾くために使う
create table if not exists public.puzzle_stages (
  id         text primary key,
  limit_cuts smallint not null,
  min_cut    smallint not null
);

alter table public.puzzle_scores enable row level security;
alter table public.puzzle_stages enable row level security;

drop policy if exists "puzzle_stages read" on public.puzzle_stages;
create policy "puzzle_stages read" on public.puzzle_stages for select to anon, authenticated using (true);

drop policy if exists "puzzle_scores read" on public.puzzle_scores;
create policy "puzzle_scores read" on public.puzzle_scores
  for select to anon, authenticated using (true);

drop policy if exists "puzzle_scores insert" on public.puzzle_scores;
create policy "puzzle_scores insert" on public.puzzle_scores
  for insert to anon, authenticated with check (
    (stage_id like 'cut-%' and exists (
       select 1 from public.puzzle_stages s
       where s.id = stage_id and score between s.min_cut and s.limit_cuts))
    or
    -- スタート探し: 失敗1回につき30秒加算されるので、タイムはそれ以上になる
    (stage_id like 'start-%' and time_ms >= score * 30000 + 1000)
  );

grant select, insert on public.puzzle_scores to anon, authenticated;
grant select on public.puzzle_stages to anon, authenticated;
grant select on public.puzzle_best to anon, authenticated;
