/*
 * ステージ別ランキング
 *   score: 削除モード=消した横線の本数 / スタート探しモード=失敗回数（どちらも少ないほど上位）
 *   同じ score ならタイムが短い方が上位
 *   official=false の記録（削除モードの2回目以降の挑戦）は参考記録として順位に含めない
 * 公式ランキングは1プレイヤーにつき各ステージ1行（自己ベスト）。
 */
const Ranking = (() => {
  const online = !!(CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY);
  const LS_KEY = 'sap_local_ranking_v2';
  const MY_KEY = 'sap_my_records';

  // エンドレスチャレンジ（endless-*）はクリア数が多いほど上位
  const isDesc = (stageId) => stageId.startsWith('endless-');
  const betterFor = (stageId) => (a, b) => (isDesc(stageId) ? b.score - a.score : a.score - b.score) || a.time_ms - b.time_ms;
  const load = (k) => { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch { return {}; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

  function playerId() {
    let id = localStorage.getItem('sap_player_id');
    if (!id) {
      id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
      localStorage.setItem('sap_player_id', id);
    }
    return id;
  }

  // 自分の記録（公式／参考のベスト）。オンライン時も端末に保持して表示に使う
  function saveMine(stageId, row) {
    const db = load(MY_KEY);
    const m = db[stageId] || {};
    const k = row.official ? 'official' : 'ref';
    if (!m[k] || betterFor(stageId)(row, m[k]) < 0) m[k] = { score: row.score, time_ms: row.time_ms };
    db[stageId] = m;
    save(MY_KEY, db);
  }
  const mine = (stageId) => load(MY_KEY)[stageId] || {};

  // ---- Supabase REST ----
  function headers(extra) {
    return Object.assign({
      apikey: CONFIG.SUPABASE_ANON_KEY,
      Authorization: 'Bearer ' + CONFIG.SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    }, extra || {});
  }
  const api = (p) => CONFIG.SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/' + p;

  async function submit(stageId, name, score, timeMs, official) {
    const row = { stage_id: stageId, player_id: playerId(), player_name: name, score, time_ms: Math.round(timeMs), official: !!official };
    saveMine(stageId, row);
    if (online) {
      const r = await fetch(api('puzzle_scores'), { method: 'POST', headers: headers({ Prefer: 'return=minimal' }), body: JSON.stringify(row) });
      if (!r.ok) throw new Error(I18N.t('rankSendFail', r.status));
      return;
    }
    if (!row.official) return; // 端末内ランキングは公式記録のみ
    const better = betterFor(stageId);
    const db = load(LS_KEY);
    const list = db[stageId] || [];
    const cur = list.find((x) => x.player_id === row.player_id);
    if (!cur) list.push(row);
    else if (better(row, cur) < 0) Object.assign(cur, row);
    list.sort(better);
    db[stageId] = list.slice(0, 50);
    save(LS_KEY, db);
  }

  async function top(stageId, limit = 20) {
    if (online) {
      const q = `puzzle_best?stage_id=eq.${encodeURIComponent(stageId)}&order=score.${isDesc(stageId) ? 'desc' : 'asc'},time_ms.asc,created_at.asc&limit=${limit}`;
      const r = await fetch(api(q), { headers: headers() });
      if (!r.ok) throw new Error(I18N.t('rankGetFail', r.status));
      return r.json();
    }
    return (load(LS_KEY)[stageId] || []).slice().sort(betterFor(stageId)).slice(0, limit);
  }

  // 他プレイヤーの公式記録の中での順位（参考記録なら「公式なら何位相当」）
  async function rankOf(stageId, score, timeMs) {
    timeMs = Math.round(timeMs);
    const me = playerId();
    if (online) {
      const f = `or=(score.${isDesc(stageId) ? 'gt' : 'lt'}.${score},and(score.eq.${score},time_ms.lt.${timeMs}))`;
      const r = await fetch(api(`puzzle_best?select=player_id&stage_id=eq.${encodeURIComponent(stageId)}&player_id=neq.${me}&${f}`), {
        method: 'HEAD', headers: headers({ Prefer: 'count=exact' }),
      });
      const range = r.headers.get('content-range') || '*/0';
      return Number(range.split('/')[1] || 0) + 1;
    }
    const list = load(LS_KEY)[stageId] || [];
    const better = betterFor(stageId);
    return list.filter((x) => x.player_id !== me && better(x, { score, time_ms: timeMs }) < 0).length + 1;
  }

  return { online, submit, top, rankOf, playerId, mine };
})();
