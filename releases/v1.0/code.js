// ─────────────────────────────────────────────
// Blog Prototype Figma Plugin
// Version : 1.0
// Released: 2026-03-25
// PC (1440px) + Mobile (375px)
// ─────────────────────────────────────────────
const PLUGIN_VERSION = "1.0";

const C = {
  bg:          { r: 0.976, g: 0.973, b: 0.961 },
  surface:     { r: 1,     g: 1,     b: 1     },
  border:      { r: 0.910, g: 0.902, b: 0.878 },
  text:        { r: 0.102, g: 0.102, b: 0.094 },
  muted:       { r: 0.478, g: 0.471, b: 0.439 },
  accent:      { r: 0.173, g: 0.373, b: 0.180 },
  accentLight: { r: 0.910, g: 0.941, b: 0.910 },
  white:       { r: 1,     g: 1,     b: 1     },
  t1: { r: 0.831, g: 0.910, b: 0.831 },
  t2: { r: 0.831, g: 0.875, b: 0.941 },
  t3: { r: 0.941, g: 0.910, b: 0.831 },
  t4: { r: 0.910, g: 0.831, b: 0.941 },
  t5: { r: 0.941, g: 0.831, b: 0.831 },
};

const POSTS = [
  { cat: "디자인", title: "여백이 말하는 것들 — 미니멀리즘의 역설",       excerpt: "덜어낼수록 더 많은 것이 보인다. 디자인에서 여백은 단순히 빈 공간이 아니라, 시선을 이끄는 능동적인 요소다.", date: "2026. 3. 20", rt: "5분",  tc: "t1", emoji: "◻" },
  { cat: "기술",   title: "CSS가 이렇게 재미있었나 — 2026년의 새로운 기능들", excerpt: "container queries, :has() 선택자, scroll-driven animations... CSS는 조용히, 그러나 빠르게 진화하고 있다.",     date: "2026. 3. 15", rt: "7분",  tc: "t2", emoji: "◈" },
  { cat: "에세이", title: "느리게 읽는다는 것의 의미",                       excerpt: "스크롤을 멈추고 한 단락을 두 번 읽었을 때, 비로소 글이 보이기 시작했다.",                                           date: "2026. 3. 10", rt: "4분",  tc: "t3", emoji: "◉" },
  { cat: "디자인", title: "타입페이스 하나가 브랜드를 바꾼다",               excerpt: "폰트는 단순한 글자 모양이 아니다. 브랜드의 성격, 가치, 그리고 감정을 전달하는 비언어적 커뮤니케이션이다.",             date: "2026. 3. 5",  rt: "6분",  tc: "t4", emoji: "◆" },
  { cat: "에세이", title: "완벽주의라는 이름의 미루기",                       excerpt: "완성하지 못한 채 머릿속에만 존재하는 '완벽한 것'보다, 세상에 나온 '충분히 좋은 것'이 훨씬 낫다.",                  date: "2026. 2. 28", rt: "3분",  tc: "t5", emoji: "◇" },
];

// ── Primitives ───────────────────────────────

function s(color) { return [{ type: "SOLID", color }]; }

function mkRect(parent, x, y, w, h, fill, opts = {}) {
  const r = figma.createRectangle();
  r.x = x; r.y = y;
  r.resize(Math.max(w, 1), Math.max(h, 1));
  r.fills = fill ? s(fill) : [];
  if (opts.radius) r.cornerRadius = opts.radius;
  if (opts.stroke) { r.strokes = s(opts.stroke); r.strokeWeight = opts.sw || 1; r.strokeAlign = "INSIDE"; }
  if (opts.name) r.name = opts.name;
  parent.appendChild(r);
  return r;
}

function mkText(parent, x, y, content, size, weight, color, opts = {}) {
  const t = figma.createText();
  t.fontName = {
    family: "Inter",
    style: weight >= 800 ? "Extra Bold" : weight >= 700 ? "Bold" : weight >= 600 ? "Semi Bold" : weight >= 500 ? "Medium" : "Regular"
  };
  t.fontSize = size;
  t.fills = s(color);
  if (opts.lineH) t.lineHeight = { value: opts.lineH, unit: "PIXELS" };
  if (opts.ls) t.letterSpacing = { value: opts.ls, unit: "PERCENT" };
  t.characters = content;
  if (opts.w) { t.textAutoResize = "HEIGHT"; t.resize(opts.w, 20); }
  else t.textAutoResize = "WIDTH_AND_HEIGHT";
  t.x = x; t.y = y;
  if (opts.name) t.name = opts.name;
  parent.appendChild(t);
  return t;
}

function mkFrame(parent, x, y, w, h, fill, opts = {}) {
  const f = figma.createFrame();
  f.x = x; f.y = y;
  f.resize(Math.max(w, 1), Math.max(h, 1));
  f.fills = fill ? s(fill) : [];
  f.clipsContent = opts.clip !== false;
  if (opts.radius) f.cornerRadius = opts.radius;
  if (opts.stroke) { f.strokes = s(opts.stroke); f.strokeWeight = opts.sw || 1; f.strokeAlign = "INSIDE"; }
  if (opts.name) f.name = opts.name;
  if (parent) parent.appendChild(f);
  return f;
}

// ── Load fonts ───────────────────────────────

async function loadFonts() {
  await Promise.all([
    figma.loadFontAsync({ family: "Inter", style: "Regular" }),
    figma.loadFontAsync({ family: "Inter", style: "Medium" }),
    figma.loadFontAsync({ family: "Inter", style: "Semi Bold" }),
    figma.loadFontAsync({ family: "Inter", style: "Bold" }),
    figma.loadFontAsync({ family: "Inter", style: "Extra Bold" }),
  ]);
}

// ─────────────────────────────────────────────
// PC — 1440px
// ─────────────────────────────────────────────

function buildPC() {
  const W = 1440;
  const PAD = 170; // horizontal margin
  const CW = W - PAD * 2; // 1100px content width
  const POSTS_W = 756;
  const SIDEBAR_W = CW - POSTS_W - 44; // ~300px
  const SB_X = PAD + POSTS_W + 44;

  const root = mkFrame(figma.currentPage, 0, 0, W, 100, C.bg, { name: "PC — 1440px", clip: false });

  let cy = 0;

  // ── Header (h:60) ────────────────────────────
  const header = mkFrame(root, 0, 0, W, 60, C.surface, { name: "Header" });
  mkRect(header, 0, 59, W, 1, C.border);
  mkText(header, PAD, 18, "antigravity", 18, 700, C.accent, { name: "Logo" });
  // Nav items
  const navLabels = ["홈", "카테고리", "소개"];
  let nx = W - PAD - 240;
  navLabels.forEach((label, i) => {
    const nw = 72;
    if (i === 0) {
      mkRect(header, nx, 14, nw, 32, C.accent, { radius: 20 });
      mkText(header, nx + (nw - label.length * 9) / 2, 21, label, 14, 600, C.white);
    } else {
      mkText(header, nx + (nw - label.length * 9) / 2, 21, label, 14, 400, C.muted);
    }
    nx += nw + 6;
  });
  cy = 60;

  // ── Hero (h:200) ─────────────────────────────
  const hero = mkFrame(root, 0, cy, W, 200, C.bg, { name: "Hero" });
  mkRect(hero, 0, 199, W, 1, C.border);
  mkText(hero, PAD, 36, "Featured", 12, 700, C.accent, { ls: 8 });
  mkText(hero, PAD, 60, "중력을 거스르는 생각들을 기록합니다", 48, 800, C.text, { lineH: 58 });
  mkText(hero, PAD, 128, "디자인, 기술, 그리고 그 사이 어딘가", 17, 400, C.muted);
  cy += 200;

  // ── Section header ────────────────────────────
  cy += 48;
  mkText(root, PAD, cy, "최근 글", 20, 700, C.text);

  // Filter tabs
  const filterLabels = ["전체", "디자인", "기술", "에세이"];
  let ftx = PAD + POSTS_W - filterLabels.length * 74;
  filterLabels.forEach((label, i) => {
    const fw = 68;
    if (i === 0) {
      mkRect(root, ftx, cy - 2, fw, 30, C.accent, { radius: 20 });
      mkText(root, ftx + (fw - label.length * 8) / 2, cy + 6, label, 13, 600, C.white);
    } else {
      mkRect(root, ftx, cy - 2, fw, 30, C.surface, { radius: 20, stroke: C.border });
      mkText(root, ftx + (fw - label.length * 8) / 2, cy + 6, label, 13, 400, C.muted);
    }
    ftx += 74;
  });
  cy += 44;

  // ── Featured card (full-width, h:280) ─────────
  {
    const CARD_H = 280;
    const card = mkFrame(root, PAD, cy, POSTS_W, CARD_H, C.surface, { radius: 12, stroke: C.border, name: "Post — Featured" });
    const half = POSTS_W / 2;
    // Thumbnail
    mkRect(card, 0, 0, half, CARD_H, C[POSTS[0].tc]);
    mkText(card, half / 2 - 24, 100, POSTS[0].emoji, 56, 400, C.text).opacity = 0.2;
    // Body
    mkText(card, half + 24, 32, POSTS[0].cat.toUpperCase(), 11, 700, C.accent, { ls: 6 });
    mkText(card, half + 24, 56, POSTS[0].title, 20, 800, C.text, { w: half - 48, lineH: 28 });
    mkText(card, half + 24, 116, POSTS[0].excerpt, 13, 400, C.muted, { w: half - 48, lineH: 20 });
    mkText(card, half + 24, CARD_H - 36, `${POSTS[0].date}  ·  ${POSTS[0].rt} 읽기`, 12, 400, C.muted);
    cy += CARD_H + 20;
  }

  // ── 2-column cards ─────────────────────────────
  const COL_W = (POSTS_W - 20) / 2;
  const COL_THUMB = 160;
  const COL_H = 290;

  for (let i = 1; i < POSTS.length; i += 2) {
    [0, 1].forEach(col => {
      const p = POSTS[i + col];
      if (!p) return;
      const cx2 = PAD + col * (COL_W + 20);
      const card = mkFrame(root, cx2, cy, COL_W, COL_H, C.surface, { radius: 12, stroke: C.border, name: `Post — ${p.title.slice(0, 20)}` });
      mkRect(card, 0, 0, COL_W, COL_THUMB, C[p.tc]);
      mkText(card, COL_W / 2 - 20, COL_THUMB / 2 - 20, p.emoji, 44, 400, C.text).opacity = 0.2;
      mkText(card, 20, COL_THUMB + 18, p.cat.toUpperCase(), 11, 700, C.accent, { ls: 6 });
      mkText(card, 20, COL_THUMB + 36, p.title, 15, 700, C.text, { w: COL_W - 40, lineH: 22 });
      mkText(card, 20, COL_THUMB + 80, p.excerpt, 12, 400, C.muted, { w: COL_W - 40, lineH: 18 });
      mkText(card, 20, COL_H - 28, `${p.date}  ·  ${p.rt} 읽기`, 11, 400, C.muted);
    });
    cy += COL_H + 20;
  }

  // ── Sidebar ────────────────────────────────────
  let scy = 60 + 200 + 48 + 44; // align with section title

  // Category widget
  {
    const wh = 214;
    const sw = mkFrame(root, SB_X, scy, SIDEBAR_W, wh, C.surface, { radius: 12, stroke: C.border, name: "Categories" });
    mkText(sw, 20, 20, "카테고리", 14, 700, C.text);
    const cats = [["디자인", "12"], ["기술", "8"], ["에세이", "15"], ["인터뷰", "4"]];
    cats.forEach(([name, cnt], i) => {
      const rowY = 52 + i * 38;
      if (i === 0) mkRect(sw, 8, rowY, SIDEBAR_W - 16, 32, C.accentLight, { radius: 8 });
      mkText(sw, 20, rowY + 8, name, 14, 400, i === 0 ? C.accent : C.muted);
      mkRect(sw, SIDEBAR_W - 42, rowY + 7, 28, 18, C.bg, { radius: 9 });
      mkText(sw, SIDEBAR_W - 35, rowY + 9, cnt, 11, 400, C.muted);
    });
    scy += wh + 24;
  }

  // Tags widget
  {
    const tags = ["UI/UX", "JavaScript", "CSS", "타이포그래피", "철학", "생산성", "독서"];
    const tw = mkFrame(root, SB_X, scy, SIDEBAR_W, 20, C.surface, { radius: 12, stroke: C.border, name: "Tags" });
    mkText(tw, 20, 20, "태그", 14, 700, C.text);
    let tx = 12, tgy = 52;
    tags.forEach(tag => {
      const tagPx = tag.length <= 3 ? tag.length * 12 + 24
                  : tag.length <= 6 ? tag.length * 11 + 24
                  : tag.length * 10 + 24;
      if (tx + tagPx > SIDEBAR_W - 12) { tx = 12; tgy += 32; }
      mkRect(tw, tx, tgy, tagPx, 26, C.bg, { radius: 20, stroke: C.border });
      mkText(tw, tx + 12, tgy + 6, tag, 12, 400, C.muted);
      tx += tagPx + 8;
    });
    tw.resize(SIDEBAR_W, tgy + 44);
    scy += tw.height + 24;
  }

  // Newsletter widget
  {
    const nw = mkFrame(root, SB_X, scy, SIDEBAR_W, 176, C.surface, { radius: 12, stroke: C.border, name: "Newsletter" });
    mkText(nw, 20, 20, "뉴스레터", 14, 700, C.text);
    mkText(nw, 20, 50, "새 글이 올라오면 이메일로 알려드려요.", 13, 400, C.muted, { w: SIDEBAR_W - 40, lineH: 20 });
    mkRect(nw, 12, 88, SIDEBAR_W - 24, 38, C.bg, { radius: 8, stroke: C.border });
    mkText(nw, 24, 98, "이메일 주소", 13, 400, C.border);
    mkRect(nw, 12, 134, SIDEBAR_W - 24, 34, C.accent, { radius: 8 });
    mkText(nw, SIDEBAR_W / 2 - 12, 143, "구독", 13, 600, C.white);
    scy += 176 + 24;
  }

  // ── Footer ─────────────────────────────────────
  const footerY = Math.max(cy + 48, scy + 8);
  const footer = mkFrame(root, 0, footerY, W, 68, C.bg, { name: "Footer" });
  mkRect(footer, 0, 0, W, 1, C.border);
  mkText(footer, PAD, 22, "antigravity", 16, 700, C.accent);
  mkText(footer, W - PAD - 200, 26, "2026 © All rights reserved.", 13, 400, C.muted);

  root.resize(W, footerY + 68);
  return root;
}

// ─────────────────────────────────────────────
// Mobile — 375px
// ─────────────────────────────────────────────

function buildMobile() {
  const W = 375;
  const PAD = 20;

  const root = mkFrame(figma.currentPage, 1480, 0, W, 100, C.bg, { name: "Mobile — 375px", clip: false });

  let cy = 0;

  // ── Header (h:56) ─────────────────────────────
  const header = mkFrame(root, 0, 0, W, 56, C.surface, { name: "Header" });
  mkRect(header, 0, 55, W, 1, C.border);
  mkText(header, PAD, 17, "antigravity", 17, 700, C.accent);
  // Hamburger
  [18, 26, 34].forEach(hy => mkRect(header, W - 44, hy, 22, 2, C.text, { radius: 1 }));
  cy = 56;

  // ── Hero (h:168) ──────────────────────────────
  const hero = mkFrame(root, 0, cy, W, 168, C.bg, { name: "Hero" });
  mkRect(hero, 0, 167, W, 1, C.border);
  mkText(hero, PAD, 28, "Featured", 11, 700, C.accent, { ls: 8 });
  mkText(hero, PAD, 48, "중력을 거스르는\n생각들을 기록합니다", 28, 800, C.text, { lineH: 36, w: W - PAD * 2 });
  mkText(hero, PAD, 130, "디자인, 기술, 그리고 그 사이 어딘가", 13, 400, C.muted);
  cy += 168;

  // ── Filter tabs ───────────────────────────────
  cy += 20;
  const filterLabels = ["전체", "디자인", "기술", "에세이"];
  let ftx = PAD;
  filterLabels.forEach((label, i) => {
    const fw = label.length <= 2 ? 52 : label.length <= 3 ? 62 : 68;
    if (i === 0) {
      mkRect(root, ftx, cy, fw, 30, C.accent, { radius: 20 });
      mkText(root, ftx + (fw - label.length * 8) / 2, cy + 8, label, 13, 600, C.white);
    } else {
      mkRect(root, ftx, cy, fw, 30, C.surface, { radius: 20, stroke: C.border });
      mkText(root, ftx + (fw - label.length * 8) / 2, cy + 8, label, 13, 400, C.muted);
    }
    ftx += fw + 8;
  });
  cy += 48;

  // ── Section title ─────────────────────────────
  mkText(root, PAD, cy, "최근 글", 18, 700, C.text);
  cy += 36;

  // ── Post cards (1-column) ─────────────────────
  const CARD_W = W - PAD * 2;
  const THUMB_H = 160;
  // Fixed layout heights to avoid dynamic measurement issues
  const BODY_Y = THUMB_H + 16;
  const TITLE_Y = BODY_Y + 18;
  const EXCERPT_Y = TITLE_Y + 44; // fixed gap: title ~2 lines = 44px
  const META_Y = EXCERPT_Y + 54; // fixed gap: excerpt ~3 lines = 54px
  const CARD_H = META_Y + 28;

  POSTS.forEach((p) => {
    const card = mkFrame(root, PAD, cy, CARD_W, CARD_H, C.surface, { radius: 12, stroke: C.border, name: `Post — ${p.title.slice(0, 20)}` });
    // Thumbnail
    mkRect(card, 0, 0, CARD_W, THUMB_H, C[p.tc]);
    mkText(card, CARD_W / 2 - 20, THUMB_H / 2 - 22, p.emoji, 44, 400, C.text).opacity = 0.2;
    // Category
    mkText(card, PAD, BODY_Y, p.cat.toUpperCase(), 11, 700, C.accent, { ls: 6 });
    // Title
    mkText(card, PAD, TITLE_Y, p.title, 15, 700, C.text, { w: CARD_W - PAD * 2, lineH: 22 });
    // Excerpt
    mkText(card, PAD, EXCERPT_Y, p.excerpt, 12, 400, C.muted, { w: CARD_W - PAD * 2, lineH: 18 });
    // Meta
    mkText(card, PAD, META_Y, `${p.date}  ·  ${p.rt} 읽기`, 11, 400, C.muted);
    cy += CARD_H + 16;
  });

  // ── Footer ─────────────────────────────────────
  cy += 16;
  const footer = mkFrame(root, 0, cy, W, 64, C.bg, { name: "Footer" });
  mkRect(footer, 0, 0, W, 1, C.border);
  mkText(footer, PAD, 18, "antigravity", 15, 700, C.accent);
  mkText(footer, PAD, 40, "2026 © All rights reserved.", 11, 400, C.muted);
  cy += 64;

  root.resize(W, cy);
  return root;
}

// ── Main ─────────────────────────────────────

(async () => {
  try {
    await loadFonts();

    // 현재 버전 이름으로 Figma 페이지를 찾거나 새로 생성
    const pageName = `V${PLUGIN_VERSION}`;
    let page = figma.root.children.find(p => p.name === pageName);
    if (!page) {
      page = figma.createPage();
      page.name = pageName;
    }
    figma.currentPage = page;

    // 이미 같은 버전 프레임이 있으면 삭제 후 재생성
    page.children
      .filter(n => n.name === "PC — 1440px" || n.name === "Mobile — 375px")
      .forEach(n => n.remove());

    const pc = buildPC();
    const mobile = buildMobile();

    figma.viewport.scrollAndZoomIntoView([pc, mobile]);
    figma.closePlugin(`V${PLUGIN_VERSION} — PC + Mobile 생성 완료!`);
  } catch (e) {
    figma.closePlugin("오류 발생: " + e.message);
  }
})();
