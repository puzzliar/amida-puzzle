/* 盤面の描画とタップ判定（両モード・チュートリアル共通） */
const Board = (() => {
  'use strict';
  const { LABELS } = AmidaCore;
  const R_IN = 34;      // 最内周の横線より内側
  const R_OUT = 176;    // 最外周の横線より外側
  const R_SPOKE = 188;  // 放射線の外端（スタート地点）
  const R_LABEL = 202;

  const ang = (s, N) => ((s * 360) / N - 90) * Math.PI / 180;
  const radiusOf = (level, R) => R_IN + (R_OUT - R_IN) * (level / (R + 1));
  const pt = (r, a) => [r * Math.cos(a), r * Math.sin(a)];
  const f1 = (n) => n.toFixed(1);
  const spacing = (R) => (R_OUT - R_IN) / (R + 1);

  function barGeom(stage) {
    return AmidaCore.makeBars(stage.N, stage.R).map((b) => {
      const r = radiusOf(b.level, stage.R);
      const [x1, y1] = pt(r, ang(b.sector, stage.N));
      const [x2, y2] = pt(r, ang((b.sector + 1) % stage.N, stage.N));
      return Object.assign(b, { x1, y1, x2, y2 });
    });
  }

  // start から中央までの経路（SVG path）
  function routePath(stage, start, tr) {
    const { N, R } = stage;
    let s = start;
    const pts = [pt(R_SPOKE, ang(s, N))];
    for (const st of tr.steps) {
      const r = radiusOf(st.level, R);
      pts.push(pt(r, ang(st.from, N)));
      pts.push(pt(r, ang(st.to, N)));
      s = st.to;
    }
    pts.push(pt(R_IN * 0.55, ang(s, N)));
    pts.push([0, 0]);
    return 'M' + pts.map((p) => f1(p[0]) + ' ' + f1(p[1])).join(' L');
  }

  /**
   * opt:
   *   start    スタート地点（金色で表示）。null なら表示しない
   *   labels   'start'（既定）| 'pick'（全地点をタップ可能な丸で表示）| 'none'
   *   cut      Set<idx> 消した横線 / hint Set<idx> 緑で強調 / pulse idx 点滅させる横線
   *   route    {start, trace, cls} 経路アニメーション
   *   wrong    Set<spoke> 不正解として薄く表示する地点 / right spoke 正解表示
   */
  function draw(svg, stage, opt = {}) {
    const { N, R } = stage;
    const removed = new Set(stage.removed);
    const cut = opt.cut || new Set();
    const labels = opt.labels || 'start';
    const start = opt.start == null ? null : opt.start;
    let h = '<defs><filter id="glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>';
    h += `<circle r="${R_OUT + 4}" fill="none" stroke="#1e1e1c" stroke-width="1"/>`;
    for (let s = 0; s < N; s++) {
      const [x, y] = pt(R_SPOKE, ang(s, N));
      h += `<line class="spoke${s === start ? ' start' : ''}" x1="0" y1="0" x2="${f1(x)}" y2="${f1(y)}"/>`;
    }
    const bars = barGeom(stage);
    for (const b of bars) {
      let cls = 'bar';
      if (removed.has(b.idx)) cls += ' gone';
      else if (cut.has(b.idx)) cls += ' cut';
      if (opt.hint && opt.hint.has(b.idx)) cls += ' hint';
      if (opt.pulse === b.idx) cls += ' pulse';
      h += `<line class="${cls}" data-i="${b.idx}" x1="${f1(b.x1)}" y1="${f1(b.y1)}" x2="${f1(b.x2)}" y2="${f1(b.y2)}"/>`;
    }
    for (const b of bars) if (cut.has(b.idx)) h += `<text class="cutmark" x="${f1((b.x1 + b.x2) / 2)}" y="${f1((b.y1 + b.y2) / 2)}">✕</text>`;
    h += `<circle r="${R_IN * 0.55}" fill="#141412" stroke="#4a4a46" stroke-width="1.5"/><circle r="4" fill="${labels === 'none' ? '#4a4a46' : '#ef9f27'}"/>`;
    if (opt.route) h += `<path id="routePath" class="route ${opt.route.cls || ''}" d="${routePath(stage, opt.route.start, opt.route.trace)}"/>`;
    if (labels !== 'none') {
      for (let s = 0; s < N; s++) {
        const [x, y] = pt(R_LABEL, ang(s, N));
        if (labels === 'pick') {
          const st = opt.right === s ? ' right' : opt.wrong && opt.wrong.has(s) ? ' wrong' : opt.chosen === s ? ' chosen' : '';
          h += `<g class="pick${st}"><circle cx="${f1(x)}" cy="${f1(y)}" r="12"/><text class="label" x="${f1(x)}" y="${f1(y)}">${LABELS[s]}</text></g>`;
        } else {
          if (s === start) h += `<circle cx="${f1(x)}" cy="${f1(y)}" r="11" fill="#ef9f27"/>`;
          h += `<text class="label${s === start ? ' start' : ''}" x="${f1(x)}" y="${f1(y)}">${LABELS[s]}</text>`;
        }
      }
    }
    svg.innerHTML = h;
    // 段数が多いほど横線を細く（隣セクターとの段差 = 段間隔の半分）
    svg.style.setProperty('--bw', Math.min(4, spacing(R) * 0.3).toFixed(2));
    if (opt.route) {
      const p = svg.querySelector('#routePath');
      const len = p.getTotalLength();
      p.style.strokeDasharray = len;
      p.style.strokeDashoffset = len;
      p.getBoundingClientRect();
      p.style.transition = `stroke-dashoffset ${Math.min(2.2, 0.5 + len / 900)}s ease-in-out`;
      p.style.strokeDashoffset = 0;
    }
  }

  function svgPoint(svg, e) {
    const p = svg.createSVGPoint();
    p.x = e.clientX; p.y = e.clientY;
    return p.matrixTransform(svg.getScreenCTM().inverse());
  }
  function distSeg(px, py, b) {
    const dx = b.x2 - b.x1, dy = b.y2 - b.y1;
    const t = Math.max(0, Math.min(1, ((px - b.x1) * dx + (py - b.y1) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(px - (b.x1 + t * dx), py - (b.y1 + t * dy));
  }

  // タップ位置に最も近い生存横線の idx（遠すぎれば null）
  function nearestBar(svg, stage, e) {
    const removed = new Set(stage.removed);
    const p = svgPoint(svg, e);
    let best = null, bd = Infinity;
    for (const b of barGeom(stage)) {
      if (removed.has(b.idx)) continue;
      const d = distSeg(p.x, p.y, b);
      if (d < bd) { bd = d; best = b; }
    }
    return best && bd <= Math.max(10, spacing(stage.R)) ? best.idx : null;
  }

  // 外周（スタート地点付近）のタップから放射線番号を返す
  function nearestSpoke(svg, stage, e) {
    const p = svgPoint(svg, e);
    if (Math.hypot(p.x, p.y) < R_OUT - 20) return null;
    const a = (Math.atan2(p.y, p.x) * 180) / Math.PI + 90;
    return ((Math.round((a * stage.N) / 360) % stage.N) + stage.N) % stage.N;
  }

  // 拡大表示時に地点付近へスクロール
  function scrollToSpoke(wrap, svg, stage, s) {
    const [x, y] = pt(R_OUT * 0.75, ang(s, stage.N));
    requestAnimationFrame(() => {
      const bw = svg.clientWidth;
      wrap.scrollLeft = ((x + 215) / 430) * bw - wrap.clientWidth / 2;
      wrap.scrollTop = ((y + 215) / 430) * bw - wrap.clientHeight / 2;
    });
  }

  return { draw, nearestBar, nearestSpoke, scrollToSpoke, LABELS };
})();
