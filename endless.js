/*
 * エンドレスチャレンジ: 放射線×横線のサイズを選び、ランダム生成の削除型問題に失敗するまで挑戦し続ける
 *   - 1面の制限時間は2分。誤ったルートで提出するか時間切れで即終了
 *   - ランキング: クリア面数が多い順 → 同数ならクリアした面の合計タイムが短い順
 */
(() => {
  'use strict';
  const { $, store, fmt, show, onShow, toast, closeModal, sheet } = UI;
  const { LABELS } = Board;

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
    $('#enInfo').innerHTML = `<b>放射線${N}本 × 横線${R}段</b><br>消せる横線は <b>${AmidaCore.cutLimit(N, R)}本</b> まで／1面の制限時間 <b>2分</b>` +
      `<br>自己ベスト：${best ? `<b class="gold">${best.score}面</b>（${fmt(best.time_ms)}秒）` : 'まだ記録がありません'}`;
    $('#enN').querySelectorAll('.chip').forEach((b) => (b.onclick = () => { sel.N = +b.dataset.n; store.set('sap_endless_size', sel); renderSelect(); }));
    $('#enR').querySelectorAll('.chip').forEach((b) => (b.onclick = () => { sel.R = +b.dataset.r; store.set('sap_endless_size', sel); renderSelect(); }));
  }
  onShow('endlessSelect', renderSelect);
  const openRank = (N, R) => UI.openRanking({
    stageId: rid(N, R), title: `ENDLESS ${N}×${R}`, unit: '面', metric: 'クリア',
    sortText: 'クリア面数が多い順 → 同数は合計タイム順',
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
    $('#enLabel').innerHTML = `消した横線 <b>${run.cut.size}</b> / ${pz.limit} 本`;
  }
  function renderHud() {
    const pz = run.pz;
    $('#enName').innerHTML = `第${run.cleared + 1}面<small>${run.N}×${run.R}／クリア ${run.cleared}面・合計 ${fmt(run.total)}秒</small>`;
    $('#enMission').innerHTML = `<b>${LABELS[pz.start]}</b> から中央までのルートを最短にせよ。消せる横線は <b>${pz.limit}本</b> まで。<br>誤答・時間切れで即終了。`;
  }

  function start() {
    run = { N: sel.N, R: sel.R, cleared: 0, total: 0 };
    $('#enSubmit').onclick = null;
    $('#enSubmit').textContent = 'この回答で提出';
    show('endless');
    nextBoard(true);
  }

  function nextBoard(first) {
    Object.assign(run, { pz: AmidaCore.cutPuzzle(run.N, run.R), cut: new Set(), elapsed: 0, running: false, done: false });
    $('#enWrap').classList.remove('zoom');
    $('#enZoom').textContent = '拡大';
    renderHud();
    renderBoard();
    renderTime();
    const cd = $('#enCountdown');
    if (first) { run.cancel = UI.countdown(cd, startClock); return; }
    // 2面目以降: 盤面を伏せて「第n面」を表示してからスタート
    cd.classList.remove('hidden');
    cd.innerHTML = `<span class="cd-msg">第${run.cleared + 1}面</span>`;
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
    else if (run.cut.size >= pz.limit) { toast(`消せるのは ${pz.limit} 本までです`); navigator.vibrate?.(60); return; }
    else run.cut.add(idx);
    navigator.vibrate?.(12);
    renderBoard();
  });
  $('#enReset').addEventListener('click', () => { if (run && run.running) { run.cut.clear(); renderBoard(); } });
  $('#enZoom').addEventListener('click', () => {
    if (!run || (!run.running && !run.done)) return;
    const w = $('#enWrap');
    const z = w.classList.toggle('zoom');
    $('#enZoom').textContent = z ? '縮小' : '拡大';
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
      $('#enLabel').innerHTML = `<b>CLEAR！</b> ${fmt(run.elapsed)}秒`;
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
    $('#enLabel').innerHTML = `解答例：緑の横線 <b>${cut.size}</b> 本を消すとルート数 <b>${tr.crossings}</b>`;
    $('#enSubmit').textContent = '結果に戻る';
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
    const why = reason === 'time' ? '制限時間の2分を超えました'
      : reason === 'quit' ? 'チャレンジを終了しました'
      : `ルート数 ${res.crossings}（最短は ${run.pz.target}）`;
    const N = run.N, R = run.R;
    sheet(`
      <h3 class="ng serif">GAME OVER</h3>
      <p class="sub">${why}</p>
      <div class="stats two">
        <div class="stat"><span>クリア面数</span><b>${run.cleared}</b><em>面</em></div>
        <div class="stat"><span>合計タイム</span><b>${fmt(run.total)}</b><em>秒</em></div>
      </div>
      <div class="rank-big" id="rRank">${run.cleared >= 1 ? '集計中…' : '1面以上クリアするとランキングに記録されます'}</div>
      <button class="btn primary" id="rRetry">もう一度（${N}×${R}）</button>
      ${reason === 'quit' ? '' : '<button class="btn" id="rAnswer">この面の解答を見る</button>'}
      <div class="row"><button class="btn" id="rRankBtn">ランキング</button><button class="btn" id="rShare">シェア</button></div>
      <button class="btn" id="rSel">サイズ選択へ</button>`, {
      rRetry: () => { closeModal('resultModal'); start(); },
      rAnswer: showAnswer,
      rRankBtn: () => openRank(N, R),
      rShare: () => UI.share(`削減アミダクジ PUZZLE【エンドレスチャレンジ ${N}×${R}】\n${run.cleared}面クリア！（合計 ${fmt(run.total)}秒）`),
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
    sheet(`<h3 class="serif" style="font-size:22px">チャレンジを終了しますか？</h3>
      <p class="sub">ここまでの記録（${run.cleared}面クリア・${fmt(run.total)}秒）で登録されます。<br>確認中もタイマーは止まりません。</p>
      <button class="btn primary" id="qEnd">終了して記録する</button>
      <button class="btn" id="qBack">続ける</button>`, {
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
