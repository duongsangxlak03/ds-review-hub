import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, "src", "assets", "insights", "local-previews");
const WIDTH = 1600;
const HEIGHT = 900;

const chromeCandidates = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
];

const chromePath = chromeCandidates.find((candidate) => fs.existsSync(candidate));
if (!chromePath) throw new Error("Chrome or Edge is required to export local SVG visuals to PNG.");

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const palette = {
  paper: "#fbfaf4",
  ink: "#111111",
  lime: "#adff2f",
  mint: "#dff8df",
  blue: "#d8f0ff",
  purple: "#e7d8ff",
  peach: "#ffe4d8",
  yellow: "#fff0b8",
};

const sharedDefs = `
  <defs>
    <filter id="paper-grain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="7" result="noise"/>
      <feColorMatrix in="noise" type="saturate" values="0" result="gray"/>
      <feComponentTransfer in="gray" result="faint">
        <feFuncA type="table" tableValues="0 0.035"/>
      </feComponentTransfer>
      <feBlend in="SourceGraphic" in2="faint" mode="multiply"/>
    </filter>
    <marker id="arrow" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto">
      <path d="M 0 0 L 12 6 L 0 12 z" fill="${palette.ink}"/>
    </marker>
    <style><![CDATA[
      .display { font-family: "Arial Black", "Inter", Arial, sans-serif; font-weight: 900; fill: ${palette.ink}; letter-spacing: -3px; }
      .label { font-family: "Arial Black", "Inter", Arial, sans-serif; font-weight: 900; fill: ${palette.ink}; letter-spacing: -.5px; }
      .body { font-family: "Inter", Arial, sans-serif; font-weight: 500; fill: ${palette.ink}; }
      .micro { font-family: "Inter", Arial, sans-serif; font-weight: 800; fill: ${palette.ink}; letter-spacing: 3px; }
      .card { stroke: ${palette.ink}; stroke-width: 3; }
      .line { fill: none; stroke: ${palette.ink}; stroke-width: 4; stroke-linecap: round; stroke-linejoin: round; }
    ]]></style>
  </defs>`;

function shell(content) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
    ${sharedDefs}
    <rect width="1600" height="900" fill="${palette.paper}"/>
    <g filter="url(#paper-grain)">${content}</g>
  </svg>`;
}

function iconDocument(x, y) {
  return `<g transform="translate(${x} ${y})" class="line">
    <path d="M8 0h66l26 26v104H8z" fill="none"/>
    <path d="M74 0v28h26"/>
    <path d="M28 56h52M28 78h52M28 100h38"/>
  </g>`;
}

function iconLayers(x, y) {
  return `<g transform="translate(${x} ${y})" class="line">
    <path d="M54 0 108 28 54 56 0 28Z" fill="none"/>
    <path d="m8 48 46 24 46-24M8 70l46 24 46-24"/>
  </g>`;
}

function iconWand(x, y) {
  return `<g transform="translate(${x} ${y})" class="line">
    <path d="m18 100 74-74 18 18-74 74z"/>
    <path d="M88 3v14M119 23l-12 8M124 56h-14M28 18l8 12"/>
  </g>`;
}

function iconReview(x, y) {
  return `<g transform="translate(${x} ${y})" class="line">
    <circle cx="48" cy="48" r="40"/><path d="m77 77 34 34"/>
    <path d="m29 49 13 13 28-32" stroke="${palette.lime}" stroke-width="9"/>
  </g>`;
}

function iconLoop(x, y) {
  return `<g transform="translate(${x} ${y})" class="line">
    <path d="M18 48A42 42 0 0 1 92 20" marker-end="url(#arrow)"/>
    <path d="M94 62A42 42 0 0 1 20 90" marker-end="url(#arrow)"/>
  </g>`;
}

function workflowVisual() {
  const cards = [
    { x: 72, fill: palette.mint, label: "BRIEF", icon: iconDocument(58, 78), foot: "GOAL  •  AUDIENCE  •  MESSAGE" },
    { x: 378, fill: palette.blue, label: "CONTEXT", icon: iconLayers(60, 86), foot: "REFERENCES  •  STYLE  •  RULES" },
    { x: 684, fill: palette.peach, label: "CREATE", icon: iconWand(62, 75), foot: "GENERATE THE ASSETS" },
    { x: 990, fill: palette.purple, label: "REVIEW", icon: iconReview(70, 75), foot: "CHECK  •  CHOOSE  •  IMPROVE" },
    { x: 1296, fill: palette.mint, label: "REUSE", icon: iconLoop(68, 78), foot: "SAVE  •  ADAPT  •  RUN AGAIN" },
  ];

  const renderedCards = cards.map((card, index) => `
    <g transform="translate(${card.x} 298)">
      <rect class="card" width="238" height="270" rx="18" fill="${card.fill}"/>
      <circle cx="36" cy="38" r="23" fill="${palette.lime}" stroke="${palette.ink}" stroke-width="2"/>
      <text x="36" y="47" text-anchor="middle" class="label" font-size="27">${index + 1}</text>
      ${card.icon}
      <text x="119" y="226" text-anchor="middle" class="label" font-size="27">${card.label}</text>
      <text x="119" y="305" text-anchor="middle" class="micro" font-size="11">${card.foot}</text>
    </g>
    ${index < cards.length - 1 ? `<path class="line" d="M${card.x + 244} 432 H${cards[index + 1].x - 10}" marker-end="url(#arrow)"/>` : ""}
  `).join("");

  return shell(`
    <text x="72" y="104" class="display" font-size="78">ONE BRIEF.</text>
    <rect x="525" y="128" width="760" height="78" rx="6" fill="${palette.lime}"/>
    <text x="72" y="194" class="display" font-size="78">A REPEATABLE CREATIVE SYSTEM.</text>
    <text x="1320" y="96" class="micro" font-size="15">DS REVIEW HUB</text>
    <path class="line" d="M1320 115h208"/>
    ${renderedCards}
    <text x="78" y="746" class="label" font-size="28">SAME BRIEF. MORE POSSIBILITIES.</text>
    <path class="line" d="M510 736c120-68 238-68 350 0" marker-end="url(#arrow)"/>
    <g transform="translate(930 674)">
      <rect class="card" width="170" height="122" rx="16" fill="${palette.yellow}"/>
      <text x="85" y="57" text-anchor="middle" class="label" font-size="22">IMAGES</text>
      <text x="85" y="88" text-anchor="middle" class="body" font-size="15">Static assets</text>
    </g>
    <g transform="translate(1122 674)">
      <rect class="card" width="170" height="122" rx="16" fill="${palette.blue}"/>
      <text x="85" y="57" text-anchor="middle" class="label" font-size="22">VIDEOS</text>
      <text x="85" y="88" text-anchor="middle" class="body" font-size="15">Motion assets</text>
    </g>
    <g transform="translate(1314 674)">
      <rect class="card" width="214" height="122" rx="16" fill="${palette.mint}"/>
      <text x="107" y="57" text-anchor="middle" class="label" font-size="22">CAMPAIGNS</text>
      <text x="107" y="88" text-anchor="middle" class="body" font-size="15">Repeatable systems</text>
    </g>
  `);
}

function layersVisual() {
  const arcs = [
    { rx: 330, ry: 170, label: "FOUNDATION", color: palette.purple },
    { rx: 500, ry: 300, label: "INTENT", color: palette.blue },
    { rx: 680, ry: 430, label: "CONTENT", color: palette.purple },
    { rx: 860, ry: 560, label: "AUTHORITY", color: palette.mint },
    { rx: 1040, ry: 700, label: "DISCOVERY", color: palette.lime },
  ];
  const arcSvg = arcs.map(({ rx, ry }) => `<path d="M${800 - rx} 900 A${rx} ${ry} 0 0 1 ${800 + rx} 900" class="line" stroke-width="2.5"/>`).join("");
  const labelY = [748, 618, 488, 358, 218];
  const labels = arcs.map((arc, i) => `
    <rect x="650" y="${labelY[i] - 34}" width="300" height="58" rx="29" fill="${arc.color}" stroke="${palette.ink}" stroke-width="2.5"/>
    <text x="800" y="${labelY[i] + 6}" text-anchor="middle" class="label" font-size="31">${arc.label}</text>
  `).join("");
  const tags = [
    ["TECHNICAL SEO", 475, 828, palette.purple], ["SITE STRUCTURE", 880, 828, palette.purple],
    ["TOPICS", 425, 702, palette.blue], ["QUESTIONS", 1020, 702, palette.blue],
    ["USE CASES", 320, 566, palette.purple], ["COMPARISONS", 1120, 566, palette.purple],
    ["REVIEWS", 230, 430, palette.mint], ["COMMUNITIES", 1150, 430, palette.mint],
    ["AI ANSWERS", 290, 282, palette.blue], ["RECOMMENDATIONS", 1110, 282, palette.blue],
  ].map(([text, x, y, fill]) => `
    <rect x="${x}" y="${y}" width="200" height="48" rx="24" fill="${fill}"/>
    <text x="${Number(x) + 100}" y="${Number(y) + 32}" text-anchor="middle" class="body" font-size="19">${text}</text>
  `).join("");

  return shell(`
    <text x="800" y="90" text-anchor="middle" class="display" font-size="72">MODERN SEARCH VISIBILITY</text>
    <text x="800" y="138" text-anchor="middle" class="body" font-size="26">From technical foundation to discovery across search and AI</text>
    ${arcSvg}${labels}${tags}
  `);
}

function simpleIcon(type) {
  const icons = {
    research: `<circle cx="62" cy="55" r="27" class="line"/><path d="m82 76 26 26M22 104h48" class="line"/>`,
    create: `<path d="M18 92 88 22l18 18-70 70zM85 8v20M115 30l-17 9" class="line"/>`,
    distribute: `<path d="m18 58 78-34v68L18 58Zm0 0v52M96 58h24" class="line"/>`,
    automate: `<circle cx="62" cy="60" r="29" class="line"/><path d="M62 9v19M62 92v19M11 60h19M94 60h19" class="line"/>`,
    measure: `<path d="M16 104V32M16 104h104M34 88l22-24 22 10 31-42" class="line" marker-end="url(#arrow)"/>`,
    collaborate: `<circle cx="62" cy="42" r="18" class="line"/><circle cx="28" cy="84" r="14" class="line"/><circle cx="98" cy="84" r="14" class="line"/><path d="M48 57 34 70M76 57l16 13M43 98h38" class="line"/>`,
  };
  return icons[type];
}

function stackVisual() {
  const cards = [
    { x: 70, y: 260, title: "RESEARCH", color: palette.purple, icon: "research" },
    { x: 590, y: 260, title: "CREATE", color: palette.lime, icon: "create" },
    { x: 1110, y: 260, title: "DISTRIBUTE", color: palette.purple, icon: "distribute" },
    { x: 70, y: 620, title: "COLLABORATE", color: palette.lime, icon: "collaborate" },
    { x: 590, y: 620, title: "MEASURE", color: palette.purple, icon: "measure" },
    { x: 1110, y: 620, title: "AUTOMATE", color: palette.lime, icon: "automate" },
  ];
  const cardsSvg = cards.map(card => `
    <g transform="translate(${card.x} ${card.y})">
      <rect class="card" width="420" height="220" rx="20" fill="#fffef9"/>
      <path d="M20 0h380a20 20 0 0 1 20 20v58H0V20A20 20 0 0 1 20 0Z" fill="${card.color}"/>
      <text x="210" y="53" text-anchor="middle" class="label" font-size="35">${card.title}</text>
      <g transform="translate(146 94)">${simpleIcon(card.icon)}</g>
    </g>
  `).join("");

  return shell(`
    <text x="800" y="82" text-anchor="middle" class="display" font-size="72">BUILD A SMALL AI STACK</text>
    <rect x="652" y="112" width="760" height="76" rx="7" fill="${palette.lime}"/>
    <text x="800" y="176" text-anchor="middle" class="display" font-size="70">AROUND YOUR REAL WORKFLOW</text>
    ${cardsSvg}
    <path class="line" d="M490 370h88" marker-end="url(#arrow)"/>
    <path class="line" d="M1010 370h88" marker-end="url(#arrow)"/>
    <path class="line" d="M1320 492v116" marker-end="url(#arrow)"/>
    <path class="line" d="M1110 730h-88" marker-end="url(#arrow)"/>
    <path class="line" d="M590 730h-88" marker-end="url(#arrow)"/>
    <path class="line" d="M280 620V494" marker-end="url(#arrow)"/>
    <rect x="662" y="510" width="276" height="92" rx="46" fill="${palette.lime}" stroke="${palette.ink}" stroke-width="3"/>
    <text x="800" y="548" text-anchor="middle" class="label" font-size="27">WORKFLOW</text>
    <text x="800" y="580" text-anchor="middle" class="label" font-size="27">FIRST</text>
  `);
}

const variants = [
  ["option-a-workflow", workflowVisual()],
  ["option-b-layers", layersVisual()],
  ["option-c-modular-stack", stackVisual()],
];

const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), "dsreviewhub-svg-render-"));
try {
  for (const [name, svg] of variants) {
    const svgPath = path.join(OUTPUT_DIR, `${name}.svg`);
    const pngPath = path.join(OUTPUT_DIR, `${name}.png`);
    fs.writeFileSync(svgPath, svg, "utf8");
    const result = spawnSync(chromePath, [
      "--headless=new",
      "--hide-scrollbars",
      "--disable-gpu",
      "--force-device-scale-factor=1",
      `--window-size=${WIDTH},${HEIGHT}`,
      `--user-data-dir=${profileDir}`,
      `--screenshot=${pngPath}`,
      pathToFileURL(svgPath).href,
    ], { encoding: "utf8", windowsHide: true });
    if (result.status !== 0 || !fs.existsSync(pngPath)) {
      throw new Error(`Could not render ${name}: ${result.stderr || result.stdout}`);
    }
    console.log(`${name}: ${pngPath}`);
  }
} finally {
  fs.rmSync(profileDir, { recursive: true, force: true });
}
