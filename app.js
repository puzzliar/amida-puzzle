/* 削減アミダクジ PUZZLE — タイトル／削除モード */
(() => {
  'use strict';
  const { $, store, fmt, show, onShow, toast, openModal, closeModal, sheet, Life } = UI;
  const { LABELS } = Board;

  // ---------- タイトル ----------
  $('#eventLink').href = CONFIG.EVENT_URL;
  Board.draw($('#titleArt'), { N: 12, R: 5, removed: [3, 8, 14, 21, 27, 33, 40, 46, 51, 57] }, { labels: 'none' });

  // 初回はチュートリアルを挟んでからモードへ
  $('#goCut').addEventListener('click', () => {
    if (store.get('sap_tut_cut', false)) show('select');
    else Tutorial.run('cut', () => { store.set('sap_tut_cut', true); show('select'); });
  });
  $('#goHunt').addEventListener('click', () => {
    if (store.get('sap_tut_hunt', false)) show('huntSelect');
    else Tutorial.run('hunt', () => { store.set('sap_tut_hunt', true); show('huntSelect'); });
  });
  $('#goEndless').addEventListener('click', () => {
    if (store.get('sap_tut_endless', false)) show('endlessSelect');
    else Tutorial.run('endless', () => { store.set('sap_tut_endless', true); show('endlessSelect'); });
  });
  $('#tutEndlessAgain').addEventListener('click', () => Tutorial.run('endless', () => show('howto')));
  $('#tutCutAgain').addEventListener('click', () => Tutorial.run('cut', () => show('howto')));
  $('#tutHuntAgain').addEventListener('click', () => Tutorial.run('hunt', () => show('howto')));

  // ---------- 削除モード: 保存データ ----------
  const rid = (st) => 'cut-' + st.id;
  let progress = store.get('sap_cut_progress', {}); // {id: {cuts, time}} クリア済み自己ベスト
  let attempts = store.get('sap_cut_attempts', {}); // {id: 挑戦回数}

  // ---------- ステージ選択 ----------
  const isUnlocked = (i) => i === 0 || !!progress[STAGES[i - 1].id];
  onShow('select', () => {
    UI.refreshLife();
    const byLv = {};
    STAGES.forEach((s, i) => (byLv[s.level] = byLv[s.level] || []).push([s, i]));
    let h = '';
    for (const lv of Object.keys(byLv)) {
      const s0 = byLv[lv][0][0];
      h += `<div class="level"><div class="level-head"><b>Lv.${lv}</b><span>放射線${s0.N}本・横線${s0.R}段／消せるのは${s0.limit}本まで</span></div><div class="stage-grid">`;
      for (const [s, i] of byLv[lv]) {
        const p = progress[s.id];
        const cls = !isUnlocked(i) ? 'locked' : p ? (p.cuts === s.minCut ? 'perfect' : 'clear') : '';
        const sub = !isUnlocked(i) ? '🔒' : p ? `${p.cuts}本 ${fmt(p.time)}s` : '';
        h += `<button class="stage-btn ${cls}" data-i="${i}">${s.id}<small>${sub}</small></button>`;
      }
      h += '</div></div>';
    }
    $('#levelList').innerHTML = h;
    $('#levelList').querySelectorAll('.stage-btn').forEach((b) => b.addEventListener('click', () => startStage(+b.dataset.i)));
    $('#clearCount').textContent = `${Object.keys(progress).length} / ${STAGES.length}`;
  });

  // ---------- ゲーム ----------
  const timer = new UI.Timer($('#timer'));
  let cur = null; // {i, stage, cut:Set, official, done, cancelCd}

  function renderGame(extra = {}) {
    const st = cur.stage;
    Board.draw($('#board'), st, Object.assign({ start: st.start, cut: cur.cut }, extra));
    const used = cur.cut.size;
    $('#pips').innerHTML = Array.from({ length: st.limit }, (_, k) => `<span class="pip${k < used ? ' on' : ''}"></span>`).join('');
    $('#counterLabel').innerHTML = `消した横線 <b>${used}</b> / ${st.limit} 本`;
  }

  function lifeEmptySheet() {
    const g = Life.get();
    sheet(`<h3 class="ng serif">NO LIFE</h3>
      <p class="sub">ライフがありません。<br>30分ごとに1回復します（次の回復まで ${UI.fmtClock(g.nextMs)}）。<br>その間は「スタート探しモード」で遊べます。</p>
      <button class="btn" id="rClose">閉じる</button>`, { rClose: () => closeModal('resultModal') });
  }

  function startStage(i) {
    if (Life.get().life <= 0) { lifeEmptySheet(); return; }
    const st = STAGES[i];
    cur = { i, stage: st, cut: new Set(), official: false, done: false };
    const first = !attempts[st.id];
    $('#stageName').innerHTML = `STAGE ${st.id}<small>放射線${st.N}本・横線${st.R}段</small>`;
    $('#mission').innerHTML = `<b>${LABELS[st.start]}</b> から中央までのルートを最短にせよ。消せる横線は <b>${st.limit}本</b> まで。<br>` +
      (first ? '<span class="tag official">初回挑戦</span> この挑戦の記録が公式記録になります' : '<span class="tag ref">再挑戦</span> 記録は参考記録になります');
    timer.reset();
    $('#submitBtn').onclick = null; // ギブアップ後の「ステージ選択へ」状態を解除
    $('#submitBtn').textContent = 'この回答で提出';
    $('#boardWrap').classList.remove('zoom');
    $('#zoomBtn').textContent = '拡大';
    show('game');
    UI.refreshLife();
    renderGame();
    cur.cancelCd = UI.countdown($('#countdown'), () => {
      // カウントダウン完了＝挑戦開始。初回挑戦のみ公式記録
      attempts[st.id] = (attempts[st.id] || 0) + 1;
      store.set('sap_cut_attempts', attempts);
      cur.official = attempts[st.id] === 1;
      timer.start();
    });
  }

  $('#board').addEventListener('click', (e) => {
    if (!cur || !timer.running || cur.done) return;
    const st = cur.stage;
    const idx = Board.nearestBar($('#board'), st, e);
    if (idx == null) return;
    if (cur.cut.has(idx)) cur.cut.delete(idx);
    else if (cur.cut.size >= st.limit) { toast(`消せるのは ${st.limit} 本までです`); navigator.vibrate?.(60); return; }
    else cur.cut.add(idx);
    navigator.vibrate?.(12);
    renderGame();
  });

  $('#zoomBtn').addEventListener('click', () => {
    if (!cur || (!timer.running && !cur.done)) return; // カウントダウン中は不可
    const w = $('#boardWrap');
    const z = w.classList.toggle('zoom');
    $('#zoomBtn').textContent = z ? '縮小' : '拡大';
    if (z) Board.scrollToSpoke(w, $('#board'), cur.stage, cur.stage.start);
  });
  $('#resetBtn').addEventListener('click', () => { if (cur && timer.running) { cur.cut.clear(); renderGame(); } });
  $('#quit').addEventListener('click', () => {
    if (cur) { cur.cancelCd && cur.cancelCd(); timer.stop(); cur.done = true; }
    show('select');
  });

  $('#submitBtn').addEventListener('click', () => {
    if (!cur || !timer.running) return;
    timer.stop();
    const st = cur.stage;
    const res = AmidaCore.judge(st, cur.cut);
    renderGame({ route: { start: st.start, trace: res.trace, cls: res.ok ? '' : 'miss' } });
    const life = res.ok ? null : Life.lose(); // 演出中に中断してもライフは減る
    UI.refreshLife();
    const c = cur;
    setTimeout(() => {
      if (c !== cur || c.done) return; // 演出中に中断された
      res.ok ? onClear(res) : onMiss(res, life);
    }, 1500);
  });

  function showAnswer() {
    closeModal('resultModal');
    cur.done = true;
    const st = cur.stage;
    const cut = new Set(AmidaCore.solve(st, st.limit).sample);
    const tr = AmidaCore.trace(st, cut);
    Board.draw($('#board'), st, { start: st.start, cut, hint: cut, route: { start: st.start, trace: tr } });
    $('#counterLabel').innerHTML = `解答例：緑の横線 <b>${cut.size}</b> 本を消すとルート数 <b>${tr.crossings}</b>`;
    $('#submitBtn').textContent = 'ステージ選択へ';
    $('#submitBtn').onclick = () => show('select');
  }

  function onMiss(res, g) {
    if (g.life <= 0) {
      sheet(`<h3 class="ng serif">MISS</h3>
        <p class="sub">ルート数 <b>${res.crossings}</b>。まだ短くできます。</p>
        <div class="life-big">❤ 0 / ${g.max}</div>
        <p class="sub">ライフが0になりました。30分ごとに1回復します<br>（次の回復まで ${UI.fmtClock(g.nextMs)}）。</p>
        <button class="btn" id="rGiveup">解答を見る</button>
        <button class="btn" id="rSel">ステージ選択へ</button>`, {
        rGiveup: showAnswer,
        rSel: () => { closeModal('resultModal'); cur.done = true; show('select'); },
      });
      return;
    }
    sheet(`<h3 class="ng serif">MISS</h3>
      <p class="sub">ルート数 <b>${res.crossings}</b>。まだ短くできます。</p>
      <div class="life-big">❤ ${g.life} / ${g.max}<small>ライフ −1</small></div>
      <p class="sub">選択した横線はリセットされ、タイマーは止まらずに続きます。</p>
      <button class="btn primary" id="rContinue">続ける</button>
      <button class="btn" id="rGiveup">ギブアップして解答を見る</button>`, {
      rContinue: () => { closeModal('resultModal'); cur.cut.clear(); renderGame(); timer.start(); },
      rGiveup: showAnswer,
    });
  }

  function onClear(res) {
    const st = cur.stage;
    cur.done = true;
    const time = timer.value();
    const prev = progress[st.id];
    const newBest = !prev || res.cuts < prev.cuts || (res.cuts === prev.cuts && time < prev.time);
    if (newBest) { progress[st.id] = { cuts: res.cuts, time }; store.set('sap_cut_progress', progress); }
    const hasNext = cur.i + 1 < STAGES.length;
    const i = cur.i;
    sheet(`
      <h3 class="ok serif">${res.perfect ? 'PERFECT' : 'CLEAR'}</h3>
      <p class="sub">${res.perfect ? '最短ルートを、最少の本数で。' : `最短ルート達成！ 最少 ${st.minCut} 本でも解けます。`}</p>
      <div class="stats">
        <div class="stat"><span>ルート数</span><b>${res.crossings}</b><em>最短</em></div>
        <div class="stat"><span>消した横線</span><b>${res.cuts}</b><em>${res.perfect ? '最少' : '最少 ' + st.minCut}</em></div>
        <div class="stat"><span>タイム</span><b>${fmt(time)}</b><em>秒</em></div>
      </div>
      <div class="rank-big" id="rRank">集計中…</div>
      ${hasNext ? '<button class="btn primary" id="rNext">次のステージへ</button>' : ''}
      <div class="row"><button class="btn" id="rRankBtn">ランキング</button><button class="btn" id="rShare">シェア</button></div>
      <div class="row"><button class="btn" id="rRetry">もう一度</button><button class="btn" id="rSel">ステージ選択</button></div>`, {
      rNext: () => { closeModal('resultModal'); startStage(i + 1); },
      rRankBtn: () => UI.openRanking({ stageId: rid(st), title: `RANKING ${st.id}`, unit: '本', metric: '本数', sortText: '消した本数が少ない順 → 同数はタイム順', star: (r) => r.score === st.minCut }),
      rShare: () => UI.share(`削減アミダクジ PUZZLE【削除モード】STAGE ${st.id} ${res.perfect ? 'PERFECT' : 'CLEAR'}！\n消した横線 ${res.cuts}本／${fmt(time)}秒`),
      rRetry: () => { closeModal('resultModal'); startStage(i); },
      rSel: () => { closeModal('resultModal'); show('select'); },
    });
    UI.submitScore(rid(st), res.cuts, time, cur.official);
  }

  // ---------- PWA ----------
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
