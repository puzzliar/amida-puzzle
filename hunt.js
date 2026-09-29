/* スタート探しモード: 横線がランダムに消えた盤面から、ルート数が最少になるスタート地点を選ぶ */
(() => {
  'use strict';
  const { $, store, fmt, show, onShow, closeModal, sheet, toast } = UI;
  const { LABELS } = Board;
  const { t } = I18N;

  const PER_STAGE = 5;
  const PENALTY_MS = 30000;
  const REMOVED_RATE = 0.3;
  // 削除モードの Lv1〜10 と同じ盤面サイズ
  const HUNT_STAGES = [[6, 3], [8, 4], [10, 5], [12, 6], [14, 6], [16, 6], [16, 7], [16, 8], [16, 9], [16, 10]]
    .map(([N, R], k) => ({ no: k + 1, N, R }));
  const rid = (hs) => 'start-' + hs.no;

  let progress = store.get('sap_hunt_progress', {}); // {no: {misses, time}}
  const better = (a, b) => a.misses - b.misses || a.time - b.time;
  const isUnlocked = (k) => k === 0 || !!progress[HUNT_STAGES[k - 1].no];

  onShow('huntSelect', () => {
    let h = `<div class="level"><div class="level-head"><b>STAGE</b><span>${t('huntHead')}</span></div><div class="hunt-grid">`;
    HUNT_STAGES.forEach((hs, k) => {
      const p = progress[hs.no];
      const cls = !isUnlocked(k) ? 'locked' : p ? (p.misses === 0 ? 'perfect' : 'clear') : '';
      const sub = !isUnlocked(k) ? '🔒' : p ? t('huntSub', p.misses, fmt(p.time)) : t('sizeShort', hs.N, hs.R);
      h += `<button class="stage-btn ${cls}" data-k="${k}">${hs.no}<small>${sub}</small></button>`;
    });
    h += '</div></div>';
    $('#huntList').innerHTML = h;
    $('#huntList').querySelectorAll('.stage-btn').forEach((b) => b.addEventListener('click', () => start(+b.dataset.k)));
    $('#huntClearCount').textContent = `${Object.keys(progress).length} / ${HUNT_STAGES.length}`;
  });

  const timer = new UI.Timer($('#huntTimer'));
  let cur = null; // {k, hs, puzzles, q, misses, wrong:Set, busy, done, cancelCd}

  function render(extra = {}) {
    const pz = cur.puzzles[cur.q];
    Board.draw($('#huntBoard'), pz, Object.assign({ labels: 'pick', wrong: cur.wrong }, extra));
    $('#huntProgress').innerHTML = Array.from({ length: PER_STAGE }, (_, i) =>
      `<span class="qdot${i < cur.q ? ' done' : i === cur.q ? ' now' : ''}">${i + 1}</span>`).join('');
    $('#huntMisses').innerHTML = t('missesLabel', cur.misses);
  }

  function start(k) {
    if (!UI.lifeGate()) return;
    const hs = HUNT_STAGES[k];
    // 挑戦ごとにランダム生成
    const puzzles = Array.from({ length: PER_STAGE }, () => AmidaCore.huntPuzzle(hs.N, hs.R, REMOVED_RATE));
    cur = { k, hs, puzzles, q: 0, misses: 0, wrong: new Set(), busy: false, done: false };
    $('#huntName').innerHTML = `STAGE ${hs.no}<small>${t('stageSub', hs.N, hs.R)}</small>`;
    timer.reset();
    $('#huntWrap').classList.remove('zoom');
    $('#huntZoom').textContent = t('zoom');
    show('hunt');
    render();
    cur.cancelCd = UI.countdown($('#huntCountdown'), () => timer.start());
  }

  $('#huntBoard').addEventListener('click', (e) => {
    if (!cur || cur.busy || cur.done || !timer.running) return;
    const pz = cur.puzzles[cur.q];
    const s = Board.nearestSpoke($('#huntBoard'), pz, e);
    if (s == null || cur.wrong.has(s)) return;
    cur.busy = true;
    timer.stop(); // 判定演出の間は計測しない（全員同じ演出時間のため）
    const tr = AmidaCore.trace(Object.assign({}, pz, { start: s }), new Set());
    const ok = s === pz.answer;
    const c = cur;
    const stale = () => c !== cur || c.done; // 演出中に中断・別ステージ開始された
    navigator.vibrate?.(ok ? 15 : [40, 40, 40]);
    if (ok) {
      render({ start: s, right: s, route: { start: s, trace: tr } });
      $('#huntFeedback').innerHTML = `<span class="fb ok">${t('huntOk', LABELS[s], tr.crossings)}</span>`;
      setTimeout(() => {
        if (stale()) return;
        $('#huntFeedback').innerHTML = '';
        cur.q++;
        cur.wrong.clear();
        cur.busy = false;
        if (cur.q >= PER_STAGE) { finish(); return; }
        render();
        timer.start();
      }, 1600);
    } else {
      cur.misses++;
      timer.add(PENALTY_MS);
      cur.wrong.add(s);
      const life = UI.Life.lose(); // 演出中に中断してもライフは減る
      UI.refreshLife();
      render({ start: s, route: { start: s, trace: tr, cls: 'miss' } });
      $('#huntFeedback').innerHTML = `<span class="fb ng">${t('huntNg', LABELS[s], tr.crossings)}</span>`;
      setTimeout(() => {
        if (stale()) return;
        if (life.life <= 0) { lifeOut(life); return; }
        $('#huntFeedback').innerHTML = '';
        cur.busy = false;
        render();
        timer.start();
      }, 1600);
    }
  });

  $('#huntZoom').addEventListener('click', () => {
    if (!cur || !timer.running) return;
    const w = $('#huntWrap');
    const z = w.classList.toggle('zoom');
    $('#huntZoom').textContent = t(z ? 'unzoom' : 'zoom');
    if (z) toast(t('tapOuter'));
  });
  $('#huntQuit').addEventListener('click', () => {
    if (cur) { cur.cancelCd && cur.cancelCd(); timer.stop(); cur.done = true; }
    $('#huntFeedback').innerHTML = '';
    show('huntSelect');
  });

  // ライフ切れ: このステージの挑戦はここで終了（記録なし）
  function lifeOut(g) {
    cur.done = true;
    $('#huntFeedback').innerHTML = '';
    sheet(`<h3 class="ng serif">NO LIFE</h3>
      <div class="life-big">${UI.Life.html()}</div>
      <p class="sub">${t('lifeZeroStage', UI.fmtClock(g.nextMs))}</p>
      <button class="btn" id="rSel">${t('toSelect')}</button>`, {
      rSel: () => { closeModal('resultModal'); show('huntSelect'); },
    });
  }

  function finish() {
    const hs = cur.hs;
    cur.done = true;
    const time = timer.value();
    const rec = { misses: cur.misses, time };
    const prev = progress[hs.no];
    if (!prev || better(rec, prev) < 0) { progress[hs.no] = rec; store.set('sap_hunt_progress', progress); }
    const hasNext = cur.k + 1 < HUNT_STAGES.length;
    const k = cur.k;
    sheet(`
      <h3 class="ok serif">${cur.misses === 0 ? 'PERFECT' : 'CLEAR'}</h3>
      <p class="sub">${t('huntAll')}${prev && better(rec, prev) < 0 ? '<br>' + t('newBest') : ''}</p>
      <div class="stats two">
        <div class="stat"><span>${t('statMiss')}</span><b>${cur.misses}</b><em>${t('times')}</em></div>
        <div class="stat"><span>${t('statTime')}</span><b>${fmt(time)}</b><em>${cur.misses ? t('penalty', cur.misses * 30) : t('sec')}</em></div>
      </div>
      <div class="rank-big" id="rRank">${t('tallying')}</div>
      ${hasNext ? `<button class="btn primary" id="rNext">${t('nextStage')}</button>` : ''}
      <div class="row"><button class="btn" id="rRankBtn">${t('ranking')}</button><button class="btn" id="rShare">${t('share')}</button></div>
      <div class="row"><button class="btn" id="rRetry">${t('again')}</button><button class="btn" id="rSel">${t('stageSelect')}</button></div>`, {
      rNext: () => { closeModal('resultModal'); start(k + 1); },
      rRankBtn: () => UI.openRanking({ stageId: rid(hs), title: `RANKING STAGE ${hs.no}`, scoreText: (n) => t('nMiss', n), metric: t('metricMiss'), sortText: t('rankHuntSort'), star: (r) => r.score === 0 }),
      rShare: () => UI.share(t('shareHunt', hs.no, cur.misses === 0 ? 'PERFECT' : 'CLEAR', cur.misses, fmt(time))),
      rRetry: () => { closeModal('resultModal'); start(k); },
      rSel: () => { closeModal('resultModal'); show('huntSelect'); },
    });
    UI.submitScore(rid(hs), cur.misses, time, true); // 毎回ランダム出題なので全記録が公式
  }
})();
