import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const root = dirname(dirname(scriptPath));
const assets = join(root, 'assets');
const profile = JSON.parse(readFileSync(join(root, 'profile-data.json'), 'utf8'));
const portraitDataUri = `data:image/jpeg;base64,${readFileSync(join(assets, 'profile.jpg')).toString('base64')}`;

const themes = {
  dark: { bg: '#05060A', panel: '#0B0E16', line: '#27304A', text: '#F5F7FF', muted: '#8F99B0', cyan: '#56E6FF', purple: '#9A72FF', green: '#42F5C5', orange: '#FFB16D' },
  light: { bg: '#F7F9FC', panel: '#FFFFFF', line: '#D7DFEC', text: '#111827', muted: '#58667D', cyan: '#087EA4', purple: '#6D42D8', green: '#07866F', orange: '#C76A20' }
};

const escapeXml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;'
}[character]));

const wrap = (text, maximum) => {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maximum && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
};

const textLines = (lines, x, y, lineHeight) => lines
  .map((line, index) => `<tspan x="${x}" dy="${index ? lineHeight : 0}">${escapeXml(line)}</tspan>`)
  .join('');

function writeSvg(name, themeName, builder, width, height) {
  const theme = themes[themeName];
  const identityName = escapeXml(profile.identity.name);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="${name}-${themeName}-title ${name}-${themeName}-desc">
  <title id="${name}-${themeName}-title">${identityName} — live digital profile</title>
  <desc id="${name}-${themeName}-desc">Animated bilingual command-center profile for ${identityName}.</desc>
  <defs>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${theme.cyan}"/><stop offset=".52" stop-color="${theme.purple}"/><stop offset="1" stop-color="${theme.green}"/></linearGradient>
    <filter id="softGlow" x="-70%" y="-70%" width="240%" height="240%"><feGaussianBlur stdDeviation="5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <style>.hero-static { display: none; } @media (prefers-reduced-motion: reduce) { .hero-animated { display: none; } .hero-static { display: inline; } }</style>
  ${builder(theme)}
</svg>`;
  mkdirSync(assets, { recursive: true });
  writeFileSync(join(assets, `${name}-${themeName}.svg`), `${svg}\n`, 'utf8');
}

const pill = (label, x, y, color, text, delay, animated) => `<g>
  <rect x="${x}" y="${y}" width="150" height="32" rx="10" fill="${color}" fill-opacity=".09" stroke="${color}" stroke-opacity=".58"/>
  <circle cx="${x + 16}" cy="${y + 16}" r="3" fill="${color}" filter="url(#softGlow)">${animated ? `<animate attributeName="opacity" values=".35;1;.35" dur="2.8s" begin="${delay}s" repeatCount="indefinite"/>` : ''}</circle>
  <text x="${x + 27}" y="${y + 20.5}" fill="${text}" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="11" font-weight="700">${escapeXml(label)}</text>
</g>`;

const motion = (animated, svg) => animated ? svg : '';

const panelFrame = (p, height, title, status) => `<rect width="1180" height="${height}" rx="28" fill="${p.bg}"/>
<circle cx="120" cy="-20" r="230" fill="url(#accent)" opacity=".08"/>
<rect x="14" y="14" width="1152" height="${height - 28}" rx="22" fill="${p.panel}" stroke="${p.line}"/>
<rect x="14" y="14" width="1152" height="58" rx="22" fill="${p.bg}"/>
<path d="M38 72H1142" stroke="${p.line}"/>
<circle cx="43" cy="43" r="5" fill="${p.orange}"/><circle cx="61" cy="43" r="5" fill="${p.purple}"/><circle cx="79" cy="43" r="5" fill="${p.green}"/>
<text x="104" y="47" fill="${p.text}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="18" font-weight="800">${escapeXml(title)}</text>
<rect x="910" y="29" width="215" height="28" rx="9" fill="${p.green}" fill-opacity=".08" stroke="${p.green}" stroke-opacity=".55"/>
<circle cx="926" cy="43" r="3" fill="${p.green}" filter="url(#softGlow)"/>
<text x="937" y="47" fill="${p.green}" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="10" font-weight="700">${escapeXml(status)}</text>`;

const analyticsScene = (p, animated) => {
  const cards = profile.metrics.map((metric, index) => {
    const x = 42 + index * 278;
    const colors = [p.cyan, p.purple, p.green, p.orange];
    return `<g>
  <rect x="${x}" y="98" width="250" height="112" rx="15" fill="${p.bg}" fill-opacity=".5" stroke="${p.line}"/>
  <rect x="${x}" y="98" width="4" height="112" rx="2" fill="${colors[index]}"/>
  <text x="${x + 20}" y="126" fill="${p.muted}" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="10" font-weight="700" aria-label="${escapeXml(metric.label)}">${escapeXml(metric.label)}</text>
  <text x="${x + 20}" y="169" fill="${p.text}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="36" font-weight="800">${escapeXml(metric.value)}</text>
  <text x="${x + 20}" y="193" fill="${p.muted}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="10.5">${escapeXml(metric.note)}</text>
  <circle cx="${x + 224}" cy="122" r="5" fill="${colors[index]}" filter="url(#softGlow)">${motion(animated, `<animate attributeName="opacity" values=".35;1;.35" dur="2.4s" begin="${index * .3}s" repeatCount="indefinite"/>`)}</circle>
</g>`;
  }).join('');
  const trace = `M62 290 C130 250 164 302 232 270 S348 290 420 246 S550 287 625 258 S762 291 838 235 S971 276 1118 242`;
  return `${panelFrame(p, 360, 'GitHub Analytics / Données vérifiées', 'NO FAKE NUMBERS')}
${cards}
<text x="42" y="236" fill="${p.muted}" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="10" letter-spacing=".8">VISUAL SYSTEM TRACE — decorative activity signal, not a time-series claim</text>
<path d="M62 308H1118" stroke="${p.line}" stroke-dasharray="3 7"/>
<path d="${trace}" fill="none" stroke="url(#accent)" stroke-width="4" stroke-linecap="round" filter="url(#softGlow)" stroke-dasharray="1200" stroke-dashoffset="${animated ? 1200 : 0}">${motion(animated, '<animate attributeName="stroke-dashoffset" values="1200;0" dur="3.6s" fill="freeze"/>')}</path>
<path d="${trace}" fill="none" stroke="${p.text}" stroke-opacity=".28" stroke-width="1.2" stroke-dasharray="5 8">${motion(animated, '<animate attributeName="stroke-dashoffset" values="0;-52" dur="3s" repeatCount="indefinite"/>')}</path>
<text x="42" y="338" fill="${p.muted}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="11">Verified profile metrics only · live contribution data appears in the arcade.</text>`;
};

const analytics = (p) => `<g class="hero-animated">
<!-- hero-animated:start -->
${analyticsScene(p, true)}
<!-- hero-animated:end -->
</g>
<g class="hero-static">
<!-- hero-static:start -->
${analyticsScene(p, false)}
<!-- hero-static:end -->
</g>`;

const projectCard = (p, project, index, animated) => {
  const x = index % 2 === 0 ? 42 : 598;
  const y = index < 2 ? 100 : 338;
  const color = [p.cyan, p.purple, p.green, p.orange][index];
  const titles = wrap(project.title, 38);
  const summary = wrap(project.summary, 61);
  const facts = project.facts.map((fact, factIndex) => `<text x="${x + 22 + (factIndex % 2) * 237}" y="${y + 166 + Math.floor(factIndex / 2) * 22}" fill="${p.text}" fill-opacity=".85" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="10.5">• ${escapeXml(fact)}</text>`).join('');
  return `<g>
  <rect x="${x}" y="${y}" width="528" height="210" rx="17" fill="${p.bg}" fill-opacity=".5" stroke="${p.line}"/>
  <path d="M${x + 18} ${y + 10}H${x + 76}M${x + 10} ${y + 18}V${y + 76}" fill="none" stroke="${color}" stroke-width="2" opacity=".9"/>
  <circle cx="${x + 500}" cy="${y + 27}" r="5" fill="${color}" filter="url(#softGlow)">${motion(animated, `<animate attributeName="r" values="3.5;6;3.5" dur="2.2s" begin="${index * .35}s" repeatCount="indefinite"/>`)}</circle>
  <text x="${x + 22}" y="${y + 31}" fill="${color}" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="10" font-weight="700" letter-spacing=".8">${escapeXml(project.kicker)}</text>
  <text x="${x + 480}" y="${y + 31}" text-anchor="end" fill="${p.muted}" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="11" font-weight="700">#${escapeXml(project.id)}</text>
  <text x="${x + 22}" y="${y + 64}" fill="${p.text}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="19" font-weight="800" aria-label="${escapeXml(project.title)}">${textLines(titles, x + 22, y + 64, 22)}</text>
  <text x="${x + 22}" y="${y + 111}" fill="${p.muted}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="11.5" aria-label="${escapeXml(project.summary)}">${textLines(summary, x + 22, y + 111, 16)}</text>
  <path d="M${x + 22} ${y + 143}H${x + 506}" stroke="${p.line}"/>
  ${facts}
</g>`;
};

const projectsScene = (p, animated) => `${panelFrame(p, 610, 'Selected Systems / Projets choisis', 'PROOF OF WORK')}
${profile.projects.map((project, index) => projectCard(p, project, index, animated)).join('')}`;

const projects = (p) => `<g class="hero-animated">
<!-- hero-animated:start -->
${projectsScene(p, true)}
<!-- hero-animated:end -->
</g>
<g class="hero-static">
<!-- hero-static:start -->
${projectsScene(p, false)}
<!-- hero-static:end -->
</g>`;

const journeyScene = (p, animated) => {
  const nodes = profile.journey.map((step, index) => {
    const x = 120 + index * 313;
    const text = wrap(step.text, 32);
    return `<g id="journey-node-${index}${animated ? '' : '-static'}">
  <circle cx="${x}" cy="132" r="17" fill="${p.bg}" stroke="url(#accent)" stroke-width="3" filter="url(#softGlow)">${motion(animated, `<animate attributeName="r" values="14;19;14" dur="2.8s" begin="${index * .4}s" repeatCount="indefinite"/>`)}</circle>
  <circle cx="${x}" cy="132" r="5" fill="${[p.cyan, p.purple, p.green, p.orange][index]}">${motion(animated, `<animate attributeName="opacity" values=".4;1;.4" dur="1.8s" begin="${index * .25}s" repeatCount="indefinite"/>`)}</circle>
  <text x="${x}" y="174" text-anchor="middle" fill="${p.text}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="14" font-weight="800" aria-label="${escapeXml(step.title)}">${escapeXml(step.title)}</text>
  <text x="${x}" y="197" text-anchor="middle" fill="${p.muted}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="10.5" aria-label="${escapeXml(step.text)}">${textLines(text, x, 197, 14)}</text>
</g>`;
  }).join('');
  return `${panelFrame(p, 270, 'Journey / Mon parcours', 'ONE COHERENT EVOLUTION')}
<path d="M120 132H1060" stroke="url(#accent)" stroke-width="3" stroke-linecap="round" filter="url(#softGlow)" stroke-dasharray="940" stroke-dashoffset="${animated ? 940 : 0}">${motion(animated, '<animate attributeName="stroke-dashoffset" values="940;0" dur="2.8s" fill="freeze"/>')}</path>
${nodes}`;
};

const journey = (p) => `<g class="hero-animated">
<!-- hero-animated:start -->
${journeyScene(p, true)}
<!-- hero-animated:end -->
</g>
<g class="hero-static">
<!-- hero-static:start -->
${journeyScene(p, false)}
<!-- hero-static:end -->
</g>`;

const arcadeScene = (p, animated) => {
  const grid = Array.from({ length: 84 }, (_, index) => {
    const column = index % 14;
    const row = Math.floor(index / 14);
    const opacity = [0.08, 0.14, 0.22, 0.34][(index * 7 + row) % 4];
    return `<rect x="${52 + column * 27}" y="${105 + row * 24}" width="18" height="16" rx="3" fill="${p.green}" fill-opacity="${opacity}"/>`;
  }).join('');
  const snakePositions = [[302, 164], [327, 164], [352, 164], [377, 164], [402, 164], [427, 188], [452, 212], [477, 212], [502, 212]];
  const snake = snakePositions.map(([x, y], index) => `<rect x="${x}" y="${y}" width="18" height="18" rx="5" fill="${index === snakePositions.length - 1 ? p.orange : p.cyan}" stroke="${p.bg}" stroke-width="2" filter="url(#softGlow)">${motion(animated, `<animateTransform attributeName="transform" type="translate" values="0 0;0 ${index % 2 ? -8 : 8};0 0" dur="1.8s" begin="${index * .12}s" repeatCount="indefinite"/>`)}</rect>`).join('');
  return `${panelFrame(p, 330, 'Contribution Arcade / Le serpent de Laouën', 'FALLBACK READY')}
<g id="contribution-grid${animated ? '' : '-static'}">${grid}</g>
<text x="52" y="262" fill="${p.muted}" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="10">Contribution grid backdrop — decorative only, not live statistics.</text>
<g id="arcade-snake${animated ? '' : '-static'}">${snake}</g>
<text x="305" y="135" fill="${p.cyan}" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="10" font-weight="700">NEON SNAKE · LOCAL VISUAL</text>
<g id="ai-robot${animated ? '' : '-static'}" transform="translate(850 110)">
<g id="ai-robot-bob${animated ? '' : '-static'}">
  <rect x="28" y="39" width="98" height="72" rx="22" fill="${p.bg}" stroke="${p.purple}" stroke-width="3" filter="url(#softGlow)"/>
  <rect x="43" y="56" width="68" height="29" rx="12" fill="${p.purple}" fill-opacity=".16" stroke="${p.purple}"/>
  <circle cx="61" cy="70" r="5" fill="${p.cyan}"/><circle cx="93" cy="70" r="5" fill="${p.cyan}"/>
  <path d="M68 93Q77 100 86 93M77 39V22M69 22H85" fill="none" stroke="${p.green}" stroke-width="3" stroke-linecap="round"/>
  <rect x="48" y="111" width="17" height="26" rx="8" fill="${p.purple}"/><rect x="89" y="111" width="17" height="26" rx="8" fill="${p.purple}"/>
${motion(animated, '<animateTransform attributeName="transform" type="translate" values="0 0;0 -7;0 0" dur="2.2s" repeatCount="indefinite"/>')}
</g>
</g>
<text x="899" y="272" text-anchor="middle" fill="${p.text}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="11" font-weight="700">Local preview/fallback</text>
<text x="899" y="291" text-anchor="middle" fill="${p.muted}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="10">The daily generated contribution snake replaces it after the first successful workflow run.</text>`;
};

const arcadeFallback = (p) => `<g class="hero-animated">
<!-- hero-animated:start -->
${arcadeScene(p, true)}
<!-- hero-animated:end -->
</g>
<g class="hero-static">
<!-- hero-static:start -->
${arcadeScene(p, false)}
<!-- hero-static:end -->
</g>`;

const scene = (p, animated) => {
  const identity = profile.identity;
  const [firstName] = identity.name.split(/\s+/);
  const terminalUser = firstName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const introFr = wrap(identity.introFr, 70);
  const introEn = wrap(identity.introEn, 70);
  const focus = wrap(identity.focus, 48);
  const pillColors = [p.cyan, p.purple, p.green, p.orange];
  const pills = profile.heroSkills.map((label, index) => pill(
    label,
    465 + (index % 4) * 160,
    474 + Math.floor(index / 4) * 42,
    pillColors[index % pillColors.length],
    p.text,
    index * 0.24,
    animated
  )).join('');
  const motion = (svg) => animated ? svg : '';

  return `<rect width="1180" height="610" rx="28" fill="${p.bg}"/>
<circle cx="160" cy="115" r="250" fill="url(#glow)" opacity=".6">${motion('<animate attributeName="opacity" values=".45;.8;.45" dur="7s" repeatCount="indefinite"/>')}</circle>
<rect x="18" y="18" width="1144" height="574" rx="22" fill="${p.panel}" stroke="${p.line}"/>
<rect x="18" y="18" width="1144" height="42" rx="22" fill="${p.bg}"/>
<path d="M40 60H1140" stroke="${p.line}"/>
<circle cx="43" cy="39" r="5" fill="${p.orange}"/><circle cx="61" cy="39" r="5" fill="${p.purple}"/><circle cx="79" cy="39" r="5" fill="${p.green}"/>
<text x="102" y="43" fill="${p.muted}" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="12">${escapeXml(`${terminalUser}@digital-ai — ./profile.sh --live`)}</text>
<circle cx="1031" cy="39" r="4" fill="${p.green}" filter="url(#softGlow)">${motion('<animate attributeName="opacity" values=".35;1;.35" dur="1.6s" repeatCount="indefinite"/>')}</circle>
<text x="1042" y="43" fill="${p.green}" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="11" font-weight="700">● LIVE SYSTEM</text>
<g${animated ? ' mask="url(#reveal)"' : ''}>
  <path d="M420 82V556" stroke="${p.line}" stroke-dasharray="3 6"/>
  <text x="65" y="111" fill="${p.cyan}" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="10" letter-spacing="1.15">PORTRAIT_SCAN // IDENTITY VERIFIED</text>
  <circle cx="210" cy="285" r="153" fill="url(#glow)" opacity=".7"/>
  <circle cx="210" cy="285" r="145" fill="none" stroke="${p.cyan}" stroke-opacity=".42" stroke-dasharray="9 13">${motion('<animateTransform attributeName="transform" type="rotate" from="0 210 285" to="360 210 285" dur="20s" repeatCount="indefinite"/>')}</circle>
  <circle cx="210" cy="285" r="141" fill="none" stroke="${p.purple}" stroke-opacity=".45" stroke-dasharray="2 18">${motion('<animateTransform attributeName="transform" type="rotate" from="360 210 285" to="0 210 285" dur="14s" repeatCount="indefinite"/>')}</circle>
  <circle cx="210" cy="285" r="135" fill="none" stroke="url(#accent)" stroke-width="5" stroke-dasharray="120 18" filter="url(#softGlow)">${motion('<animate attributeName="stroke-dasharray" values="120 18;42 8;120 18" dur="5s" repeatCount="indefinite"/>')}</circle>
  <use href="#portrait-photo" clip-path="url(#portrait)"/>
${animated ? `<g clip-path="url(#portrait)"><rect x="78" y="153" width="264" height="4" fill="${p.cyan}" fill-opacity=".78" filter="url(#softGlow)"><animate attributeName="y" values="153;413;153" dur="4.8s" repeatCount="indefinite"/></rect></g>` : ''}
  <circle cx="210" cy="285" r="132" fill="none" stroke="url(#accent)" stroke-width="3"/>
  <path d="M210 433V451M201 442H219" stroke="${p.cyan}" stroke-width="1.5"/>
  <text x="210" y="475" text-anchor="middle" fill="${p.text}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="22" font-weight="700">${escapeXml(identity.name.toUpperCase())}</text>
  <text x="210" y="497" text-anchor="middle" fill="${p.muted}" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="10" letter-spacing=".45">${escapeXml(`${identity.location.toUpperCase()} · INDUSTRIAL_DNA: TRUE`)}</text>

  <text x="465" y="111" fill="${p.cyan}" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="11" font-weight="700" letter-spacing="1.1">${escapeXml(identity.roleEn.toUpperCase())}</text>
  <text x="465" y="169" fill="${p.text}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="44" font-weight="800">${escapeXml(`Hi, I'm ${firstName}.`)}</text>
  <text x="465" y="207" fill="${p.purple}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="20" font-weight="650">${escapeXml(identity.roleFr)}<tspan fill="${p.cyan}">▋${motion('<animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite"/>')}</tspan></text>
  <text x="465" y="247" fill="${p.text}" fill-opacity=".91" font-family="ui-sans-serif, system-ui, sans-serif" font-size="13" aria-label="${escapeXml(identity.introFr)}">${textLines(introFr, 465, 247, 18)}</text>
  <text x="465" y="${247 + introFr.length * 18 + 12}" fill="${p.muted}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="12.5" aria-label="${escapeXml(identity.introEn)}">${textLines(introEn, 465, 247 + introFr.length * 18 + 12, 17)}</text>
  <rect x="465" y="354" width="636" height="96" rx="14" fill="${p.bg}" fill-opacity=".62" stroke="${p.line}"/>
  <path d="M465 377H1101" stroke="${p.line}"/>
  <circle cx="484" cy="366" r="4" fill="${p.green}" filter="url(#softGlow)"/>
  <text x="496" y="370" fill="${p.muted}" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="10" letter-spacing=".85">CURRENT_FOCUS</text>
  <text x="484" y="403" fill="${p.text}" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="13" aria-label="${escapeXml(identity.focus)}">${textLines(focus, 484, 403, 20)}</text>
  ${pills}
</g>
${animated ? `<rect x="-140" y="59" width="140" height="2" fill="url(#accent)" filter="url(#softGlow)"><animate attributeName="x" values="-140;1180" dur="4.5s" repeatCount="indefinite"/></rect>` : '<rect x="18" y="59" width="1144" height="1" fill="url(#accent)" opacity=".35"/>'}`;
};

const hero = (p) => `<defs>
  <radialGradient id="glow"><stop stop-color="${p.cyan}" stop-opacity=".26"/><stop offset="1" stop-color="${p.cyan}" stop-opacity="0"/></radialGradient>
  <clipPath id="portrait"><circle cx="210" cy="285" r="132"/></clipPath>
  <image id="portrait-photo" href="${portraitDataUri}" x="78" y="153" width="264" height="264" preserveAspectRatio="xMidYMid slice"/>
  <mask id="reveal"><rect width="1180" height="610" fill="white"><animate attributeName="height" values="0;610;610" keyTimes="0;.32;1" dur="3.4s" fill="freeze"/></rect></mask>
</defs>
<g class="hero-animated">
<!-- hero-animated:start -->
${scene(p, true)}
<!-- hero-animated:end -->
</g>
<g class="hero-static">
<!-- hero-static:start -->
${scene(p, false)}
<!-- hero-static:end -->
</g>`;

const builders = { hero, analytics, projects, journey, 'arcade-fallback': arcadeFallback };
const sizes = {
  hero: [1180, 610],
  analytics: [1180, 360],
  projects: [1180, 610],
  journey: [1180, 270],
  'arcade-fallback': [1180, 330]
};

for (const [name, builder] of Object.entries(builders)) {
  const [width, height] = sizes[name];
  for (const theme of Object.keys(themes)) writeSvg(name, theme, builder, width, height);
}
