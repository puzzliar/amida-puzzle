/* チュートリアル: 各モード初回開始時に表示（遊び方画面から再表示可） */
const Tutorial = (() => {
  'use strict';
  const { $, show, toast } = UI;
  const { LABELS } = Board;
  const { t } = I18N;
  const svg = $('#tutBoard');
  let steps = [], i = 0, onDone = null, onTap = null;

  function cutSteps() {
    const st = { N: 6, R: 3, start: 0, removed: [2, 7, 9, 16] };
    const base = AmidaCore.trace(st, new Set());
    // 1本消してルート数が最も短くなる横線を体験用に選ぶ
    let best = null;
    for (let idx = 0; idx < st.N * st.R; idx++) {
      if (st.removed.includes(idx)) continue;
      const c = AmidaCore.trace(st, new Set([idx])).crossings;
      if (!best || c < best.c) best = { idx, c };
    }
    const cut = new Set([best.idx]);
    const after = AmidaCore.trace(st, cut);
    const A = LABELS[st.start];
    return [
      { text: t('tutCut1'),
        draw: () => Board.draw(svg, st, { start: st.start }) },
      { text: t('tutCut2', A, base.crossings),
        draw: () => Board.draw(svg, st, { start: st.start, route: { start: st.start, trace: base } }) },
      { text: t('tutCut3'),
        draw: () => Board.draw(svg, st, { start: st.start, pulse: best.idx }),
        tap: (e) => {
          if (Board.nearestBar(svg, st, e) === best.idx) go(i + 1);
          else toast(t('tutTapGlow'));
        } },
      { text: t('tutCut4', base.crossings, after.crossings),
        draw: () => Board.draw(svg, st, { start: st.start, cut, route: { start: st.start, trace: after } }) },
      { text: t('tutCut5'),
        draw: () => Board.draw(svg, st, { start: st.start, cut }) },
      { text: t('tutCut6'),
        draw: () => Board.draw(svg, st, { start: st.start }) },
    ];
  }

  function huntSteps() {
    const pz = AmidaCore.huntPuzzle(6, 3, 0.3);
    const ans = pz.answer;
    const ansTr = AmidaCore.trace(Object.assign({}, pz, { start: ans }), new Set());
    return [
      { text: t('tutHunt1'),
        draw: () => Board.draw(svg, pz, { labels: 'pick' }) },
      { text: t('tutHunt2'),
        draw: () => Board.draw(svg, pz, { labels: 'pick' }),
        tap: (e) => {
          const s = Board.nearestSpoke(svg, pz, e);
          if (s == null) return;
          onTap = null;
          $('#tutNext').disabled = false;
          if (s === ans) {
            $('#tutText').innerHTML = t('tutHuntOk', LABELS[ans], ansTr.crossings);
            Board.draw(svg, pz, { labels: 'pick', right: ans, start: ans, route: { start: ans, trace: ansTr } });
          } else {
            const tr = AmidaCore.trace(Object.assign({}, pz, { start: s }), new Set());
            $('#tutText').innerHTML = t('tutHuntNg', LABELS[s], tr.crossings, LABELS[ans], ansTr.crossings);
            Board.draw(svg, pz, { labels: 'pick', right: ans, wrong: new Set([s]), start: ans, route: { start: ans, trace: ansTr } });
          }
        } },
      { text: t('tutHunt3'),
        draw: () => Board.draw(svg, pz, { labels: 'pick', right: ans }) },
    ];
  }

  function endlessSteps() {
    const pz = AmidaCore.cutPuzzle(8, 4);
    const cut = new Set(pz.sample);
    const tr = AmidaCore.trace(pz, cut);
    return [
      { text: t('tutEnd1'),
        draw: () => Board.draw(svg, pz, { start: pz.start }) },
      { text: t('tutEnd2', LABELS[pz.start]),
        draw: () => Board.draw(svg, pz, { start: pz.start, cut, route: { start: pz.start, trace: tr } }) },
      { text: t('tutEnd3'),
        draw: () => Board.draw(svg, pz, { start: pz.start, cut }) },
    ];
  }

  function go(n) {
    i = n;
    if (i >= steps.length) { const cb = onDone; onDone = null; cb && cb(); return; }
    const s = steps[i];
    $('#tutText').innerHTML = s.text;
    $('#tutDots').innerHTML = steps.map((_, k) => `<span class="${k === i ? 'on' : ''}"></span>`).join('');
    $('#tutNext').textContent = t(i === steps.length - 1 ? 'tutStart' : 'tutNext');
    $('#tutNext').disabled = !!s.tap;
    onTap = s.tap || null;
    s.draw();
  }

  svg.addEventListener('click', (e) => { if (onTap) onTap(e); });
  $('#tutNext').addEventListener('click', () => { if (!$('#tutNext').disabled) go(i + 1); });
  $('#tutSkip').addEventListener('click', () => go(steps.length));

  function run(kind, done) {
    steps = kind === 'cut' ? cutSteps() : kind === 'hunt' ? huntSteps() : endlessSteps();
    onDone = done;
    $('#tutTitle').textContent = t('tutTitle', t('tutModes')[kind]);
    show('tutorial');
    go(0);
  }

  return { run };
})();
