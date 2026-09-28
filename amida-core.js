/*
 * 削減アミダクジ PUZZLE — コアロジック（ブラウザ／Node 共用）
 *
 * 盤面モデルは本番運営ツール（tool_v7.1 の traceRouteStatic）と同一:
 *   - N 本の放射線（spoke 0..N-1）、各セクター（spoke s と s+1 の間）に R 本の横線
 *   - 横線 idx = row * N + sector
 *   - level = row + 1 (+0.5 奇数セクター) … 値が大きいほど外周
 *   - スタート地点（外周）から内側へ進み、出会った横線で隣の放射線へ渡る
 *   - ルート数 = 中央に着くまでに横線を渡った回数（少ないほど短い）
 */
(function (root) {
  'use strict';

  function barLevel(row, sector, N) {
    if (N % 2 === 1 && sector === N - 1) return row + 1.25;
    return row + 1 + (sector % 2 === 0 ? 0 : 0.5);
  }

  function makeBars(N, R) {
    const bars = [];
    for (let row = 0; row < R; row++)
      for (let sector = 0; sector < N; sector++)
        bars.push({ idx: row * N + sector, row, sector, level: barLevel(row, sector, N) });
    return bars;
  }

  // 放射線 s に接する横線（外周→内側の順）
  function spokeBars(bars, s, N) {
    const left = (s - 1 + N) % N;
    return bars
      .filter((b) => b.sector === s || b.sector === left)
      .sort((a, b) => b.level - a.level);
  }

  /**
   * 経路追跡
   * @param stage  {N, R, removed:[idx], start}
   * @param cut    Set<idx> プレイヤーが消した横線
   * @returns {crossings, crossed:[idx], steps:[{from,to,level,idx}], end}
   */
  function trace(stage, cut) {
    const { N, R, start } = stage;
    const removed = new Set(stage.removed);
    const bars = makeBars(N, R).sort((a, b) => b.level - a.level);
    let cur = start;
    const steps = [];
    for (const b of bars) {
      if (removed.has(b.idx) || cut.has(b.idx)) continue;
      let nxt;
      if (b.sector === cur) nxt = (cur + 1) % N;
      else if (b.sector === (cur - 1 + N) % N) nxt = (cur - 1 + N) % N;
      else continue;
      steps.push({ from: cur, to: nxt, level: b.level, idx: b.idx });
      cur = nxt;
    }
    return { crossings: steps.length, crossed: steps.map((s) => s.idx), steps, end: cur };
  }

  /**
   * 最適解ソルバー（動的計画法）
   * 経路は内側へ単調に進むため各横線に出会うのは高々1回。
   * 出会った横線ごとに「消す（削除+1）」「渡る（ルート+1）」の二択となり、
   * 状態 (放射線, 現在レベル) 上の DP で厳密解が得られる。
   * @returns {best:[d]=そのd本以内での最少ルート数, target, minCut, solutions(最少本数の解の数), sample:[idx]}
   */
  function solve(stage, K) {
    const { N, R, start } = stage;
    const removed = new Set(stage.removed);
    const bars = makeBars(N, R).filter((b) => !removed.has(b.idx));
    const bySpoke = [];
    for (let s = 0; s < N; s++) bySpoke.push(spokeBars(bars, s, N));
    const INF = 1e9;
    const memo = new Map();

    // f(s, lv) → 配列 exact[d] = ちょうど d 本消したときの最少ルート数, cnt[d] = その解の数
    function f(s, lv) {
      const key = s + ':' + lv;
      if (memo.has(key)) return memo.get(key);
      const next = bySpoke[s].find((b) => b.level < lv);
      let res;
      if (!next) {
        const exact = Array(K + 1).fill(INF);
        const cnt = Array(K + 1).fill(0);
        exact[0] = 0;
        cnt[0] = 1;
        res = { exact, cnt, next: null };
      } else {
        const other = next.sector === s ? (s + 1) % N : (s - 1 + N) % N;
        const cross = f(other, next.level);
        const del = f(s, next.level);
        const exact = Array(K + 1).fill(INF);
        const cnt = Array(K + 1).fill(0);
        for (let d = 0; d <= K; d++) {
          const a = cross.exact[d] + 1;
          const b = d >= 1 ? del.exact[d - 1] : INF;
          const m = Math.min(a, b);
          if (m >= INF) continue;
          exact[d] = m;
          if (a === m) cnt[d] += cross.cnt[d];
          if (b === m) cnt[d] += del.cnt[d - 1];
        }
        res = { exact, cnt, next, other };
      }
      memo.set(key, res);
      return res;
    }

    const rootRes = f(start, Infinity);
    let target = INF;
    for (let d = 0; d <= K; d++) target = Math.min(target, rootRes.exact[d]);
    let minCut = -1;
    for (let d = 0; d <= K; d++) if (rootRes.exact[d] === target) { minCut = d; break; }

    // 最少本数の解をすべて列挙（小さいので全列挙で十分）
    const all = [];
    (function walk(s, lv, d, need, acc) {
      const r = f(s, lv);
      if (r.exact[d] !== need) return;
      if (!r.next) { all.push(acc.slice()); return; }
      const cr = f(r.other, r.next.level);
      if (cr.exact[d] + 1 === need) walk(r.other, r.next.level, d, need - 1, acc);
      if (d >= 1) {
        const dl = f(s, r.next.level);
        if (dl.exact[d - 1] === need) { acc.push(r.next.idx); walk(s, r.next.level, d - 1, need, acc); acc.pop(); }
      }
    })(start, Infinity, minCut, target, []);

    return { target, minCut, solutions: all.length, all, sample: all[0] || [] };
  }

  /** 回答判定 */
  function judge(stage, cut) {
    const t = trace(stage, cut);
    const ok = cut.size <= stage.limit && t.crossings === stage.target;
    return { ok, crossings: t.crossings, cuts: cut.size, perfect: ok && cut.size === stage.minCut, trace: t };
  }

  // 盤面サイズに応じた「消せる本数の上限」（削除モード各レベルと同じ基準）
  function cutLimit(N, R) {
    const t = N * R;
    return t < 40 ? 2 : t < 90 ? 3 : t < 140 ? 4 : 5;
  }

  /**
   * 削除型の問題として成立するか判定（ステージ生成・エンドレス共通の除外条件）
   *   - スタート地点に接する横線をすべて消せば最短…という単純ケースは除外
   *   - 消さないままより必ずルート数を短縮できる
   *   - 最少解は2本以上、requireFar なら全最少解がスタート周辺だけで完結しない
   */
  function evaluateCut(stage, K, requireFar) {
    const removed = new Set(stage.removed);
    const bars = makeBars(stage.N, stage.R).filter((b) => !removed.has(b.idx));
    const adj = spokeBars(bars, stage.start, stage.N).map((b) => b.idx);
    if (adj.length <= K) return null;
    const initial = trace(stage, new Set()).crossings;
    const sol = solve(stage, K);
    if (sol.target >= initial) return null;
    if (sol.minCut < 2) return null;
    const adjSet = new Set(adj);
    if (requireFar && sol.all.some((s) => s.every((i) => adjSet.has(i)))) return null;
    return { initial, sol };
  }

  /** エンドレスチャレンジ用: 削除型の問題をランダム生成 */
  function cutPuzzle(N, R, rnd) {
    rnd = rnd || Math.random;
    const total = N * R;
    const K = cutLimit(N, R);
    const rate = 0.15 + 0.1 * Math.min(1, total / 160);
    for (let t = 0; t < 5000; t++) {
      const idxs = [...Array(total).keys()];
      for (let i = idxs.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [idxs[i], idxs[j]] = [idxs[j], idxs[i]]; }
      const stage = { N, R, start: Math.floor(rnd() * N), removed: idxs.slice(0, Math.round(total * rate)).sort((a, b) => a - b) };
      const ev = evaluateCut(stage, K, total > 18);
      if (ev) return Object.assign(stage, { limit: K, initial: ev.initial, target: ev.sol.target, minCut: ev.sol.minCut, sample: ev.sol.sample });
    }
    throw new Error('問題を生成できませんでした');
  }

  /**
   * スタート探しモードの問題生成
   * 横線をランダムに消した盤面のうち、ルート数が最少になるスタート地点が1つだけのものを返す。
   * ルート数0（横線に一度も当たらない＝見ただけで分かる）地点がある盤面は除外。
   */
  function huntPuzzle(N, R, rate, rnd) {
    rnd = rnd || Math.random;
    const total = N * R;
    for (let t = 0; t < 5000; t++) {
      const idxs = [...Array(total).keys()];
      for (let i = idxs.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [idxs[i], idxs[j]] = [idxs[j], idxs[i]]; }
      const removed = idxs.slice(0, Math.round(total * rate)).sort((a, b) => a - b);
      const counts = [];
      for (let s = 0; s < N; s++) counts.push(trace({ N, R, start: s, removed }, new Set()).crossings);
      const min = Math.min(...counts);
      if (min === 0 || counts.filter((c) => c === min).length !== 1) continue;
      return { N, R, removed, answer: counts.indexOf(min), counts, min };
    }
    throw new Error('問題を生成できませんでした');
  }

  const LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  const api = { barLevel, makeBars, spokeBars, trace, solve, judge, cutLimit, evaluateCut, cutPuzzle, huntPuzzle, LABELS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AmidaCore = api;
})(typeof self !== 'undefined' ? self : this);
