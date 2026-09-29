/* 共通UI部品: 画面遷移・モーダル・タイマー・ライフ・プレイヤー名・ランキング表示 */
const UI = (() => {
  'use strict';
  const $ = (s) => document.querySelector(s);

  const store = {
    get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };

  const fmt = (ms) => (ms / 1000).toFixed(2);
  const fmtClock = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- 画面 ----------
  const hooks = {};
  function show(id) {
    document.querySelectorAll('.screen').forEach((e) => e.classList.toggle('active', e.id === id));
    refreshLife();
    if (hooks[id]) hooks[id]();
    window.scrollTo(0, 0);
  }
  const onShow = (id, fn) => (hooks[id] = fn);

  function toast(msg, ms = 1800) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove('show'), ms);
  }
  const openModal = (id) => $('#' + id).classList.add('active');
  const closeModal = (id) => $('#' + id).classList.remove('active');

  // 結果シートを表示し、{id: handler} でボタンを結線
  function sheet(html, handlers = {}) {
    $('#resultSheet').innerHTML = html;
    for (const [id, fn] of Object.entries(handlers)) {
      const el = document.getElementById(id);
      if (el) el.onclick = fn;
    }
    openModal('resultModal');
  }

  // ---------- タイマー ----------
  class Timer {
    constructor(el) { this.el = el; this.reset(); }
    reset() { this.elapsed = 0; this.running = false; cancelAnimationFrame(this.raf); this.render(); }
    start() {
      if (this.running) return;
      this.t0 = performance.now();
      this.running = true;
      const loop = () => { if (!this.running) return; this.render(); this.raf = requestAnimationFrame(loop); };
      loop();
    }
    stop() {
      if (!this.running) return;
      this.elapsed += performance.now() - this.t0;
      this.running = false;
      cancelAnimationFrame(this.raf);
      this.render();
    }
    add(ms) { this.elapsed += ms; this.render(); }
    value() { return this.elapsed + (this.running ? performance.now() - this.t0 : 0); }
    render() { this.el.textContent = fmt(this.value()); }
  }

  // 盤面を伏せた 3-2-1 カウントダウン。中断用の cancel 関数を返す
  function countdown(el, done) {
    el.classList.remove('hidden');
    let n = 3;
    el.textContent = n;
    const iv = setInterval(() => {
      n--;
      if (n > 0) el.textContent = n;
      else { clearInterval(iv); el.classList.add('hidden'); done(); }
    }, 700);
    return () => { clearInterval(iv); el.classList.add('hidden'); };
  }

  // ---------- ライフ（削除モード） ----------
  const Life = (() => {
    const MAX = 10, INTERVAL = 30 * 60 * 1000, KEY = 'sap_life';
    function load() {
      const now = Date.now();
      const s = store.get(KEY, null) || { life: MAX, t: now };
      if (s.life < MAX) {
        const n = Math.floor((now - s.t) / INTERVAL);
        if (n > 0) { s.life = Math.min(MAX, s.life + n); s.t += n * INTERVAL; }
      }
      if (s.life >= MAX) { s.life = MAX; s.t = now; }
      store.set(KEY, s);
      return s;
    }
    function get() {
      const s = load();
      return { life: s.life, max: MAX, nextMs: s.life < MAX ? s.t + INTERVAL - Date.now() : 0 };
    }
    function lose() {
      const s = load();
      if (s.life >= MAX) s.t = Date.now(); // 満タンから減った時点で回復タイマー開始
      s.life = Math.max(0, s.life - 1);
      store.set(KEY, s);
      return get();
    }
    // 保有ライフを10個のハートで表示（残り=赤、減った分=枠のみ）
    const HEART = '<svg viewBox="0 0 24 22" aria-hidden="true"><path d="M12 21s-8.5-5.3-10.6-10.3C-.3 6.4 2.6 1.5 7 1.5c2.2 0 3.9 1.2 5 2.9 1.1-1.7 2.8-2.9 5-2.9 4.4 0 7.3 4.9 5.6 9.2C20.5 15.7 12 21 12 21z"/></svg>';
    function html() {
      const g = get();
      const hearts = Array.from({ length: MAX }, (_, k) => `<i class="h${k < g.life ? ' on' : ''}">${HEART}</i>`).join('');
      return `<span class="hearts" role="img" aria-label="${I18N.t('lifeAria', g.life, MAX)}">${hearts}</span>` +
        `<small>${g.life < MAX ? I18N.t('lifeRecover', fmtClock(g.nextMs)) : 'MAX'}</small>`;
    }
    return { get, lose, html, MAX };
  })();

  // 挑戦開始前のライフ確認。0なら案内を出して false
  function lifeGate() {
    const g = Life.get();
    if (g.life > 0) return true;
    sheet(`<h3 class="ng serif">NO LIFE</h3>
      <div class="life-big">${Life.html()}</div>
      <p class="sub">${I18N.t('noLife', fmtClock(g.nextMs))}</p>
      <button class="btn" id="rClose">${I18N.t('close')}</button>`, { rClose: () => closeModal('resultModal') });
    return false;
  }
  setInterval(() => document.querySelectorAll('.life-view').forEach((e) => (e.innerHTML = Life.html())), 1000);
  const refreshLife = () => document.querySelectorAll('.life-view').forEach((e) => (e.innerHTML = Life.html()));

  // ---------- プレイヤー名 ----------
  let playerName = store.get('sap_name', '');
  let nameCb = null;
  const refreshName = () => ($('#nameLabel').textContent = playerName || I18N.t('notSet'));
  document.addEventListener('langchange', refreshName);
  function askName(cb) {
    nameCb = cb || null;
    $('#nameInput').value = playerName;
    openModal('nameModal');
    setTimeout(() => $('#nameInput').focus(), 50);
  }
  $('#btnName').addEventListener('click', () => askName());
  $('#nameSave').addEventListener('click', () => {
    const v = $('#nameInput').value.trim().slice(0, 12);
    if (!v) { toast(I18N.t('enterName')); return; }
    playerName = v;
    store.set('sap_name', v);
    refreshName();
    closeModal('nameModal');
    const cb = nameCb;
    nameCb = null;
    if (cb) cb();
  });
  $('#nameCancel').addEventListener('click', () => { closeModal('nameModal'); nameCb = null; });
  refreshName();

  // ---------- ランキング ----------
  /**
   * 記録を送信し、結果シート内の #rRank に順位を表示する
   * official=false は参考記録（公式なら何位相当かを表示）
   */
  async function submitScore(stageId, score, time, official, onSubmitted) {
    const el = () => document.getElementById('rRank');
    const run = async () => {
      try {
        await Ranking.submit(stageId, playerName, score, time, official);
        if (onSubmitted) onSubmitted();
        await showRank(stageId, score, time, official);
      } catch (e) {
        if (el()) el().textContent = e.message;
      }
    };
    if (playerName) return run();
    if (el()) el().innerHTML = `<button class="btn" id="rName">${I18N.t('joinRanking')}</button>`;
    document.getElementById('rName').onclick = () => askName(run);
  }

  // 送信済みの記録の順位だけを #rRank に表示（結果シートの再表示用）
  async function showRank(stageId, score, time, official) {
    const el = document.getElementById('rRank');
    try {
      const r = await Ranking.rankOf(stageId, score, time);
      const where = Ranking.online ? '' : I18N.t('localNote');
      if (el) el.innerHTML = I18N.t(official ? 'officialRank' : 'refRank', r) + where;
    } catch (e) {
      if (el) el.textContent = e.message;
    }
  }

  /**
   * ランキング表示
   * metric: 列見出し（本数／失敗／クリア） sortText: 並び順の説明 scoreText: 記録値の表示
   */
  async function openRanking({ stageId, title, scoreText, metric, sortText, star }) {
    const { t } = I18N;
    const sheet = $('#rankSheet');
    sheet.innerHTML = `<h3 class="serif" style="font-size:22px">${esc(title)}</h3><p class="sub">${sortText}<br>${t(Ranking.online ? 'scopeOnline' : 'scopeLocal')}</p><div id="rankBody"><p class="muted">${t('loading')}</p></div>`;
    openModal('rankModal');
    try {
      const rows = await Ranking.top(stageId, 20);
      const me = Ranking.playerId();
      let h = `<table class="rank-table"><tr><th>#</th><th>${t('colName')}</th><th>${metric}</th><th>${t('colTime')}</th></tr>`;
      rows.forEach((r, k) => {
        h += `<tr class="${r.player_id === me ? 'me' : ''}"><td class="r">${k + 1}</td><td class="n">${esc(r.player_name)}</td><td>${scoreText(r.score)}${star && star(r) ? ' ★' : ''}</td><td>${fmt(r.time_ms)}s</td></tr>`;
      });
      h += '</table>';
      if (!rows.length) h = `<p class="muted">${t('noRecords')}</p>`;
      const my = Ranking.mine(stageId);
      if (my.ref) h += `<p class="muted">${t('myRef', `${scoreText(my.ref.score)} / ${fmt(my.ref.time_ms)}s`)}</p>`;
      $('#rankBody').innerHTML = h;
    } catch (e) {
      $('#rankBody').innerHTML = `<p class="muted">${esc(e.message)}</p>`;
    }
    const close = document.createElement('button');
    close.className = 'btn';
    close.textContent = t('close');
    close.onclick = () => closeModal('rankModal');
    sheet.appendChild(close);
  }

  async function share(text) {
    const url = location.href.split('#')[0];
    if (navigator.share) {
      try { await navigator.share({ text: text + `\n#${CONFIG.HASHTAG}`, url }); } catch {}
    } else {
      window.open('https://x.com/intent/post?text=' + encodeURIComponent(text + `\n#${CONFIG.HASHTAG}`) + '&url=' + encodeURIComponent(url), '_blank', 'noopener');
    }
  }

  // [data-go] ボタンで画面遷移
  document.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => show(b.dataset.go)));

  return {
    $, store, fmt, fmtClock, esc, show, onShow, toast, openModal, closeModal, sheet,
    Timer, countdown, Life, refreshLife, lifeGate, askName, submitScore, showRank, openRanking, share,
    get playerName() { return playerName; },
  };
})();
