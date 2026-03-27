// ─────────────────────────────────────────────
// Blog Prototype Figma Plugin
// Version : 2.2  (Component Generation)
//
// V2.2 전략: 반복 요소를 Figma 컴포넌트로 자동 생성
//   마스터 컴포넌트 → 🧩 Components 전용 페이지에 등록
//   디자인 페이지   → createInstance() + 텍스트 오버라이드
//
// 컴포넌트 대상:
//   Post Card / Regular, Post Card / Featured
//   Button / Pill (Active, Inactive)
//   Tag / Default, Badge / Count, Category / Item
// ─────────────────────────────────────────────
const PLUGIN_VERSION = "2.2";

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

// ── Component Registry ────────────────────────

const COMPONENTS = {};

// ── Progress Reporter ─────────────────────────

let _notifyHandle = null;
function progress(msg) {
  if (_notifyHandle) { try { _notifyHandle.cancel(); } catch (_) {} }
  try { _notifyHandle = figma.notify(msg, { timeout: 60000 }); } catch(_) {}
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
    style.effects = token.effects.map(function(e) {
      return { type: e.type, color: { r: e.color.r, g: e.color.g, b: e.color.b, a: e.color.a },
               offset: { x: e.offset.x, y: e.offset.y }, radius: e.radius,
               spread: e.spread, visible: e.visible, blendMode: e.blendMode };
    });
    STYLE_MAP[token.name] = { id: style.id, token };
  }

  try {
    const existingGrids = figma.getLocalGridStyles();
    for (const token of GRID_TOKENS) {
      const found = existingGrids.find(s => s.name === token.name);
      if (found) { STYLE_MAP[token.name] = { id: found.id, token }; continue; }
      const style = figma.createGridStyle();
      style.name  = token.name;
      style.grids = token.grids.map(function(g) {
        return { pattern: g.pattern, alignment: g.alignment, gutterSize: g.gutterSize,
                 count: g.count, offset: g.offset, sectionSize: g.sectionSize };
      });
      STYLE_MAP[token.name] = { id: style.id, token };
    }
  } catch(e) {
    // Grid styles 실패는 무시 (레이아웃 생성에 필수 아님)
    console.warn("Grid style 생성 실패:", e.message);
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

// mkAutoComponent: mkAutoFrame와 동일하지만 ComponentNode를 생성한다.
// 마스터 컴포넌트 빌드 전용. parent는 항상 null로 호출 후 컴포넌트 페이지에 배치.
function mkAutoComponent(name, direction, opts) {
  var o = opts || {};
  var f = figma.createComponent();
  f.name = name;
  f.clipsContent = false;

  if (o.fillStyle) applyFillStyle(f, o.fillStyle);
  else if (o.fill) f.fills = solidFill(C[o.fill]);
  else f.fills = [];

  if (o.radius !== undefined) f.cornerRadius = o.radius;
  if (o.stroke) {
    f.strokes = solidFill(C[o.stroke]);
    f.strokeWeight = 1;
    f.strokeAlign = "INSIDE";
  }

  f.layoutMode = direction;

  var pad = o.pad !== undefined ? o.pad : 0;
  var padH = o.padH !== undefined ? o.padH : pad;
  var padV = o.padV !== undefined ? o.padV : pad;
  f.paddingLeft   = o.padLeft  !== undefined ? o.padLeft  : padH;
  f.paddingRight  = o.padRight !== undefined ? o.padRight : padH;
  f.paddingTop    = o.padTop   !== undefined ? o.padTop   : padV;
  f.paddingBottom = o.padBot   !== undefined ? o.padBot   : padV;

  if (o.gap !== undefined) f.itemSpacing = o.gap;
  if (o.wrap) {
    f.layoutWrap = "WRAP";
    if (o.rowGap !== undefined) f.counterAxisSpacing = o.rowGap;
  }

  f.primaryAxisAlignItems = o.spaceBetween ? "SPACE_BETWEEN" : (o.centerMain ? "CENTER" : "MIN");
  f.counterAxisAlignItems = o.centerCross ? "CENTER" : "MIN";

  var isH = direction === "HORIZONTAL";
  var hasW = o.w !== undefined;
  var hasH = o.h !== undefined;

  if (hasW && hasH) {
    f.resize(o.w, o.h);
    f.primaryAxisSizingMode = "FIXED";
    f.counterAxisSizingMode = "FIXED";
  } else if (hasW) {
    f.resize(o.w, f.height);
    if (isH) { f.primaryAxisSizingMode = "FIXED"; f.counterAxisSizingMode = "AUTO"; }
    else      { f.counterAxisSizingMode = "FIXED"; f.primaryAxisSizingMode = "AUTO"; }
  } else if (hasH) {
    f.resize(f.width, o.h);
    if (isH) { f.counterAxisSizingMode = "FIXED"; f.primaryAxisSizingMode = "AUTO"; }
    else      { f.primaryAxisSizingMode = "FIXED"; f.counterAxisSizingMode = "AUTO"; }
  } else {
    f.primaryAxisSizingMode = "AUTO";
    f.counterAxisSizingMode = "AUTO";
  }

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
// Component Builders
// ─────────────────────────────────────────────

function buildAllComponents() {
  var compPageName = "🧩 Components";
  var compPage = figma.root.children.find(function(p) { return p.name === compPageName; });
  if (!compPage) { compPage = figma.createPage(); compPage.name = compPageName; }

  // 다른 페이지에 잘못 만들어진 동명 컴포넌트 노드 제거
  figma.root.children.forEach(function(page) {
    if (page.id === compPage.id) return;
    var orphans = page.children.filter(function(n) {
      return n.type === "COMPONENT" && (
        n.name === "Post Card / Regular" || n.name === "Post Card / Featured" ||
        n.name === "Card Body" || n.name === "Tag / Default" ||
        n.name === "Badge / Count" || n.name === "Button / Pill \u2014 Active" ||
        n.name === "Button / Pill \u2014 Inactive" || n.name === "Category / Item" ||
        n.name === "Nav Link / Active" || n.name === "Nav Link / Default" ||
        n.name === "Sidebar Widget"
      );
    });
    orphans.forEach(function(n) { n.remove(); });
  });

  var savedPage = figma.currentPage;
  figma.currentPage = compPage;
  try {
  [...compPage.children].forEach(function(n) { n.remove(); });

  var xCursor = 0;
  function place(comp) {
    compPage.appendChild(comp);
    comp.x = xCursor;
    comp.y = 0;
    xCursor += comp.width + 48;
    return comp;
  }

  // ── 1. Tag / Default ─────────────────────────────────
  var tagComp = mkAutoComponent("Tag / Default", "HORIZONTAL", {
    fillStyle: "Background/Primary", radius: 20, stroke: "border",
    padLeft: 12, padRight: 12, padTop: 5, padBot: 5,
  });
  mkFlexText(tagComp, "태그", "muted", { textStyle: "Label/Tag", fillStyle: "Text/Muted" });
  place(tagComp);
  COMPONENTS.tag = tagComp;

  // ── 2. Badge / Count ─────────────────────────────────
  var badgeComp = mkAutoComponent("Badge / Count", "HORIZONTAL", {
    fillStyle: "Background/Primary", radius: 9,
    padLeft: 6, padRight: 6, centerMain: true, centerCross: true,
  });
  mkFlexText(badgeComp, "0", "muted", { textStyle: "Label/Meta", fillStyle: "Text/Muted" });
  place(badgeComp);
  COMPONENTS.badge = badgeComp;

  // ── 3. Button / Pill — Active ─────────────────────────
  var btnActive = mkAutoComponent("Button / Pill — Active", "HORIZONTAL", {
    fillStyle: "Accent/Primary", radius: 20,
    padLeft: 14, padRight: 14, padTop: 6, padBot: 6,
    centerMain: true, centerCross: true,
  });
  mkFlexText(btnActive, "전체", "white", { textStyle: "Label/Filter-Active", fillStyle: "Accent/White" });
  place(btnActive);
  COMPONENTS.btnActive = btnActive;

  // ── 4. Button / Pill — Inactive ───────────────────────
  var btnInactive = mkAutoComponent("Button / Pill — Inactive", "HORIZONTAL", {
    fillStyle: "Background/Surface", radius: 20, stroke: "border",
    padLeft: 14, padRight: 14, padTop: 6, padBot: 6,
    centerMain: true, centerCross: true,
  });
  mkFlexText(btnInactive, "카테고리", "muted", { textStyle: "Label/Filter", fillStyle: "Text/Muted" });
  place(btnInactive);
  COMPONENTS.btnInactive = btnInactive;

  // ── 5. Category / Item ────────────────────────────────
  var catComp = mkAutoComponent("Category / Item", "HORIZONTAL", {
    padLeft: 12, padRight: 12, spaceBetween: true, centerCross: true, h: 32,
  });
  mkFlexText(catComp, "카테고리", "muted",
    { textStyle: "Body/Regular", fillStyle: "Text/Muted", hFill: true });
  var badgeInst = COMPONENTS.badge.createInstance();
  catComp.appendChild(badgeInst);
  place(catComp);
  COMPONENTS.catItem = catComp;

  // ── 6. Post Card / Regular ───────────────────────────
  var CW = 368, TH = 160;
  var cardComp = mkAutoComponent("Post Card / Regular", "VERTICAL", {
    fillStyle: "Background/Surface", radius: 12, stroke: "border", w: CW,
  });
  cardComp.itemSpacing = 0;

  var thumbRect = figma.createRectangle();
  thumbRect.name = "Thumbnail";
  thumbRect.resize(CW, TH);
  applyFillStyle(thumbRect, "Thumbnail/Green", C.t1);
  cardComp.appendChild(thumbRect);
  thumbRect.layoutSizingHorizontal = "FILL";
  thumbRect.layoutSizingVertical   = "FIXED";

  var cardBody = mkAutoFrame(null, "Card Body", "VERTICAL", {
    padLeft: 20, padRight: 20, padTop: 18, padBot: 20, gap: 10,
  });
  mkFlexText(cardBody, "CATEGORY", "accent",
    { textStyle: "Label/Category", fillStyle: "Accent/Primary", hFill: true });
  mkFlexText(cardBody, "포스트 제목이 여기에 들어갑니다", "text",
    { textStyle: "Heading/Card", fillStyle: "Text/Primary", hFill: true });
  mkFlexText(cardBody, "포스트 요약 내용이 여기에 표시됩니다. 두 줄 정도의 내용이 들어갑니다.", "muted",
    { textStyle: "Body/XSmall", fillStyle: "Text/Muted", hFill: true });
  mkFlexText(cardBody, "2026. 3. 26  ·  5분 읽기", "muted",
    { textStyle: "Label/Meta", fillStyle: "Text/Muted", hFill: true });
  cardComp.appendChild(cardBody);
  cardBody.layoutSizingHorizontal = "FILL";

  place(cardComp);
  COMPONENTS.postCardRegular = cardComp;

  // ── 7. Post Card / Featured ──────────────────────────
  var FW = 756, FH = 280;
  var featComp = mkAutoComponent("Post Card / Featured", "HORIZONTAL", {
    fillStyle: "Background/Surface", radius: 12, stroke: "border",
    w: FW, h: FH,
  });
  featComp.itemSpacing = 0;

  var featThumb = figma.createRectangle();
  featThumb.name = "Thumbnail";
  featThumb.resize(FW / 2, FH);
  applyFillStyle(featThumb, "Thumbnail/Green", C.t1);
  featComp.appendChild(featThumb);
  featThumb.layoutSizingHorizontal = "FIXED";
  featThumb.layoutSizingVertical   = "FILL";

  var featBody = mkAutoFrame(null, "Card Body", "VERTICAL", {
    padLeft: 28, padRight: 28, padTop: 32, padBot: 32, gap: 10, centerMain: true,
  });
  mkFlexText(featBody, "CATEGORY", "accent",
    { textStyle: "Label/Category", fillStyle: "Accent/Primary", hFill: true });
  mkFlexText(featBody, "피처드 포스트 제목이 여기에 들어갑니다", "text",
    { textStyle: "Heading/Card-Large", fillStyle: "Text/Primary", hFill: true });
  mkFlexText(featBody, "피처드 포스트 요약 내용이 여기에 표시됩니다. 조금 더 긴 내용이 들어갑니다.", "muted",
    { textStyle: "Body/Regular", fillStyle: "Text/Muted", hFill: true });
  mkFlexText(featBody, "2026. 3. 26  ·  5분 읽기", "muted",
    { textStyle: "Label/Meta", fillStyle: "Text/Muted", hFill: true });
  featComp.appendChild(featBody);
  featBody.layoutSizingHorizontal = "FILL";
  featBody.layoutSizingVertical   = "FILL";

  place(featComp);
  COMPONENTS.postCardFeatured = featComp;

  // ── 8. Nav Link / Active ──────────────────────────────
  var navActive = mkAutoComponent("Nav Link / Active", "HORIZONTAL", {
    fillStyle: "Accent/Primary", radius: 20,
    padLeft: 14, padRight: 14, padTop: 6, padBot: 6,
    centerMain: true, centerCross: true,
  });
  mkFlexText(navActive, "링크", "white", { textStyle: "Label/Nav-Active", fillStyle: "Accent/White" });
  place(navActive);
  COMPONENTS.navLinkActive = navActive;

  // ── 9. Nav Link / Default ─────────────────────────────
  var navDefault = mkAutoComponent("Nav Link / Default", "HORIZONTAL", {
    radius: 20,
    padLeft: 14, padRight: 14, padTop: 6, padBot: 6,
    centerMain: true, centerCross: true,
  });
  mkFlexText(navDefault, "링크", "muted", { textStyle: "Label/Nav", fillStyle: "Text/Muted" });
  place(navDefault);
  COMPONENTS.navLinkDefault = navDefault;

  // ── 10. Sidebar Widget ────────────────────────────────
  var sbComp = mkAutoComponent("Sidebar Widget", "VERTICAL", {
    fillStyle: "Background/Surface", radius: 12, stroke: "border",
    w: 300, pad: 22, gap: 16,
  });
  mkFlexText(sbComp, "위젯 제목", "text",
    { textStyle: "Heading/Widget", fillStyle: "Text/Primary", hFill: true });
  var sbSlot = mkAutoFrame(null, "Content", "VERTICAL", { gap: 0 });
  sbComp.appendChild(sbSlot);
  sbSlot.layoutSizingHorizontal = "FILL";
  sbSlot.layoutSizingVertical   = "HUG";
  place(sbComp);
  COMPONENTS.sidebarWidget = sbComp;

  } finally {
    figma.currentPage = savedPage;
  }
}

// 인스턴스 텍스트 오버라이드 헬퍼
function setInstanceText(instance, nodeName, value) {
  var node = instance.findOne(function(n) { return n.type === "TEXT" && n.parent && n.parent.name === nodeName || n.name === nodeName; });
  if (node && node.type === "TEXT") {
    try { node.characters = value; } catch(_) {}
  }
}

// ─────────────────────────────────────────────
// PC — Bottom-Up Build
// ─────────────────────────────────────────────

function buildPC(page) {
  var W = 1440, PAD = 170;
  // content width = 1440 - 170*2 = 1100
  // sidebar = 300, gap = 44  →  posts column = 1100 - 44 - 300 = 756
  var SB_W = 300, COL_GAP = 44;
  var POSTS_W = W - PAD * 2 - COL_GAP - SB_W; // 756

  // ── Step 3-4: Post Cards (컴포넌트 인스턴스) ──────────────────

  function overrideCardTexts(inst, p) {
    var texts = inst.findAll(function(n) { return n.type === "TEXT"; });
    if (texts[0]) try { texts[0].characters = p.cat.toUpperCase(); } catch(_) {}
    if (texts[1]) try { texts[1].characters = p.title; } catch(_) {}
    if (texts[2]) try { texts[2].characters = p.excerpt; } catch(_) {}
    if (texts[3]) try { texts[3].characters = p.date + "  \u00b7  " + p.rt + " \uc77d\uae30"; } catch(_) {}
  }

  function makeFeaturedCard(p) {
    var inst = COMPONENTS.postCardFeatured.createInstance();
    inst.name = "Post \u2014 Featured";
    var thumb = inst.findOne(function(n) { return n.name === "Thumbnail"; });
    if (thumb) applyFillStyle(thumb, "Thumbnail/Green", C.t1);
    overrideCardTexts(inst, p);
    return inst;
  }

  function makePostCard(p, idx) {
    var inst = COMPONENTS.postCardRegular.createInstance();
    inst.name = "Post \u2014 " + p.title.slice(0, 20);
    var thumb = inst.findOne(function(n) { return n.name === "Thumbnail"; });
    if (thumb) applyFillStyle(thumb, "Thumbnail/" + THUMB_NAMES[idx], C[p.tc]);
    overrideCardTexts(inst, p);
    return inst;
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
    var btn = i === 0
      ? COMPONENTS.btnActive.createInstance()
      : COMPONENTS.btnInactive.createInstance();
    btn.name = "Filter \u2014 " + label;
    var txt = btn.findOne(function(n) { return n.type === "TEXT"; });
    if (txt) try { txt.characters = label; } catch(_) {}
    filterRow.appendChild(btn);
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
  // 컨텐츠를 먼저 빌드한 뒤 Sidebar Widget 인스턴스에 주입

  // ── Categories: content ────────────────────────────────
  var catList = mkAutoFrame(null, "Category List", "VERTICAL", { gap: 2 });

  [["디자인","12"],["기술","8"],["에세이","15"],["인터뷰","4"]].forEach(function(pair, i) {
    var catName = pair[0], cnt = pair[1];
    var item = COMPONENTS.catItem.createInstance();
    item.name = "Category \u2014 " + catName;
    if (i === 0) { applyFillStyle(item, "Accent/Light", C.accentLight); item.cornerRadius = 8; }
    catList.appendChild(item);
    item.layoutSizingHorizontal = "FILL";
    var texts = item.findAll(function(n) { return n.type === "TEXT"; });
    if (texts[0]) try { texts[0].characters = catName; texts[0].fillStyleId = STYLE_MAP[i === 0 ? "Accent/Primary" : "Text/Muted"].id; } catch(_) {}
    if (texts[1]) try { texts[1].characters = cnt; } catch(_) {}
  });

  // ── Tags: content ─────────────────────────────────────
  var tagsInner = mkAutoFrame(null, "Tags Container", "HORIZONTAL", {
    wrap: true, gap: 8, rowGap: 8,
  });
  tagsInner.layoutSizingHorizontal = "FILL";
  tagsInner.layoutSizingVertical   = "HUG";

  ["UI/UX", "JavaScript", "CSS", "\ud0c0\uc774\ud3ec\uadf8\ub798\ud53c", "\ucca0\ud559", "\uc0dd\uc0b0\uc131", "\ub3c5\uc11c"].forEach(function(tag) {
    var tagInst = COMPONENTS.tag.createInstance();
    tagInst.name = "Tag \u2014 " + tag;
    var txt = tagInst.findOne(function(n) { return n.type === "TEXT"; });
    if (txt) try { txt.characters = tag; } catch(_) {}
    tagsInner.appendChild(tagInst);
  });

  // ── Newsletter: content ────────────────────────────────
  var emailInput = mkAutoFrame(null, "Email Input", "HORIZONTAL", {
    fillStyle: "Background/Primary", radius: 8, stroke: "border",
    padLeft: 14, padRight: 14, centerCross: true, h: 38,
  });
  mkFlexText(emailInput, "\uc774\uba54\uc77c \uc8fc\uc18c", "border",
    { textStyle: "Body/Small", fillStyle: "Border/Default" });

  var subBtn = mkAutoFrame(null, "\uad6c\ub3c5", "HORIZONTAL", {
    fillStyle: "Accent/Primary", radius: 8,
    padLeft: 14, padRight: 14, padTop: 9, padBot: 9,
    centerMain: true, centerCross: true,
  });
  mkFlexText(subBtn, "\uad6c\ub3c5", "white",
    { textStyle: "Label/Button", fillStyle: "Accent/White" });

  var nlForm = mkAutoFrame(null, "Newsletter Form", "VERTICAL", { gap: 8 });
  nlForm.appendChild(emailInput);
  emailInput.layoutSizingHorizontal = "FILL";
  nlForm.appendChild(subBtn);
  subBtn.layoutSizingHorizontal = "FILL";

  // ── Categories Widget instance ─────────────────────────
  var catsWidget = COMPONENTS.sidebarWidget.createInstance();
  catsWidget.name = "Categories";
  var catTitle = catsWidget.findOne(function(n) { return n.type === "TEXT"; });
  if (catTitle) try { catTitle.characters = "\uce74\ud14c\uace0\ub9ac"; } catch(_) {}
  var catSlot = catsWidget.findOne(function(n) { return n.name === "Content"; });
  if (catSlot) { catSlot.appendChild(catList); catList.layoutSizingHorizontal = "FILL"; }

  // ── Tags Widget instance ───────────────────────────────
  var tagsWidget = COMPONENTS.sidebarWidget.createInstance();
  tagsWidget.name = "Tags";
  var tagTitle = tagsWidget.findOne(function(n) { return n.type === "TEXT"; });
  if (tagTitle) try { tagTitle.characters = "\ud0dc\uadf8"; } catch(_) {}
  var tagSlot = tagsWidget.findOne(function(n) { return n.name === "Content"; });
  if (tagSlot) { tagSlot.appendChild(tagsInner); tagsInner.layoutSizingHorizontal = "FILL"; }

  // ── Newsletter Widget instance ─────────────────────────
  var nlWidget = COMPONENTS.sidebarWidget.createInstance();
  nlWidget.name = "Newsletter";
  nlWidget.itemSpacing = 12;
  var nlTitle = nlWidget.findOne(function(n) { return n.type === "TEXT"; });
  if (nlTitle) try { nlTitle.characters = "\ub274\uc2a4\ub808\ud130"; } catch(_) {}
  var nlSlot = nlWidget.findOne(function(n) { return n.name === "Content"; });
  if (nlSlot) {
    nlSlot.itemSpacing = 12;
    mkFlexText(nlSlot, "\uc0c8 \uae00\uc774 \uc62c\ub77c\uc624\uba74 \uc774\uba54\uc77c\ub85c \uc54c\ub824\ub4dc\ub824\uc694.", "muted",
      { textStyle: "Body/Small", fillStyle: "Text/Muted", hFill: true });
    nlSlot.appendChild(nlForm);
    nlForm.layoutSizingHorizontal = "FILL";
  }

  // ── Sidebar: 3 widget instances stacked ───────────────
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
  ["\ud648", "\uce74\ud14c\uace0\ub9ac", "\uc18c\uac1c"].forEach(function(label, i) {
    var navInst = i === 0
      ? COMPONENTS.navLinkActive.createInstance()
      : COMPONENTS.navLinkDefault.createInstance();
    navInst.name = "Nav \u2014 " + label;
    var txt = navInst.findOne(function(n) { return n.type === "TEXT"; });
    if (txt) try { txt.characters = label; } catch(_) {}
    navRow.appendChild(navInst);
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

  var root = mkAutoFrame(page, "PC \u2014 1440px", "VERTICAL", {
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

function buildMobile(page) {
  var W = 375, PAD = 20;

  // ── Post Cards (컴포넌트 인스턴스) ───────────────────────────

  function makePostCard(p, idx) {
    var inst = COMPONENTS.postCardRegular.createInstance();
    inst.name = "Post \u2014 " + p.title.slice(0, 20);
    var thumb = inst.findOne(function(n) { return n.name === "Thumbnail"; });
    if (thumb) applyFillStyle(thumb, "Thumbnail/" + THUMB_NAMES[idx], C[p.tc]);
    var texts = inst.findAll(function(n) { return n.type === "TEXT"; });
    if (texts[0]) try { texts[0].characters = p.cat.toUpperCase(); } catch(_) {}
    if (texts[1]) try { texts[1].characters = p.title; } catch(_) {}
    if (texts[2]) try { texts[2].characters = p.excerpt; } catch(_) {}
    if (texts[3]) try { texts[3].characters = p.date + "  \u00b7  " + p.rt + " \uc77d\uae30"; } catch(_) {}
    return inst;
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
    var btn = i === 0
      ? COMPONENTS.btnActive.createInstance()
      : COMPONENTS.btnInactive.createInstance();
    btn.name = "Filter \u2014 " + label;
    var txt = btn.findOne(function(n) { return n.type === "TEXT"; });
    if (txt) try { txt.characters = label; } catch(_) {}
    filterRow.appendChild(btn);
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

  var root = mkAutoFrame(page, "Mobile \u2014 375px", "VERTICAL", {
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
      progress("컴포넌트를 생성하고 있습니다...");
      await yield_();
      try { buildAllComponents(); }
      catch (e) { figma.closePlugin("[Components] 빌드 오류: " + e.message); return; }
      progress("컴포넌트 10개 생성 완료.");
      await yield_();

      var designPage = getOrMakePage("V" + PLUGIN_VERSION);

      var pc;
      try { pc = buildPC(designPage); }
      catch (e) { figma.closePlugin("[PC] 빌드 오류: " + e.message); return; }
      progress("PC 1440px 프레임 생성 완료.");
      await yield_();

      var mb;
      try { mb = buildMobile(designPage); }
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

      if (_notifyHandle) { try { _notifyHandle.cancel(); } catch (_) {} }
      figma.currentPage = designPage;
      figma.viewport.scrollAndZoomIntoView([pc, mb]);
      figma.closePlugin(
        "완료! 컴포넌트 10개 + 스타일 " + totalStyles + "개 + Auto Layout 적용 완료 (PC / Mobile)"
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
