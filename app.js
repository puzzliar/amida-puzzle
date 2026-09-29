/* 削減アミダクジ PUZZLE — タイトル／削除モード */
(() => {
  'use strict';
  const { $, store, fmt, show, onShow, toast, openModal, closeModal, sheet, Life } = UI;
  const { LABELS } = Board;
  const { t } = I18N;

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
      h += `<div class="level"><div class="level-head"><b>Lv.${lv}</b><span>${t('lvHead', s0.N, s0.R, s0.limit)}</span></div><div class="stage-grid">`;
      for (const [s, i] of byLv[lv]) {
        const p = progress[s.id];
        const cls = !isUnlocked(i) ? 'locked' : p ? (p.cuts === s.minCut ? 'perfect' : 'clear') : '';
        const sub = !isUnlocked(i) ? '🔒' : p ? t('cutSub', p.cuts, fmt(p.time)) : '';
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
    $('#counterLabel').innerHTML = t('cutCount', used, st.limit);
  }

  function startStage(i) {
    if (!UI.lifeGate()) return;
    const st = STAGES[i];
    cur = { i, stage: st, cut: new Set(), official: false, done: false };
    const first = !attempts[st.id];
    $('#stageName').innerHTML = `STAGE ${st.id}<small>${t('stageSub', st.N, st.R)}</small>`;
    $('#mission').innerHTML = t('mission', LABELS[st.start], st.limit) + '<br>' + t(first ? 'firstTry' : 'retryTry');
    timer.reset();
    $('#submitBtn').onclick = null; // ギブアップ後の「ステージ選択へ」状態を解除
    $('#submitBtn').textContent = t('submit');
    $('#boardWrap').classList.remove('zoom');
    $('#zoomBtn').textContent = t('zoom');
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
    else if (cur.cut.size >= st.limit) { toast(t('limitToast', st.limit)); navigator.vibrate?.(60); return; }
    else cur.cut.add(idx);
    navigator.vibrate?.(12);
    renderGame();
  });

  $('#zoomBtn').addEventListener('click', () => {
    if (!cur || (!timer.running && !cur.done)) return; // カウントダウン中は不可
    const w = $('#boardWrap');
    const z = w.classList.toggle('zoom');
    $('#zoomBtn').textContent = t(z ? 'unzoom' : 'zoom');
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
    $('#counterLabel').innerHTML = t('answerLabel', cut.size, tr.crossings);
    $('#submitBtn').textContent = t('toSelect');
    $('#submitBtn').onclick = () => show('select');
  }

  function onMiss(res, g) {
    if (g.life <= 0) {
      sheet(`<h3 class="ng serif">MISS</h3>
        <p class="sub">${t('missCross', res.crossings)}</p>
        <div class="life-big">${Life.html()}</div>
        <p class="sub">${t('lifeZero', UI.fmtClock(g.nextMs))}</p>
        <button class="btn" id="rGiveup">${t('seeAnswer')}</button>
        <button class="btn" id="rSel">${t('toSelect')}</button>`, {
        rGiveup: showAnswer,
        rSel: () => { closeModal('resultModal'); cur.done = true; show('select'); },
      });
      return;
    }
    sheet(`<h3 class="ng serif">MISS</h3>
      <p class="sub">${t('missCross', res.crossings)}</p>
      <div class="life-big">${Life.html()}<em>${t('lifeMinus')}</em></div>
      <p class="sub">${t('missNote')}</p>
      <button class="btn primary" id="rContinue">${t('continue')}</button>
      <button class="btn" id="rGiveup">${t('giveup')}</button>`, {
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
      <p class="sub">${res.perfect ? t('perfectSub') : t('clearSub', st.minCut)}</p>
      <div class="stats">
        <div class="stat"><span>${t('statCross')}</span><b>${res.crossings}</b><em>${t('shortest')}</em></div>
        <div class="stat"><span>${t('statCut')}</span><b>${res.cuts}</b><em>${res.perfect ? t('fewest') : t('fewestN', st.minCut)}</em></div>
        <div class="stat"><span>${t('statTime')}</span><b>${fmt(time)}</b><em>${t('sec')}</em></div>
      </div>
      <div class="rank-big" id="rRank">${t('tallying')}</div>
      ${hasNext ? `<button class="btn primary" id="rNext">${t('nextStage')}</button>` : ''}
      <div class="row"><button class="btn" id="rRankBtn">${t('ranking')}</button><button class="btn" id="rShare">${t('share')}</button></div>
      <div class="row"><button class="btn" id="rRetry">${t('again')}</button><button class="btn" id="rSel">${t('stageSelect')}</button></div>`, {
      rNext: () => { closeModal('resultModal'); startStage(i + 1); },
      rRankBtn: () => UI.openRanking({ stageId: rid(st), title: `RANKING ${st.id}`, scoreText: (n) => t('nCuts', n), metric: t('metricCut'), sortText: t('rankCutSort'), star: (r) => r.score === st.minCut }),
      rShare: () => UI.share(t('shareCut', st.id, res.perfect ? 'PERFECT' : 'CLEAR', res.cuts, fmt(time))),
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
