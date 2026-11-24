/* Shared localization for the static site, Voice and the React product area.
 * Catalogs are built ahead of time and served from this website. User input is
 * never translated or sent to a translation service. Text nodes stay intact
 * so React and the interactive demos retain ownership of their elements. */
(() => {
  'use strict';
  const html = document.documentElement;
  const assetRoot = new URL('.', document.currentScript.src);
  const pageSource = html.dataset.sourceLanguage || 'de';
  const normalize = text => text.replace(/\s+/g, ' ').trim();
  const ignore = 'script,style,noscript,code,pre,textarea,[contenteditable],[data-i18n-ignore],[data-i18n-user]';
  const attributes = ['alt', 'title', 'aria-label', 'aria-description', 'placeholder', 'data-lu-text'];
  const textState = new WeakMap(), attributeState = new WeakMap();
  const missing = new Set();
  let dictionary = {}, folded = {}, templates = [], manifest, language = 'de', dialog, opener;
  let observer, ready = false;
  function storedLanguage() { try { return localStorage.getItem('aiforeu.language'); } catch { return null; } }
  function remember(value) { try { localStorage.setItem('aiforeu.language', value); } catch { /* URL keeps the choice without storage. */ } }
  async function getJSON(url) {
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 15000);
    try { const response = await fetch(url, { signal: controller.signal, cache: 'no-cache' }); if (!response.ok) throw new Error('Language file unavailable'); return await response.json(); }
    finally { clearTimeout(timeout); }
  }
  function translated(text, source = pageSource) {
    const value = normalize(text), key = `${source}\u0004${value}`;
    if (Object.hasOwn(dictionary, key)) return dictionary[key];
    if (Object.hasOwn(folded, key.toLocaleLowerCase())) return folded[key.toLocaleLowerCase()];
    for (const entry of templates) {
      if (entry.source !== source) continue;
      const match = value.match(entry.pattern);
      if (match) return entry.value.replace(/\{(\d+)\}/g, (_, id) => { const value = match[entry.slots.indexOf(id) + 1]; return dictionary[`${source}\u0004${value}`] ?? folded[`${source}\u0004${value}`.toLocaleLowerCase()] ?? value; });
    }
    if (value && /\p{L}/u.test(value) && !manifest?.literals.includes(value) && !/^(?:https?:|mailto:|[\w.+-]+@[\w.-]+\.|\/|\{)/.test(value)) missing.add(key);
    return text;
  }
  const sourceOf = element => element.closest('[data-source-language]')?.dataset.sourceLanguage || pageSource;
  function updateText(node) {
    if (!node.parentElement || node.parentElement.closest(ignore)) return;
    const value = node.nodeValue;
    let state = textState.get(node);
    if (!state || (value !== state.applied && value !== state.source)) state = { source: value };
    const result = translated(state.source, sourceOf(node.parentElement));
    state.applied = result === state.source ? state.source : (state.source.match(/^\s*/)[0] + result + state.source.match(/\s*$/)[0]);
    textState.set(node, state);
    if (value !== state.applied) node.nodeValue = state.applied;
  }
  function updateAttribute(element, name) {
    if (!element.hasAttribute(name)) return;
    const states = attributeState.get(element) || {};
    const value = element.getAttribute(name);
    let state = states[name];
    if (!state || (value !== state.applied && value !== state.source)) state = { source: value };
    state.applied = translated(state.source, sourceOf(element));
    states[name] = state; attributeState.set(element, states);
    if (value !== state.applied) element.setAttribute(name, state.applied);
  }
  function localizedURL(href) {
    const url = new URL(href, location.href);
    const siteRoot = new URL('../', assetRoot);
    if (url.origin !== location.origin || !url.pathname.startsWith(siteRoot.pathname)) return null;
    if (/\.[a-z0-9]+$/i.test(url.pathname) && !/\.html$/i.test(url.pathname)) return null;
    url.searchParams.set('lang', language);
    return url;
  }
  function updateElement(element) {
    if (element.closest(ignore)) return;
    attributes.forEach(name => updateAttribute(element, name));
    if (element.matches('meta[name="description"],meta[property="og:title"],meta[property="og:description"],meta[name="twitter:title"],meta[name="twitter:description"]')) updateAttribute(element, 'content');
    if (element.matches('input[type="submit"],input[type="button"]')) updateAttribute(element, 'value');
    if (element.matches('a[href]:not([download])')) {
      const href = element.getAttribute('href');
      if (!href || href.startsWith('#')) return;
      const url = localizedURL(href);
      if (url && url.href !== element.href) element.setAttribute('href', url.pathname + url.search + url.hash);
    }
  }
  function scan(root) {
    if (root.nodeType === Node.TEXT_NODE) { updateText(root); return; }
    if (root.nodeType !== Node.ELEMENT_NODE) return;
    if (root.closest(ignore)) return;
    updateElement(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode(node) { return node.nodeType === Node.ELEMENT_NODE && node.matches(ignore) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; }
    });
    let node;
    while ((node = walker.nextNode())) node.nodeType === Node.TEXT_NODE ? updateText(node) : updateElement(node);
  }
  function sourceText(element) {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT); let node, value = '';
    while ((node = walker.nextNode())) value += textState.get(node)?.source ?? node.nodeValue;
    return value;
  }
  function buttonFor(slot) {
    if (slot.firstElementChild) {
      const button = slot.querySelector('button'), name = `${translated('Sprache wählen', 'de')}: ${manifest.languages.find(item => item.code === language).name}`;
      if (button.getAttribute('aria-label') !== name) button.setAttribute('aria-label', name);
      const label = slot.querySelector('span');
      if (label.textContent !== language.split('-')[0].toUpperCase()) label.textContent = language.split('-')[0].toUpperCase();
      return;
    }
    slot.dataset.i18nIgnore = '';
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'aif-language-button';
    button.setAttribute('aria-haspopup', 'dialog'); button.setAttribute('aria-controls', 'aif-language-dialog');
    button.setAttribute('aria-label', `${translated('Sprache wählen', 'de')}: ${manifest.languages.find(item => item.code === language).name}`);
    button.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18M5 6.5h14M5 17.5h14"/></svg><span></span>';
    button.querySelector('span').textContent = language.split('-')[0].toUpperCase();
    button.addEventListener('click', event => {
      opener = button;
      for (const link of dialog.querySelectorAll('[data-code]')) { const url = new URL(location.href); url.searchParams.set('lang', link.dataset.code); link.href = url.pathname + url.search + url.hash; }
      const input = dialog.querySelector('input');
      input.value = '';
      input.dispatchEvent(new Event('input'));
      dialog.showModal();
      dialog.querySelector('.aif-language-list').scrollTop = 0;
      if (event.detail === 0 || !matchMedia('(pointer: coarse)').matches) {
        input.focus({ preventScroll: true });
      }
    });
    slot.append(button);
  }
  function mountButtons() { document.querySelectorAll('[data-site-language-switch]').forEach(buttonFor); }
  function createDialog() {
    dialog = document.createElement('dialog'); dialog.id = 'aif-language-dialog'; dialog.className = 'aif-language-dialog';
    dialog.dataset.i18nIgnore = ''; dialog.setAttribute('aria-labelledby', 'aif-language-title');
    const top = document.createElement('div'); top.className = 'aif-language-top';
    const title = document.createElement('h2'); title.id = 'aif-language-title'; title.textContent = translated('Sprache wählen', 'de');
    const close = document.createElement('button'); close.type = 'button'; close.className = 'aif-language-close';
    close.textContent = '×'; close.setAttribute('aria-label', translated('Schließen', 'de')); close.addEventListener('click', () => dialog.close());
    top.append(title, close);
    const input = document.createElement('input'); input.type = 'search'; input.className = 'aif-language-search'; input.autocomplete = 'off';
    input.placeholder = translated('Sprache suchen', 'de'); input.setAttribute('aria-label', input.placeholder);
    const list = document.createElement('div'); list.className = 'aif-language-list';
    manifest.languages.forEach(item => {
      const link = document.createElement('a'); const url = new URL(location.href); url.searchParams.set('lang', item.code);
      link.href = url.pathname + url.search + url.hash; link.lang = item.code; link.hreflang = item.code;
      link.textContent = item.name; link.dataset.code = item.code;
      const aliases = typeof Intl.DisplayNames === 'function' ? [language, 'en', 'de'].map(locale => new Intl.DisplayNames([locale], { type: 'language' }).of(item.code)) : [];
      link.dataset.search = [item.name, item.code, ...aliases].join(' ');
      if (item.code === language) link.setAttribute('aria-current', 'true');
      link.addEventListener('click', event => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault(); dialog.close(); changeLanguage(item.code);
      }); list.append(link);
    });
    const empty = document.createElement('p'); empty.className = 'aif-language-empty'; empty.hidden = true; empty.textContent = translated('Keine Sprache gefunden.', 'de');
    input.addEventListener('input', () => {
      const search = input.value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase(); let count = 0;
      for (const link of list.children) {
        link.hidden = !link.dataset.search.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase().includes(search);
        if (!link.hidden) count++;
      }
      empty.hidden = count > 0;
    });
    dialog.append(top, input, list, empty); document.body.append(dialog);
    dialog.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); dialog.close(); } });
    dialog.addEventListener('close', () => opener?.focus({ preventScroll: true }));
    dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
  }
  function installDictionary(data) {
    dictionary = data;
    folded = Object.fromEntries(Object.entries(dictionary).map(([key, value]) => [key.toLocaleLowerCase(), value]));
    templates = manifest.templates.map(key => {
      const [source, text] = key.split('\u0004'), slots = [];
      const pattern = text.split(/(\{\d+\})/).map(part => {
        const match = part.match(/^\{(\d+)\}$/); if (match) { slots.push(match[1]); return '(.+?)'; }
        return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      }).join('');
      return { source, slots, pattern: new RegExp(`^${pattern}$`), value: dictionary[key] };
    }).filter(entry => entry.value);
  }
  function applyLanguage() {
    html.lang = language; remember(language);
    const url = new URL(location.href); url.searchParams.set('lang', language); history.replaceState(history.state, '', url);
    document.querySelector('meta[property="og:locale"]')?.setAttribute('content', language.replace('-', '_'));
    missing.clear(); dialog?.remove(); createDialog(); scan(html); mountButtons();
    ready = true; html.dataset.languageReady = language; delete html.dataset.languagePending;
    queueMicrotask(() => window.dispatchEvent(new CustomEvent('aiforeu:language-ready', { detail: { language } })));
  }
  async function changeLanguage(code) {
    if (code === language) return;
    html.dataset.languagePending = '';
    try {
      const data = await getJSON(new URL(`i18n/${code}.json?v=${manifest.version}`, assetRoot));
      language = code; installDictionary(data); applyLanguage(); opener?.focus({ preventScroll: true });
    } catch {
      delete html.dataset.languagePending;
      const error = document.createElement('p'); error.setAttribute('role', 'alert'); error.textContent = translated('Die Übersetzung konnte nicht geladen werden.', 'de');
      dialog.prepend(error); dialog.showModal();
    }
  }
  async function start() {
    const loading = document.createElement('div'); loading.className = 'aif-language-loading'; loading.dataset.i18nIgnore = '';
    loading.setAttribute('role', 'progressbar'); loading.setAttribute('aria-label', 'AIFOREU');
    loading.innerHTML = '<span>AIFOREU</span><span class="aif-language-dots" aria-hidden="true">···</span>'; document.body.append(loading);
    manifest = await getJSON(new URL('i18n/manifest.json', assetRoot));
    const requested = new URLSearchParams(location.search).get('lang') || storedLanguage() || 'de';
    language = manifest.languages.some(item => item.code === requested) ? requested : 'de';
    installDictionary(await getJSON(new URL(`i18n/${language}.json?v=${manifest.version}`, assetRoot)));
    applyLanguage();
    observer = new MutationObserver(records => {
      const roots = new Set();
      for (const record of records) {
        if (record.type === 'childList') record.addedNodes.forEach(node => roots.add(node));
        else if (record.type === 'characterData') roots.add(record.target);
        else if (record.target instanceof Element && !record.target.closest(ignore)) updateElement(record.target);
      }
      roots.forEach(scan); mountButtons();
    });
    observer.observe(html, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: [...attributes, 'content', 'href', 'value'] });
  }
  window.AiforeuLanguage = { t: translated, sourceText, get language() { return language; }, get ready() { return ready; }, get missing() { return [...missing]; }, localizedURL };
  start().catch(() => {
    html.dataset.languageError = '';
    if (manifest) html.lang = language;
    const panel = document.createElement('main'); panel.className = 'aif-language-error'; panel.dataset.i18nIgnore = '';
    const text = document.createElement('p'); text.setAttribute('role', 'alert'); text.textContent = manifest?.labels?.[language]?.error || 'Die Übersetzung konnte nicht geladen werden. / Translation could not be loaded.';
    const retry = document.createElement('button'); retry.textContent = '↻'; retry.setAttribute('aria-label', manifest?.labels?.[language]?.retry || 'Erneut versuchen / Retry'); retry.addEventListener('click', () => location.reload());
    panel.append(text, retry); document.body.append(panel);
  });
})();
