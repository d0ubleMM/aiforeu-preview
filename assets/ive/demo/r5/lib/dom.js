// Tiny rendering toolkit for the generated IVE demos: an escaping `html` template tag and
// `morph`, which patches a live DOM subtree towards new markup in place. Elements are kept
// where tag and key agree, so scroll positions, text selections and focus survive a re-render;
// only changed attributes and text nodes are touched.

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ESC[c]);

/** Marks a string as already-safe markup for the `html` tag. */
export const raw = (s) => ({ __raw: String(s) });

function part(v) {
  if (v == null || v === false) return '';
  if (Array.isArray(v)) return v.map(part).join('');
  if (typeof v === 'object' && '__raw' in v) return v.__raw;
  return esc(v);
}

/** Template tag: interpolations are escaped, arrays joined, `raw()` values passed through. */
export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i++) out += part(values[i]) + strings[i + 1];
  return raw(out);
}

/** The markup string of an `html` result (or a plain string). */
export const str = (v) => (v && typeof v === 'object' && '__raw' in v ? v.__raw : String(v ?? ''));

const keyOf = (n) => (n.nodeType === 1 ? (n.getAttribute('data-key') || n.id || '') : '');

function same(a, b) {
  if (a.nodeType !== b.nodeType) return false;
  if (a.nodeType !== 1) return true;
  return a.nodeName === b.nodeName && keyOf(a) === keyOf(b);
}

function syncAttributes(live, want) {
  for (const { name } of Array.from(live.attributes)) {
    if (!want.hasAttribute(name)) live.removeAttribute(name);
  }
  for (const { name, value } of Array.from(want.attributes)) {
    if (live.getAttribute(name) !== value) live.setAttribute(name, value);
  }
  const tag = live.nodeName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') {
    const v = tag === 'INPUT' ? (want.getAttribute('value') ?? '') : want.textContent;
    if (live.value !== v && document.activeElement !== live) live.value = v;
  }
}

function patch(live, want) {
  if (live.nodeType === 3) {
    if (live.nodeValue !== want.nodeValue) live.nodeValue = want.nodeValue;
    return;
  }
  if (live.nodeType !== 1) return;
  syncAttributes(live, want);
  if (live.nodeName === 'TEXTAREA') return; // value handled above
  morphChildren(live, want);
}

function morphChildren(live, want) {
  const wanted = Array.from(want.childNodes);
  const wantedKeys = new Set(wanted.map(keyOf).filter(Boolean));
  for (let i = 0; i < wanted.length; i++) {
    const w = wanted[i];
    const have = live.childNodes[i];
    if (!have) { live.appendChild(document.importNode(w, true)); continue; }
    if (same(have, w)) { patch(have, w); continue; }
    const k = keyOf(w);
    if (k) {
      let found = null;
      for (let j = i + 1; j < live.childNodes.length; j++) {
        const c = live.childNodes[j];
        if (c.nodeType === 1 && keyOf(c) === k && c.nodeName === w.nodeName) { found = c; break; }
      }
      if (found) { live.insertBefore(found, have); patch(found, w); continue; }
    }
    const hk = keyOf(have);
    if (hk && wantedKeys.has(hk)) { live.insertBefore(document.importNode(w, true), have); continue; }
    live.replaceChild(document.importNode(w, true), have);
  }
  while (live.childNodes.length > wanted.length) live.removeChild(live.lastChild);
}

const tpl = document.createElement('template');

/** Patches `container`'s children towards `markup` (an `html` result or string). */
export function morph(container, markup) {
  tpl.innerHTML = str(markup);
  morphChildren(container, tpl.content);
}

/**
 * Containers marked data-stick (and DOM terminals, .dt) follow their end when content grows,
 * until a visitor scrolls them up; they follow again once scrolled back to the end. Call after
 * every render. Programmatic writes are flagged so the scroll listener ignores them.
 */
export function stick(root) {
  for (const el of root.querySelectorAll('[data-stick], .dt')) {
    if (!el.__demoStickBound) {
      el.__demoStickBound = true;
      el.addEventListener('scroll', () => {
        if (el.__demoSetting) { el.__demoSetting = false; return; }
        el.__demoFree = el.scrollTop + el.clientHeight < el.scrollHeight - 6;
      }, { passive: true });
    }
    if (el.__demoFree) continue;
    const end = el.scrollHeight - el.clientHeight;
    if (end > 0 && Math.abs(el.scrollTop - end) > 1) { el.__demoSetting = true; el.scrollTop = end; }
  }
}
