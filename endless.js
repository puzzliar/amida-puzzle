/*
 * エンドレスチャレンジ: 種類（削除／スタート探し）と放射線×横線のサイズを選び、
 * ランダム生成の問題に失敗するまで挑戦し続ける
 *   - 1面の制限時間は2分。誤答（誤ったルートで提出／誤ったスタート地点を選択）か時間切れで即終了
 *   - ランキング（種類×サイズごと）: クリア面数が多い順 → 同数ならクリアした面の合計タイムが短い順
 */
(() => {
  'use strict';
  const { $, store, fmt, show, onShow, toast, closeModal, sheet } = UI;
  const { LABELS } = Board;
  const { t } = I18N;

  const LIMIT_MS = 120000;
  const HUNT_REMOVED_RATE = 0.3; // スタート探しモードと同じ
  const NS = [6, 8, 10, 12, 14, 16];
  const RS = [3, 4, 5, 6, 7, 8, 9, 10];
  const TYPES = ['cut', 'hunt'];
  // 削除型は従来どおり endless-NxR、スタート探し型は endless-h-NxR
  const rid = (type, N, R) => (type === 'hunt' ? `endless-h-${N}x${R}` : `endless-${N}x${R}`);
  const typeName = (type) => t(type === 'hunt' ? 'enTypeHunt' : 'enTypeCut');
  let sel = Object.assign({ type: 'cut', N: 6, R: 3 }, store.get('sap_endless_size', {}));
  const saveSel = () => store.set('sap_endless_size', sel);

  // ---------- 種類・サイズ選択 ----------
  function renderSelect() {
    const { type, N, R } = sel;
    const chips = (vals, cur, key, label = (v) => v) =>
      vals.map((v) => `<button class="chip${v === cur ? ' on' : ''}" data-${key}="${v}">${label(v)}</button>`).join('');
    $('#enT').innerHTML = chips(TYPES, type, 't', typeName);
    $('#enN').innerHTML = chips(NS, N, 'n');
    $('#enR').innerHTML = chips(RS, R, 'r');
    Board.draw($('#enPreview'), { N, R, removed: [] }, { labels: type === 'hunt' ? 'pick' : 'none' });
    const best = Ranking.mine(rid(type, N, R)).official;
    $('#enInfo').innerHTML = (type === 'hunt' ? t('enInfoHunt', N, R) : t('enInfo', N, R, AmidaCore.cutLimit(N, R))) +
      `<br>${t('myBest')}${best ? t('bestVal', best.score, fmt(best.time_ms)) : t('noRecords')}`;
    $('#enT').querySelectorAll('.chip').forEach((b) => (b.onclick = () => { sel.type = b.dataset.t; saveSel(); renderSelect(); }));
    $('#enN').querySelectorAll('.chip').forEach((b) => (b.onclick = () => { sel.N = +b.dataset.n; saveSel(); renderSelect(); }));
    $('#enR').querySelectorAll('.chip').forEach((b) => (b.onclick = () => { sel.R = +b.dataset.r; saveSel(); renderSelect(); }));
  }
  onShow('endlessSelect', renderSelect);
  const openRank = (type, N, R) => UI.openRanking({
    stageId: rid(type, N, R), title: `ENDLESS ${typeName(type)} ${N}×${R}`,
    scoreText: (n) => t('nBoards', n), metric: t('metricClear'), sortText: t('rankEndSort'),
  });
  $('#enStart').addEventListener('click', () => start());
  $('#enRank').addEventListener('click', () => openRank(sel.type, sel.N, sel.R));

  // ---------- 制限時間（1面ごと） ----------
  let run = null; // {type,N,R,cleared,total,pz,cut,elapsed,t0,running,done,raf,cancel,busy}
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
  const isHunt = () => run.type === 'hunt';
  function renderBoard(extra = {}) {
    const pz = run.pz;
    if (isHunt()) {
      Board.draw($('#enBoard'), pz, Object.assign({ labels: 'pick' }, extra));
      $('#enPips').innerHTML = '';
      if (!extra.keepLabel) $('#enLabel').innerHTML = t('huntHint');
      return;
    }
    Board.draw($('#enBoard'), pz, Object.assign({ start: pz.start, cut: run.cut }, extra));
    $('#enPips').innerHTML = Array.from({ length: pz.limit }, (_, k) => `<span class="pip${k < run.cut.size ? ' on' : ''}"></span>`).join('');
    if (!extra.keepLabel) $('#enLabel').innerHTML = t('cutCount', run.cut.size, pz.limit);
  }
  function renderHud() {
    const pz = run.pz;
    $('#enName').innerHTML = t('enName', run.cleared + 1, run.N, run.R, run.cleared, fmt(run.total));
    $('#enMission').innerHTML = (isHunt() ? t('enHuntMission') : t('mission', LABELS[pz.start], pz.limit)) + t('enMissionTail');
  }

  function start() {
    run = { type: sel.type, N: sel.N, R: sel.R, cleared: 0, total: 0 };
    $('#enSubmit').onclick = null;
    $('#enSubmit').textContent = t('submit');
    $('#enReset').style.visibility = '';
    // スタート探し型は提出ボタン不要（地点をタップした時点で判定）
    $('#enControls').style.display = isHunt() ? 'none' : '';
    show('endless');
    nextBoard(true);
  }

  function nextBoard(first) {
    const pz = isHunt() ? AmidaCore.huntPuzzle(run.N, run.R, HUNT_REMOVED_RATE) : AmidaCore.cutPuzzle(run.N, run.R);
    Object.assign(run, { pz, cut: new Set(), elapsed: 0, running: false, done: false, busy: false });
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

  // 正解時: 記録を加算して次の面へ
  function onSolved() {
    run.cleared++;
    run.total += run.elapsed;
    $('#enLabel').innerHTML = t('clearTime', fmt(run.elapsed));
    const r = run;
    setTimeout(() => { if (r === run && !r.done) nextBoard(false); }, 1400);
  }

  $('#enBoard').addEventListener('click', (e) => {
    if (!run || !run.running || run.done || run.busy) return;
    const pz = run.pz;
    if (isHunt()) {
      const s = Board.nearestSpoke($('#enBoard'), pz, e);
      if (s == null) return;
      if (remaining() <= 0) { timeUp(); return; }
      stopClock();
      run.busy = true;
      const tr = AmidaCore.trace(Object.assign({}, pz, { start: s }), new Set());
      const ok = s === pz.answer;
      navigator.vibrate?.(ok ? 15 : [40, 40, 40]);
      if (ok) {
        renderBoard({ start: s, right: s, route: { start: s, trace: tr }, keepLabel: true });
        onSolved();
      } else {
        run.done = true;
        renderBoard({ start: s, wrong: new Set([s]), route: { start: s, trace: tr, cls: 'miss' }, keepLabel: true });
        $('#enLabel').innerHTML = t('enHuntWrong', LABELS[s], tr.crossings);
        const r = run;
        setTimeout(() => { if (r === run) gameOver('miss', { pick: s, crossings: tr.crossings }); }, 1400);
      }
      return;
    }
    const idx = Board.nearestBar($('#enBoard'), pz, e);
    if (idx == null) return;
    if (run.cut.has(idx)) run.cut.delete(idx);
    else if (run.cut.size >= pz.limit) { toast(t('limitToast', pz.limit)); navigator.vibrate?.(60); return; }
    else run.cut.add(idx);
    navigator.vibrate?.(12);
    renderBoard();
  });
  $('#enReset').addEventListener('click', () => { if (run && run.running && !isHunt()) { run.cut.clear(); renderBoard(); } });
  $('#enZoom').addEventListener('click', () => {
    if (!run || (!run.running && !run.done)) return;
    const w = $('#enWrap');
    const z = w.classList.toggle('zoom');
    $('#enZoom').textContent = t(z ? 'unzoom' : 'zoom');
    if (!z) return;
    if (isHunt()) toast(t('tapOuter'));
    else Board.scrollToSpoke(w, $('#enBoard'), run.pz, run.pz.start);
  });

  $('#enSubmit').addEventListener('click', () => {
    if (!run || !run.running || run.done || isHunt()) return;
    if (remaining() <= 0) { timeUp(); return; }
    stopClock();
    const pz = run.pz;
    const res = AmidaCore.judge(pz, run.cut);
    renderBoard({ route: { start: pz.start, trace: res.trace, cls: res.ok ? '' : 'miss' }, keepLabel: true });
    if (res.ok) { onSolved(); return; }
    run.done = true;
    const r = run;
    setTimeout(() => { if (r === run) gameOver('miss', res); }, 1400);
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
    if (isHunt()) {
      const a = pz.answer;
      const tr = AmidaCore.trace(Object.assign({}, pz, { start: a }), new Set());
      Board.draw($('#enBoard'), pz, { labels: 'pick', right: a, start: a, route: { start: a, trace: tr } });
      $('#enLabel').innerHTML = t('huntAnswerLabel', LABELS[a], tr.crossings);
      // 「結果に戻る」ボタンだけ表示
      $('#enControls').style.display = '';
      $('#enReset').style.visibility = 'hidden';
    } else {
      const cut = new Set(pz.sample);
      const tr = AmidaCore.trace(pz, cut);
      Board.draw($('#enBoard'), pz, { start: pz.start, cut, hint: cut, route: { start: pz.start, trace: tr } });
      $('#enLabel').innerHTML = t('answerLabel', cut.size, tr.crossings);
    }
    $('#enSubmit').textContent = t('backToResult');
    $('#enSubmit').onclick = () => {
      $('#enSubmit').onclick = null;
      $('#enReset').style.visibility = '';
      if (isHunt()) $('#enControls').style.display = 'none';
      resultSheet();
    };
  }

  let last = null; // 直近の終了理由（結果シート再表示用）
  function gameOver(reason, res) {
    last = { reason, res };
    resultSheet();
  }

  // 記録は1回だけ送信。解答表示から結果シートに戻ったときは順位表示のみ
  function recordScore() {
    if (run.cleared < 1) return;
    const id = rid(run.type, run.N, run.R);
    if (run.submitted) UI.showRank(id, run.cleared, run.total, true);
    else { const r = run; UI.submitScore(id, r.cleared, r.total, true, () => (r.submitted = true)); }
  }

  function resultSheet() {
    const { reason, res } = last;
    const pz = run.pz;
    let why;
    if (reason === 'time') why = t('whyTime');
    else if (reason === 'quit') why = t('whyQuit');
    else if (isHunt()) {
      const ansTr = AmidaCore.trace(Object.assign({}, pz, { start: pz.answer }), new Set());
      why = t('whyHuntMiss', LABELS[res.pick], res.crossings, LABELS[pz.answer], ansTr.crossings);
    } else why = t('whyMiss', res.crossings, pz.target);
    const { type, N, R } = run;
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
      rRankBtn: () => openRank(type, N, R),
      rShare: () => UI.share(t('shareEndless', `${typeName(type)} ${N}×${R}`, run.cleared, fmt(run.total))),
      rSel: () => { closeModal('resultModal'); show('endlessSelect'); },
    });
    recordScore();
  }

  // 途中終了: クリア済みの面があれば記録して終了（確認中もタイマーは止めない）
  $('#enQuit').addEventListener('click', () => {
    $('#enReset').style.visibility = '';
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
