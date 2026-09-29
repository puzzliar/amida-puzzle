/*
 * エンドレスチャレンジ: 放射線×横線のサイズを選び、ランダム生成の削除型問題に失敗するまで挑戦し続ける
 *   - 1面の制限時間は2分。誤ったルートで提出するか時間切れで即終了
 *   - ランキング: クリア面数が多い順 → 同数ならクリアした面の合計タイムが短い順
 */
(() => {
  'use strict';
  const { $, store, fmt, show, onShow, toast, closeModal, sheet } = UI;
  const { LABELS } = Board;
  const { t } = I18N;

  const LIMIT_MS = 120000;
  const NS = [6, 8, 10, 12, 14, 16];
  const RS = [3, 4, 5, 6, 7, 8, 9, 10];
  const rid = (N, R) => `endless-${N}x${R}`;
  let sel = store.get('sap_endless_size', { N: 6, R: 3 });

  // ---------- サイズ選択 ----------
  function renderSelect() {
    const { N, R } = sel;
    const chips = (vals, cur, key) => vals.map((v) => `<button class="chip${v === cur ? ' on' : ''}" data-${key}="${v}">${v}</button>`).join('');
    $('#enN').innerHTML = chips(NS, N, 'n');
    $('#enR').innerHTML = chips(RS, R, 'r');
    Board.draw($('#enPreview'), { N, R, removed: [] }, { labels: 'none' });
    const best = Ranking.mine(rid(N, R)).official;
    $('#enInfo').innerHTML = t('enInfo', N, R, AmidaCore.cutLimit(N, R)) +
      `<br>${t('myBest')}${best ? t('bestVal', best.score, fmt(best.time_ms)) : t('noRecords')}`;
    $('#enN').querySelectorAll('.chip').forEach((b) => (b.onclick = () => { sel.N = +b.dataset.n; store.set('sap_endless_size', sel); renderSelect(); }));
    $('#enR').querySelectorAll('.chip').forEach((b) => (b.onclick = () => { sel.R = +b.dataset.r; store.set('sap_endless_size', sel); renderSelect(); }));
  }
  onShow('endlessSelect', renderSelect);
  const openRank = (N, R) => UI.openRanking({
    stageId: rid(N, R), title: `ENDLESS ${N}×${R}`, scoreText: (n) => t('nBoards', n), metric: t('metricClear'),
    sortText: t('rankEndSort'),
  });
  $('#enStart').addEventListener('click', () => start());
  $('#enRank').addEventListener('click', () => openRank(sel.N, sel.R));

  // ---------- 制限時間（1面ごと） ----------
  let run = null; // {N,R,cleared,total,pz,cut,elapsed,t0,running,done,raf,cancel}
  const remaining = () => LIMIT_MS - (run.elapsed + (run.running ? performance.now() - run.t0 : 0));
  function renderTime() {
    const r = Math.max(0, remaining());
    const el = $('#enTimer');
    el.textContent = `${Math.floor(r / 60000)}:${((r % 60000) / 1000).toFixed(1).padStart(4, '0')}`;
    el.classList.toggle('warn', r < 10000);
  }
  function loop() {
    if (!run || !run.running) return;
    renderTime();
    if (remaining() <= 0) { timeUp(); return; }
    run.raf = requestAnimationFrame(loop);
  }
  function startClock() { run.t0 = performance.now(); run.running = true; loop(); }
  function stopClock() {
    if (!run.running) return;
    run.elapsed += performance.now() - run.t0;
    run.running = false;
    cancelAnimationFrame(run.raf);
    renderTime();
  }

  // ---------- ゲーム ----------
  function renderBoard(extra = {}) {
    const pz = run.pz;
    Board.draw($('#enBoard'), pz, Object.assign({ start: pz.start, cut: run.cut }, extra));
    $('#enPips').innerHTML = Array.from({ length: pz.limit }, (_, k) => `<span class="pip${k < run.cut.size ? ' on' : ''}"></span>`).join('');
    $('#enLabel').innerHTML = t('cutCount', run.cut.size, pz.limit);
  }
  function renderHud() {
    const pz = run.pz;
    $('#enName').innerHTML = t('enName', run.cleared + 1, run.N, run.R, run.cleared, fmt(run.total));
    $('#enMission').innerHTML = t('mission', LABELS[pz.start], pz.limit) + t('enMissionTail');
  }

  function start() {
    run = { N: sel.N, R: sel.R, cleared: 0, total: 0 };
    $('#enSubmit').onclick = null;
    $('#enSubmit').textContent = t('submit');
    show('endless');
    nextBoard(true);
  }

  function nextBoard(first) {
    Object.assign(run, { pz: AmidaCore.cutPuzzle(run.N, run.R), cut: new Set(), elapsed: 0, running: false, done: false });
    $('#enWrap').classList.remove('zoom');
    $('#enZoom').textContent = t('zoom');
    renderHud();
    renderBoard();
    renderTime();
    const cd = $('#enCountdown');
    if (first) { run.cancel = UI.countdown(cd, startClock); return; }
    // 2面目以降: 盤面を伏せて「第n面」を表示してからスタート
    cd.classList.remove('hidden');
    cd.innerHTML = `<span class="cd-msg">${t('boardN', run.cleared + 1)}</span>`;
    const r = run;
    const tid = setTimeout(() => { if (r !== run || r.done) return; cd.classList.add('hidden'); startClock(); }, 1100);
    run.cancel = () => { clearTimeout(tid); cd.classList.add('hidden'); };
  }

  $('#enBoard').addEventListener('click', (e) => {
    if (!run || !run.running || run.done) return;
    const pz = run.pz;
    const idx = Board.nearestBar($('#enBoard'), pz, e);
    if (idx == null) return;
    if (run.cut.has(idx)) run.cut.delete(idx);
    else if (run.cut.size >= pz.limit) { toast(t('limitToast', pz.limit)); navigator.vibrate?.(60); return; }
    else run.cut.add(idx);
    navigator.vibrate?.(12);
    renderBoard();
  });
  $('#enReset').addEventListener('click', () => { if (run && run.running) { run.cut.clear(); renderBoard(); } });
  $('#enZoom').addEventListener('click', () => {
    if (!run || (!run.running && !run.done)) return;
    const w = $('#enWrap');
    const z = w.classList.toggle('zoom');
    $('#enZoom').textContent = t(z ? 'unzoom' : 'zoom');
    if (z) Board.scrollToSpoke(w, $('#enBoard'), run.pz, run.pz.start);
  });

  $('#enSubmit').addEventListener('click', () => {
    if (!run || !run.running || run.done) return;
    if (remaining() <= 0) { timeUp(); return; }
    stopClock();
    const pz = run.pz;
    const res = AmidaCore.judge(pz, run.cut);
    renderBoard({ route: { start: pz.start, trace: res.trace, cls: res.ok ? '' : 'miss' } });
    const r = run;
    if (res.ok) {
      run.cleared++;
      run.total += run.elapsed;
      $('#enLabel').innerHTML = t('clearTime', fmt(run.elapsed));
      setTimeout(() => { if (r === run && !r.done) nextBoard(false); }, 1400);
    } else {
      run.done = true;
      setTimeout(() => { if (r === run) gameOver('miss', res); }, 1400);
    }
  });

  function timeUp() {
    stopClock();
    run.done = true;
    navigator.vibrate?.([60, 40, 60]);
    gameOver('time');
  }

  function showAnswer() {
    closeModal('resultModal');
    const pz = run.pz;
    const cut = new Set(pz.sample);
    const tr = AmidaCore.trace(pz, cut);
    Board.draw($('#enBoard'), pz, { start: pz.start, cut, hint: cut, route: { start: pz.start, trace: tr } });
    $('#enLabel').innerHTML = t('answerLabel', cut.size, tr.crossings);
    $('#enSubmit').textContent = t('backToResult');
    $('#enSubmit').onclick = () => { $('#enSubmit').onclick = null; resultSheet(); };
  }

  let last = null; // 直近の終了理由（結果シート再表示用）
  function gameOver(reason, res) {
    last = { reason, res };
    resultSheet();
    if (run.cleared >= 1) UI.submitScore(rid(run.N, run.R), run.cleared, run.total, true);
  }

  function resultSheet() {
    const { reason, res } = last;
    const why = reason === 'time' ? t('whyTime')
      : reason === 'quit' ? t('whyQuit')
      : t('whyMiss', res.crossings, run.pz.target);
    const N = run.N, R = run.R;
    sheet(`
      <h3 class="ng serif">GAME OVER</h3>
      <p class="sub">${why}</p>
      <div class="stats two">
        <div class="stat"><span>${t('statCleared')}</span><b>${run.cleared}</b><em>${t('boardsUnit')}</em></div>
        <div class="stat"><span>${t('statTotal')}</span><b>${fmt(run.total)}</b><em>${t('sec')}</em></div>
      </div>
      <div class="rank-big" id="rRank">${run.cleared >= 1 ? t('tallying') : t('needOne')}</div>
      <button class="btn primary" id="rRetry">${t('retrySize', N, R)}</button>
      ${reason === 'quit' ? '' : `<button class="btn" id="rAnswer">${t('boardAnswer')}</button>`}
      <div class="row"><button class="btn" id="rRankBtn">${t('ranking')}</button><button class="btn" id="rShare">${t('share')}</button></div>
      <button class="btn" id="rSel">${t('toSize')}</button>`, {
      rRetry: () => { closeModal('resultModal'); start(); },
      rAnswer: showAnswer,
      rRankBtn: () => openRank(N, R),
      rShare: () => UI.share(t('shareEndless', N, R, run.cleared, fmt(run.total))),
      rSel: () => { closeModal('resultModal'); show('endlessSelect'); },
    });
  }

  // 途中終了: クリア済みの面があれば記録して終了（確認中もタイマーは止めない）
  $('#enQuit').addEventListener('click', () => {
    if (!run || run.done) { show('endlessSelect'); return; }
    if (run.cleared === 0) {
      run.cancel && run.cancel();
      stopClock();
      run.done = true;
      show('endlessSelect');
      return;
    }
    sheet(`<h3 class="serif" style="font-size:22px">${t('quitTitle')}</h3>
      <p class="sub">${t('quitBody', run.cleared, fmt(run.total))}</p>
      <button class="btn primary" id="qEnd">${t('quitEnd')}</button>
      <button class="btn" id="qBack">${t('continue')}</button>`, {
      qEnd: () => {
        closeModal('resultModal');
        if (run.done) return; // 確認中に時間切れ
        run.cancel && run.cancel();
        stopClock();
        run.done = true;
        gameOver('quit');
      },
      qBack: () => closeModal('resultModal'),
    });
  });
})();
