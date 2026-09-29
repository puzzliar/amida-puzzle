/*
 * 多言語対応（日本語 / English）
 *   I18N.t(key, ...args) で文言を取得。値が関数なら引数で差し込む
 *   HTML の静的文言は data-i18n="key"（innerHTML）/ data-i18n-ph="key"（placeholder）
 *   言語は localStorage 'sap_lang' に保存。未設定なら端末の言語（ja 以外は英語）
 */
const I18N = (() => {
  'use strict';

  const ja = {
    docTitle: '削減アミダクジ PUZZLE',
    // タイトル
    logo: '削減<br>アミダクジ<small>PUZZLE</small>',
    goCut: '削除モード<span class="desc">横線を消して最短ルートをつくる</span>',
    goHunt: 'スタート探しモード<span class="desc">最短ルートになるスタート地点を見抜く</span>',
    goEndless: 'エンドレスチャレンジ<span class="desc">失敗するまで何面クリアできるか</span>',
    howtoBtn: '遊び方',
    nameLbl: '名前：',
    notSet: '未設定',
    credit: '原作：ラダ ／ 監修：dai',
    eventLink: 'リアル交渉ゲーム「削減アミダクジ」はこちら ›',
    // 共通
    zoom: '拡大', unzoom: '縮小', reset: 'リセット', submit: 'この回答で提出',
    close: '閉じる', ranking: 'ランキング', share: 'シェア', again: 'もう一度',
    nextStage: '次のステージへ', stageSelect: 'ステージ選択', toSelect: 'ステージ選択へ',
    tallying: '集計中…', seeAnswer: '解答を見る', continue: '続ける',
    statCross: 'ルート数', statCut: '消した横線', statTime: 'タイム', sec: '秒',
    shortest: '最短', fewest: '最少', fewestN: (n) => `最少 ${n}`,
    newBest: '自己ベスト更新！',
    stageSub: (N, R) => `放射線${N}本・横線${R}段`,
    mission: (A, k) => `<b>${A}</b> から中央までのルートを最短にせよ。消せる横線は <b>${k}本</b> まで。`,
    cutCount: (u, k) => `消した横線 <b>${u}</b> / ${k} 本`,
    limitToast: (k) => `消せるのは ${k} 本までです`,
    answerLabel: (n, c) => `解答例：緑の横線 <b>${n}</b> 本を消すとルート数 <b>${c}</b>`,
    nCuts: (n) => `${n}本`, nMiss: (n) => `${n}回`, nBoards: (n) => `${n}面`,
    // 削除モード
    cutTitle: '削除モード',
    lifeBar: 'ライフ（ミスで−1・30分で1回復）',
    lvHead: (N, R, k) => `放射線${N}本・横線${R}段／消せるのは${k}本まで`,
    cutSub: (c, t) => `${c}本 ${t}s`,
    noLife: (clock) => `ライフがありません。<br>30分ごとに1回復します（次の回復まで ${clock}）。`,
    lifeZeroStage: (clock) => `ライフが0になったため、このステージの挑戦は終了です。<br>30分ごとに1回復します（次の回復まで ${clock}）。`,
    lifeAria: (l, m) => `ライフ ${l} / ${m}`,
    enLifeCost: '挑戦1回につきライフを<b>1</b>消費',
    firstTry: '<span class="tag official">初回挑戦</span> この挑戦の記録が公式記録になります',
    retryTry: '<span class="tag ref">再挑戦</span> 記録は参考記録になります',
    missCross: (c) => `ルート数 <b>${c}</b>。まだ短くできます。`,
    lifeZero: (clock) => `ライフが0になりました。30分ごとに1回復します<br>（次の回復まで ${clock}）。`,
    lifeMinus: 'ライフ −1',
    missNote: '選択した横線はリセットされ、タイマーは止まらずに続きます。',
    giveup: 'ギブアップして解答を見る',
    perfectSub: '最短ルートを、最少の本数で。',
    clearSub: (m) => `最短ルート達成！ 最少 ${m} 本でも解けます。`,
    rankCutSort: '消した本数が少ない順 → 同数はタイム順',
    metricCut: '本数',
    shareCut: (id, r, c, t) => `削減アミダクジ PUZZLE【削除モード】STAGE ${id} ${r}！\n消した横線 ${c}本／${t}秒`,
    // スタート探し
    huntTitle: 'スタート探し',
    huntHint: 'ルート数が<b class="gold">最も少ない</b>スタート地点をタップ',
    huntHead: '1ステージ＝5問・誤答は+30秒',
    huntSub: (m, t) => `失敗${m} ${t}s`,
    sizeShort: (N, R) => `放射線${N}・横線${R}`,
    missesLabel: (m) => `失敗 <b>${m}</b> 回`,
    huntOk: (L, c) => `正解！ ${L} のルート数 ${c}`,
    huntNg: (L, c) => `ハズレ　${L} のルート数 ${c}　+30秒`,
    tapOuter: '外周の記号をタップして回答',
    huntAll: '5問すべて正解！',
    statMiss: '失敗回数', times: '回',
    penalty: (s) => `うちペナルティ +${s}秒`,
    rankHuntSort: '失敗回数が少ない順 → 同数はタイム順',
    metricMiss: '失敗',
    shareHunt: (no, r, m, t) => `削減アミダクジ PUZZLE【スタート探しモード】STAGE ${no} ${r}！\n失敗 ${m}回／${t}秒`,
    // エンドレス
    endlessTitle: 'エンドレス',
    spokes: '放射線', spokesSub: '本数', rungs: '横線', rungsSub: '段数（隣り合う放射線の間ごと）',
    enStart: 'チャレンジ開始', enRank: 'このサイズのランキング',
    enInfo: (N, R, k) => `<b>放射線${N}本 × 横線${R}段</b><br>消せる横線は <b>${k}本</b> まで／1面の制限時間 <b>2分</b>`,
    myBest: '自己ベスト：',
    bestVal: (n, t) => `<b class="gold">${n}面</b>（${t}秒）`,
    enName: (n, N, R, c, t) => `第${n}面<small>${N}×${R}／クリア ${c}面・合計 ${t}秒</small>`,
    enMissionTail: '<br>誤答・時間切れで即終了。',
    boardN: (n) => `第${n}面`,
    clearTime: (t) => `<b>CLEAR！</b> ${t}秒`,
    backToResult: '結果に戻る',
    whyTime: '制限時間の2分を超えました',
    whyQuit: 'チャレンジを終了しました',
    whyMiss: (c, t) => `ルート数 ${c}（最短は ${t}）`,
    statCleared: 'クリア面数', boardsUnit: '面', statTotal: '合計タイム',
    needOne: '1面以上クリアするとランキングに記録されます',
    retrySize: (N, R) => `もう一度（${N}×${R}）`,
    boardAnswer: 'この面の解答を見る',
    toSize: 'サイズ選択へ',
    rankEndSort: 'クリア面数が多い順 → 同数は合計タイム順',
    metricClear: 'クリア',
    shareEndless: (label, c, t) => `削減アミダクジ PUZZLE【エンドレスチャレンジ ${label}】\n${c}面クリア！（合計 ${t}秒）`,
    enType: '種類', enTypeSub: 'ゲームのルール', enTypeCut: '削除', enTypeHunt: 'スタート探し',
    enInfoHunt: (N, R) => `<b>放射線${N}本 × 横線${R}段</b><br>ルート数が最少のスタート地点を選ぶ<br>1面の制限時間 <b>2分</b>`,
    enHuntMission: 'ルート数が<b>最も少ない</b>スタート地点を外周の記号から選べ。',
    enHuntWrong: (L, c) => `ハズレ　${L} のルート数 ${c}`,
    whyHuntMiss: (L, c, A, ac) => `${L} はルート数 ${c}（正解は ${A} のルート数 ${ac}）`,
    huntAnswerLabel: (A, c) => `正解：<b>${A}</b> からのルート数 <b>${c}</b>`,
    quitTitle: 'チャレンジを終了しますか？',
    quitBody: (c, t) => `ここまでの記録（${c}面クリア・${t}秒）で登録されます。<br>確認中もタイマーは止まりません。`,
    quitEnd: '終了して記録する',
    // ライフ・名前・ランキング
    lifeRecover: (clock) => `回復まで ${clock}`,
    nameTitle: 'プレイヤー名',
    nameSub: 'ランキングに表示される名前（12文字まで）',
    namePh: 'ニックネーム', nameOk: '決定', cancel: 'キャンセル',
    enterName: '名前を入力してください',
    localNote: '<br><span class="muted">（この端末内のランキング）</span>',
    officialRank: (r) => `公式記録　<b>${r}</b>位`,
    refRank: (r) => `<span class="tag ref">参考記録</span> 公式ランキングなら <b>${r}</b>位相当`,
    joinRanking: '名前を登録してランキングに参加',
    scopeOnline: '全国ランキング（公式記録）',
    scopeLocal: 'この端末内のランキング（公式記録）',
    loading: '読み込み中…', colName: '名前', colTime: 'タイム',
    noRecords: 'まだ記録がありません',
    myRef: (v) => `あなたの参考記録（2回目以降の挑戦）：${v}`,
    rankSendFail: (s) => `ランキング送信に失敗しました（${s}）`,
    rankGetFail: (s) => `ランキング取得に失敗しました（${s}）`,
    // チュートリアル
    tutTitle: (m) => `チュートリアル：${m}`,
    tutModes: { cut: '削除モード', hunt: 'スタート探し', endless: 'エンドレス' },
    tutSkip: 'スキップ', tutNext: '次へ', tutStart: 'はじめる',
    tutTapGlow: '光っている横線をタップしてください',
    tutCut1: '中央から放射状にのびる<b>放射線</b>と、隣どうしをつなぐ<b class="red">赤い横線</b>。これが「削減アミダクジ」の盤面です。',
    tutCut2: (A, c) => `<b class="gold">金色のスタート地点 ${A}</b> から中央へ進みます。横線にぶつかったら、必ず渡って隣の放射線へ。<br>中央に着くまでに横線を渡った回数が<b>ルート数</b>。いまは <b>${c}</b> です。`,
    tutCut3: '横線はタップすると消せます（もう一度タップで元に戻ります）。<br><b class="gold">光っている横線</b>をタップしてみましょう。',
    tutCut4: (a, b) => `ルートが変わって、ルート数が <b>${a} → ${b}</b> に！<br>このように<b>どの横線を消せばルート数が最短になるか</b>を考えるパズルです。`,
    tutCut5: 'ステージごとに<b>消せる本数の上限</b>があります。上限内でたどり着ける最短ルートにできたら <b class="gold">CLEAR</b>。<br>ランキングは ①<b>消した本数が少ない</b> ②<b>タイムが速い</b> 順。<br><b>各ステージ初回の挑戦だけが公式記録</b>で、2回目以降は参考記録になります。',
    tutCut6: 'ライフは<b>全モード共通</b>で最大10。不正解だと<b class="red">1減ります</b>（エンドレスは挑戦1回ごとに1消費）。0になると遊べませんが、<b>30分ごとに1回復</b>します。<br>さあ、挑戦しましょう！',
    tutHunt1: '「スタート探しモード」では、<b>横線がランダムに消えたアミダクジ</b>が出題されます。',
    tutHunt2: 'どのスタート地点から進むと<b>ルート数（横線を渡る回数）が最も少ない</b>でしょう？<br>外周の記号をタップして答えてみましょう。',
    tutHuntOk: (L, c) => `<b class="gold">正解！</b> ${L} からのルート数は <b>${c}</b>。これが最短です。`,
    tutHuntNg: (L, c, A, ac) => `${L} からだとルート数 <b>${c}</b>。<br>正解は <b class="gold">${A}</b>（ルート数 <b>${ac}</b>）でした。本番では<b class="red">+30秒</b>のペナルティです。`,
    tutHunt3: '1ステージは<b>5問</b>。5問すべて正解するまでのタイムを競います。<br>間違えると<b class="red">タイム+30秒</b>＆失敗回数+1、<b class="red">ライフも1減ります</b>。<br>ランキングは ①<b>失敗回数が少ない</b> ②<b>タイムが速い</b> 順。問題は挑戦のたびに変わります。',
    tutEnd1: '「エンドレスチャレンジ」は、<b>ランダムに作られる問題に失敗するまで挑戦し続ける</b>モードです。<br>まず種類（<b>削除</b>／<b>スタート探し</b>）と、<b>放射線の数×横線の数</b>で盤面の大きさを選びます。',
    tutEnd2: (A) => `「削除」ならスタート地点 <b class="gold">${A}</b> からのルート数が最短になるよう横線を消して提出、「スタート探し」ならルート数が最少のスタート地点をタップ。正解すると<b>次の面</b>が現れます。<br>1面の制限時間は<b>2分</b>。<b class="red">1回でも間違えるか、時間切れで即終了</b>です。`,
    tutEnd3: '種類と盤面の大きさごとにランキングがあります。<br>①<b>クリアした面の数が多い</b> ②同じ面数なら<b>かかった合計タイムが短い</b> 順。<br>挑戦1回につき<b class="red">ライフを1消費</b>します。どこまで続けられるか、挑戦しましょう！',
    // 遊び方
    howtoTitle: '遊び方',
    howtoIntro: `<p>中央から放射状にのびる線（放射線）と、隣どうしを結ぶ<b class="red">赤い横線</b>でできたアミダクジです。スタート地点から中央に向かって進み、横線にぶつかったら必ず渡って隣の放射線へ移ります。中央に着くまでに<b>横線を渡った回数＝ルート数</b>です。</p>
      <h3>ライフ（全モード共通）</h3>
      <p>はじめは<b>10</b>。削除モードとスタート探しモードは<b class="red">不正解で1減り</b>、エンドレスチャレンジは<b class="red">挑戦1回ごとに1消費</b>します。0になると挑戦できません。<b>30分ごとに1回復</b>します。</p>`,
    howtoCut: `<h3>削除モード</h3>
      <ul>
        <li>横線をタップして消し、<b class="gold">金色のスタート地点</b>からのルート数を<b>最短</b>にします。</li>
        <li>ステージごとに<b>消せる本数の上限</b>があります。点線の横線ははじめから消えています。</li>
        <li>上限内でたどり着ける最短ルートにできたら <b class="gold">CLEAR</b>。必要最少本数なら <b class="gold">PERFECT</b>。</li>
      </ul>
      <p>不正解だとライフが1減ります。ライフが残っていれば「続ける」で再挑戦できます（選んだ横線はリセット・タイマーは継続）。</p>
      <h4>ランキング</h4>
      <ol><li><b>消した横線が少ない方が上位</b></li><li>同じ本数なら<b>タイムが短い方が上位</b></li></ol>
      <p class="note">各ステージ<b>初回の挑戦の記録だけが公式記録</b>です。2回目以降の挑戦（ギブアップ後やクリア後の再挑戦）の記録は<b>参考記録</b>になり、順位には入りません。</p>
      <h4>レベル</h4>
      <p>Lv.1〜10（各5ステージ）。放射線は6本から2本ずつ増えてLv.6で16本、横線は3段から増えてLv.10で10段。ステージをクリアすると次のステージに挑戦できます。</p>`,
    howtoHunt: `<h3>スタート探しモード</h3>
      <ul>
        <li>横線がランダムに消えたアミダクジから、<b>ルート数が最も少なくなるスタート地点</b>を外周の記号をタップして選びます。</li>
        <li>1ステージ<b>5問</b>。正解すると次の問題へ。5問すべて正解するまでのタイムを記録します。</li>
        <li>間違えると<b class="red">タイム+30秒</b>、失敗回数+1、<b class="red">ライフ−1</b>。ライフが0になるとそのステージは終了です。</li>
        <li>問題は挑戦のたびに変わります。</li>
      </ul>
      <h4>ランキング</h4>
      <ol><li><b>失敗回数が少ない方が上位</b></li><li>同じ回数なら<b>タイムが短い方が上位</b></li></ol>`,
    howtoEndless: `<h3>エンドレスチャレンジ</h3>
      <ul>
        <li>種類（<b>削除</b>／<b>スタート探し</b>）と<b>放射線の数×横線の数</b>で盤面の大きさを選び、ランダムに作られる問題に失敗するまで挑戦し続けます。</li>
        <li>「削除」は削除モード、「スタート探し」はスタート探しモードと同じルールです。</li>
        <li>1面の制限時間は<b>2分</b>。正解すると次の面が現れます。</li>
        <li><b class="red">1回でも間違える（誤ったルートで提出／誤ったスタート地点を選択）か、時間切れで即終了</b>です。</li>
        <li>挑戦1回につき<b class="red">ライフを1消費</b>します。</li>
      </ul>
      <h4>ランキング（種類×盤面の大きさごと）</h4>
      <ol><li><b>クリアした面の数が多い方が上位</b></li><li>同じ面数なら<b>クリアした面の合計タイムが短い方が上位</b></li></ol>`,
    howtoNote: '<p class="note">本家「削減アミダクジ」は、プレイヤーが交渉しながら横線を消し合い、中央までのルート数が最も少ない「最終生存者」を目指すリアル交渉ゲームです。</p>',
    tutCutAgain: '削除モードのチュートリアルを見る',
    tutHuntAgain: 'スタート探しのチュートリアルを見る',
    tutEndlessAgain: 'エンドレスのチュートリアルを見る',
  };

  const en = {
    docTitle: 'Sakugen Amidakuji PUZZLE',
    logo: 'SAKUGEN<br>AMIDAKUJI<small>PUZZLE</small>',
    goCut: 'Cut Mode<span class="desc">Cut rungs to make the shortest route</span>',
    goHunt: 'Start Hunt<span class="desc">Spot the start with the shortest route</span>',
    goEndless: 'Endless Challenge<span class="desc">How many boards can you clear?</span>',
    howtoBtn: 'How to Play',
    nameLbl: 'Name: ',
    notSet: 'not set',
    credit: 'Original: ラダ / Supervised by dai',
    eventLink: 'The real negotiation game “Sakugen Amidakuji” ›',
    zoom: 'Zoom', unzoom: 'Fit', reset: 'Reset', submit: 'Submit',
    close: 'Close', ranking: 'Ranking', share: 'Share', again: 'Retry',
    nextStage: 'Next stage', stageSelect: 'Stages', toSelect: 'Back to stages',
    tallying: 'Calculating…', seeAnswer: 'Show answer', continue: 'Continue',
    statCross: 'Crossings', statCut: 'Rungs cut', statTime: 'Time', sec: 'sec',
    shortest: 'shortest', fewest: 'fewest', fewestN: (n) => `fewest: ${n}`,
    newBest: 'New personal best!',
    stageSub: (N, R) => `${N} spokes · ${R} rungs`,
    mission: (A, k) => `Make the route from <b>${A}</b> to the center as short as possible. Cut up to <b>${k}</b> rung${k === 1 ? '' : 's'}.`,
    cutCount: (u, k) => `Rungs cut <b>${u}</b> / ${k}`,
    limitToast: (k) => `You can cut up to ${k} rungs`,
    answerLabel: (n, c) => `Sample answer: cut the <b>${n}</b> green rungs → <b>${c}</b> crossings`,
    nCuts: (n) => `${n}`, nMiss: (n) => `${n}`, nBoards: (n) => `${n}`,
    cutTitle: 'Cut Mode',
    lifeBar: 'Lives (−1 per miss, +1 every 30 min)',
    lvHead: (N, R, k) => `${N} spokes · ${R} rungs / cut up to ${k}`,
    cutSub: (c, t) => `${c} cut ${t}s`,
    noLife: (clock) => `You have no lives left.<br>You recover 1 life every 30 min (next in ${clock}).`,
    lifeZeroStage: (clock) => `You ran out of lives, so this stage ends here.<br>You recover 1 life every 30 min (next in ${clock}).`,
    lifeAria: (l, m) => `Lives ${l} of ${m}`,
    enLifeCost: 'Each run costs <b>1</b> life',
    firstTry: '<span class="tag official">1st try</span> This attempt counts as your official record',
    retryTry: '<span class="tag ref">Retry</span> Your result will be unofficial',
    missCross: (c) => `<b>${c}</b> crossings. It can be shorter.`,
    lifeZero: (clock) => `You're out of lives. You recover 1 life every 30 min<br>(next in ${clock}).`,
    lifeMinus: 'Life −1',
    missNote: 'Your cuts are reset, and the timer keeps running.',
    giveup: 'Give up and show answer',
    perfectSub: 'The shortest route with the fewest cuts.',
    clearSub: (m) => `Shortest route! It can be done with just ${m} cuts.`,
    rankCutSort: 'Fewest cuts first → then fastest time',
    metricCut: 'Cuts',
    shareCut: (id, r, c, t) => `Sakugen Amidakuji PUZZLE [Cut Mode] STAGE ${id} ${r}!\n${c} rungs cut / ${t}s`,
    huntTitle: 'Start Hunt',
    huntHint: 'Tap the start with the <b class="gold">fewest</b> crossings',
    huntHead: '5 puzzles per stage · +30s per miss',
    huntSub: (m, t) => `${m} miss ${t}s`,
    sizeShort: (N, R) => `${N}×${R}`,
    missesLabel: (m) => `Misses <b>${m}</b>`,
    huntOk: (L, c) => `Correct! ${L}: ${c} crossings`,
    huntNg: (L, c) => `Wrong — ${L}: ${c} crossings  +30s`,
    tapOuter: 'Tap a letter on the rim to answer',
    huntAll: 'All 5 puzzles solved!',
    statMiss: 'Misses', times: 'times',
    penalty: (s) => `incl. +${s}s penalty`,
    rankHuntSort: 'Fewest misses first → then fastest time',
    metricMiss: 'Misses',
    shareHunt: (no, r, m, t) => `Sakugen Amidakuji PUZZLE [Start Hunt] STAGE ${no} ${r}!\n${m} misses / ${t}s`,
    endlessTitle: 'Endless',
    spokes: 'Spokes', spokesSub: 'count', rungs: 'Rungs', rungsSub: 'rows (per gap between spokes)',
    enStart: 'Start Challenge', enRank: 'Ranking for this size',
    enInfo: (N, R, k) => `<b>${N} spokes × ${R} rungs</b><br>Cut up to <b>${k}</b> rungs / <b>2 min</b> per board`,
    myBest: 'Personal best: ',
    bestVal: (n, t) => `<b class="gold">${n} board${n === 1 ? '' : 's'}</b> (${t}s)`,
    enName: (n, N, R, c, t) => `Board ${n}<small>${N}×${R} / cleared ${c} · total ${t}s</small>`,
    enMissionTail: '<br>One wrong answer or timeout ends the run.',
    boardN: (n) => `Board ${n}`,
    clearTime: (t) => `<b>CLEAR!</b> ${t}s`,
    backToResult: 'Back to results',
    whyTime: 'Time is up (2 minutes).',
    whyQuit: 'Challenge ended.',
    whyMiss: (c, t) => `${c} crossings (shortest is ${t})`,
    statCleared: 'Boards cleared', boardsUnit: 'boards', statTotal: 'Total time',
    needOne: 'Clear at least 1 board to enter the ranking',
    retrySize: (N, R) => `Retry (${N}×${R})`,
    boardAnswer: 'Show answer for this board',
    toSize: 'Choose size',
    rankEndSort: 'Most boards cleared first → then shortest total time',
    metricClear: 'Cleared',
    shareEndless: (label, c, t) => `Sakugen Amidakuji PUZZLE [Endless ${label}]\nCleared ${c} boards! (total ${t}s)`,
    enType: 'Type', enTypeSub: 'game rules', enTypeCut: 'Cut', enTypeHunt: 'Start Hunt',
    enInfoHunt: (N, R) => `<b>${N} spokes × ${R} rungs</b><br>Pick the start with the fewest crossings<br><b>2 min</b> per board`,
    enHuntMission: 'Pick the start on the rim with the <b>fewest</b> crossings.',
    enHuntWrong: (L, c) => `Wrong — ${L}: ${c} crossings`,
    whyHuntMiss: (L, c, A, ac) => `${L} has ${c} crossings (answer: ${A} with ${ac})`,
    huntAnswerLabel: (A, c) => `Answer: <b>${A}</b> with <b>${c}</b> crossings`,
    quitTitle: 'End this challenge?',
    quitBody: (c, t) => `Your result so far (${c} boards, ${t}s) will be saved.<br>The timer keeps running while you decide.`,
    quitEnd: 'End and save',
    lifeRecover: (clock) => `+1 in ${clock}`,
    nameTitle: 'Player Name',
    nameSub: 'Shown in the rankings (up to 12 characters)',
    namePh: 'Nickname', nameOk: 'OK', cancel: 'Cancel',
    enterName: 'Please enter a name',
    localNote: '<br><span class="muted">(ranking on this device)</span>',
    officialRank: (r) => `Official record: <b>#${r}</b>`,
    refRank: (r) => `<span class="tag ref">Unofficial</span> Would rank <b>#${r}</b>`,
    joinRanking: 'Register a name to join the ranking',
    scopeOnline: 'Global ranking (official records)',
    scopeLocal: 'Ranking on this device (official records)',
    loading: 'Loading…', colName: 'Name', colTime: 'Time',
    noRecords: 'No records yet',
    myRef: (v) => `Your unofficial best (retries): ${v}`,
    rankSendFail: (s) => `Failed to send your score (${s})`,
    rankGetFail: (s) => `Failed to load the ranking (${s})`,
    tutTitle: (m) => `Tutorial: ${m}`,
    tutModes: { cut: 'Cut Mode', hunt: 'Start Hunt', endless: 'Endless' },
    tutSkip: 'Skip', tutNext: 'Next', tutStart: "Let's play",
    tutTapGlow: 'Tap the glowing rung',
    tutCut1: 'Lines radiating from the center (<b>spokes</b>) and <b class="red">red rungs</b> linking neighboring spokes. This is the board of “Sakugen Amidakuji”.',
    tutCut2: (A, c) => `Start from the <b class="gold">gold start ${A}</b> and head to the center. Whenever you meet a rung, you must cross it to the next spoke.<br>The number of rungs crossed on the way is the <b>crossing count</b>. Right now it is <b>${c}</b>.`,
    tutCut3: 'Tap a rung to cut it (tap again to restore it).<br>Try tapping the <b class="gold">glowing rung</b>.',
    tutCut4: (a, b) => `The route changed: crossings went <b>${a} → ${b}</b>!<br>The puzzle is to find <b>which rungs to cut to make the route as short as possible</b>.`,
    tutCut5: 'Each stage has a <b>limit on how many rungs you can cut</b>. Reach the shortest route possible within the limit to <b class="gold">CLEAR</b>.<br>Ranking: ① <b>fewest cuts</b> ② <b>fastest time</b>.<br><b>Only your first attempt at each stage is official</b>; retries are unofficial.',
    tutCut6: 'Lives are <b>shared by all modes</b> (max 10). A wrong answer <b class="red">costs 1 life</b> (in Endless, each run costs 1). At 0 you can’t play, but you <b>recover 1 life every 30 minutes</b>.<br>Let’s go!',
    tutHunt1: 'In “Start Hunt”, you get an Amidakuji where <b>rungs have been removed at random</b>.',
    tutHunt2: 'From which start is the <b>crossing count (rungs crossed) the smallest</b>?<br>Tap a letter on the rim to answer.',
    tutHuntOk: (L, c) => `<b class="gold">Correct!</b> From ${L} the route has <b>${c}</b> crossings — the shortest.`,
    tutHuntNg: (L, c, A, ac) => `From ${L} there are <b>${c}</b> crossings.<br>The answer was <b class="gold">${A}</b> (<b>${ac}</b> crossings). In the real game a miss costs <b class="red">+30s</b>.`,
    tutHunt3: 'Each stage has <b>5 puzzles</b>. Compete on the time to solve all five.<br>A miss adds <b class="red">+30 seconds</b> and 1 miss, and <b class="red">costs 1 life</b>.<br>Ranking: ① <b>fewest misses</b> ② <b>fastest time</b>. Puzzles change every attempt.',
    tutEnd1: 'In “Endless Challenge” you <b>keep solving randomly generated boards until you fail</b>.<br>First choose the type (<b>Cut</b> / <b>Start Hunt</b>) and the board size: <b>spokes × rungs</b>.',
    tutEnd2: (A) => `In “Cut”, cut rungs so the route from <b class="gold">${A}</b> is as short as possible and submit; in “Start Hunt”, tap the start with the fewest crossings. Solve it and the <b>next board</b> appears.<br>Each board has a <b>2-minute</b> limit. <b class="red">One wrong answer or a timeout ends the run</b>.`,
    tutEnd3: 'Each type and board size has its own ranking.<br>① <b>most boards cleared</b> ② for ties, <b>shortest total time</b>.<br>Each run <b class="red">costs 1 life</b>. How far can you go?',
    howtoTitle: 'How to Play',
    howtoIntro: `<p>An Amidakuji (ladder lottery) made of lines radiating from the center (<b>spokes</b>) and <b class="red">red rungs</b> linking neighboring spokes. Start from a point on the rim and head to the center; whenever you meet a rung you must cross it to the next spoke. The number of rungs crossed on the way to the center is the <b>crossing count</b>.</p>
      <h3>Lives (shared by all modes)</h3>
      <p>You start with <b>10</b>. In Cut Mode and Start Hunt a <b class="red">wrong answer costs 1</b>; in Endless Challenge <b class="red">each run costs 1</b>. At 0 you can’t start a challenge. You <b>recover 1 every 30 minutes</b>.</p>`,
    howtoCut: `<h3>Cut Mode</h3>
      <ul>
        <li>Tap rungs to cut them and make the crossing count from the <b class="gold">gold start</b> as <b>small as possible</b>.</li>
        <li>Each stage has a <b>limit on how many rungs you can cut</b>. Dotted rungs are already removed.</li>
        <li>Reach the shortest route possible within the limit to <b class="gold">CLEAR</b>. Do it with the fewest cuts for a <b class="gold">PERFECT</b>.</li>
      </ul>
      <p>A wrong answer costs 1 life. If you still have lives, you can “Continue” (your cuts reset, the timer keeps running).</p>
      <h4>Ranking</h4>
      <ol><li><b>Fewer rungs cut ranks higher</b></li><li>For ties, <b>faster time ranks higher</b></li></ol>
      <p class="note"><b>Only your first attempt at each stage is an official record.</b> Later attempts (after giving up or clearing) are <b>unofficial</b> and not ranked.</p>
      <h4>Levels</h4>
      <p>Lv.1–10 (5 stages each). Spokes grow from 6 by 2 up to 16 at Lv.6; rungs grow from 3 up to 10 at Lv.10. Clear a stage to unlock the next.</p>`,
    howtoHunt: `<h3>Start Hunt</h3>
      <ul>
        <li>On an Amidakuji with rungs removed at random, tap the letter on the rim for the <b>start with the fewest crossings</b>.</li>
        <li><b>5 puzzles</b> per stage. Solve one to move on; your time to solve all five is recorded.</li>
        <li>A miss adds <b class="red">+30 seconds</b>, 1 miss and <b class="red">−1 life</b>. At 0 lives the stage ends.</li>
        <li>Puzzles change every attempt.</li>
      </ul>
      <h4>Ranking</h4>
      <ol><li><b>Fewer misses ranks higher</b></li><li>For ties, <b>faster time ranks higher</b></li></ol>`,
    howtoEndless: `<h3>Endless Challenge</h3>
      <ul>
        <li>Choose a type (<b>Cut</b> / <b>Start Hunt</b>) and a board size (<b>spokes × rungs</b>), and keep solving randomly generated boards until you fail.</li>
        <li>“Cut” follows the Cut Mode rules; “Start Hunt” follows the Start Hunt rules.</li>
        <li>Each board has a <b>2-minute</b> limit. Solve it and the next board appears.</li>
        <li><b class="red">One wrong answer (a wrong route or a wrong start) or a timeout ends the run.</b></li>
        <li>Each run <b class="red">costs 1 life</b>.</li>
      </ul>
      <h4>Ranking (per type and board size)</h4>
      <ol><li><b>More boards cleared ranks higher</b></li><li>For ties, <b>shorter total time ranks higher</b></li></ol>`,
    howtoNote: '<p class="note">The original “Sakugen Amidakuji” is a live negotiation game: players negotiate while cutting rungs, aiming to be the “last survivor” with the fewest crossings to the center.</p>',
    tutCutAgain: 'Cut Mode tutorial',
    tutHuntAgain: 'Start Hunt tutorial',
    tutEndlessAgain: 'Endless tutorial',
  };

  const dict = { ja, en };
  let lang = (() => {
    try { const v = localStorage.getItem('sap_lang'); if (v === 'ja' || v === 'en') return v; } catch {}
    return (navigator.language || 'ja').toLowerCase().startsWith('ja') ? 'ja' : 'en';
  })();

  function t(key, ...args) {
    const v = dict[lang][key] != null ? dict[lang][key] : ja[key];
    if (v == null) return key;
    return typeof v === 'function' ? v(...args) : v;
  }

  function apply() {
    document.documentElement.lang = lang;
    document.title = t('docTitle');
    document.querySelectorAll('[data-i18n]').forEach((el) => (el.innerHTML = t(el.dataset.i18n)));
    document.querySelectorAll('[data-i18n-ph]').forEach((el) => (el.placeholder = t(el.dataset.i18nPh)));
    document.querySelectorAll('[data-lang]').forEach((b) => b.classList.toggle('on', b.dataset.lang === lang));
  }

  function set(l) {
    lang = l;
    try { localStorage.setItem('sap_lang', l); } catch {}
    apply();
    document.dispatchEvent(new CustomEvent('langchange'));
  }

  document.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => set(b.dataset.lang)));
  apply();

  return { t, set, apply, get lang() { return lang; } };
})();
