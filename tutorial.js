/* チュートリアル: 各モード初回開始時に表示（遊び方画面から再表示可） */
const Tutorial = (() => {
  'use strict';
  const { $, show, toast } = UI;
  const { LABELS } = Board;
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
      { text: '中央から放射状にのびる<b>放射線</b>と、隣どうしをつなぐ<b class="red">赤い横線</b>。これが「削減アミダクジ」の盤面です。',
        draw: () => Board.draw(svg, st, { start: st.start }) },
      { text: `<b class="gold">金色のスタート地点 ${A}</b> から中央へ進みます。横線にぶつかったら、必ず渡って隣の放射線へ。<br>中央に着くまでに横線を渡った回数が<b>ルート数</b>。いまは <b>${base.crossings}</b> です。`,
        draw: () => Board.draw(svg, st, { start: st.start, route: { start: st.start, trace: base } }) },
      { text: '横線はタップすると消せます（もう一度タップで元に戻ります）。<br><b class="gold">光っている横線</b>をタップしてみましょう。',
        draw: () => Board.draw(svg, st, { start: st.start, pulse: best.idx }),
        tap: (e) => {
          if (Board.nearestBar(svg, st, e) === best.idx) go(i + 1);
          else toast('光っている横線をタップしてください');
        } },
      { text: `ルートが変わって、ルート数が <b>${base.crossings} → ${after.crossings}</b> に！<br>このように<b>どの横線を消せばルート数が最短になるか</b>を考えるパズルです。`,
        draw: () => Board.draw(svg, st, { start: st.start, cut, route: { start: st.start, trace: after } }) },
      { text: 'ステージごとに<b>消せる本数の上限</b>があります。上限内でたどり着ける最短ルートにできたら <b class="gold">CLEAR</b>。<br>ランキングは ①<b>消した本数が少ない</b> ②<b>タイムが速い</b> 順。<br><b>各ステージ初回の挑戦だけが公式記録</b>で、2回目以降は参考記録になります。',
        draw: () => Board.draw(svg, st, { start: st.start, cut }) },
      { text: '不正解だと<b class="red">ライフが1減ります</b>（最大10）。0になると遊べませんが、<b>30分ごとに1回復</b>します。<br>さあ、挑戦しましょう！',
        draw: () => Board.draw(svg, st, { start: st.start }) },
    ];
  }

  function huntSteps() {
    const pz = AmidaCore.huntPuzzle(6, 3, 0.3);
    const ans = pz.answer;
    const ansTr = AmidaCore.trace(Object.assign({}, pz, { start: ans }), new Set());
    return [
      { text: '「スタート探しモード」では、<b>横線がランダムに消えたアミダクジ</b>が出題されます。',
        draw: () => Board.draw(svg, pz, { labels: 'pick' }) },
      { text: 'どのスタート地点から進むと<b>ルート数（横線を渡る回数）が最も少ない</b>でしょう？<br>外周の記号をタップして答えてみましょう。',
        draw: () => Board.draw(svg, pz, { labels: 'pick' }),
        tap: (e) => {
          const s = Board.nearestSpoke(svg, pz, e);
          if (s == null) return;
          onTap = null;
          $('#tutNext').disabled = false;
          if (s === ans) {
            $('#tutText').innerHTML = `<b class="gold">正解！</b> ${LABELS[ans]} からのルート数は <b>${ansTr.crossings}</b>。これが最短です。`;
            Board.draw(svg, pz, { labels: 'pick', right: ans, start: ans, route: { start: ans, trace: ansTr } });
          } else {
            const tr = AmidaCore.trace(Object.assign({}, pz, { start: s }), new Set());
            $('#tutText').innerHTML = `${LABELS[s]} からだとルート数 <b>${tr.crossings}</b>。<br>正解は <b class="gold">${LABELS[ans]}</b>（ルート数 <b>${ansTr.crossings}</b>）でした。本番では<b class="red">+30秒</b>のペナルティです。`;
            Board.draw(svg, pz, { labels: 'pick', right: ans, wrong: new Set([s]), start: ans, route: { start: ans, trace: ansTr } });
          }
        } },
      { text: '1ステージは<b>5問</b>。5問すべて正解するまでのタイムを競います。<br>間違えると<b class="red">タイム+30秒</b>＆失敗回数+1。<br>ランキングは ①<b>失敗回数が少ない</b> ②<b>タイムが速い</b> 順。問題は挑戦のたびに変わります。',
        draw: () => Board.draw(svg, pz, { labels: 'pick', right: ans }) },
    ];
  }

  function go(n) {
    i = n;
    if (i >= steps.length) { const cb = onDone; onDone = null; cb && cb(); return; }
    const s = steps[i];
    $('#tutText').innerHTML = s.text;
    $('#tutDots').innerHTML = steps.map((_, k) => `<span class="${k === i ? 'on' : ''}"></span>`).join('');
    $('#tutNext').textContent = i === steps.length - 1 ? 'はじめる' : '次へ';
    $('#tutNext').disabled = !!s.tap;
    onTap = s.tap || null;
    s.draw();
  }

  svg.addEventListener('click', (e) => { if (onTap) onTap(e); });
  $('#tutNext').addEventListener('click', () => { if (!$('#tutNext').disabled) go(i + 1); });
  $('#tutSkip').addEventListener('click', () => go(steps.length));

  function run(kind, done) {
    steps = kind === 'cut' ? cutSteps() : huntSteps();
    onDone = done;
    $('#tutTitle').textContent = kind === 'cut' ? 'チュートリアル：削除モード' : 'チュートリアル：スタート探し';
    show('tutorial');
    go(0);
  }

  return { run };
})();
