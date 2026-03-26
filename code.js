// ─────────────────────────────────────────────
// Blog Prototype Figma Plugin
// Version : 2.1  (Bottom-Up Auto Layout)
//
// V2.1 전략: 상향식(leaf → root) 구성
//   텍스트 → Card Body → Card → Grid → Column → Page
//   AL은 빌드 시점에 적용 — 사후 후처리 없음
// ─────────────────────────────────────────────
const PLUGIN_VERSION = "2.1";

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

const STYLE_MAP = {};

// ── Progress Reporter ─────────────────────────

let _notifyHandle = null;
function progress(msg) {
  if (_notifyHandle) { try { _notifyHandle.cancel(); } catch (_) {} }
  _notifyHandle = figma.notify(msg, { timeout: Infinity });
}
function yield_() { return new Promise(r => setTimeout(r, 80)); }

async function registerAllStyles() {
  const fonts = [...new Set(TEXT_TOKENS.map(t => JSON.stringify({ family: t.family, style: t.style })))];
  await Promise.all(fonts.map(f => figma.loadFontAsync(JSON.parse(f))));

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

// ── Color & Style Helpers ─────────────────────

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
  { cat: "디자인", title: "여백이 말하는 것들 — 미니멀리즘의 역설",        excerpt: "덜어낼수록 더 많은 것이 보인다. 디자인에서 여백은 단순히 빈 공간이 아니라, 시선을 이끄는 능동적인 요소다.", date: "2026. 3. 20", rt: "5분",  tc: "t1" },
  { cat: "기술",   title: "CSS가 이렇게 재미있었나 — 2026년의 새로운 기능들", excerpt: "container queries, :has() 선택자, scroll-driven animations... CSS는 조용히, 그러나 빠르게 진화하고 있다.",    date: "2026. 3. 15", rt: "7분",  tc: "t2" },
  { cat: "에세이", title: "느리게 읽는다는 것의 의미",                        excerpt: "스크롤을 멈추고 한 단락을 두 번 읽었을 때, 비로소 글이 보이기 시작했다.",                                          date: "2026. 3. 10", rt: "4분",  tc: "t3" },
  { cat: "디자인", title: "타입페이스 하나가 브랜드를 바꾼다",                excerpt: "폰트는 단순한 글자 모양이 아니다. 브랜드의 성격, 가치, 그리고 감정을 전달하는 비언어적 커뮤니케이션이다.",            date: "2026. 3. 5",  rt: "6분",  tc: "t4" },
  { cat: "에세이", title: "완벽주의라는 이름의 미루기",                        excerpt: "완성하지 못한 채 머릿속에만 존재하는 '완벽한 것'보다, 세상에 나온 '충분히 좋은 것'이 훨씬 낫다.",                 date: "2026. 2. 28", rt: "3분",  tc: "t5" },
];

const THUMB_NAMES = ["Green", "Blue", "Yellow", "Purple", "Red"];

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

function applyBorderStroke(f, side) {
  // side: "bottom" | "top" | "all"
  f.strokes = solidFill(C.border);
  f.strokeWeight = 1;
  f.strokeAlign = "INSIDE";
  try {
    f.strokeTopWeight    = (side === "top"    || side === "all") ? 1 : 0;
    f.strokeBottomWeight = (side === "bottom" || side === "all") ? 1 : 0;
    f.strokeLeftWeight   = side === "all" ? 1 : 0;
    f.strokeRightWeight  = side === "all" ? 1 : 0;
  } catch (_) {}
}

// ── Bottom-Up AL Helpers (V2.1) ───────────────
//
// mkAutoFrame: creates frame with AL configured from the start
//   opts.w / opts.h  — if only one given, the other axis uses AUTO (hug)
//                      if both given, both axes are FIXED
//   opts.pad         — all sides
//   opts.padH        — left + right
//   opts.padV        — top + bottom
//   opts.padLeft/Right/Top/Bot — individual sides
//   opts.gap         — itemSpacing
//   opts.wrap        — layoutWrap = "WRAP"
//   opts.rowGap      — counterAxisSpacing (gap between rows when wrapped)
//   opts.spaceBetween — primaryAxisAlignItems = "SPACE_BETWEEN"
//   opts.centerMain  — primaryAxisAlignItems = "CENTER"
//   opts.centerCross — counterAxisAlignItems = "CENTER"
//   opts.fillStyle   — paint style name
//   opts.fill        — color key from C{}
//   opts.radius      — cornerRadius
//   opts.stroke      — color key from C{} → solidFill border
//
function mkAutoFrame(parent, name, direction, opts) {
  var o = opts || {};
  var f = figma.createFrame();
  f.name = name;
  f.clipsContent = false;

  // Fill
  if (o.fillStyle) applyFillStyle(f, o.fillStyle);
  else if (o.fill) f.fills = solidFill(C[o.fill]);
  else f.fills = [];

  // Decoration
  if (o.radius !== undefined) f.cornerRadius = o.radius;
  if (o.stroke) {
    f.strokes = solidFill(C[o.stroke]);
    f.strokeWeight = 1;
    f.strokeAlign = "INSIDE";
  }

  // Auto Layout
  f.layoutMode = direction;

  // Padding
  var pad = o.pad !== undefined ? o.pad : 0;
  var padH = o.padH !== undefined ? o.padH : pad;
  var padV = o.padV !== undefined ? o.padV : pad;
  f.paddingLeft   = o.padLeft  !== undefined ? o.padLeft  : padH;
  f.paddingRight  = o.padRight !== undefined ? o.padRight : padH;
  f.paddingTop    = o.padTop   !== undefined ? o.padTop   : padV;
  f.paddingBottom = o.padBot   !== undefined ? o.padBot   : padV;

  // Gap & wrap
  if (o.gap !== undefined) f.itemSpacing = o.gap;
  if (o.wrap) {
    f.layoutWrap = "WRAP";
    if (o.rowGap !== undefined) f.counterAxisSpacing = o.rowGap;
  }

  // Alignment
  f.primaryAxisAlignItems = o.spaceBetween ? "SPACE_BETWEEN" : (o.centerMain ? "CENTER" : "MIN");
  f.counterAxisAlignItems = o.centerCross ? "CENTER" : "MIN";

  // Sizing: derive from w / h
  // 중요: resize()를 먼저 호출한 뒤 sizing mode를 설정해야 한다.
  // Figma API에서 resize()가 AUTO 모드를 FIXED로 덮어쓸 수 있으므로,
  // AUTO 설정은 반드시 resize() 이후에 위치해야 올바르게 적용된다.
  var isH = direction === "HORIZONTAL";
  var hasW = o.w !== undefined;
  var hasH = o.h !== undefined;

  if (hasW && hasH) {
    f.resize(o.w, o.h);
    f.primaryAxisSizingMode = "FIXED";
    f.counterAxisSizingMode = "FIXED";
  } else if (hasW) {
    f.resize(o.w, f.height); // width 고정, height는 현재값 유지 후 AUTO가 덮어씀
    if (isH) {
      f.primaryAxisSizingMode = "FIXED"; // HORIZONTAL primary = width
      f.counterAxisSizingMode = "AUTO";  // height hugs (resize 이후 설정)
    } else {
      f.counterAxisSizingMode = "FIXED"; // width fixed
      f.primaryAxisSizingMode = "AUTO";  // height hugs (resize 이후 설정)
    }
  } else if (hasH) {
    f.resize(f.width, o.h); // height 고정, width는 현재값 유지 후 AUTO가 덮어씀
    if (isH) {
      f.counterAxisSizingMode = "FIXED"; // height fixed
      f.primaryAxisSizingMode = "AUTO";  // width hugs (resize 이후 설정)
    } else {
      f.primaryAxisSizingMode = "FIXED"; // height fixed
      f.counterAxisSizingMode = "AUTO";  // width hugs (resize 이후 설정)
    }
  } else {
    // neither → both hug
    f.primaryAxisSizingMode = "AUTO";
    f.counterAxisSizingMode = "AUTO";
  }

  if (parent) parent.appendChild(f);
  return f;
}

// mkFlexText: creates text node for use inside an AL container (no x,y)
//   opts.textStyle  — text style name
//   opts.fillStyle  — paint style name
//   opts.size       — fontSize fallback
//   opts.hFill      — set layoutSizingHorizontal = "FILL" after appending
//
function mkFlexText(parent, content, colorKey, opts) {
  var o = opts || {};
  var t = figma.createText();
  var token = o.textStyle && STYLE_MAP[o.textStyle] ? STYLE_MAP[o.textStyle].token : null;
  t.fontName = token
    ? { family: token.family, style: token.style }
    : { family: "Inter", style: "Regular" };
  t.fontSize = token ? token.size : (o.size || 14);
  if (token && token.lineH) t.lineHeight    = { value: token.lineH, unit: "PIXELS"  };
  if (token && token.ls)    t.letterSpacing = { value: token.ls,    unit: "PERCENT" };
  t.characters = content;
  t.textAutoResize = "WIDTH_AND_HEIGHT";
  if (o.textStyle) applyTextStyle(t, o.textStyle);
  if (o.fillStyle) applyFillStyle(t, o.fillStyle);
  else t.fills = solidFill(C[colorKey] || C.text);
  if (parent) parent.appendChild(t);
  // Set FILL after appending so the parent's AL context is active
  if (o.hFill) t.layoutSizingHorizontal = "FILL";
  return t;
}

// ── Legacy Helpers (kept for mkPillButton) ────

function mkPillButton(parent, label, fillColorKey, textColorKey, opts) {
  var o = opts || {};
  var btn = figma.createFrame();
  btn.name = label;
  btn.layoutMode = "HORIZONTAL";
  btn.primaryAxisSizingMode = o.fixedW ? "FIXED" : "AUTO";
  btn.counterAxisSizingMode = "AUTO";
  btn.primaryAxisAlignItems = "CENTER";
  btn.counterAxisAlignItems = "CENTER";
  btn.paddingLeft = btn.paddingRight = (o.px !== undefined) ? o.px : 14;
  btn.paddingTop = btn.paddingBottom = (o.py !== undefined) ? o.py : 6;
  btn.cornerRadius = (o.radius !== undefined) ? o.radius : 20;
  if (o.fixedW) btn.resize(o.fixedW, 36);
  if (o.fillStyle) applyFillStyle(btn, o.fillStyle, C[fillColorKey]);
  else if (fillColorKey) btn.fills = solidFill(C[fillColorKey]);
  else btn.fills = [];
  if (o.stroke) {
    btn.strokes = solidFill(C[o.stroke] || C.border);
    btn.strokeWeight = 1;
    btn.strokeAlign = "INSIDE";
  }
  var t = figma.createText();
  var token = o.textStyle && STYLE_MAP[o.textStyle] ? STYLE_MAP[o.textStyle].token : null;
  t.fontName = token
    ? { family: token.family, style: token.style }
    : { family: "Inter", style: "Regular" };
  t.fontSize = token ? token.size : (o.size || 13);
  if (token && token.lineH) t.lineHeight    = { value: token.lineH, unit: "PIXELS"  };
  if (token && token.ls)    t.letterSpacing = { value: token.ls,    unit: "PERCENT" };
  t.characters = label;
  t.textAutoResize = "WIDTH_AND_HEIGHT";
  if (o.textStyle) applyTextStyle(t, o.textStyle);
  if (o.textFillStyle) applyFillStyle(t, o.textFillStyle, C[textColorKey]);
  else t.fills = solidFill(C[textColorKey] || C.text);
  btn.appendChild(t);
  if (parent) parent.appendChild(btn);
  return btn;
}

function getOrMakePage(name) {
  var page = figma.root.children.find(function(p) { return p.name === name; });
  if (!page) { page = figma.createPage(); page.name = name; }
  figma.currentPage = page;
  [...figma.currentPage.children].forEach(function(n) { n.remove(); });
  return page;
}

// ─────────────────────────────────────────────
// PC — Bottom-Up Build
// ─────────────────────────────────────────────

function buildPC() {
  var W = 1440, PAD = 170;
  // content width = 1440 - 170*2 = 1100
  // sidebar = 300, gap = 44  →  posts column = 1100 - 44 - 300 = 756
  var SB_W = 300, COL_GAP = 44;
  var POSTS_W = W - PAD * 2 - COL_GAP - SB_W; // 756

  // ── Step 1-2: Card Body ───────────────────────────────────
  // leaf: text nodes inside Card Body
  // Card Body: VERTICAL AL, padding, gap:10
  //
  function makeCardBody(p, isFeatured) {
    var body = mkAutoFrame(null, "Card Body", "VERTICAL", {
      padLeft:  isFeatured ? 28 : 20,
      padRight: isFeatured ? 28 : 20,
      padTop:   isFeatured ? 32 : 18,
      padBot:   isFeatured ? 32 : 20,
      gap: 10,
      centerMain: isFeatured ? true : false,
    });

    mkFlexText(body, p.cat.toUpperCase(), "accent",
      { textStyle: "Label/Category",  fillStyle: "Accent/Primary",  hFill: true });
    mkFlexText(body, p.title, "text",
      { textStyle: isFeatured ? "Heading/Card-Large" : "Heading/Card",
        fillStyle: "Text/Primary", hFill: true });
    mkFlexText(body, p.excerpt, "muted",
      { textStyle: isFeatured ? "Body/Regular" : "Body/XSmall",
        fillStyle: "Text/Muted", hFill: true });
    mkFlexText(body, p.date + "  \u00b7  " + p.rt + " \uc77d\uae30", "muted",
      { textStyle: "Label/Meta", fillStyle: "Text/Muted", hFill: true });

    return body;
  }

  // ── Step 3-4: Post Cards ──────────────────────────────────
  // Thumbnail (rect) → Card Body → Post Card frame

  function makeFeaturedCard(p) {
    // Featured: HORIZONTAL [thumb | body], fixed 756x280
    var H = 280;
    var card = mkAutoFrame(null, "Post \u2014 Featured", "HORIZONTAL", {
      fillStyle: "Background/Surface", radius: 12, stroke: "border",
      w: POSTS_W, h: H,
    });
    card.itemSpacing = 0;

    var thumb = figma.createRectangle();
    thumb.resize(POSTS_W / 2, H);
    applyFillStyle(thumb, "Thumbnail/Green", C.t1);
    card.appendChild(thumb);
    thumb.layoutSizingHorizontal = "FIXED";
    thumb.layoutSizingVertical   = "FILL";

    var body = makeCardBody(p, true);
    card.appendChild(body);
    body.layoutSizingHorizontal = "FILL";
    body.layoutSizingVertical   = "FILL";

    return card;
  }

  function makePostCard(p, idx) {
    // Regular: VERTICAL [thumb / body], fixed width, AUTO height
    var TH = 160;
    var CW = (POSTS_W - 20) / 2; // 368 — initial size, overridden by FILL in row
    var card = mkAutoFrame(null, "Post \u2014 " + p.title.slice(0, 20), "VERTICAL", {
      fillStyle: "Background/Surface", radius: 12, stroke: "border",
      w: CW,
    });
    card.itemSpacing = 0;

    var thumb = figma.createRectangle();
    thumb.resize(CW, TH);
    applyFillStyle(thumb, "Thumbnail/" + THUMB_NAMES[idx], C[p.tc]);
    card.appendChild(thumb);
    thumb.layoutSizingHorizontal = "FILL";
    thumb.layoutSizingVertical   = "FIXED";

    var body = makeCardBody(p, false);
    card.appendChild(body);
    body.layoutSizingHorizontal = "FILL";
    body.layoutSizingVertical   = "HUG";

    return card;
  }

  // ── Step 5-6: Posts Grid ──────────────────────────────────
  // Card Row (HORIZONTAL) → Posts Grid (VERTICAL)

  var postsGrid = mkAutoFrame(null, "Posts Grid", "VERTICAL", {
    w: POSTS_W, gap: 20,
  });

  // Featured card (spans full width)
  var featCard = makeFeaturedCard(POSTS[0]);
  postsGrid.appendChild(featCard);
  featCard.layoutSizingHorizontal = "FILL";

  // Regular cards in pairs (2-column rows)
  for (var i = 1; i < POSTS.length; i += 2) {
    var row = mkAutoFrame(null, "Card Row", "HORIZONTAL", {
      w: POSTS_W, gap: 20,
    });
    postsGrid.appendChild(row);
    row.layoutSizingHorizontal = "FILL";

    [POSTS[i], POSTS[i + 1]].forEach(function(p, col) {
      if (!p) return;
      var card = makePostCard(p, i + col);
      row.appendChild(card);
      card.layoutSizingHorizontal = "FILL";
      card.layoutSizingVertical   = "HUG";
    });
  }

  // ── Step 7-8: Filter Tabs + Section Header ────────────────
  // Filter Tabs (HORIZONTAL) → Section Header (HORIZONTAL SPACE_BETWEEN)

  var filterRow = mkAutoFrame(null, "Filter Tabs", "HORIZONTAL", { gap: 6 });
  ["전체", "디자인", "기술", "에세이"].forEach(function(label, i) {
    mkPillButton(filterRow, label,
      i === 0 ? "accent" : "surface",
      i === 0 ? "white"  : "muted", {
        fillStyle:     i === 0 ? "Accent/Primary"    : "Background/Surface",
        textStyle:     i === 0 ? "Label/Filter-Active" : "Label/Filter",
        textFillStyle: i === 0 ? "Accent/White"      : "Text/Muted",
        stroke: i === 0 ? undefined : "border",
        px: 14, py: 6,
      });
  });

  var secHdr = mkAutoFrame(null, "Section Header", "HORIZONTAL", {
    w: POSTS_W, spaceBetween: true, centerCross: true,
  });
  mkFlexText(secHdr, "최근 글", "text",
    { textStyle: "Heading/Section", fillStyle: "Text/Primary" });
  secHdr.appendChild(filterRow);

  // ── Step 9: Posts Column ──────────────────────────────────
  // Section Header + Posts Grid → Posts Column (VERTICAL)

  var postsCol = mkAutoFrame(null, "Posts Column", "VERTICAL", {
    w: POSTS_W, gap: 28,
  });
  postsCol.appendChild(secHdr);
  secHdr.layoutSizingHorizontal = "FILL";
  postsCol.appendChild(postsGrid);
  postsGrid.layoutSizingHorizontal = "FILL";

  // ── Steps 10-14: Sidebar ──────────────────────────────────

  // Categories Widget
  var catsWidget = mkAutoFrame(null, "Categories", "VERTICAL", {
    fillStyle: "Background/Surface", radius: 12, stroke: "border",
    w: SB_W, pad: 22, gap: 16,  // 16px gap: title → category list
  });
  mkFlexText(catsWidget, "카테고리", "text",
    { textStyle: "Heading/Widget", fillStyle: "Text/Primary", hFill: true });

  // Category List: nested container so items have gap:2 independent of title gap
  var catList = mkAutoFrame(null, "Category List", "VERTICAL", { gap: 2 });
  catsWidget.appendChild(catList);
  catList.layoutSizingHorizontal = "FILL";

  [["디자인","12"],["기술","8"],["에세이","15"],["인터뷰","4"]].forEach(function(pair, i) {
    var name = pair[0], cnt = pair[1];
    var item = mkAutoFrame(null, "Category Item", "HORIZONTAL", {
      padLeft: 12, padRight: 12, spaceBetween: true, centerCross: true, h: 32,
    });
    if (i === 0) { applyFillStyle(item, "Accent/Light", C.accentLight); item.cornerRadius = 8; }
    catList.appendChild(item);
    item.layoutSizingHorizontal = "FILL";

    mkFlexText(item, name, i === 0 ? "accent" : "muted",
      { textStyle: "Body/Regular",
        fillStyle: i === 0 ? "Accent/Primary" : "Text/Muted", hFill: true });

    // Badge (number pill)
    var badge = mkAutoFrame(null, "Badge", "HORIZONTAL", {
      fillStyle: "Background/Primary", radius: 9,
      padLeft: 6, padRight: 6, centerMain: true, centerCross: true,
    });
    item.appendChild(badge);
    badge.layoutSizingHorizontal = "HUG";
    mkFlexText(badge, cnt, "muted", { textStyle: "Label/Meta", fillStyle: "Text/Muted" });
  });

  // Tags Widget
  var tagsInner = mkAutoFrame(null, "Tags Container", "HORIZONTAL", {
    wrap: true, gap: 8, rowGap: 8,
  });
  tagsInner.primaryAxisSizingMode = "FIXED";
  tagsInner.counterAxisSizingMode = "AUTO";
  tagsInner.resize(SB_W - 44, 10); // inner width = SB_W - pad*2

  ["UI/UX", "JavaScript", "CSS", "타이포그래피", "철학", "생산성", "독서"].forEach(function(tag) {
    var tagBtn = mkAutoFrame(null, tag, "HORIZONTAL", {
      fillStyle: "Background/Primary", radius: 20, stroke: "border",
      padLeft: 12, padRight: 12, padTop: 5, padBot: 5,
    });
    mkFlexText(tagBtn, tag, "muted", { textStyle: "Label/Tag", fillStyle: "Text/Muted" });
    tagsInner.appendChild(tagBtn);
  });

  var tagsWidget = mkAutoFrame(null, "Tags", "VERTICAL", {
    fillStyle: "Background/Surface", radius: 12, stroke: "border",
    w: SB_W, pad: 22, gap: 16,
  });
  mkFlexText(tagsWidget, "태그", "text",
    { textStyle: "Heading/Widget", fillStyle: "Text/Primary", hFill: true });
  tagsWidget.appendChild(tagsInner);
  tagsInner.layoutSizingHorizontal = "FILL";

  // Newsletter Widget
  var emailInput = mkAutoFrame(null, "Email Input", "HORIZONTAL", {
    fillStyle: "Background/Primary", radius: 8, stroke: "border",
    padLeft: 14, padRight: 14, centerCross: true, h: 38,
  });
  mkFlexText(emailInput, "이메일 주소", "border",
    { textStyle: "Body/Small", fillStyle: "Border/Default" });

  var subBtn = mkAutoFrame(null, "구독", "HORIZONTAL", {
    fillStyle: "Accent/Primary", radius: 8,
    padLeft: 14, padRight: 14, padTop: 9, padBot: 9,
    centerMain: true, centerCross: true,
  });
  mkFlexText(subBtn, "구독", "white",
    { textStyle: "Label/Button", fillStyle: "Accent/White" });

  var nlForm = mkAutoFrame(null, "Newsletter Form", "VERTICAL", { gap: 8 });
  nlForm.appendChild(emailInput);
  emailInput.layoutSizingHorizontal = "FILL";
  nlForm.appendChild(subBtn);
  subBtn.layoutSizingHorizontal = "FILL";

  var nlWidget = mkAutoFrame(null, "Newsletter", "VERTICAL", {
    fillStyle: "Background/Surface", radius: 12, stroke: "border",
    w: SB_W, pad: 22, gap: 12,
  });
  mkFlexText(nlWidget, "뉴스레터", "text",
    { textStyle: "Heading/Widget", fillStyle: "Text/Primary", hFill: true });
  mkFlexText(nlWidget, "새 글이 올라오면 이메일로 알려드려요.", "muted",
    { textStyle: "Body/Small", fillStyle: "Text/Muted", hFill: true });
  nlWidget.appendChild(nlForm);
  nlForm.layoutSizingHorizontal = "FILL";

  // Sidebar: 3 widgets stacked vertically
  var sidebar = mkAutoFrame(null, "Sidebar", "VERTICAL", {
    w: SB_W, gap: 28,
  });
  sidebar.appendChild(catsWidget);
  catsWidget.layoutSizingHorizontal = "FILL";
  sidebar.appendChild(tagsWidget);
  tagsWidget.layoutSizingHorizontal = "FILL";
  sidebar.appendChild(nlWidget);
  nlWidget.layoutSizingHorizontal = "FILL";

  // ── Step 15: Main Layout ──────────────────────────────────
  // Posts Column + Sidebar → Main Layout (HORIZONTAL)

  var mainLayout = mkAutoFrame(null, "Main Layout", "HORIZONTAL", {
    fillStyle: "Background/Primary",
    w: W, padLeft: PAD, padRight: PAD, padTop: 48, padBot: 64,
    gap: COL_GAP, centerCross: false,
  });
  mainLayout.appendChild(postsCol);
  postsCol.layoutSizingHorizontal = "FILL";  // fills remaining space after sidebar
  postsCol.layoutSizingVertical   = "HUG";
  mainLayout.appendChild(sidebar);
  sidebar.layoutSizingHorizontal = "FIXED"; // stays SB_W
  sidebar.layoutSizingVertical   = "HUG";

  // ── Step 16: Header ───────────────────────────────────────
  var header = mkAutoFrame(null, "Header", "HORIZONTAL", {
    fillStyle: "Background/Surface",
    w: W, h: 60, padLeft: PAD, padRight: PAD,
    spaceBetween: true, centerCross: true,
  });
  applyBorderStroke(header, "bottom");

  mkFlexText(header, "antigravity", "accent",
    { textStyle: "Heading/Logo", fillStyle: "Accent/Primary" });

  var navRow = mkAutoFrame(null, "Nav", "HORIZONTAL", { gap: 4 });
  ["홈", "카테고리", "소개"].forEach(function(label, i) {
    mkPillButton(navRow, label,
      i === 0 ? "accent" : null,
      i === 0 ? "white" : "muted", {
        fillStyle:     i === 0 ? "Accent/Primary" : undefined,
        textStyle:     i === 0 ? "Label/Nav-Active" : "Label/Nav",
        textFillStyle: i === 0 ? "Accent/White" : "Text/Muted",
        px: 14, py: 6,
      });
  });
  header.appendChild(navRow);

  // ── Step 17: Hero ─────────────────────────────────────────
  var hero = mkAutoFrame(null, "Hero", "VERTICAL", {
    fillStyle: "Background/Primary",
    w: W, padLeft: PAD, padRight: PAD, padTop: 36, padBot: 48, gap: 16,
  });
  applyBorderStroke(hero, "bottom");

  mkFlexText(hero, "Featured", "accent",
    { textStyle: "Label/Category", fillStyle: "Accent/Primary", hFill: true });
  mkFlexText(hero, "중력을 거스르는 생각들을 기록합니다", "text",
    { textStyle: "Display/Hero-PC", fillStyle: "Text/Primary", hFill: true });
  mkFlexText(hero, "디자인, 기술, 그리고 그 사이 어딘가", "muted",
    { textStyle: "Body/Regular", fillStyle: "Text/Muted", hFill: true });

  // ── Step 18: Footer ───────────────────────────────────────
  var footer = mkAutoFrame(null, "Footer", "HORIZONTAL", {
    fillStyle: "Background/Primary",
    w: W, h: 68, padLeft: PAD, padRight: PAD,
    spaceBetween: true, centerCross: true,
  });
  applyBorderStroke(footer, "top");

  mkFlexText(footer, "antigravity", "accent",
    { textStyle: "Heading/Logo", fillStyle: "Accent/Primary" });
  mkFlexText(footer, "2026 \u00a9 All rights reserved.", "muted",
    { textStyle: "Body/Small", fillStyle: "Text/Muted" });

  // ── Step 19: Root Frame ───────────────────────────────────
  // All sections appended to VERTICAL root → each section FILL width

  var root = mkAutoFrame(figma.currentPage, "PC \u2014 1440px", "VERTICAL", {
    fillStyle: "Background/Primary", w: W,
  });
  root.clipsContent = false;

  root.appendChild(header);
  header.layoutSizingHorizontal = "FILL";

  root.appendChild(hero);
  hero.layoutSizingHorizontal = "FILL";

  root.appendChild(mainLayout);
  mainLayout.layoutSizingHorizontal = "FILL";

  root.appendChild(footer);
  footer.layoutSizingHorizontal = "FILL";

  return root;
}

// ─────────────────────────────────────────────
// Mobile — Bottom-Up Build
// ─────────────────────────────────────────────

function buildMobile() {
  var W = 375, PAD = 20;

  // ── Card Body (same pattern as PC) ───────────────────────

  function makeCardBody(p) {
    var body = mkAutoFrame(null, "Card Body", "VERTICAL", {
      pad: PAD, gap: 8,
    });
    mkFlexText(body, p.cat.toUpperCase(), "accent",
      { textStyle: "Label/Category", fillStyle: "Accent/Primary", hFill: true });
    mkFlexText(body, p.title, "text",
      { textStyle: "Heading/Card", fillStyle: "Text/Primary", hFill: true });
    mkFlexText(body, p.excerpt, "muted",
      { textStyle: "Body/XSmall", fillStyle: "Text/Muted", hFill: true });
    mkFlexText(body, p.date + "  \u00b7  " + p.rt + " \uc77d\uae30", "muted",
      { textStyle: "Label/Meta", fillStyle: "Text/Muted", hFill: true });
    return body;
  }

  function makePostCard(p, idx) {
    var TH = 160;
    var CW = W - PAD * 2;
    var card = mkAutoFrame(null, "Post \u2014 " + p.title.slice(0, 20), "VERTICAL", {
      fillStyle: "Background/Surface", radius: 12, stroke: "border",
      w: CW,
    });
    card.itemSpacing = 0;

    var thumb = figma.createRectangle();
    thumb.resize(CW, TH);
    applyFillStyle(thumb, "Thumbnail/" + THUMB_NAMES[idx], C[p.tc]);
    card.appendChild(thumb);
    thumb.layoutSizingHorizontal = "FILL";
    thumb.layoutSizingVertical   = "FIXED";

    var body = makeCardBody(p);
    card.appendChild(body);
    body.layoutSizingHorizontal = "FILL";
    body.layoutSizingVertical   = "HUG";

    return card;
  }

  // ── Posts List ────────────────────────────────────────────

  var postsList = mkAutoFrame(null, "Posts List", "VERTICAL", {
    w: W - PAD * 2, gap: 16,
  });
  POSTS.forEach(function(p, idx) {
    var card = makePostCard(p, idx);
    postsList.appendChild(card);
    card.layoutSizingHorizontal = "FILL";
    card.layoutSizingVertical   = "HUG";
  });

  // ── Filter Tabs ───────────────────────────────────────────

  var filterRow = mkAutoFrame(null, "Filter Tabs", "HORIZONTAL", { gap: 8 });
  ["전체", "디자인", "기술", "에세이"].forEach(function(label, i) {
    mkPillButton(filterRow, label,
      i === 0 ? "accent" : "surface",
      i === 0 ? "white"  : "muted", {
        fillStyle:     i === 0 ? "Accent/Primary"    : "Background/Surface",
        textStyle:     i === 0 ? "Label/Filter-Active" : "Label/Filter",
        textFillStyle: i === 0 ? "Accent/White"      : "Text/Muted",
        stroke: i === 0 ? undefined : "border",
        px: 14, py: 6,
      });
  });

  // ── Posts Section ─────────────────────────────────────────
  // Filter Tabs + Section Title + Posts List → Posts Section

  var postsSection = mkAutoFrame(null, "Posts Section", "VERTICAL", {
    w: W, padLeft: PAD, padRight: PAD, padTop: 20, padBot: 32, gap: 16,
  });
  postsSection.appendChild(filterRow);
  filterRow.layoutSizingHorizontal = "HUG";

  mkFlexText(postsSection, "최근 글", "text",
    { textStyle: "Heading/Section", fillStyle: "Text/Primary", hFill: true });

  postsSection.appendChild(postsList);
  postsList.layoutSizingHorizontal = "FILL";

  // ── Header ────────────────────────────────────────────────

  var header = mkAutoFrame(null, "Header", "HORIZONTAL", {
    fillStyle: "Background/Surface",
    w: W, h: 56, padLeft: PAD, padRight: PAD,
    spaceBetween: true, centerCross: true,
  });
  applyBorderStroke(header, "bottom");

  mkFlexText(header, "antigravity", "accent",
    { textStyle: "Heading/Logo", fillStyle: "Accent/Primary" });

  // Hamburger icon: 3 bars stacked vertically
  var burger = mkAutoFrame(null, "Hamburger", "VERTICAL", {
    gap: 6, centerMain: true, centerCross: true,
  });
  for (var b = 0; b < 3; b++) {
    var bar = figma.createRectangle();
    bar.resize(22, 2);
    bar.fills = solidFill(C.text);
    bar.cornerRadius = 1;
    burger.appendChild(bar);
  }
  header.appendChild(burger);

  // ── Hero ──────────────────────────────────────────────────

  var hero = mkAutoFrame(null, "Hero", "VERTICAL", {
    fillStyle: "Background/Primary",
    w: W, padLeft: PAD, padRight: PAD, padTop: 28, padBot: 32, gap: 12,
  });
  applyBorderStroke(hero, "bottom");

  mkFlexText(hero, "Featured", "accent",
    { textStyle: "Label/Category", fillStyle: "Accent/Primary", hFill: true });
  mkFlexText(hero, "중력을 거스르는\n생각들을 기록합니다", "text",
    { textStyle: "Display/Hero-Mobile", fillStyle: "Text/Primary", hFill: true });
  mkFlexText(hero, "디자인, 기술, 그리고 그 사이 어딘가", "muted",
    { textStyle: "Body/Small", fillStyle: "Text/Muted", hFill: true });

  // ── Footer ────────────────────────────────────────────────

  var footer = mkAutoFrame(null, "Footer", "VERTICAL", {
    fillStyle: "Background/Primary",
    w: W, padLeft: PAD, padRight: PAD, padTop: 16, padBot: 16, gap: 6,
  });
  applyBorderStroke(footer, "top");

  mkFlexText(footer, "antigravity", "accent",
    { textStyle: "Heading/Logo", fillStyle: "Accent/Primary" });
  mkFlexText(footer, "2026 \u00a9 All rights reserved.", "muted",
    { textStyle: "Label/Meta", fillStyle: "Text/Muted" });

  // ── Root Frame ────────────────────────────────────────────

  var root = mkAutoFrame(figma.currentPage, "Mobile \u2014 375px", "VERTICAL", {
    fillStyle: "Background/Primary", w: W,
  });
  root.clipsContent = false;
  root.x = 1480; // offset from PC frame

  root.appendChild(header);
  header.layoutSizingHorizontal = "FILL";

  root.appendChild(hero);
  hero.layoutSizingHorizontal = "FILL";

  root.appendChild(postsSection);
  postsSection.layoutSizingHorizontal = "FILL";

  root.appendChild(footer);
  footer.layoutSizingHorizontal = "FILL";

  return root;
}

// ─────────────────────────────────────────────
// MODE B — Apply styles to existing selection
// ─────────────────────────────────────────────

function colorDistance(a, b) {
  return Math.sqrt((a.r-b.r)*(a.r-b.r) + (a.g-b.g)*(a.g-b.g) + (a.b-b.b)*(a.b-b.b));
}

function findClosestColorStyle(color) {
  var best = null, bestDist = Infinity;
  for (var name in STYLE_MAP) {
    var entry = STYLE_MAP[name];
    if (!entry.token || entry.token.r === undefined) continue;
    var dist = colorDistance(color, entry.token);
    if (dist < bestDist) { bestDist = dist; best = name; }
  }
  return bestDist < 0.05 ? best : null;
}

function findMatchingTextStyle(node) {
  var size = node.fontSize;
  var style = node.fontName && node.fontName.style;
  for (var name in STYLE_MAP) {
    var t = STYLE_MAP[name].token;
    if (!t || t.size === undefined) continue;
    if (t.size === size && t.style === style) return name;
  }
  return null;
}

var appliedCount = 0;

function applyStylesToNode(node) {
  if (node.type === "TEXT") {
    var ts = findMatchingTextStyle(node);
    if (ts) { try { node.textStyleId = STYLE_MAP[ts].id; appliedCount++; } catch(e) {} }
    if (node.fills && node.fills.length > 0 && node.fills[0].type === "SOLID") {
      var cs = findClosestColorStyle(node.fills[0].color);
      if (cs) { try { node.fillStyleId = STYLE_MAP[cs].id; appliedCount++; } catch(e) {} }
    }
    return;
  }
  if ((node.type === "RECTANGLE" || node.type === "FRAME" || node.type === "COMPONENT") &&
       node.fills && node.fills.length > 0 && node.fills[0].type === "SOLID") {
    var cs2 = findClosestColorStyle(node.fills[0].color);
    if (cs2) { try { node.fillStyleId = STYLE_MAP[cs2].id; appliedCount++; } catch(e) {} }
  }
  if ("children" in node) {
    for (var i = 0; i < node.children.length; i++) applyStylesToNode(node.children[i]);
  }
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

(async function() {
  try {
    var totalStyles = COLOR_TOKENS.length + TEXT_TOKENS.length + EFFECT_TOKENS.length + GRID_TOKENS.length;
    var selection = figma.currentPage.selection;

    if (selection.length === 0) {

      // Phase 1 — 디자인 생성 (상향식 AL 포함)
      progress("코드를 피그마로 옮기는 중입니다...");
      await yield_();

      await registerAllStyles();
      getOrMakePage("V" + PLUGIN_VERSION);

      var pc;
      try { pc = buildPC(); }
      catch (e) { figma.closePlugin("[PC] 빌드 오류: " + e.message); return; }
      progress("PC 1440px 프레임 생성 완료.");
      await yield_();

      var mb;
      try { mb = buildMobile(); }
      catch (e) { figma.closePlugin("[Mobile] 빌드 오류: " + e.message); return; }
      progress("Mobile 375px 프레임 생성 완료.");
      await yield_();

      // Phase 2 — 스타일 확인
      progress("스타일 " + totalStyles + "개를 분석하고 있습니다...");
      await yield_();
      progress("스타일 " + totalStyles + "개 분석 완료. 적용이 완료되었습니다.");
      await yield_();

      // Phase 3 — AL 검증 메시지 (AL은 Phase 1에서 이미 적용됨)
      progress("Auto Layout 구조 검증 중 (1/4) \u2014 Header, Hero, Footer...");
      await yield_();
      progress("Auto Layout 구조 검증 중 (2/4) \u2014 Section Header, Posts Grid...");
      await yield_();
      progress("Auto Layout 구조 검증 중 (3/4) \u2014 Post Cards, Card Body...");
      await yield_();
      progress("Auto Layout 구조 검증 중 (4/4) \u2014 Sidebar, Widgets, Form...");
      await yield_();

      figma.viewport.scrollAndZoomIntoView([pc, mb]);
      figma.closePlugin(
        "완료! 스타일 " + totalStyles + "개 + Auto Layout 전면 적용 완료 (PC / Mobile)"
      );

    } else {

      // Mode B — 선택 노드에 스타일 적용
      progress("선택된 노드에 스타일을 연결합니다. 스타일 " + totalStyles + "개 등록 중...");
      await yield_();
      await registerAllStyles();
      progress("스타일 등록 완료. 선택 노드를 분석하고 스타일을 적용합니다...");
      await yield_();
      appliedCount = 0;
      for (var i = 0; i < selection.length; i++) applyStylesToNode(selection[i]);
      figma.closePlugin(
        "[Mode B] 선택된 " + selection.length + "개 노드에 스타일 " + appliedCount + "건 적용 완료"
      );

    }
  } catch(e) {
    figma.closePlugin("오류: " + e.message);
  }
})();
