import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const assets = join(root, 'assets');
const profile = JSON.parse(readFileSync(join(root, 'profile-data.json'), 'utf8'));
const portrait = readFileSync(join(assets, 'profile.jpg')).toString('base64');

const themes = {
  dark: { bg: '#080A12', panel: '#111522', surface: '#161B2B', text: '#F7F8FF', muted: '#A9B0C5', line: '#2B3450', cyan: '#54E6FF', purple: '#9B7BFF', lime: '#72F3C8', peach: '#FFB37A' },
  light: { bg: '#F6F7FC', panel: '#FFFFFF', surface: '#F0F3FA', text: '#171B2B', muted: '#58647A', line: '#D7DDED', cyan: '#087EA4', purple: '#7048D8', lime: '#087A67', peach: '#BD5D18' }
};

const escape = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const lines = (value, size) => {
  const words = String(value).split(/\s+/);
  return words.reduce((result, word) => {
    if (!result.length || `${result.at(-1)} ${word}`.length > size) result.push(word);
    else result[result.length - 1] += ` ${word}`;
    return result;
  }, []);
};
const textLines = (value, x, y, lineHeight) => lines(value, 78).map((line, index) => `<tspan x="${x}" dy="${index ? lineHeight : 0}">${escape(line)}</tspan>`).join('');

function documentSvg(name, theme, width, height, content) {
  const p = themes[theme];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="${name}-${theme}-title ${name}-${theme}-description">
  <title id="${name}-${theme}-title">Laouën Bernard — ${name}</title>
  <desc id="${name}-${theme}-description">A polished, readable GitHub profile panel for Laouën Bernard.</desc>
  <defs>
    <linearGradient id="${name}-${theme}-accent" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${p.cyan}"/><stop offset=".55" stop-color="${p.purple}"/><stop offset="1" stop-color="${p.lime}"/></linearGradient>
    <radialGradient id="${name}-${theme}-glow" cx="0" cy="0" r="1"><stop stop-color="${p.purple}" stop-opacity=".32"/><stop offset="1" stop-color="${p.purple}" stop-opacity="0"/></radialGradient>
    <filter id="${name}-${theme}-soft"><feGaussianBlur stdDeviation="12" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  ${content(p)}
</svg>`;
}

function hero(p) {
  const identity = profile.identity;
  const metric = (x, value, label, color) => `<g transform="translate(${x} 390)"><rect width="184" height="66" rx="16" fill="${p.surface}" stroke="${p.line}"/><rect x="16" y="14" width="5" height="38" rx="2.5" fill="${color}"/><text x="36" y="31" fill="${p.text}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="24" font-weight="800">${value}</text><text x="36" y="51" fill="${p.muted}" font-family="ui-monospace, monospace" font-size="10" letter-spacing=".7">${label}</text></g>`;
  return `<rect width="1200" height="500" rx="32" fill="${p.bg}"/>
  <circle cx="1040" cy="44" r="430" fill="url(#hero-${p === themes.dark ? 'dark' : 'light'}-glow)"/>
  <path d="M0 83H1200M0 466H1200" stroke="${p.line}" stroke-opacity=".7"/>
  <path d="M730 0V500" stroke="${p.line}" stroke-dasharray="4 10"/>
  <text x="66" y="60" fill="${p.cyan}" font-family="ui-monospace, monospace" font-size="12" font-weight="700" letter-spacing="1.6">LALA44599  /  DIGITAL PROFILE</text>
  <text x="66" y="160" fill="${p.text}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="64" font-weight="850">Laouën Bernard</text>
  <text x="70" y="207" fill="${p.purple}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="25" font-weight="750">${escape(identity.roleFr)}</text>
  <text x="70" y="244" fill="${p.muted}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="17">${escape(identity.roleEn)}</text>
  <text x="70" y="298" fill="${p.text}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="19" font-weight="600">Du terrain industriel aux produits numériques utiles.</text>
  <text x="70" y="329" fill="${p.muted}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="16">${escape(identity.location)} · agents · automation · B2B experiences</text>
  ${metric(66, '13', 'REPOSITORIES', p.cyan)}
  ${metric(266, '26', 'AI MODULES', p.purple)}
  ${metric(466, '869', 'QUESTIONS', p.lime)}
  <g transform="translate(873 96)"><circle cx="128" cy="128" r="148" fill="none" stroke="url(#hero-${p === themes.dark ? 'dark' : 'light'}-accent)" stroke-width="4" opacity=".9"/><circle cx="128" cy="128" r="132" fill="${p.surface}" stroke="${p.line}"/><clipPath id="hero-portrait"><circle cx="128" cy="128" r="122"/></clipPath><image href="data:image/jpeg;base64,${portrait}" x="6" y="6" width="244" height="244" preserveAspectRatio="xMidYMid slice" clip-path="url(#hero-portrait)"/><path d="M-10 128H266M128 -10V266" stroke="${p.cyan}" stroke-opacity=".42" stroke-width="1"/><circle cx="128" cy="128" r="122" fill="none" stroke="${p.bg}" stroke-width="4"/></g>
  <text x="1001" y="408" text-anchor="middle" fill="${p.text}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="20" font-weight="800">BUILDING USEFUL SYSTEMS</text>
  <text x="1001" y="435" text-anchor="middle" fill="${p.muted}" font-family="ui-monospace, monospace" font-size="11" letter-spacing="1">INDUSTRY  ·  DIGITAL  ·  AI</text>`;
}

function work(p) {
  const cards = profile.projects.slice(0, 3).map((project, index) => {
    const y = 116 + index * 224;
    const color = [p.cyan, p.purple, p.lime][index];
    const summary = textLines(project.summary, 248, y + 108, 24);
    const facts = project.facts.slice(0, 4).map((fact, factIndex) => `<text x="${248 + (factIndex % 2) * 322}" y="${y + 170 + Math.floor(factIndex / 2) * 24}" fill="${p.muted}" font-family="ui-monospace, monospace" font-size="12">${escape(fact)}</text>`).join('');
    return `<g><rect x="52" y="${y}" width="1096" height="190" rx="24" fill="${p.panel}" stroke="${p.line}"/><rect x="52" y="${y}" width="9" height="190" rx="4.5" fill="${color}"/><text x="94" y="${y + 61}" fill="${color}" font-family="ui-monospace, monospace" font-size="30" font-weight="800">0${index + 1}</text><text x="94" y="${y + 94}" fill="${p.muted}" font-family="ui-monospace, monospace" font-size="10" font-weight="700" letter-spacing="1">${escape(project.kicker)}</text><path d="M206 ${y + 32}V${y + 158}" stroke="${p.line}"/><text x="248" y="${y + 54}" fill="${p.text}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="28" font-weight="820">${escape(project.title)}</text><text x="248" y="${y + 108}" fill="${p.muted}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="16">${summary}</text>${facts}</g>`;
  }).join('');
  return `<rect width="1200" height="820" rx="32" fill="${p.bg}"/>
  <circle cx="1140" cy="0" r="360" fill="url(#work-${p === themes.dark ? 'dark' : 'light'}-glow)"/>
  <text x="54" y="58" fill="${p.cyan}" font-family="ui-monospace, monospace" font-size="12" font-weight="700" letter-spacing="1.6">SELECTED WORK</text>
  <text x="52" y="95" fill="${p.text}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="32" font-weight="850">Trois systèmes, une même logique : rendre le travail plus clair.</text>
  ${cards}
  <text x="58" y="774" fill="${p.muted}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="14">Private case study / Étude de cas privée : aucune donnée interne ni code propriétaire n’est publié.</text>`;
}

mkdirSync(assets, { recursive: true });
for (const theme of Object.keys(themes)) {
  writeFileSync(join(assets, `showcase-hero-${theme}.svg`), documentSvg('showcase-hero', theme, 1200, 500, hero), 'utf8');
  writeFileSync(join(assets, `showcase-work-${theme}.svg`), documentSvg('showcase-work', theme, 1200, 820, work), 'utf8');
}
