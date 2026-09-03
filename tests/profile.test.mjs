import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const at = (path) => join(root, path);
const read = (path) => readFileSync(at(path), 'utf8');
const requiredAssets = [
  'assets/profile.jpg',
  'assets/hero-dark.svg', 'assets/hero-light.svg',
  'assets/analytics-dark.svg', 'assets/analytics-light.svg',
  'assets/projects-dark.svg', 'assets/projects-light.svg',
  'assets/journey-dark.svg', 'assets/journey-light.svg',
  'assets/arcade-fallback-dark.svg', 'assets/arcade-fallback-light.svg'
];
const heroThemes = {
  dark: { bg: '#05060A', panel: '#0B0E16', line: '#27304A', text: '#F5F7FF', muted: '#8F99B0', cyan: '#56E6FF', purple: '#9A72FF', green: '#42F5C5', orange: '#FFB16D' },
  light: { bg: '#F7F9FC', panel: '#FFFFFF', line: '#D7DFEC', text: '#111827', muted: '#58667D', cyan: '#087EA4', purple: '#6D42D8', green: '#07866F', orange: '#C76A20' }
};
const panelAssets = [
  ['analytics', '1180 360'],
  ['projects', '1180 610'],
  ['journey', '1180 270'],
  ['arcade-fallback', '1180 330']
];
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const svgText = (value) => value.replace(/&/g, '&amp;').replace(/'/g, '&apos;');
const wrapLines = (text, maximum) => text.split(/\s+/).reduce((lines, word) => {
  if (lines.length === 0) return [word];
  const previous = lines.at(-1);
  if (previous && `${previous} ${word}`.length > maximum) lines.push(word);
  else lines[lines.length - 1] = `${previous} ${word}`;
  return lines;
}, []);

test('all required profile assets exist', () => {
  for (const path of requiredAssets) assert.ok(existsSync(at(path)), `${path} is missing`);
});

test('approved profile JPEG has the canonical safe format', () => {
  const jpeg = readFileSync(at('assets/profile.jpg'));
  assert.equal(jpeg[0], 0xff, 'JPEG must start with SOI');
  assert.equal(jpeg[1], 0xd8, 'JPEG must start with SOI');

  let offset = 2;
  let dimensions;
  while (offset < jpeg.length) {
    while (jpeg[offset] === 0xff) offset += 1;
    const marker = jpeg[offset++];
    assert.notEqual(marker, undefined, 'JPEG marker is truncated');
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    assert.ok(offset + 1 < jpeg.length, 'JPEG marker length is truncated');
    const length = jpeg.readUInt16BE(offset);
    assert.ok(length >= 2 && offset + length <= jpeg.length, 'JPEG segment length is invalid');
    assert.notEqual(marker, 0xe1, 'JPEG must not contain EXIF/XMP APP1 metadata');
    assert.notEqual(marker, 0xed, 'JPEG must not contain IPTC APP13 metadata');
    if (marker >= 0xc0 && marker <= 0xc3) {
      assert.ok(length >= 7, 'JPEG SOF segment is truncated');
      assert.ok(offset + 6 < jpeg.length, 'JPEG SOF dimensions are truncated');
      dimensions = { height: jpeg.readUInt16BE(offset + 3), width: jpeg.readUInt16BE(offset + 5) };
    }
    offset += length;
  }
  assert.deepEqual(dimensions, { width: 400, height: 400 });

  assert.equal(createHash('sha256').update(jpeg).digest('hex'), '28f7203874cf0e134462a7545bad85b5950818e17afe66c06661469616d1e7f8');
  const script = read('scripts/prepare-photo.ps1');
  assert.match(script, /^#requires -PSEdition Desktop/m);
  assert.match(script, /430B83B8ACC6CE79DCCA76A86E3D7E9286D4F3286C0BD6D1B1EF1E34931E008D/);
});

test('profile data is structured, public-safe, and link-scoped', () => {
  const data = JSON.parse(read('profile-data.json'));
  assert.deepEqual(Object.keys(data).sort(), ['heroSkills', 'identity', 'journey', 'links', 'metrics', 'projects', 'skills']);
  assert.deepEqual(Object.keys(data.identity).sort(), ['focus', 'handle', 'introEn', 'introFr', 'location', 'name', 'roleEn', 'roleFr']);
  assert.equal(data.identity.handle, 'LALA44599');
  assert.deepEqual(data.metrics.map(({ value }) => value), ['13', '26', '869', '990']);
  assert.deepEqual(data.heroSkills, ['Python', 'TypeScript', 'Google Cloud', 'Firebase', 'Microsoft Azure', 'ComfyUI', 'VS Code / IDE', 'Figma']);

  const projectIds = data.projects.map(({ id }) => id);
  assert.equal(new Set(projectIds).size, projectIds.length);
  const projectFields = ['facts', 'id', 'kicker', 'private', 'summary', 'title'];
  for (const project of data.projects) {
    assert.deepEqual(Object.keys(project).sort(), projectFields);
    assert.equal(typeof project.private, 'boolean');
    assert.ok(Array.isArray(project.facts));
  }
  for (const step of data.journey) {
    assert.deepEqual(Object.keys(step).sort(), ['text', 'title']);
    assert.equal(typeof step.title, 'string');
    assert.equal(typeof step.text, 'string');
  }
  const skillGroups = ['Cloud & AI Platforms', 'Development & IDE', 'Product & Creative'];
  assert.deepEqual(Object.keys(data.skills).sort(), skillGroups);
  for (const skills of Object.values(data.skills)) assert.ok(Array.isArray(skills));
  const skillUnion = new Set(Object.values(data.skills).flat());
  for (const skill of data.heroSkills) assert.ok(skillUnion.has(skill), `${skill} must be represented in profile.skills`);

  assert.deepEqual(data.links, {
    github: 'https://github.com/LALA44599',
    linkedin: 'https://fr.linkedin.com/in/laou%C3%ABn-bernard-901584212'
  });
  for (const link of Object.values(data.links)) assert.equal(new URL(link).protocol, 'https:');
  for (const project of data.projects.filter(({ private: isPrivate }) => isPrivate)) {
    for (const field of ['url', 'repo', 'repository']) assert.equal(field in project, false, field);
  }
});

test('generated profile SVGs are tracked by the synchronization command', () => {
  const scripts = JSON.parse(read('package.json')).scripts;
  assert.equal(scripts['check:generated'], 'git ls-files --error-unmatch assets/hero-dark.svg assets/hero-light.svg assets/analytics-dark.svg assets/analytics-light.svg assets/projects-dark.svg assets/projects-light.svg assets/journey-dark.svg assets/journey-light.svg assets/arcade-fallback-dark.svg assets/arcade-fallback-light.svg && git diff --exit-code -- assets/hero-dark.svg assets/hero-light.svg assets/analytics-dark.svg assets/analytics-light.svg assets/projects-dark.svg assets/projects-light.svg assets/journey-dark.svg assets/journey-light.svg assets/arcade-fallback-dark.svg assets/arcade-fallback-light.svg');
  assert.equal(scripts.verify, 'npm run build && npm test && npm run check:generated');
});

test('Task 4 panels use the shared responsive SMIL and reduced-motion surface', () => {
  for (const [stem, viewBox] of panelAssets) {
    for (const theme of ['dark', 'light']) {
      const svg = read(`assets/${stem}-${theme}.svg`);
      assert.match(svg, new RegExp(`viewBox="0 0 ${viewBox}"`));
      assert.match(svg, /width="100%"/);
      assert.match(svg, /<title[^>]*>Laouën Bernard —/);
      assert.match(svg, /<desc[^>]*>Animated bilingual command-center profile/);
      assert.match(svg, /<g class="hero-animated">[\s\S]*?<!-- hero-animated:start -->[\s\S]*?<animate(?:Transform|Motion)?\b/);
      const staticScene = svg.match(/<!-- hero-static:start -->([\s\S]*?)<!-- hero-static:end -->/)?.[1];
      assert.ok(staticScene, `${stem} ${theme} static scene is missing`);
      assert.doesNotMatch(staticScene, /<animate(?:Transform|Motion)?\b/);
      assert.doesNotMatch(svg, /<script\b|javascript:|<image\b|(?:href|src)="https?:\/\//i);
    }
  }
});

test('Task 4 analytics renders only the verified metrics and an explicitly decorative trace', () => {
  const data = JSON.parse(read('profile-data.json'));
  for (const theme of ['dark', 'light']) {
    const svg = read(`assets/analytics-${theme}.svg`);
    for (const metric of data.metrics) {
      assert.match(svg, new RegExp(`>${escapeRegex(metric.value)}<`));
      assert.match(svg, new RegExp(escapeRegex(metric.label)));
      assert.match(svg, new RegExp(escapeRegex(metric.note)));
    }
    assert.match(svg, /NO FAKE NUMBERS/);
    assert.match(svg, /visual system trace|decorative activity signal/i);
    assert.match(svg, /live contribution data appears in the arcade/i);
    assert.doesNotMatch(svg, /(?:commits|stars|followers)\s*[0-9]/i);
  }
  const generator = read('scripts/build-assets.mjs');
  assert.match(generator, /profile\.metrics\.map\(/);
});

test('Task 4 projects are sourced from profile data and protect the private case study', () => {
  const data = JSON.parse(read('profile-data.json'));
  for (const theme of ['dark', 'light']) {
    const svg = read(`assets/projects-${theme}.svg`);
    for (const project of data.projects) {
      for (const value of [project.id, project.kicker, project.title, project.summary, ...project.facts]) {
        assert.match(svg, new RegExp(escapeRegex(svgText(value))));
      }
    }
    assert.match(svg, /Private case study/);
    assert.doesNotMatch(svg, /(?:github\.com|repository|repo:|(?:href|src)="https?:\/\/)/i);
  }
  assert.match(read('scripts/build-assets.mjs'), /profile\.projects\.map\(/);
});

test('Task 4 journey renders each profile journey entry in an isolated quarter', () => {
  const data = JSON.parse(read('profile-data.json'));
  for (const theme of ['dark', 'light']) {
    const svg = read(`assets/journey-${theme}.svg`);
    for (const step of data.journey) {
      assert.match(svg, new RegExp(escapeRegex(svgText(step.title))));
      assert.match(svg, new RegExp(escapeRegex(svgText(step.text))));
    }
    assert.match(svg, /ONE COHERENT EVOLUTION/);
    assert.match(svg, /journey-node-0[\s\S]*?<animate/);
  }
  assert.match(read('scripts/build-assets.mjs'), /profile\.journey\.map\(/);
});

test('Task 4 arcade fallback has animated snake and robot plus explicit daily replacement copy', () => {
  for (const theme of ['dark', 'light']) {
    const svg = read(`assets/arcade-fallback-${theme}.svg`);
    assert.match(svg, /id="arcade-snake"/);
    assert.match(svg, /id="ai-robot"/);
    assert.match(svg, /id="contribution-grid"/);
    assert.match(svg, /arcade-snake[\s\S]*?<animate(?:Transform)?\b/);
    assert.match(svg, /ai-robot[\s\S]*?<animate(?:Transform)?\b/);
    assert.match(svg, /local preview\/fallback/i);
    assert.match(svg, /daily generated contribution snake replaces it after the first successful workflow run/i);
    assert.match(svg, /decorative only.*not live statistics/i);
  }
});

test('Task 4 arcade robot keeps its positioned outer group separate from its bob animation', () => {
  for (const theme of ['dark', 'light']) {
    const svg = read(`assets/arcade-fallback-${theme}.svg`);
    const animatedScene = svg.match(/<!-- hero-animated:start -->([\s\S]*?)<!-- hero-animated:end -->/)?.[1];
    const staticScene = svg.match(/<!-- hero-static:start -->([\s\S]*?)<!-- hero-static:end -->/)?.[1];
    assert.ok(animatedScene, `${theme} animated fallback scene is missing`);
    assert.ok(staticScene, `${theme} static fallback scene is missing`);
    assert.match(animatedScene, /<g id="ai-robot" transform="translate\(850 110\)">\s*<g id="ai-robot-bob">[\s\S]*?<animateTransform attributeName="transform" type="translate" values="0 0;0 -7;0 0"/);
    assert.match(staticScene, /<g id="ai-robot-static" transform="translate\(850 110\)">\s*<g id="ai-robot-bob-static">/);
    assert.doesNotMatch(staticScene, /<g id="ai-robot-bob-static">[\s\S]*?<animateTransform/);
    assert.match(svg, /<text x="899" y="272"/);
  }
});

test('Task 4 dark and light panels share normalized geometry', () => {
  const normalize = (svg, theme) => Object.entries(heroThemes[theme]).reduce(
    (normalized, [token, color]) => normalized.replaceAll(color, `{{${token}}}`),
    svg
  ).replaceAll(`-${theme}-title`, '-theme-title').replaceAll(`-${theme}-desc`, '-theme-desc');
  for (const [stem] of panelAssets) {
    assert.equal(normalize(read(`assets/${stem}-dark.svg`), 'dark'), normalize(read(`assets/${stem}-light.svg`), 'light'), stem);
  }
});

test('hero generator derives identity copy and pills from profile data', () => {
  const generator = read('scripts/build-assets.mjs');
  assert.match(generator, /const \[firstName\] = identity\.name\.split\(\/\\s\+\//);
  assert.match(generator, /normalize\('NFD'\)\.replace\(\/\[\\u0300-\\u036f\]\/g, ''\)\.toLowerCase\(\)/);
  assert.match(generator, /identity\.roleEn\.toUpperCase\(\)/);
  assert.match(generator, /profile\.heroSkills\.map\(/);
  assert.match(generator, /<g class="hero-animated"/);
  assert.match(generator, /<g class="hero-static"/);
});

test('wrapLines starts with the first word and wraps subsequent words', () => {
  assert.deepEqual(wrapLines('one two three', 5), ['one', 'two', 'three']);
});

test('SVG assets are responsive, animated, and contain no JavaScript', () => {
  for (const path of requiredAssets.filter((value) => value.endsWith('.svg'))) {
    const svg = read(path);
    assert.match(svg, /^<svg\b/);
    assert.match(svg, /viewBox="0 0 \d+ \d+"/);
    assert.match(svg, /width="100%"/);
    assert.match(svg, /<animate(?:Transform|Motion)?\b/);
    assert.doesNotMatch(svg, /<script\b|javascript:/i);
  }
});

test('hero artwork presents the bilingual live profile command center', () => {
  const data = JSON.parse(read('profile-data.json'));
  const [firstName] = data.identity.name.split(/\s+/);
  const terminalUser = firstName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  for (const theme of ['dark', 'light']) {
    const svg = read(`assets/hero-${theme}.svg`);
    for (const value of [
      `${terminalUser}@digital-ai — ./profile.sh --live`,
      '● LIVE SYSTEM',
      'PORTRAIT_SCAN // IDENTITY VERIFIED',
      data.identity.name,
      data.identity.roleEn.toUpperCase(),
      `Hi, I'm ${firstName}.`,
      data.identity.roleFr,
      data.identity.introFr,
      data.identity.introEn,
      data.identity.focus,
      ...data.heroSkills
    ]) assert.match(svg, new RegExp(escapeRegex(svgText(value))));
    assert.match(svg, new RegExp(`<title[^>]*>${escapeRegex(svgText(data.identity.name))} — live digital profile</title>`));
    assert.match(svg, new RegExp(`<desc[^>]*>Animated bilingual command-center profile for ${escapeRegex(svgText(data.identity.name))}\.</desc>`));
    assert.match(svg, /\.hero-static \{ display: none; \}[\s\S]*?@media \(prefers-reduced-motion: reduce\) \{ \.hero-animated \{ display: none; \} \.hero-static \{ display: inline; \} \}/);
    assert.match(svg, /<animate(?:Transform)?\b/);
    assert.doesNotMatch(svg, /<\/text>\s*<animate attributeName="opacity"/);
    for (const skill of data.heroSkills) {
      assert.match(svg, new RegExp(`<text[^>]*fill="${escapeRegex(heroThemes[theme].text)}"[^>]*>${escapeRegex(svgText(skill))}</text>`));
    }
  }
});

test('hero has a readable SMIL-free static reduced-motion scene', () => {
  for (const theme of ['dark', 'light']) {
    const svg = read(`assets/hero-${theme}.svg`);
    const animated = svg.match(/<!-- hero-animated:start -->([\s\S]*?)<!-- hero-animated:end -->/)?.[1];
    const staticScene = svg.match(/<!-- hero-static:start -->([\s\S]*?)<!-- hero-static:end -->/)?.[1];
    assert.ok(animated, `${theme} animated scene is missing`);
    assert.ok(staticScene, `${theme} static scene is missing`);
    assert.match(animated, /<animate(?:Transform|Motion)?\b/);
    assert.doesNotMatch(staticScene, /<animate(?:Transform|Motion)?\b/);
    assert.doesNotMatch(staticScene, /mask="url\(#reveal\)"|id="reveal"/);
    assert.match(staticScene, /Hi, I&apos;m Laouën\.|Hi, I'm Laouën\./);
  }
});

test('hero artwork embeds only the approved local JPEG and no external resources', () => {
  const approvedPhotoHash = createHash('sha256').update(readFileSync(at('assets/profile.jpg'))).digest('hex');
  for (const theme of ['dark', 'light']) {
    const svg = read(`assets/hero-${theme}.svg`);
    const images = svg.match(/<image\b[^>]*>/g) ?? [];
    assert.equal(images.length, 1, `${theme} hero must have one portrait image`);
    for (const image of images) {
      const href = image.match(/\bhref="([^"]+)"/)?.[1];
      assert.ok(href, `${theme} portrait image must have href`);
      assert.match(href, /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/);
      const encoded = href.slice('data:image/jpeg;base64,'.length);
      assert.equal(createHash('sha256').update(Buffer.from(encoded, 'base64')).digest('hex'), approvedPhotoHash);
    }
    const urls = svg.match(/https?:\/\/[^\s"'<>]+/gi) ?? [];
    assert.deepEqual(urls, ['http://www.w3.org/2000/svg']);
  }
});

test('dark and light heroes share normalized structure', () => {
  const normalize = (svg, theme) => Object.entries(heroThemes[theme]).reduce(
    (normalized, [token, color]) => normalized.replaceAll(color, `{{${token}}}`),
    svg
  ).replaceAll(`hero-${theme}-title`, 'hero-theme-title')
    .replaceAll(`hero-${theme}-desc`, 'hero-theme-desc')
    .replaceAll(`${theme} mode`, 'theme mode');
  assert.equal(normalize(read('assets/hero-dark.svg'), 'dark'), normalize(read('assets/hero-light.svg'), 'light'));
});

test('hero copy remains within conservative line bounds', () => {
  const identity = JSON.parse(read('profile-data.json')).identity;
  const bounds = [
    ['name', 30, 1], ['location', 30, 1], ['roleEn', 60, 1], ['roleFr', 60, 1],
    ['introFr', 70, 3], ['introEn', 70, 2], ['focus', 48, 2]
  ];
  for (const [field, lineLength, lineCount] of bounds) {
    const lines = wrapLines(identity[field], lineLength);
    assert.ok(lines.length <= lineCount, `${field} requires ${lines.length} lines; maximum is ${lineCount}`);
    for (const line of lines) assert.ok(line.length <= lineLength, `${field} line exceeds ${lineLength} characters`);
  }
});

test('dark and light pairs have identical layout dimensions', () => {
  for (const stem of ['hero', 'analytics', 'projects', 'journey', 'arcade-fallback']) {
    const getViewBox = (theme) => read(`assets/${stem}-${theme}.svg`).match(/viewBox="([^"]+)"/)[1];
    assert.equal(getViewBox('dark'), getViewBox('light'), stem);
  }
});

test('README is bilingual, theme-aware, private-safe, and honest', () => {
  const readme = read('README.md');
  for (const value of ['Laouën Bernard', 'Chef de projet digital', 'Digital Project Lead', 'Google Cloud', 'Firebase', 'Microsoft Azure', 'ComfyUI']) {
    assert.match(readme, new RegExp(value));
  }
  assert.match(readme, /prefers-color-scheme: dark/);
  assert.match(readme, /prefers-color-scheme: light/);
  assert.match(readme, /Private case study/);
});

test('public content contains no forbidden claims or email addresses', () => {
  const publicFiles = ['README.md', 'profile-data.json'];
  if (existsSync(at('assets'))) {
    for (const file of readdirSync(at('assets'))) {
      if (file.endsWith('.svg') && existsSync(at(`assets/${file}`))) publicFiles.push(`assets/${file}`);
    }
  }
  const forbiddenTerms = ['Full Stack Developer', '953 commits', 'site-b2b', 'site-vitrine-secodi'];
  const email = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
  for (const file of publicFiles) {
    const content = read(file);
    for (const term of forbiddenTerms) assert.doesNotMatch(content, new RegExp(term, 'i'), `${term} in ${file}`);
    assert.doesNotMatch(content, email, `email address in ${file}`);
  }
});

test('arcade workflow is daily, manual, scoped, and secret-free', () => {
  const workflow = read('.github/workflows/contribution-arcade.yml');
  assert.match(workflow, /schedule:/);
  assert.match(workflow, /^\s*-\s+cron:\s*['"]?17 3 \* \* \*['"]?\s*$/m);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /permissions:\s*\r?\n\s+contents:\s+write\s*\r?\n\s*jobs:/);
  assert.match(workflow, /^\s*uses:\s*Platane\/snk\/svg-only@v3\s*$/m);
  assert.doesNotMatch(workflow, /PERSONAL_ACCESS_TOKEN|PAT:/);
  const secretReferences = [...workflow.matchAll(/secrets\.([A-Za-z0-9_]+)/gi)];
  for (const [, identifier] of secretReferences) assert.equal(identifier, 'GITHUB_TOKEN');
});
