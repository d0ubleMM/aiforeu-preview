// A terminal screen rendered as DOM rows, in the look of the app's xterm terminals (13 px
// SF Mono/Menlo, 18 px rows, the app's theme tokens). The text is scripted CLI-style demo
// output (a Claude Code-style transcript with ⏺ tool lines and the bordered prompt box, a
// Codex-style one with › and •). Lines carry the few SGR codes the CLIs use (bold, dim,
// green, yellow, red); `rows()` turns them into spans. Nothing here runs a CLI or a provider.
import { esc } from './dom.js';

const E = '\x1b[';
export const G = `${E}32m`, D = `${E}2m`, B = `${E}1m`, Y = `${E}33m`, RD = `${E}31m`, R = `${E}0m`;

/** Terminal model: `content` lines scroll up, `tail` (spinner, prompt box, hint, dialog) is redrawn at the bottom. */
export function terminal({ style = 'claude', content = [], typed = '', spinner = null, dialog = null, hint = true, cursor = true } = {}) {
  return { style, content: content.slice(), typed, spinner, dialog, hint, cursor };
}

/** Claude Code-style lines of one tool step: "⏺ Tool(input)" and its dim "⎿ result" line. */
export const step = (tool, input, result) => [`${G}⏺${R} ${B}${tool}${R}(${input})`, `  ${D}⎿  ${result}${R}`, ''];
/** A short reply paragraph; wrapped at render time to the terminal's width (at most `width`). */
export const say = (text, width = 60) => [{ text, width, first: `${G}⏺${R} `, rest: '  ' }, ''];
/** The user's instruction as the CLI echoes it. */
export const prompt = (text, width = 60) => [{ text, width, first: `${D}> `, rest: `${D}  `, end: R }, ''];
/** Codex-style: "• Tool input" lines with a dim result, and "› instruction". */
export const cstep = (what, result) => (result ? [`${B}•${R} ${what}`, `  ${D}${result}${R}`, ''] : [`${B}•${R} ${what}`, '']);
export const csay = (text, width = 60) => [{ text, width, first: `${B}•${R} `, rest: '  ' }, ''];
export const cprompt = (text, width = 60) => [{ text, width, first: `${D}› `, rest: `${D}  `, end: R }, ''];
/** Expands wrapped-paragraph objects to lines for `cols` columns. */
export const expand = (lines, cols) => lines.flatMap((l) => (typeof l === 'string' ? [l] : wrap(l.text, Math.max(16, Math.min(l.width || 60, cols - 4))).map((w, i) => `${i ? l.rest : l.first}${w}${l.end || ''}`)));
export const spinner = (seconds, style = 'claude') => (style === 'codex'
  ? `${D}• Working (${seconds}s · esc to interrupt)${R}`
  : `${Y}✻${R} ${D}Working… (${seconds}s · esc to interrupt)${R}`);

/** Claude Code-style permission dialog, as the CLI draws it in the terminal. */
export const permissionDialog = (command, description) => [
  `${G}⏺${R} ${B}Bash${R}(${command})`,
  '',
  `  ${B}Bash command${R}`,
  `  ${command}`,
  `  ${D}${description}${R}`,
  '',
  '  Do you want to proceed?',
  `  ${B}❯ 1. Yes${R}`,
  `    2. Yes, and don't ask again for ${command}`,
  '    3. No',
  '',
  `  ${D}Esc to cancel${R}`,
];

export function wrap(text, width) {
  const out = [];
  let line = '';
  for (const word of text.split(' ')) {
    if (line && (line + ' ' + word).length > width) { out.push(line); line = word; } else line = line ? `${line} ${word}` : word;
  }
  if (line) out.push(line);
  return out;
}

/** The tail lines of a terminal model for `cols` columns, and where the cursor sits. */
export function tail(term, cols) {
  if (term.dialog) return { lines: term.dialog, cursor: null };
  const lines = [];
  if (term.spinner) lines.push(term.spinner, '');
  if (term.style === 'codex') {
    lines.push(`${B}›${R} ${term.typed}`);
    return { lines, cursor: { line: lines.length - 1, col: 2 + term.typed.length } };
  }
  const inner = Math.max(20, Math.min(cols - 2, 140)) - 4;
  const t = term.typed.slice(0, inner - 2);
  lines.push(`╭${'─'.repeat(inner + 2)}╮`, `│ ${B}>${R} ${t}${' '.repeat(Math.max(0, inner - 2 - t.length))} │`, `╰${'─'.repeat(inner + 2)}╯`);
  const cursorLine = lines.length - 2;
  if (term.hint) lines.push(`  ${D}? for shortcuts${R}`);
  return { lines, cursor: { line: cursorLine, col: 4 + t.length } };
}

/** One SGR-coded line as spans. `cursorCol`: where to draw the block cursor (or null). */
export function spans(line, cursorCol = null) {
  let out = '', cls = new Set(), i = 0, col = 0, placed = cursorCol == null;
  const open = () => (cls.size ? `<span class="${[...cls].join(' ')}">` : '');
  const close = () => (cls.size ? '</span>' : '');
  let buf = '';
  const flush = () => { if (buf) { out += open() + esc(buf) + close(); buf = ''; } };
  while (i < line.length) {
    if (line[i] === '\x1b' && line[i + 1] === '[') {
      const m = /^\x1b\[([0-9;]*)m/.exec(line.slice(i));
      if (m) {
        flush();
        for (const code of m[1].split(';')) {
          if (code === '0' || code === '') cls = new Set();
          else if (code === '1') cls.add('dt-b');
          else if (code === '2') cls.add('dt-d');
          else if (code === '32') cls.add('dt-g');
          else if (code === '33') cls.add('dt-y');
          else if (code === '31') cls.add('dt-r');
        }
        i += m[0].length;
        continue;
      }
    }
    if (!placed && col === cursorCol) { flush(); out += `<span class="dt-cursor">${esc(line[i])}</span>`; placed = true; i++; col++; continue; }
    buf += line[i];
    i++;
    col++;
  }
  flush();
  if (!placed) out += '<span class="dt-cursor"> </span>';
  return out;
}

/**
 * Markup of a terminal: rows of the content, then the tail. `cols` decides the prompt box
 * width; the container scrolls when the content is longer than the box (the demo's player keeps
 * it at the bottom until a visitor scrolls up).
 */
export function renderTerminal(term, { cols = 80, id = '', focused = true, fontSize = 13 } = {}) {
  const showCursor = focused && term.cursor;
  let rows = '';
  const row = (line, cur = null) => { rows += `<div class="dt-row">${spans(line, cur) || '&nbsp;'}</div>`; };
  for (const line of expand(term.content, cols)) row(line);
  if (term.dialog) {
    for (const line of expand(term.dialog, cols)) row(line);
  } else if (term.style === 'codex') {
    if (term.spinner) { row(term.spinner); row(''); }
    row(`${B}›${R} ${term.typed}`, showCursor ? 2 + term.typed.length : null);
  } else {
    // Claude Code's bordered prompt box: xterm draws box-drawing glyphs as a continuous frame,
    // so the DOM version is a real 1 px rounded frame three rows tall.
    if (term.spinner) { row(term.spinner); row(''); }
    const inner = Math.max(20, Math.min(cols - 2, 140)) - 4;
    const t = term.typed.slice(0, inner - 2);
    rows += `<div class="dt-box" style="width: calc(${inner + 4} * 1ch)"><span class="dt-box-line"><span class="dt-b">&gt;</span> ${esc(t)}${showCursor ? '<span class="dt-cursor"> </span>' : ''}</span></div>`;
    if (term.hint) row(`  ${D}? for shortcuts${R}`);
    if (term.queued) row(`  ${D}⏸ Queued, sends when the turn ends: ${term.queued}${R}`);
  }
  // The hidden input takes the keyboard when a visitor clicks into the terminal (like xterm's helper textarea).
  return `<div class="dt${focused ? '' : ' dt-cursor-hidden'}" data-term="${esc(id)}" data-cols="${cols}" style="--dt-fs:${fontSize}px"><div class="dt-rows">${rows}</div><textarea class="dt-input" data-term-input="${esc(id)}" aria-label="Terminal input" autocorrect="off" autocapitalize="off" spellcheck="false" tabindex="0"></textarea></div>`;
}

/** Columns that fit a terminal of `width` CSS px at `fontSize` (xterm's cell is about 0.6 em wide). */
export const colsFor = (width, fontSize = 13) => Math.max(20, Math.floor((width - 12) / (fontSize * 0.6)));
