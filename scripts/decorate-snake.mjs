import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const palettes = {
  dark: { panel: '#0B0E16', text: '#F5F7FF', cyan: '#56E6FF', purple: '#9A72FF', green: '#42F5C5' },
  light: { panel: '#FFFFFF', text: '#111827', cyan: '#087EA4', purple: '#6D42D8', green: '#07866F' }
};

export function decorateSnake(source, theme = 'dark') {
  if (!source.includes('<svg') || !source.includes('</svg>')) throw new Error('Input is not an SVG document');
  const p = palettes[theme];
  if (!p) throw new Error(`Unsupported theme: ${theme}`);
  const resized = source.replace(/viewBox="0 0 ([\d.]+) ([\d.]+)"/, (_m, width, height) => `viewBox="0 0 ${width} ${Number(height) + 60}"`);
  const decoration = `<g id="laouen-arcade-frame"><text x="20" y="22" fill="${p.text}" font-size="14" font-family="monospace" font-weight="700">Contribution Arcade / Le serpent de Laouën</text><text x="780" y="22" text-anchor="end" fill="${p.green}" font-size="9" font-family="monospace">● UPDATED DAILY</text></g><g id="laouen-ai-robot"><rect x="0" y="0" width="42" height="31" rx="10" fill="${p.panel}" stroke="${p.cyan}" stroke-width="2"/><circle cx="13" cy="14" r="4" fill="${p.purple}"/><circle cx="29" cy="14" r="4" fill="${p.purple}"/><rect x="8" y="34" width="26" height="22" rx="6" fill="${p.panel}" stroke="${p.cyan}"/><text x="21" y="49" text-anchor="middle" fill="${p.green}" font-size="8" font-family="monospace">AI</text><animateMotion dur="12s" repeatCount="indefinite" path="M 40 190 C 190 145, 330 225, 480 170 S 670 205, 735 165"/></g>`;
  return resized.replace('</svg>', `${decoration}</svg>`);
}

const arg = (name) => { const i = process.argv.indexOf(name); return i < 0 ? undefined : process.argv[i + 1]; };
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const input = arg('--input');
  const output = arg('--output');
  if (!input || !output) throw new Error('Usage: node scripts/decorate-snake.mjs --input source.svg --output arcade.svg --theme dark|light');
  writeFileSync(output, decorateSnake(readFileSync(input, 'utf8'), arg('--theme') || 'dark'), 'utf8');
}
