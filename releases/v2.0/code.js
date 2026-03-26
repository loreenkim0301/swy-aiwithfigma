// ─────────────────────────────────────────────
// Blog Prototype Figma Plugin
// Version : 2.0
//
// Mode A (선택 없음)  : 스타일 등록 → 새 프레임 생성
// Mode B (프레임 선택): 스타일 등록 → 선택 노드에 스타일 연결
// ─────────────────────────────────────────────
const PLUGIN_VERSION = "2.0";

// ── Design Tokens ────────────────────────────

const COLOR_TOKENS = [
  { name: "Background/Primary",  r: 0.976, g: 0.973, b: 0.961 },
  { name: "Background/Surface",  r: 1,     g: 1,     b: 1     },
  { name: "Border/Default",      r: 0.910, g: 0.902, b: 0.878 },
  { name: "Text/Primary",        r: 0.102, g: 0.102, b: 0.094 },
  { name: "Text/Muted",          r: 0.478, g: 0.471, b: 0.439 },
  { name: "Accent/Primary",      r: 0.173, g: 0.373, b: 0.180 },
  { name: "Accent/Light",        r: 0.910, g: 0.941, b: 0.910 },
  { name: "Accent/White",        r: 1,     g: 1,     b: 1     },
  { name: "Thumbnail/Green",     r: 0.831, g: 0.910, b: 0.831 },
  { name: "Thumbnail/Blue",      r: 0.831, g: 0.875, b: 0.941 },
  { name: "Thumbnail/Yellow",    r: 0.941, g: 0.910, b: 0.831 },
  { name: "Thumbnail/Purple",    r: 0.910, g: 0.831, b: 0.941 },
  { name: "Thumbnail/Red",       r: 0.941, g: 0.831, b: 0.831 },
];

const TEXT_TOKENS = [
  { name: "Display/Hero-PC",      family: "Inter", style: "Extra Bold", size: 48, lineH: 58, ls: -1.5 },
  { name: "Display/Hero-Mobile",  family: "Inter", style: "Extra Bold", size: 28, lineH: 36, ls: -0.5 },
  { name: "Heading/Section",      family: "Inter", style: "Bold",       size: 20, lineH: 28, ls: 0   },
  { name: "Heading/Card-Large",   family: "Inter", style: "Extra Bold", size: 20, lineH: 28, ls: -0.5 },
  { name: "Heading/Card",         family: "Inter", style: "Bold",       size: 15, lineH: 22, ls: 0   },
  { name: "Heading/Widget",       family: "Inter", style: "Bold",       size: 14, lineH: 20, ls: 0   },
  { name: "Heading/Logo",         family: "Inter", style: "Bold",       size: 18, lineH: 24, ls: -0.5 },
  { name: "Body/Regular",         family: "Inter", style: "Regular",    size: 15, lineH: 24, ls: 0   },
  { name: "Body/Small",           family: "Inter", style: "Regular",    size: 13, lineH: 20, ls: 0   },
  { name: "Body/XSmall",          family: "Inter", style: "Regular",    size: 12, lineH: 18, ls: 0   },
  { name: "Label/Category",       family: "Inter", style: "Bold",       size: 11, lineH: 14, ls: 6   },
  { name: "Label/Meta",           family: "Inter", style: "Regular",    size: 11, lineH: 16, ls: 0   },
  { name: "Label/Nav-Active",     family: "Inter", style: "Semi Bold",  size: 14, lineH: 20, ls: 0   },
  { name: "Label/Nav",            family: "Inter", style: "Regular",    size: 14, lineH: 20, ls: 0   },
  { name: "Label/Filter-Active",  family: "Inter", style: "Semi Bold",  size: 13, lineH: 18, ls: 0   },
  { name: "Label/Filter",         family: "Inter", style: "Regular",    size: 13, lineH: 18, ls: 0   },
  { name: "Label/Button",         family: "Inter", style: "Semi Bold",  size: 13, lineH: 18, ls: 0   },
  { name: "Label/Tag",            family: "Inter", style: "Regular",    size: 12, lineH: 16, ls: 0   },
];

const EFFECT_TOKENS = [
  {
    name: "Shadow/Card-Hover",
    effects: [{ type: "DROP_SHADOW", color: { r: 0, g: 0, b: 0, a: 0.08 }, offset: { x: 0, y: 12 }, radius: 32, spread: 0, visible: true, blendMode: "NORMAL" }],
  },
  {
    name: "Shadow/Card-Default",
    effects: [{ type: "DROP_SHADOW", color: { r: 0, g: 0, b: 0, a: 0.04 }, offset: { x: 0, y: 2  }, radius: 8,  spread: 0, visible: true, blendMode: "NORMAL" }],
  },
];

const GRID_TOKENS = [
  { name: "Grid/PC-1440",    grids: [{ pattern: "COLUMNS", alignment: "STRETCH", gutterSize: 20, count: 12, offset: 170, sectionSize: 0 }] },
  { name: "Grid/Mobile-375", grids: [{ pattern: "COLUMNS", alignment: "STRETCH", gutterSize: 16, count: 4,  offset: 20,  sectionSize: 0 }] },
];

// ── Style Registry ───────────────────────────

const STYLE_MAP = {}; // styleName → { id, token }

async function registerAllStyles() {
  // Fonts
  const fonts = [...new Set(TEXT_TOKENS.map(t => JSON.stringify({ family: t.family, style: t.style })))];
  await Promise.all(fonts.map(f => figma.loadFontAsync(JSON.parse(f))));

  // Rule: if style already exists → use its ID only (never modify existing styles)
  //        if style is new → create and set properties
  const existingColors = figma.getLocalPaintStyles();
  for (const token of COLOR_TOKENS) {
    const found = existingColors.find(s => s.name === token.name);
    if (found) { STYLE_MAP[token.name] = { id: found.id, token }; continue; }
    const style = figma.createPaintStyle();
    style.name   = token.name;
    style.paints = [{ type: "SOLID", color: { r: token.r, g: token.g, b: token.b } }];
    STYLE_MAP[token.name] = { id: style.id, token };
  }

  const existingTexts = figma.getLocalTextStyles();
  for (const token of TEXT_TOKENS) {
    const found = existingTexts.find(s => s.name === token.name);
    if (found) { STYLE_MAP[token.name] = { id: found.id, token }; continue; }
    const style = figma.createTextStyle();
    style.name          = token.name;
    style.fontName      = { family: token.family, style: token.style };
    style.fontSize      = token.size;
    style.lineHeight    = { value: token.lineH,   unit: "PIXELS"  };
    style.letterSpacing = { value: token.ls || 0, unit: "PERCENT" };
    STYLE_MAP[token.name] = { id: style.id, token };
  }

  const existingEffects = figma.getLocalEffectStyles();
  for (const token of EFFECT_TOKENS) {
    const found = existingEffects.find(s => s.name === token.name);
    if (found) { STYLE_MAP[token.name] = { id: found.id, token }; continue; }
    const style = figma.createEffectStyle();
    style.name    = token.name;
    style.effects = JSON.parse(JSON.stringify(token.effects));
    STYLE_MAP[token.name] = { id: style.id, token };
  }

  const existingGrids = figma.getLocalGridStyles();
  for (const token of GRID_TOKENS) {
    const found = existingGrids.find(s => s.name === token.name);
    if (found) { STYLE_MAP[token.name] = { id: found.id, token }; continue; }
    const style = figma.createGridStyle();
    style.name  = token.name;
    style.grids = JSON.parse(JSON.stringify(token.grids));
    STYLE_MAP[token.name] = { id: style.id, token };
  }
}

// ── Helpers ──────────────────────────────────

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
  { cat: "디자인", title: "여백이 말하는 것들 — 미니멀리즘의 역설",        excerpt: "덜어낼수록 더 많은 것이 보인다. 디자인에서 여백은 단순히 빈 공간이 아니라, 시선을 이끄는 능동적인 요소다.", date: "2026. 3. 20", rt: "5분",  tc: "t1", emoji: "◻" },
  { cat: "기술",   title: "CSS가 이렇게 재미있었나 — 2026년의 새로운 기능들", excerpt: "container queries, :has() 선택자, scroll-driven animations... CSS는 조용히, 그러나 빠르게 진화하고 있다.",    date: "2026. 3. 15", rt: "7분",  tc: "t2", emoji: "◈" },
  { cat: "에세이", title: "느리게 읽는다는 것의 의미",                        excerpt: "스크롤을 멈추고 한 단락을 두 번 읽었을 때, 비로소 글이 보이기 시작했다.",                                          date: "2026. 3. 10", rt: "4분",  tc: "t3", emoji: "◉" },
  { cat: "디자인", title: "타입페이스 하나가 브랜드를 바꾼다",                excerpt: "폰트는 단순한 글자 모양이 아니다. 브랜드의 성격, 가치, 그리고 감정을 전달하는 비언어적 커뮤니케이션이다.",            date: "2026. 3. 5",  rt: "6분",  tc: "t4", emoji: "◆" },
  { cat: "에세이", title: "완벽주의라는 이름의 미루기",                        excerpt: "완성하지 못한 채 머릿속에만 존재하는 '완벽한 것'보다, 세상에 나온 '충분히 좋은 것'이 훨씬 낫다.",                 date: "2026. 2. 28", rt: "3분",  tc: "t5", emoji: "◇" },
];

function solidFill(color) {
  return [{ type: "SOLID", color }];
}

function applyFillStyle(node, styleName, fallbackColor) {
  const entry = STYLE_MAP[styleName];
  if (entry) node.fillStyleId = entry.id;
  else if (fallbackColor) node.fills = solidFill(fallbackColor);
}

function applyTextStyle(node, styleName) {
  const entry = STYLE_MAP[styleName];
  if (entry) node.textStyleId = entry.id;
}

function mkRect(parent, x, y, w, h, colorKey, opts = {}) {
  const r = figma.createRectangle();
  r.x = x; r.y = y;
  r.resize(Math.max(w, 1), Math.max(h, 1));
  const directColor = C[colorKey];
  if (opts.fillStyle) applyFillStyle(r, opts.fillStyle, directColor);
  else r.fills = directColor ? solidFill(directColor) : [];
  if (opts.radius) r.cornerRadius = opts.radius;
  if (opts.stroke) { r.strokes = solidFill(C[opts.stroke] || C.border); r.strokeWeight = opts.sw || 1; r.strokeAlign = "INSIDE"; }
  parent.appendChild(r);
  return r;
}

function mkText(parent, x, y, content, colorKey, opts = {}) {
  const t = figma.createText();
  const token = opts.textStyle && STYLE_MAP[opts.textStyle] ? STYLE_MAP[opts.textStyle].token : null;
  t.fontName = token
    ? { family: token.family, style: token.style }
    : { family: "Inter", style: opts.weight >= 800 ? "Extra Bold" : opts.weight >= 700 ? "Bold" : opts.weight >= 600 ? "Semi Bold" : "Regular" };
  t.fontSize = token ? token.size : (opts.size || 14);
  if (token && token.lineH) t.lineHeight = { value: token.lineH, unit: "PIXELS" };
  else if (opts.lineH)      t.lineHeight = { value: opts.lineH,  unit: "PIXELS" };
  if (token && token.ls)    t.letterSpacing = { value: token.ls, unit: "PERCENT" };
  else if (opts.ls)         t.letterSpacing = { value: opts.ls,  unit: "PERCENT" };
  t.characters = content;
  if (opts.w) { t.textAutoResize = "HEIGHT"; t.resize(opts.w, 20); }
  else t.textAutoResize = "WIDTH_AND_HEIGHT";
  t.x = x; t.y = y;
  if (opts.textStyle) applyTextStyle(t, opts.textStyle);
  if (opts.fillStyle) applyFillStyle(t, opts.fillStyle);
  else t.fills = solidFill(C[colorKey] || colorKey);
  parent.appendChild(t);
  return t;
}

function mkFrame(parent, x, y, w, h, colorKey, opts = {}) {
  const f = figma.createFrame();
  f.x = x; f.y = y;
  f.resize(Math.max(w, 1), Math.max(h, 1));
  f.clipsContent = opts.clip !== false;
  if (opts.fillStyle) applyFillStyle(f, opts.fillStyle);
  else if (colorKey) f.fills = solidFill(C[colorKey] || colorKey);
  else f.fills = [];
  if (opts.radius) f.cornerRadius = opts.radius;
  if (opts.stroke) { f.strokes = solidFill(C[opts.stroke] || opts.stroke); f.strokeWeight = opts.sw || 1; f.strokeAlign = "INSIDE"; }
  if (opts.name) f.name = opts.name;
  if (parent) parent.appendChild(f);
  return f;
}

function mkPillButton(parent, x, y, label, fillColorKey, textColorKey, opts = {}) {
  const btn = figma.createFrame();
  btn.name = label;
  btn.x = x; btn.y = y;
  btn.layoutMode = "HORIZONTAL";
  btn.primaryAxisSizingMode = opts.fixedW ? "FIXED" : "AUTO";
  btn.counterAxisSizingMode = "AUTO";
  btn.primaryAxisAlignItems = "CENTER";
  btn.counterAxisAlignItems = "CENTER";
  btn.paddingLeft = btn.paddingRight = (opts.px !== undefined) ? opts.px : 14;
  btn.paddingTop = btn.paddingBottom = (opts.py !== undefined) ? opts.py : 6;
  btn.cornerRadius = (opts.radius !== undefined) ? opts.radius : 20;
  if (opts.fixedW) btn.resize(opts.fixedW, 36);
  if (opts.fillStyle) applyFillStyle(btn, opts.fillStyle, C[fillColorKey]);
  else if (fillColorKey) btn.fills = solidFill(C[fillColorKey]);
  else btn.fills = [];
  if (opts.stroke) {
    btn.strokes = solidFill(C[opts.stroke] || C.border);
    btn.strokeWeight = 1;
    btn.strokeAlign = "INSIDE";
  }
  const t = figma.createText();
  const token = opts.textStyle && STYLE_MAP[opts.textStyle] ? STYLE_MAP[opts.textStyle].token : null;
  t.fontName = token
    ? { family: token.family, style: token.style }
    : { family: "Inter", style: "Regular" };
  t.fontSize = token ? token.size : (opts.size || 13);
  if (token && token.lineH) t.lineHeight = { value: token.lineH, unit: "PIXELS" };
  if (token && token.ls)    t.letterSpacing = { value: token.ls, unit: "PERCENT" };
  t.characters = label;
  t.textAutoResize = "WIDTH_AND_HEIGHT";
  if (opts.textStyle) applyTextStyle(t, opts.textStyle);
  if (opts.textFillStyle) applyFillStyle(t, opts.textFillStyle, C[textColorKey]);
  else t.fills = solidFill(C[textColorKey] || C.text);
  btn.appendChild(t);
  parent.appendChild(btn);
  return btn;
}

function getOrMakePage(name) {
  let page = figma.root.children.find(p => p.name === name);
  if (!page) { page = figma.createPage(); page.name = name; }
  figma.currentPage = page;
  [...figma.currentPage.children].forEach(n => n.remove());
  return page;
}

// ─────────────────────────────────────────────
// MODE A — Create new frames
// ─────────────────────────────────────────────

function buildPC() {
  const W = 1440, PAD = 170;
  const POSTS_W = 756, SB_W = 300, SB_X = PAD + POSTS_W + 44;

  const root = mkFrame(figma.currentPage, 0, 0, W, 100, "bg",
    { name: "PC — 1440px", clip: false, fillStyle: "Background/Primary" });

  let cy = 0;

  // Header
  const hdr = mkFrame(root, 0, 0, W, 60, "surface", { name: "Header", fillStyle: "Background/Surface" });
  mkRect(hdr, 0, 59, W, 1, "border", { fillStyle: "Border/Default" });
  mkText(hdr, PAD, 18, "antigravity", "accent",
    { textStyle: "Heading/Logo", fillStyle: "Accent/Primary" });
  const navRow = figma.createFrame();
  navRow.layoutMode = "HORIZONTAL";
  navRow.primaryAxisSizingMode = "AUTO";
  navRow.counterAxisSizingMode = "AUTO";
  navRow.itemSpacing = 4;
  navRow.fills = [];
  navRow.x = 0; navRow.y = 14;
  hdr.appendChild(navRow);
  ["홈","카테고리","소개"].forEach((label, i) => {
    if (i === 0) {
      mkPillButton(navRow, 0, 0, label, "accent", "white", {
        fillStyle: "Accent/Primary", textStyle: "Label/Nav-Active", textFillStyle: "Accent/White", px: 14, py: 6,
      });
    } else {
      mkPillButton(navRow, 0, 0, label, null, "muted", {
        textStyle: "Label/Nav", textFillStyle: "Text/Muted", px: 14, py: 6,
      });
    }
  });
  navRow.x = W - PAD - navRow.width;
  navRow.y = Math.round((60 - navRow.height) / 2);
  cy = 60;

  // Hero
  const hero = mkFrame(root, 0, cy, W, 200, "bg", { name: "Hero", fillStyle: "Background/Primary" });
  mkRect(hero, 0, 199, W, 1, "border", { fillStyle: "Border/Default" });
  mkText(hero, PAD, 36, "Featured", "accent",
    { textStyle: "Label/Category", fillStyle: "Accent/Primary" });
  mkText(hero, PAD, 60, "중력을 거스르는 생각들을 기록합니다", "text",
    { textStyle: "Display/Hero-PC", fillStyle: "Text/Primary" });
  mkText(hero, PAD, 128, "디자인, 기술, 그리고 그 사이 어딘가", "muted",
    { textStyle: "Body/Regular", fillStyle: "Text/Muted" });
  cy += 200 + 48;

  // Section header + filter
  mkText(root, PAD, cy, "최근 글", "text",
    { textStyle: "Heading/Section", fillStyle: "Text/Primary" });
  {
    const filterRow = figma.createFrame();
    filterRow.layoutMode = "HORIZONTAL";
    filterRow.primaryAxisSizingMode = "AUTO";
    filterRow.counterAxisSizingMode = "AUTO";
    filterRow.itemSpacing = 6;
    filterRow.fills = [];
    filterRow.x = 0; filterRow.y = cy - 2;
    root.appendChild(filterRow);
    ["전체","디자인","기술","에세이"].forEach((label, i) => {
      if (i === 0) {
        mkPillButton(filterRow, 0, 0, label, "accent", "white", {
          fillStyle: "Accent/Primary", textStyle: "Label/Filter-Active", textFillStyle: "Accent/White", px: 14, py: 6,
        });
      } else {
        mkPillButton(filterRow, 0, 0, label, "surface", "muted", {
          fillStyle: "Background/Surface", textStyle: "Label/Filter", textFillStyle: "Text/Muted", stroke: "border", px: 14, py: 6,
        });
      }
    });
    filterRow.x = PAD + POSTS_W - filterRow.width;
  }
  cy += 44;

  // Featured card
  const thumbNames = ["Green","Blue","Yellow","Purple","Red"];
  {
    const H = 280, half = POSTS_W / 2;
    const card = mkFrame(root, PAD, cy, POSTS_W, H, "surface",
      { radius: 12, stroke: "border", name: "Post — Featured", fillStyle: "Background/Surface" });
    mkRect(card, 0, 0, half, H, "t1", { fillStyle: "Thumbnail/Green" });
    const em = mkText(card, half/2-24, 100, POSTS[0].emoji, "text", { size: 56 }); em.opacity = 0.2;
    mkText(card, half+24, 32, POSTS[0].cat.toUpperCase(), "accent",
      { textStyle: "Label/Category", fillStyle: "Accent/Primary" });
    mkText(card, half+24, 56, POSTS[0].title, "text",
      { textStyle: "Heading/Card-Large", fillStyle: "Text/Primary", w: half-48 });
    mkText(card, half+24, 116, POSTS[0].excerpt, "muted",
      { textStyle: "Body/Small", fillStyle: "Text/Muted", w: half-48 });
    mkText(card, half+24, H-36, `${POSTS[0].date}  ·  ${POSTS[0].rt} 읽기`, "muted",
      { textStyle: "Label/Meta", fillStyle: "Text/Muted" });
    cy += H + 20;
  }

  // 2-column cards
  const CW2 = (POSTS_W - 20) / 2, CT = 160, CH = 290;
  for (let i = 1; i < POSTS.length; i += 2) {
    [0, 1].forEach(col => {
      const p = POSTS[i + col]; if (!p) return;
      const tn = thumbNames[i + col] || "Green";
      const card = mkFrame(root, PAD + col*(CW2+20), cy, CW2, CH, "surface",
        { radius: 12, stroke: "border", name: `Post — ${p.title.slice(0,20)}`, fillStyle: "Background/Surface" });
      mkRect(card, 0, 0, CW2, CT, p.tc, { fillStyle: `Thumbnail/${tn}` });
      const em = mkText(card, CW2/2-20, CT/2-20, p.emoji, "text", { size: 44 }); em.opacity = 0.2;
      mkText(card, 20, CT+18, p.cat.toUpperCase(), "accent",
        { textStyle: "Label/Category", fillStyle: "Accent/Primary" });
      mkText(card, 20, CT+36, p.title, "text",
        { textStyle: "Heading/Card", fillStyle: "Text/Primary", w: CW2-40 });
      mkText(card, 20, CT+80, p.excerpt, "muted",
        { textStyle: "Body/XSmall", fillStyle: "Text/Muted", w: CW2-40 });
      mkText(card, 20, CH-28, `${p.date}  ·  ${p.rt} 읽기`, "muted",
        { textStyle: "Label/Meta", fillStyle: "Text/Muted" });
    });
    cy += CH + 20;
  }

  // Sidebar
  let scy = 60 + 200 + 48 + 44;
  // Categories
  {
    const sw = mkFrame(root, SB_X, scy, SB_W, 214, "surface",
      { radius: 12, stroke: "border", name: "Categories", fillStyle: "Background/Surface" });
    mkText(sw, 20, 20, "카테고리", "text", { textStyle: "Heading/Widget", fillStyle: "Text/Primary" });
    [["디자인","12"],["기술","8"],["에세이","15"],["인터뷰","4"]].forEach(([name,cnt], i) => {
      const ry = 52 + i*38;
      if (i===0) mkRect(sw, 8, ry, SB_W-16, 32, "accentLight", { radius: 8, fillStyle: "Accent/Light" });
      mkText(sw, 20, ry+8, name, i===0?"accent":"muted",
        { textStyle: "Body/Regular", fillStyle: i===0 ? "Accent/Primary" : "Text/Muted" });
      mkRect(sw, SB_W-42, ry+7, 28, 18, "bg", { radius: 9, fillStyle: "Background/Primary" });
      mkText(sw, SB_W-35, ry+9, cnt, "muted", { textStyle: "Label/Meta", fillStyle: "Text/Muted" });
    });
    scy += 214 + 24;
  }
  // Tags
  {
    const tw = mkFrame(root, SB_X, scy, SB_W, 20, "surface",
      { radius: 12, stroke: "border", name: "Tags", fillStyle: "Background/Surface" });
    mkText(tw, 20, 20, "태그", "text", { textStyle: "Heading/Widget", fillStyle: "Text/Primary" });
    let tx=12, ty=52;
    ["UI/UX","JavaScript","CSS","타이포그래피","철학","생산성","독서"].forEach(tag => {
      const pw = tag.length<=3?tag.length*12+24:tag.length<=6?tag.length*11+24:tag.length*10+24;
      if (tx+pw > SB_W-12) { tx=12; ty+=32; }
      mkRect(tw, tx, ty, pw, 26, "bg", { radius: 20, stroke: "border", fillStyle: "Background/Primary" });
      mkText(tw, tx+12, ty+6, tag, "muted", { textStyle: "Label/Tag", fillStyle: "Text/Muted" });
      tx += pw + 8;
    });
    tw.resize(SB_W, ty+44);
    scy += tw.height + 24;
  }
  // Newsletter
  {
    const nw = mkFrame(root, SB_X, scy, SB_W, 176, "surface",
      { radius: 12, stroke: "border", name: "Newsletter", fillStyle: "Background/Surface" });
    mkText(nw, 20, 20, "뉴스레터", "text", { textStyle: "Heading/Widget", fillStyle: "Text/Primary" });
    mkText(nw, 20, 50, "새 글이 올라오면 이메일로 알려드려요.", "muted",
      { textStyle: "Body/Small", fillStyle: "Text/Muted", w: SB_W-40 });
    mkRect(nw, 12, 88, SB_W-24, 38, "bg", { radius: 8, stroke: "border", fillStyle: "Background/Primary" });
    mkText(nw, 24, 98, "이메일 주소", "border", { textStyle: "Body/Small", fillStyle: "Border/Default" });
    mkPillButton(nw, 12, 132, "구독", "accent", "white", {
      fillStyle: "Accent/Primary", textStyle: "Label/Button", textFillStyle: "Accent/White",
      fixedW: SB_W - 24, px: 14, py: 9, radius: 8,
    });
  }

  // Footer
  const fy = Math.max(cy+48, scy+200);
  const ftr = mkFrame(root, 0, fy, W, 68, "bg", { name: "Footer", fillStyle: "Background/Primary" });
  mkRect(ftr, 0, 0, W, 1, "border", { fillStyle: "Border/Default" });
  mkText(ftr, PAD, 22, "antigravity", "accent", { textStyle: "Heading/Logo", fillStyle: "Accent/Primary" });
  mkText(ftr, W-PAD-200, 26, "2026 © All rights reserved.", "muted",
    { textStyle: "Body/Small", fillStyle: "Text/Muted" });

  root.resize(W, fy+68);
  return root;
}

function buildMobile() {
  const W = 375, PAD = 20;
  const root = mkFrame(figma.currentPage, 1480, 0, W, 100, "bg",
    { name: "Mobile — 375px", clip: false, fillStyle: "Background/Primary" });

  let cy = 0;

  // Header
  const hdr = mkFrame(root, 0, 0, W, 56, "surface", { name: "Header", fillStyle: "Background/Surface" });
  mkRect(hdr, 0, 55, W, 1, "border", { fillStyle: "Border/Default" });
  mkText(hdr, PAD, 17, "antigravity", "accent", { textStyle: "Heading/Logo", fillStyle: "Accent/Primary" });
  [18,26,34].forEach(hy => mkRect(hdr, W-44, hy, 22, 2, "text", { radius: 1 }));
  cy = 56;

  // Hero
  const hero = mkFrame(root, 0, cy, W, 168, "bg", { name: "Hero", fillStyle: "Background/Primary" });
  mkRect(hero, 0, 167, W, 1, "border", { fillStyle: "Border/Default" });
  mkText(hero, PAD, 28, "Featured", "accent", { textStyle: "Label/Category", fillStyle: "Accent/Primary" });
  mkText(hero, PAD, 48, "중력을 거스르는\n생각들을 기록합니다", "text",
    { textStyle: "Display/Hero-Mobile", fillStyle: "Text/Primary", w: W-PAD*2 });
  mkText(hero, PAD, 130, "디자인, 기술, 그리고 그 사이 어딘가", "muted",
    { textStyle: "Body/Small", fillStyle: "Text/Muted" });
  cy += 168 + 20;

  // Filter tabs
  {
    const mFilterRow = figma.createFrame();
    mFilterRow.layoutMode = "HORIZONTAL";
    mFilterRow.primaryAxisSizingMode = "AUTO";
    mFilterRow.counterAxisSizingMode = "AUTO";
    mFilterRow.itemSpacing = 8;
    mFilterRow.fills = [];
    mFilterRow.x = PAD; mFilterRow.y = cy;
    root.appendChild(mFilterRow);
    ["전체","디자인","기술","에세이"].forEach((label, i) => {
      if (i === 0) {
        mkPillButton(mFilterRow, 0, 0, label, "accent", "white", {
          fillStyle: "Accent/Primary", textStyle: "Label/Filter-Active", textFillStyle: "Accent/White", px: 14, py: 6,
        });
      } else {
        mkPillButton(mFilterRow, 0, 0, label, "surface", "muted", {
          fillStyle: "Background/Surface", textStyle: "Label/Filter", textFillStyle: "Text/Muted", stroke: "border", px: 14, py: 6,
        });
      }
    });
  }
  cy += 48;

  mkText(root, PAD, cy, "최근 글", "text", { textStyle: "Heading/Section", fillStyle: "Text/Primary" });
  cy += 36;

  const CW = W-PAD*2, TH=160, BY=TH+16, TY=BY+18, EY=TY+44, MY=EY+54, CH=MY+28;
  const thumbNames = ["Green","Blue","Yellow","Purple","Red"];

  POSTS.forEach((p, idx) => {
    const card = mkFrame(root, PAD, cy, CW, CH, "surface",
      { radius: 12, stroke: "border", name: `Post — ${p.title.slice(0,20)}`, fillStyle: "Background/Surface" });
    mkRect(card, 0, 0, CW, TH, p.tc, { fillStyle: `Thumbnail/${thumbNames[idx]}` });
    const em = mkText(card, CW/2-20, TH/2-22, p.emoji, "text", { size: 44 }); em.opacity = 0.2;
    mkText(card, PAD, BY, p.cat.toUpperCase(), "accent",
      { textStyle: "Label/Category", fillStyle: "Accent/Primary" });
    mkText(card, PAD, TY, p.title, "text",
      { textStyle: "Heading/Card", fillStyle: "Text/Primary", w: CW-PAD*2 });
    mkText(card, PAD, EY, p.excerpt, "muted",
      { textStyle: "Body/XSmall", fillStyle: "Text/Muted", w: CW-PAD*2 });
    mkText(card, PAD, MY, `${p.date}  ·  ${p.rt} 읽기`, "muted",
      { textStyle: "Label/Meta", fillStyle: "Text/Muted" });
    cy += CH + 16;
  });

  cy += 16;
  const ftr = mkFrame(root, 0, cy, W, 64, "bg", { name: "Footer", fillStyle: "Background/Primary" });
  mkRect(ftr, 0, 0, W, 1, "border", { fillStyle: "Border/Default" });
  mkText(ftr, PAD, 18, "antigravity", "accent", { textStyle: "Heading/Logo", fillStyle: "Accent/Primary" });
  mkText(ftr, PAD, 40, "2026 © All rights reserved.", "muted",
    { textStyle: "Label/Meta", fillStyle: "Text/Muted" });
  cy += 64;

  root.resize(W, cy);
  return root;
}

// ─────────────────────────────────────────────
// MODE B — Apply styles to existing selection
// ─────────────────────────────────────────────

function colorDistance(a, b) {
  return Math.sqrt((a.r-b.r)**2 + (a.g-b.g)**2 + (a.b-b.b)**2);
}

function findClosestColorStyle(color) {
  let best = null, bestDist = Infinity;
  for (const [name, entry] of Object.entries(STYLE_MAP)) {
    if (!entry.token || entry.token.r === undefined) continue;
    const dist = colorDistance(color, entry.token);
    if (dist < bestDist) { bestDist = dist; best = name; }
  }
  return bestDist < 0.05 ? best : null; // threshold: only exact-ish matches
}

function findMatchingTextStyle(node) {
  const size = node.fontSize;
  const style = node.fontName && node.fontName.style;
  for (const [name, entry] of Object.entries(STYLE_MAP)) {
    const t = entry.token;
    if (!t || t.size === undefined) continue;
    if (t.size === size && t.style === style) return name;
  }
  return null;
}

let appliedCount = 0;

function applyStylesToNode(node) {
  // Text nodes: match text style + fill color
  if (node.type === "TEXT") {
    const ts = findMatchingTextStyle(node);
    if (ts) { try { node.textStyleId = STYLE_MAP[ts].id; appliedCount++; } catch(e) {} }
    if (node.fills && node.fills.length > 0 && node.fills[0].type === "SOLID") {
      const cs = findClosestColorStyle(node.fills[0].color);
      if (cs) { try { node.fillStyleId = STYLE_MAP[cs].id; appliedCount++; } catch(e) {} }
    }
    return;
  }

  // Rect / Frame: match fill color
  if ((node.type === "RECTANGLE" || node.type === "FRAME" || node.type === "COMPONENT") &&
       node.fills && node.fills.length > 0 && node.fills[0].type === "SOLID") {
    const cs = findClosestColorStyle(node.fills[0].color);
    if (cs) { try { node.fillStyleId = STYLE_MAP[cs].id; appliedCount++; } catch(e) {} }
  }

  // Recurse into children
  if ("children" in node) {
    for (const child of node.children) applyStylesToNode(child);
  }
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

(async () => {
  try {
    await registerAllStyles();
    const totalStyles = COLOR_TOKENS.length + TEXT_TOKENS.length + EFFECT_TOKENS.length + GRID_TOKENS.length;

    const selection = figma.currentPage.selection;

    if (selection.length === 0) {
      // ── Mode A: Create new frames ──
      getOrMakePage(`V${PLUGIN_VERSION}`);
      let pc, mb;
      try { pc = buildPC(); } catch(e) { figma.closePlugin("buildPC 오류: " + e.message); return; }
      try { mb = buildMobile(); } catch(e) { figma.closePlugin("buildMobile 오류: " + e.message); return; }
      figma.viewport.scrollAndZoomIntoView([pc, mb]);
      figma.closePlugin(`[Mode A] 스타일 ${totalStyles}개 등록 + PC/Mobile 프레임 생성 완료`);
    } else {
      // ── Mode B: Apply styles to selection ──
      appliedCount = 0;
      for (const node of selection) applyStylesToNode(node);
      figma.closePlugin(`[Mode B] 선택된 ${selection.length}개 노드에 스타일 ${appliedCount}건 적용 완료`);
    }
  } catch (e) {
    figma.closePlugin("오류: " + e.message);
  }
})();
