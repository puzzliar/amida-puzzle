#!/usr/bin/env node
/*
 * ステージ生成スクリプト
 *   node app/scripts/gen_stages.js        → app/stages.js を出力
 *
 * 全員が同じ問題でランキングを競うため、固定シードで決定的に生成する。
 * 採用条件（仕様書より）:
 *   - スタート地点に接する横線をすべて消せば最短…という単純ケースは除外
 *     （= スタート放射線に接する生存横線数 > 上限本数）
 *   - 消さないままより必ずルート数を短縮できる
 *   - 最少解は2本以上、かつ（Lv2以上）スタート地点から離れた横線を含む
 */
const fs = require('fs');
const path = require('path');
const Core = require('../amida-core.js');

const STAGES_PER_LEVEL = 5;

// Lv1〜10: 放射線 6→16（+2ずつ、Lv6で16本）/ 横線 3,4,5,6,6,6 → Lv7以降 +1ずつ（Lv10で10本）
const LEVELS = [
  { level: 1, N: 6, R: 3, limit: 2, removedRate: 0.15 },
  { level: 2, N: 8, R: 4, limit: 2, removedRate: 0.18 },
  { level: 3, N: 10, R: 5, limit: 3, removedRate: 0.2 },
  { level: 4, N: 12, R: 6, limit: 3, removedRate: 0.2 },
  { level: 5, N: 14, R: 6, limit: 3, removedRate: 0.2 },
  { level: 6, N: 16, R: 6, limit: 4, removedRate: 0.22 },
  { level: 7, N: 16, R: 7, limit: 4, removedRate: 0.22 },
  { level: 8, N: 16, R: 8, limit: 4, removedRate: 0.24 },
  { level: 9, N: 16, R: 9, limit: 5, removedRate: 0.24 },
  { level: 10, N: 16, R: 10, limit: 5, removedRate: 0.25 },
];

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 総当たりでソルバーを検証（小さい盤面のみ）
function bruteForce(stage, K) {
  const removed = new Set(stage.removed);
  const alive = Core.makeBars(stage.N, stage.R).filter((b) => !removed.has(b.idx)).map((b) => b.idx);
  let best = Infinity, bestCut = Infinity;
  const cut = new Set();
  (function rec(i) {
    if (i === alive.length) {
      const c = Core.trace(stage, cut).crossings;
      if (c < best || (c === best && cut.size < bestCut)) { best = c; bestCut = cut.size; }
      return;
    }
    rec(i + 1);
    if (cut.size < K) { cut.add(alive[i]); rec(i + 1); cut.delete(alive[i]); }
  })(0);
  return { target: best, minCut: bestCut };
}

function evaluate(cand, cfg) {
  // 除外条件は amida-core.js の evaluateCut（エンドレスチャレンジと共通）
  const ev = Core.evaluateCut(cand, cfg.limit, cfg.level >= 2);
  if (!ev) return null;
  const { initial, sol } = ev;
  // 難しさスコア: 短縮幅・必要本数・解の少なさ
  const score = (initial - sol.target) * 2 + sol.minCut * 3 - Math.min(sol.solutions, 6) * 1.5 + (sol.solutions === 1 ? 3 : 0);
  return { initial, sol, score };
}

function generate() {
  const stages = [];
  for (const cfg of LEVELS) {
    const total = cfg.N * cfg.R;
    for (let k = 1; k <= STAGES_PER_LEVEL; k++) {
      // 有効候補を集め、難しさスコアの分位点で選ぶ（No.1=易しめ → No.5=最難）
      const pool = [];
      for (let t = 0; t < 600; t++) {
        const seed = cfg.level * 100000 + k * 1000 + t;
        const rnd = mulberry32(seed);
        const nRemoved = Math.round(total * cfg.removedRate);
        const idxs = [...Array(total).keys()];
        for (let i = idxs.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [idxs[i], idxs[j]] = [idxs[j], idxs[i]]; }
        const cand = { N: cfg.N, R: cfg.R, start: Math.floor(rnd() * cfg.N), removed: idxs.slice(0, nRemoved).sort((a, b) => a - b) };
        const ev = evaluate(cand, cfg);
        if (ev) pool.push({ cand, ev, seed });
      }
      if (!pool.length) throw new Error(`Lv${cfg.level}-${k}: 条件を満たす盤面が見つかりません`);
      pool.sort((a, b) => a.ev.score - b.ev.score || a.seed - b.seed);
      const q = [0.2, 0.4, 0.6, 0.8, 0.97][k - 1];
      const best = pool[Math.min(pool.length - 1, Math.floor(pool.length * q))];
      const { cand, ev } = best;
      if (cfg.N * cfg.R <= 50) {
        const bf = bruteForce(cand, cfg.limit);
        if (bf.target !== ev.sol.target || bf.minCut !== ev.sol.minCut)
          throw new Error(`ソルバー不一致 Lv${cfg.level}-${k}: DP=${ev.sol.target}/${ev.sol.minCut} BF=${bf.target}/${bf.minCut}`);
      }
      stages.push({
        id: `${cfg.level}-${k}`,
        level: cfg.level,
        no: k,
        N: cfg.N,
        R: cfg.R,
        start: cand.start,
        removed: cand.removed,
        limit: cfg.limit,
        initial: ev.initial,
        target: ev.sol.target,
        minCut: ev.sol.minCut,
        solutions: ev.sol.solutions,
        seed: best.seed,
      });
    }
  }
  return stages;
}

const stages = generate();
const out = path.join(__dirname, '..', 'stages.js');
const body = stages.map((s) => '  ' + JSON.stringify(s)).join(',\n');
fs.writeFileSync(out, `/* 自動生成: scripts/gen_stages.js — 手で編集しないこと */\nconst STAGES = [\n${body}\n];\nif (typeof module !== 'undefined') module.exports = STAGES;\n`);
const seedSql = path.join(__dirname, '..', 'supabase', 'stages_seed.sql');
fs.mkdirSync(path.dirname(seedSql), { recursive: true });
fs.writeFileSync(seedSql, `-- 自動生成: scripts/gen_stages.js\ninsert into public.puzzle_stages (id, limit_cuts, min_cut) values\n${stages
  .map((s) => `  ('cut-${s.id}', ${s.limit}, ${s.minCut})`)
  .join(',\n')}\non conflict (id) do update set limit_cuts = excluded.limit_cuts, min_cut = excluded.min_cut;\n`);
console.log('stage  N  R 上限 初期 最短 最少本数 解の数');
for (const s of stages)
  console.log(`${s.id.padEnd(5)} ${String(s.N).padStart(2)} ${String(s.R).padStart(2)}  ${s.limit}   ${String(s.initial).padStart(2)}   ${String(s.target).padStart(2)}    ${s.minCut}      ${s.solutions}`);
console.log(`\n${stages.length} stages → ${out}`);
