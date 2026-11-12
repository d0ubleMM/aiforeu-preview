// The IVE 1.0.17 interface as markup functions. Every component below mirrors the DOM the real
// frontend renders (class names, attributes, nesting and texts are taken from DOM dumps made with
// scripts/demos/snapshot.mjs), so app.css styles it exactly like the app. The data is the Orbit
// demo project; nothing here talks to a backend or runs a provider.
//
// Component API (all return `html` results; compose with `${…}`):
//   shell({ sidebar, view, workspace, sessions, activeId, main, theme })  the app window
//   sidebar({ workspace, sessions, activeId })                              project/session navigation
//   header({ view, workspace, session })                                    44 px context bar
//   sessionScreen({ session, mode, transcript, drawerHeight, terminal, cols, composer })
//      mode 'overview' | 'drawer' (overview + small terminal) | 'full' (terminal only)
//   transcript(messages, { running })                                       conversation rows
//   brief(session, messages)                                                 the one-line session overview
// Session objects: { id, name, cli: 'claude'|'codex', model, state: 'running'|'waiting'|'done'|'failed'|'stopped',
//                    detail?, age? }   Messages: { role: 'user'|'assistant', text?, steps?, open?, time }
import { html, raw, esc } from './dom.js';
import { icon } from './icons.js';
import { renderTerminal } from './term.js';

export const CLAUDE_LOGO = "data:image/svg+xml,%3csvg%20width='94'%20height='94'%20viewBox='0%200%2094%2094'%20fill='none'%20xmlns='http://www.w3.org/2000/svg'%3e%3cpath%20d='M18.7657%2062.4437L37.1822%2052.1167L37.4857%2051.2122L37.1822%2050.7085H36.2715L33.1852%2050.5208L22.6615%2050.2391L13.5545%2049.8636L4.70044%2049.3942L2.47428%2048.9248L0.399902%2046.1553L0.602281%2044.794L2.47428%2043.5266L5.15579%2043.7613L11.0754%2044.1837L19.98%2044.794L26.4055%2045.1695L35.9679%2046.1553H37.4857L37.6881%2045.545L37.1822%2045.1695L36.7774%2044.794L27.5692%2038.5508L17.6021%2031.9791L12.3908%2028.1769L9.60812%2026.2524L8.19147%2024.4686L7.58433%2020.5256L10.1141%2017.7091L13.5545%2017.9438L14.4146%2018.1785L17.9056%2020.8542L25.343%2026.6279L35.0572%2033.7629L36.4739%2034.9364L37.0443%2034.5514L37.1316%2034.2792L36.4739%2033.1996L31.212%2023.6706L25.596%2013.9539L23.0663%209.91695L22.4086%207.52296C22.1538%206.51831%2022.0038%205.68714%2022.0038%204.65957L24.8877%200.716544L26.5067%200.200195L30.4025%200.716544L32.0215%202.12477L34.4501%207.66379L38.3458%2016.3478L44.4172%2028.1769L46.188%2031.6975L47.1493%2034.9364L47.5035%2035.9222H48.1106V35.3589L48.6166%2028.6933L49.5273%2020.5256L50.438%2010.0108L50.7415%207.05356L52.2088%203.48605L55.1433%201.56148L57.42%202.64112L59.292%205.31674L59.039%207.05356L57.926%2014.2824L55.7504%2025.5952L54.3337%2033.1996H55.1433L56.1046%2032.2138L59.9497%2027.1442L66.3752%2019.0704L69.2085%2015.8784L72.5478%2012.3579L74.6728%2010.668H78.7203L81.6548%2015.0804L80.3394%2019.6337L76.1906%2024.8911L72.7502%2029.3504L67.8172%2035.9595L64.7562%2041.2734L65.0307%2041.7118L65.7681%2041.6489L76.8989%2039.255L82.9197%2038.1753L90.1041%2036.9549L93.3422%2038.457L93.6963%2040.006L92.4315%2043.151L84.7411%2045.0287L75.7353%2046.8594L62.3244%2050.0164L62.1759%2050.1358L62.3512%2050.3958L68.399%2050.9432L70.9794%2051.084H77.3037L89.0922%2051.9759L92.1785%2053.9944L93.9999%2056.4822L93.6963%2058.4068L88.9404%2060.8008L82.5655%2059.2987L67.6401%2055.7312L62.5301%2054.4638H61.8217V54.8862L66.0717%2059.064L73.9139%2066.1051L83.6786%2075.2116L84.1845%2077.4648L82.9197%2079.2485L81.6042%2079.0608L73.0032%2072.5829L69.6639%2069.6726L62.1759%2063.3356H61.67V63.9928L63.3902%2066.5276L72.5478%2080.2812L73.0032%2084.5059L72.3454%2085.8672L69.9675%2086.7121L67.3871%2086.2427L61.9735%2078.6852L56.4587%2070.2359L52.0064%2062.6315L51.4687%2062.971L48.8189%2091.2654L47.6047%2092.7206L44.7714%2093.8002L42.3934%2092.0164L41.1286%2089.1061L42.3934%2083.3324L43.9113%2075.8219L45.1255%2069.8604L46.2386%2062.4437L46.9184%2059.9661L46.8583%2059.8003L46.3153%2059.8916L40.7238%2067.5603L32.2239%2079.0608L25.4948%2086.2427L23.8758%2086.8999L21.0931%2085.4447L21.3461%2082.863L22.9145%2080.5629L32.2239%2068.7338L37.8399%2061.3641L41.4594%2057.1337L41.4242%2056.5218L41.2244%2056.5048L16.489%2072.6299L12.0873%2073.1932L10.1647%2071.4094L10.4176%2068.4991L11.3283%2067.5603L18.7657%2062.4437Z'%20fill='%23D97757'/%3e%3c/svg%3e";
const BRAND_LIGHT = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%20256%20256'%20width='256'%20height='256'%20role='img'%3e%3ctitle%3eIVE%20logo%3c/title%3e%3cg%20transform='translate(5%200)'%3e%3crect%20x='-9'%20y='-9'%20width='57.6'%20height='18'%20rx='9'%20fill='%238FA6DA'%20transform='translate(72%20128)%20rotate(45)'/%3e%3crect%20x='-9'%20y='-9'%20width='57.6'%20height='18'%20rx='9'%20fill='%238FA6DA'%20transform='translate(72%20184)%20rotate(-45)'/%3e%3crect%20x='138'%20y='114'%20width='40'%20height='84'%20rx='6'%20fill='%230E1014'/%3e%3crect%20x='138'%20y='54'%20width='40'%20height='46'%20rx='6'%20fill='%231647FF'/%3e%3c/g%3e%3c/svg%3e";
const BRAND_DARK = "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%20256%20256'%20width='256'%20height='256'%20role='img'%3e%3ctitle%3eIVE%20logo%3c/title%3e%3cg%20transform='translate(5%200)'%3e%3crect%20x='-9'%20y='-9'%20width='57.6'%20height='18'%20rx='9'%20fill='%233C5AA1'%20transform='translate(72%20128)%20rotate(45)'/%3e%3crect%20x='-9'%20y='-9'%20width='57.6'%20height='18'%20rx='9'%20fill='%233C5AA1'%20transform='translate(72%20184)%20rotate(-45)'/%3e%3crect%20x='138'%20y='114'%20width='40'%20height='84'%20rx='6'%20fill='%23F4F6FA'/%3e%3crect%20x='138'%20y='54'%20width='40'%20height='46'%20rx='6'%20fill='%231647FF'/%3e%3c/g%3e%3c/svg%3e";

const I = (name, size, cls, extra) => raw(icon(name, size, cls, extra));
export { I as ic };

/* ── vocabulary: the five status words, as lib/sessionVocabulary.js says them ── */
export const STATES = {
  running: { label: 'Running', text: 'text-x-running', dot: 'running', pulse: true },
  waiting: { label: 'Needs your reply', text: 'text-x-waiting', dot: 'waiting' },
  done: { label: 'Done', text: 'text-x-done', dot: 'done', check: true },
  failed: { label: 'Failed', text: 'text-x-failed', dot: 'failed' },
  stopped: { label: 'Stopped', text: 'text-x-stopped', dot: 'stopped' },
};
export const stateOf = (s) => STATES[s.state === 'idle' ? 'done' : s.state] || STATES.stopped;
export const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const CLI_LABEL = { claude: 'claude', codex: 'codex', gemini: 'gemini' };

/** A status dot like the sidebar's: pulsing when running, a check mark when done. */
export const dot = (state) => {
  const m = STATES[state] || STATES.stopped;
  return html`<span class="ive-dot${m.pulse ? ' is-pulse' : ''}" data-state="${m.dot}" aria-hidden="true">${m.check ? raw('<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3 3 7-7"></path></svg>') : ''}</span>`;
};

/** Inline code spans for `backticks` in a sentence, as the app's markdown renderer emits them. */
export function rich(text) {
  const parts = String(text).split(/(`[^`]+`)/);
  return raw(parts.map((p) => (p.startsWith('`') && p.endsWith('`')
    ? `<code class="bg-x-hover text-x-ink font-mono text-[12px] px-1 py-0.5 rounded">${esc(p.slice(1, -1))}</code>`
    : `<span>${esc(p)}</span>`)).join(''));
}

/* ── the app window ── */
export function shell({ sidebar: showSidebar = true, view = 'session', workspace, sessions = [], activeId = null, main, header: head = null, overlays = '', tools = false }) {
  const session = sessions.find((s) => s.id === activeId) || null;
  return html`<div class="x-app-shell flex flex-col overflow-hidden x-canvas" style="height: 100%;">
  <div class="flex flex-1 min-h-0">
    ${showSidebar ? sidebar({ workspace, sessions, activeId, view, tools }) : ''}
    <main class="x-app-main flex-1 flex flex-col min-w-0 min-h-0">
      ${head || header({ view, workspace, session, sidebarOpen: showSidebar })}
      <div class="ive-main-body flex-1 flex flex-col min-h-0 min-w-0 relative">${main}</div>
    </main>
  </div>
  ${overlays}
</div>`;
}

/* ── sidebar (NavSidebar + SidebarFoot) ── */
export function sidebar({ workspace = { id: 'orbit', name: 'Orbit', color: 'rgb(16, 185, 129)' }, sessions = [], activeId = null, view = 'session', tools = false }) {
  const running = sessions.filter((s) => s.state === 'running').length;
  const attention = sessions.filter((s) => s.state === 'waiting').length;
  const navItem = (key, name, label, extra = '') => html`<button type="button" data-nav="${key}" data-chrome-button="true" class="ive-nav-item${view === key ? ' is-active' : ''}" title="${label}"${view === key ? raw(' aria-current="page"') : ''}>${I(name, 15)}<span class="ive-nav-label">${label}</span>${extra}</button>`;
  return html`<aside id="ive-project-sidebar" aria-label="Projects and sessions" class="x-sidebar">
<div class="ive-sidebar-head"><div class="ive-sidebar-brand"><img alt="" class="ive-brand-mark ive-brand-mark--light" width="20" height="20" aria-hidden="true" src="${BRAND_LIGHT}"><img alt="" class="ive-brand-mark ive-brand-mark--dark" width="20" height="20" aria-hidden="true" src="${BRAND_DARK}"><span class="ive-brand-name">IVE</span></div><div class="ive-sidebar-head-actions"><button type="button" data-chrome-button="true" class="ive-sidebar-icon-btn" aria-label="Search commands" title="Search commands (⌘K)">${I('command', 15)}</button></div></div>
<button type="button" data-sidebar-new-chat="true" class="ive-sidebar-new-chat">${I('square-pen', 16)}<span>New session</span><kbd class="ive-kbd">⌘N</kbd></button>
<div class="ive-sidebar-filter">${I('search', 14, 'ive-sidebar-filter-icon')}<input aria-label="Filter sessions by name or model" placeholder="Search" type="search" value=""><kbd class="ive-kbd" aria-hidden="true">⌘K</kbd></div>
<nav class="ive-nav-group" aria-label="Work"><div class="t-label ive-nav-group-title">Work</div>
${navItem('home', 'house', 'Home')}
${navItem('board', 'columns3', 'Board', running ? html`<span class="ive-nav-badge" data-board-badge="true">${running} running</span>` : '')}
${attention ? html`<button type="button" class="ive-needs-you" aria-haspopup="dialog">${attention} item${attention > 1 ? 's' : ''} need${attention > 1 ? '' : 's'} your attention<span aria-hidden="true">→</span></button>` : ''}
${navItem('review', 'git-compare-arrows', 'Review')}
${navItem('knowledge', 'book-open', 'Knowledge')}
</nav>
<div class="ive-nav-group ive-nav-group--projects"><div class="t-label ive-nav-group-title ive-project-heading"><span>Projects</span><button type="button" class="ive-sidebar-icon-btn" aria-label="Add project" title="Add project">${I('plus', 16)}</button></div>
<div class="ive-project-tree" data-project-tree=""><div class="ive-project-sort"><label>Sort <select aria-label="Project and session order"><option value="recent">Recent activity</option><option value="manual">Manual order</option></select></label></div>
<div class="ive-project-tree-list" data-ia-session-spine="true">
<div data-workspace-id="${workspace.id}" class="x-workspace-group relative transition-colors duration-[80ms]" data-expanded="true">
<div role="button" tabindex="0" draggable="true" class="group w-full flex items-center gap-1.5 px-3 py-2 text-xs hover:bg-x-hover text-left transition-colors cursor-grab active:cursor-grabbing" title="Drag to reorder workspace">${I('grip-vertical', 11, 'shrink-0 text-x-faint/40 opacity-0 group-hover:opacity-100 transition-opacity')}${I('chevron-down', 12, 'shrink-0 text-x-faint')}${I('folder-open', 12, 'shrink-0', `style="color: ${workspace.color || 'rgb(16, 185, 129)'};"`)}<span class="truncate text-x-ink font-medium flex-1 min-w-0">${workspace.name}</span><button type="button" draggable="false" aria-label="Pin project ${workspace.name}" aria-pressed="false" title="Pin project" class="ive-project-pin ">${I('pin', 12)}</button><button type="button" draggable="false" aria-label="Rename project ${workspace.name}" title="Rename project" class="shrink-0 p-1 text-x-muted hover:text-x-ink hover:bg-x-hover rounded">${I('pencil', 12)}</button><span data-ws-color-trigger="true" role="button" tabindex="0" class="shrink-0 w-3 h-3 rounded-full cursor-pointer hover:ring-2 hover:ring-x-line-strong transition-colors duration-[80ms]" title="Change project color" style="background-color: ${workspace.color || 'rgb(16, 185, 129)'}; border: 1px solid var(--x-line-strong);"></span><button type="button" class="group inline-flex items-center justify-center gap-1.5 border font-medium whitespace-nowrap duration-[80ms] ease-x active:scale-[.98] focus-visible:outline focus-visible:outline-x-focus rounded-md min-h-[30px] text-xs border-x-line-strong bg-x-surface shrink-0 box-content p-1 -mr-1 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 text-x-faint hover:text-x-accent-ink hover:bg-x-accent-ink/10 transition-all" aria-label="Delete workspace" title="Remove project from IVE">${I('trash2', 13)}</button></div>
<div class="relative px-1.5 pb-1.5">
<button title="New session in ${workspace.name}" data-sidebar-new-session="${workspace.id}" class="w-full flex items-center gap-1.5 px-3 py-1.5 text-xs text-x-faint hover:text-x-ink-secondary hover:bg-x-hover transition-colors duration-[80ms] border-l-2 border-l-transparent">${I('plus', 11)}New session</button>
${sessions.filter((s) => !s.hidden).map((s) => sessionCard(s, s.id === activeId))}
<details class="ive-sidebar-project-tools"${tools ? raw(' open=""') : ''}><summary>Project tools</summary><div class="ive-project-actions"><button type="button" class="ive-project-action" data-demo-open="pipelines" title="Open the Pipeline editor (⌘⇧L)">${I('git-branch', 11)}<span class="truncate">Pipelines</span></button><button type="button" class="ive-project-action" data-demo-open="task" title="Open the guided task">${I('sparkles', 11)}<span class="truncate">Guided task</span></button><button type="button" class="ive-project-action" data-nav="review" title="Review the changes">${I('git-compare-arrows', 11)}<span class="truncate">Review</span></button></div></details>
</div></div></div></div></div>
<nav class="ive-nav-group ive-nav-group--setup" aria-label="Set up"><div class="t-label ive-nav-group-title">Set up</div>
${navItem('settings', 'settings', 'Settings')}
${navItem('connectors', 'plug', 'Connectors')}
${navItem('phone', 'smartphone', 'Phone')}
</nav>
<footer data-sidebar-foot="" class="ive-sidebar-foot"><div class="ive-sidebar-foot-row"><span class="ive-dot" data-state="done" aria-hidden="true"></span><span class="ive-sidebar-foot-state">Connected</span><button type="button" class="ive-sidebar-foot-cost" data-cost-today="" title="Cost &amp; tokens">$0.00 today</button></div></footer>
</aside>`;
}

export function sessionCard(s, active) {
  const m = stateOf(s);
  const detail = s.state === 'waiting' ? (s.detail || 'Permission needed') : '';
  return html`<div data-session-id="${s.id}" data-key="${s.id}">
<div role="button" tabindex="0" draggable="true" data-reorder-session="${s.id}" class="x-session-card group${active ? ' is-active' : ''} is-open" title="${s.name} · ${m.label}${detail ? ' · ' + detail : ''} · ${s.model} · drag onto a sibling to reorder">
<div class="shrink-0 w-3.5 h-3.5 flex items-center justify-center relative"><span role="checkbox" aria-checked="false" tabindex="0" class="absolute inset-0 rounded border flex items-center justify-center transition-all cursor-pointer border-x-tint-line hover:border-x-muted opacity-0 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:z-10 group-hover:z-10 bg-x-bg" title="Select for merge"></span><div class="flex items-center justify-center transition-opacity duration-150 opacity-100 group-hover:opacity-0">${dot(s.state === 'idle' ? 'done' : s.state)}</div></div>
<div class="flex-1 min-w-0 flex flex-col justify-center py-0.5"><div class="flex items-center gap-1.5 min-w-0"><span class="truncate block" title="${s.name}">${s.name}</span></div><div class="x-session-status ${m.text}" data-session-state="${m.dot}"${detail ? raw(` title="${esc(detail)}"`) : ''}><span>${m.label}</span><span class="ive-session-age">${s.age || '1m ago'}</span>${detail ? html`<span class="x-session-status-detail">· ${detail}</span>` : ''}</div></div>
<button type="button" aria-label="More actions for ${s.name}" title="More actions: rename, clone, copy output, export, summary, archive, stop (or right-click the session)" data-session-more="true" aria-haspopup="menu" class="shrink-0 h-6 w-6 items-center justify-center rounded-md text-x-faint hover:text-x-ink hover:bg-x-hover transition-all ${active ? 'inline-flex' : 'hidden group-hover:inline-flex group-focus-within:inline-flex'}">${I('ellipsis', 13)}</button>
<button type="button" aria-label="Delete session" title="Delete session" class="shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-md -mr-1 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 text-x-faint hover:text-x-accent-ink hover:bg-x-accent-ink/10 transition-all">${I('trash2', 12)}</button>
</div></div>`;
}

/* ── header (HeaderBar) ── */
export function header({ view = 'session', workspace, session = null, sidebarOpen = true, actions = '', crumb = '' }) {
  const inSession = view === 'session' && session;
  const address = inSession ? `ive/${workspace.id}/${slug(session.name)}` : view === 'board' ? `ive/${workspace.id}` : 'ive/home';
  const toggle = html`<div class="ive-sidebar-toggle-slot"><button type="button" class="ive-sidebar-toggle" data-sidebar-toggle="true" data-chrome-button="true" aria-label="${sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}" aria-expanded="${sidebarOpen ? 'true' : 'false'}" aria-controls="ive-project-sidebar" title="${sidebarOpen ? 'Hide sidebar' : 'Show sidebar'} (⌘\\)">${I(sidebarOpen ? 'panel-left-close' : 'panel-left-close', 18)}<span>Sidebar</span></button></div>`;
  const breadcrumb = inSession
    ? html`<nav class="ive-breadcrumb" aria-label="Where you are" data-breadcrumb=""><button type="button" data-chrome-button="true" class="ive-crumb-parent" title="Board · ${workspace.name}">${workspace.name}</button><span class="ive-crumb-sep" aria-hidden="true">›</span><strong class="ive-crumb-current" title="${session.name}">${session.name}</strong></nav>`
    : html`<nav class="ive-breadcrumb" aria-label="Where you are" data-breadcrumb=""><strong class="ive-crumb-current">${view === 'board' ? 'Board' : 'Home'}</strong></nav>`;
  const global = inSession
    ? html`<button type="button" data-tour="session-context" class="ive-mobile-header-button" aria-expanded="false" aria-label="Add context">${I('book-plus', 19)}</button><button type="button" data-chrome-button="true" class="ive-header-btn" aria-label="Chat with Claude" aria-pressed="false" aria-controls="ive-sidechat" title="Chat with Claude (⌘⇧J)">${I('message-circle', 15)}</button>`
    : html`<button type="button" data-new-session-button="" data-chrome-button="true" class="ive-header-btn ive-header-btn--new" aria-label="New session" title="New session (⌘N)">${I('plus', 15)}<span class="ive-header-btn-label">New</span></button><button type="button" data-chrome-button="true" class="ive-header-btn" aria-label="Search" title="Search (⌘K)">${I('search', 15)}</button><button type="button" data-chrome-button="true" class="ive-header-btn" aria-label="Chat with Claude" aria-pressed="false" aria-controls="ive-sidechat" title="Chat with Claude (⌘⇧J)">${I('message-circle', 15)}</button><button type="button" data-chrome-button="true" class="ive-header-btn" aria-label="Settings" title="Settings">${I('settings', 15)}</button>`;
  return html`<header class="x-context-bar ive-header" data-view="${view}"${inSession ? raw(' data-session-header=""') : ''}>${toggle}${breadcrumb}<span class="ive-header-address mono" data-header-address="" title="${address}">${address}</span><div data-header-slot="crumb" class="ive-header-slot">${crumb}</div><div class="ive-header-fill"></div><div data-header-slot="actions" class="ive-header-slot ive-header-slot--actions">${actions}</div><div class="ive-header-global">${global}</div></header>`;
}

/* ── launch strip pieces (model, agent mode) ── */
export const providerLogo = (cli) => (cli === 'claude'
  ? html`<span class="ive-provider-logo w-3.5 h-3.5 shrink-0" data-provider-logo="claude" aria-hidden="true"><img alt="" draggable="false" src="${CLAUDE_LOGO}"></span>`
  : html`<span class="ive-provider-logo w-3.5 h-3.5 shrink-0" data-provider-logo="${cli}" aria-hidden="true">${I('terminal', 12)}</span>`);

const LAUNCH_BTN = 'flex items-center gap-1.5 max-w-[240px] bg-x-bg/40 hover:bg-x-bg/80 border border-x-line/45 hover:border-x-accent/45 rounded-md px-2 py-1 transition-all duration-200 cursor-pointer';
export const modelStrip = (s) => html`<div class="ive-strip-launch inline-flex relative" data-testid="chat-header-model" data-session-id="${s.id}"><button type="button" title="Launch setting: ${s.model}. Pick a model to restart the session with it; the conversation continues." aria-label="Model: ${s.model}" aria-expanded="false" class="${LAUNCH_BTN}">${providerLogo(s.cli)}<span class="ive-strip-label text-x-muted font-sans">Model:</span><span class="font-semibold text-x-ink truncate " data-testid="chat-header-model-value">${s.model}</span>${I('chevron-down', 11, 'text-x-muted shrink-0 transition-transform')}</button></div>`;
export const modeStrip = (s, testid = 'perms') => html`<div class="ive-strip-launch inline-flex relative" data-testid="${testid}" data-session-id="${s.id}"><button type="button" title="Shared with Terminal and Overview. A mode change restarts the agent and resumes this conversation." aria-label="Agent mode: ${s.mode || 'Default'}" aria-expanded="false" class="${LAUNCH_BTN}">${I('shield', 11, 'text-x-muted')}<span class="ive-strip-label text-x-muted font-sans">Agent mode:</span><span class="font-semibold text-x-ink truncate" data-testid="${testid}-value">${s.mode || 'Default'}</span>${I('chevron-down', 11, 'text-x-muted shrink-0 transition-transform')}</button></div>`;

/* ── session level (SessionScreen + ChatPanel + Terminal drawer) ── */

/** The one-line overview above the conversation. */
export function brief(session, messages = []) {
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  const lastReply = [...messages].reverse().find((m) => m.role === 'assistant' && m.text);
  const steps = messages.some((m) => m.role === 'assistant' && m.steps && m.steps.length);
  let cls = 'is-done', label = 'Reply ready', last = lastReply ? lastReply.text : (lastUser ? lastUser.text : '');
  if (session.state === 'running') { cls = 'is-running'; label = steps && (!lastReply || messages.indexOf(lastReply) < messages.indexOf(lastUser)) ? 'Working on your request' : 'Waiting for a response'; last = lastUser ? lastUser.text : ''; }
  else if (session.state === 'waiting') { cls = 'is-waiting'; label = session.detail || 'Needs your reply'; last = lastUser ? lastUser.text : ''; }
  else if (!lastReply || (lastUser && messages.indexOf(lastReply) < messages.indexOf(lastUser))) { label = lastReply ? 'Reply ready' : 'Ready'; }
  const plain = String(last).replace(/`/g, '');
  return html`<section class="ive-session-brief" aria-label="Session overview" data-session-brief="true"><div class="ive-session-brief-line"><button type="button" class="ive-brief-toggle" aria-expanded="false"><span class="ive-brief-dot ${cls}"></span><strong>${label}</strong>${I('chevron-down', 14)}</button><span class="ive-brief-last" title="${plain}">${plain}</span></div></section>`;
}

/** The strip above the conversation: model, Options, agent mode, Details, History. */
export function chatControls(s) {
  return html`<div class="x-telemetry ive-chat-controls px-4 py-1.5 flex items-center justify-between text-xs select-none z-20"><div class="ive-strip-right flex items-center gap-3 font-mono text-[11px] text-x-ink-secondary shrink-0 whitespace-nowrap">${modelStrip(s)}<button type="button" class="ive-chat-text-button" aria-expanded="false">Options ${I('chevron-down', 12)}</button>${modeStrip(s)}<div class="ive-strip-process h-3.5 w-px bg-x-line/45"></div><button title="Show activity details" aria-pressed="false" class="ive-strip-process flex items-center gap-1.5 bg-x-bg/40 hover:bg-x-bg/80 border border-x-line/45 hover:border-x-accent/45 rounded-md px-2 py-1 transition-all duration-200 cursor-pointer font-sans text-[11px] text-x-ink-secondary select-none">${I('activity', 11, 'text-x-faint')}<span>Details</span></button><div class="h-3.5 w-px bg-x-line/45"></div><button type="button" class="ive-chat-text-button" aria-expanded="false">${I('clock', 13)} History</button></div></div>`;
}

const TOOL_LABEL = { Read: 'Reading', Edit: 'Editing', Write: 'Writing', Grep: 'Searching', Glob: 'Searching', Bash: 'Running', Search: 'Searching', Update: 'Editing', Agent: 'Delegating', WebFetch: 'Fetching' };
/** The activity line of a running group ("Reading src/x.jsx", "Run the sign-in checks"). */
export function activityLine(steps) {
  const last = steps[steps.length - 1];
  if (!last) return 'Working on your request';
  if (last.description) return last.description;
  const verb = TOOL_LABEL[last.tool] || last.tool;
  return last.input ? `${verb} ${last.input}` : verb;
}

/** One tool call card inside an opened activity list. */
export function stepCard(step, { latest = false } = {}) {
  const code = step.command || step.input || '';
  return html`<div class="transition-all duration-300 rounded-md relative ${latest ? 'ring-1 ring-x-good/30 bg-x-good/[0.02] p-1' : ''}" data-key="${step.id || code}"><div class="my-1.5 overflow-hidden rounded-md border border-x-line-subtle  border-l-2 border-l-warn/40"><button type="button" class="flex w-full items-center gap-2 px-2.5 py-1.5 text-left font-mono text-[11px] uppercase tracking-wide hover:bg-x-hover transition-colors duration-[80ms]">${I('chevron-down', 12, 'shrink-0 text-x-faint transition-transform -rotate-90')}<span class="font-semibold text-x-ink-secondary font-medium">Calling ${step.tool}</span><span class="min-w-0 truncate normal-case tracking-normal text-x-faint">${step.description || step.input || ''}</span></button>${code ? html`<div class="border-t border-x-line-subtle px-2.5 py-1.5"><pre class="max-h-[2.25rem] overflow-hidden whitespace-pre-wrap break-words rounded bg-x-surface-2 px-2 py-1 font-mono text-[11px] leading-[1.25] text-x-muted"><code><span class="block min-h-[1.25em]"><span class="text-x-ink">${code}</span></span></code></pre></div>` : ''}${step.result ? html`<div class="border-t border-x-line-subtle px-2.5 py-1.5 font-mono text-[11px] text-x-muted whitespace-pre-wrap">${step.result}</div>` : ''}</div></div>`;
}

/** Conversation rows: user bubbles, activity groups (collapsed or open), agent replies. */
export function transcript(messages, { sessionId = 's' } = {}) {
  const rows = messages.map((m, i) => {
    const id = m.id || `${sessionId}-${i}`;
    if (m.role === 'user') {
      return html`<article id="msg-${id}" data-key="${id}" data-chat-message-row="true" data-chat-message-id="${id}" data-chat-role="user" data-chat-role-label="you" data-chat-timeline-row="true" class="ive-conversation-message is-user"><div class="ive-conversation-content"><div class="space-y-2 text-[13px] leading-6 text-x-ink/95 break-words font-sans"><div><p class="my-1.5 text-x-ink/90 leading-6 font-sans">${rich(m.text)}</p></div></div></div><div class="ive-conversation-message-actions"><time>${m.time || ''}</time><button type="button" aria-label="Copy message" title="Copy message">${I('copy', 13)}</button></div></article>`;
    }
    const steps = m.steps || [];
    const running = !!m.running;
    const n = steps.length;
    const parts = [];
    if (n || running) {
      const label = running ? activityLine(steps) : `Activity · ${n} step${n === 1 ? '' : 's'}`;
      parts.push(html`<div class="ive-conversation-process" data-key="${id}-p"><div class="min-w-0"><div class="ive-conversation-activity"><button type="button" aria-expanded="${m.open ? 'true' : 'false'}" class="ive-conversation-activity-toggle">${running ? I('loader-circle', 14, 'animate-spin') : I('check', 14)}<span>${label}</span>${I('chevron-down', 13, m.open ? '' : '-rotate-90')}</button>${m.open && n ? html`<div class="border-t border-x-line-subtle p-3 space-y-3 bg-x-surface-2/30">${steps.map((st, k) => stepCard(st, { latest: running && k === n - 1 }))}</div>` : ''}</div>${(m.text || m.html) && m.inline ? html`<div class="mt-2 text-x-ink/95"><div class="space-y-2 text-[13px] leading-6 text-x-ink/95 break-words font-sans"><div>${m.html ? raw(m.html) : html`<p class="my-1.5 text-x-ink/90 leading-6 font-sans">${rich(m.text)}</p>`}</div></div></div>` : ''}</div></div>`);
    }
    if ((m.text || m.html) && !m.inline) {
      parts.push(html`<article id="msg-${id}-t" data-key="${id}-t" data-chat-message-row="true" data-chat-message-id="${id}-t" data-chat-role="assistant" data-chat-role-label="agent" data-chat-timeline-row="true" class="ive-conversation-message is-assistant"><div class="ive-conversation-content"><div class="space-y-2 text-[13px] leading-6 text-x-ink/95 break-words font-sans"><div>${m.html ? raw(m.html) : html`<p class="my-1.5 text-x-ink/90 leading-6 font-sans">${rich(m.text)}</p>`}</div></div></div><div class="ive-conversation-message-actions"><time>${m.time || ''}</time><button type="button" aria-label="Copy message" title="Copy message">${I('copy', 13)}</button></div></article>`);
    }
    return parts;
  });
  return html`<div class="ive-conversation-transcript"><div>${rows}</div></div>`;
}

const BTN8 = 'w-8 h-8 flex items-center justify-center rounded-lg';
/** The conversation composer, floating above the drawer. `queue` renders the UP NEXT list. */
export function composer(s, { typed = '', drawerOpen = false, bottom = 0, queue = null, aside = true } = {}) {
  const running = s.state === 'running';
  const placeholder = running ? `${s.cli === 'codex' ? 'Codex' : 'Claude'} is working. Write your next message, Enter queues it.` : 'Type a task or instruction for the agent...';
  return html`<div class="absolute left-0 right-0 p-4 pointer-events-none select-none transition-all duration-300 ease-in-out z-20" style="bottom: ${bottom}px;"><div class="max-w-5xl w-full mx-auto flex flex-col gap-2 pointer-events-auto">${queue || ''}${aside ? html`<div class="ive-aside-entry"><button type="button" title="Ask about this task without interrupting it. You can also type /btw followed by a question.">${I('message-square', 13)}Ask on the side<kbd>/btw</kbd></button></div>` : ''}<form class="x-composer ive-session-composer flex items-end gap-2 p-1.5 pl-3"><input multiple="" class="hidden" type="file"><button type="button" class="${BTN8} text-x-muted hover:text-x-ink-secondary hover:bg-x-hover transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0" title="Attach images or text files (or paste / drag &amp; drop). Type @ for project files and folders.">${I('paperclip', 14)}</button><textarea rows="1" placeholder="${placeholder}" class="flex-1 resize-none bg-transparent text-x-ink placeholder-x-muted text-[13px] leading-5 focus:outline-none py-1.5 disabled:cursor-not-allowed max-h-32 scrollbar-thin" style="min-height: 32px; height: 32px;">${typed}</textarea><button type="button" class="${BTN8} border transition-colors duration-[80ms] shrink-0 bg-x-surface border-x-line text-x-muted hover:text-x-ink-secondary hover:bg-x-hover disabled:opacity-40 disabled:cursor-not-allowed" title="Dictate prompt">${I('mic', 14)}</button>${running ? html`<button type="button" class="h-8 px-2.5 rounded-lg border border-x-accent-ink/30 bg-x-accent-ink/15 text-x-accent-ink hover:bg-x-accent-ink/25 hover:border-x-accent-ink/45 transition-all shrink-0 flex items-center justify-center gap-1" title="Cancel output for ${s.cli}">${I('square', 12)}<span class="hidden sm:inline text-[11px] font-semibold">Cancel</span></button>` : ''}<button type="button" class="${BTN8} border transition-all ${drawerOpen ? 'bg-x-accent/10 border-x-accent/20 text-x-accent hover:bg-x-accent/20' : 'bg-x-surface border-x-line text-x-muted hover:text-x-ink-secondary hover:bg-x-hover'}" title="Toggle PTY Terminal Drawer" data-demo-terminal-toggle="">${I('terminal', 14)}</button><button type="submit"${typed ? '' : raw(' disabled=""')} class="${BTN8} bg-x-accent hover:bg-x-accent-ink text-x-on-accent disabled:opacity-40 disabled:hover:bg-x-accent transition-colors duration-[80ms] shadow-x-1 shrink-0" title="${running ? 'Add to queue, sends when Claude is done (Enter)' : 'Submit command (Enter)'}"${running ? raw(' aria-label="Add to queue"') : ''}>${I(running ? 'clock' : 'send', 14)}</button></form></div></div>`;
}

/** The drawer bar: "Terminal · claude", ⌘J to hide, expand/restore, hide. */
export function drawerBar(s, { full = false } = {}) {
  return html`<div class="ive-session-drawer-bar">${I('terminal', 14)}<span class="ive-session-drawer-title">Terminal</span><span class="ive-session-drawer-shell t-meta">· ${CLI_LABEL[s.cli] || s.cli}</span><span class="ive-header-fill"></span><kbd class="ive-kbd">⌘J</kbd><span class="t-meta">to hide</span><button type="button" class="ive-terminal-expand" title="${full ? 'Restore small terminal' : 'Expand terminal'}" aria-label="${full ? 'Restore small terminal' : 'Expand terminal'}">${I(full ? 'minimize2' : 'maximize2', 14)}</button><button type="button" class="ive-terminal-expand" title="Hide terminal — show overview" aria-label="Hide terminal — show overview">${I('x', 14)}</button></div>`;
}

/** The terminal area of a slot: the DOM terminal in the app's surface-2 box. */
export function terminalArea(s, term, { cols = 80, fontSize = 13, focused = true } = {}) {
  return html`<div class="flex-1 flex flex-col relative" style="min-height: 0px;"><div class="flex-1 bg-x-surface-2 relative" data-terminal-session="${s.id}" style="min-height: 0px; min-width: 0px;">${raw(renderTerminal(term, { cols, id: s.id, fontSize, focused }))}</div><span hidden data-find-anchor="terminal"></span></div>`;
}

/** The bar under a full-size terminal: status, agent mode, "claude | name", the input row. */
export function terminalComposer(s, { typed = '', lastSeconds = null, narrow = false } = {}) {
  const m = stateOf(s);
  const status = s.state === 'running'
    ? html`<div class="flex items-center gap-1.5 text-x-muted text-[11px] font-mono">${I('clock', 11)}<span>Last: ${lastSeconds ?? 0}s</span></div>`
    : html`<div class="flex items-center gap-1.5 ${m.text} text-[11px] font-mono"><span class="h-1.5 w-1.5 rounded-full ${m.text.replace('text-', 'bg-')}"></span><span>${m.label}</span></div>`;
  return html`<div data-terminal-composer="" class="border-t border-x-line bg-x-surface px-3 py-2 flex flex-col gap-2 shrink-0 select-none"><div class="flex items-center justify-between gap-3"><div class="flex items-center gap-2">${status}${modeStrip(s, 'terminal-perms')}</div>${narrow ? '' : html`<div class="text-[11px] font-mono text-x-muted flex items-center gap-2"><span>${CLI_LABEL[s.cli] || s.cli}</span><span class="opacity-60">| ${s.name}</span></div>`}</div><form class="x-composer flex items-center gap-1.5 p-1 pl-3"><input placeholder="Type a task or instruction..." class="flex-1 bg-transparent text-x-ink placeholder-x-muted text-xs focus:outline-none py-1 disabled:cursor-not-allowed" type="text" value="${typed}"><button type="button" class="w-7 h-7 flex items-center justify-center rounded-lg border transition-colors duration-[80ms] bg-x-surface border-x-line text-x-muted hover:text-x-ink-secondary hover:bg-x-hover" title="Dictate prompt (Voice Input)">${I('mic', 12)}</button><button type="submit"${typed ? '' : raw(' disabled=""')} class="w-7 h-7 flex items-center justify-center rounded-lg bg-x-accent hover:bg-x-accent-ink text-x-on-accent disabled:opacity-40 disabled:hover:bg-x-accent transition-colors duration-[80ms] shrink-0" title="Submit command (Enter)">${I('send', 12)}</button></form></div>`;
}

/**
 * The session screen. mode: 'full' (terminal fills the session), 'drawer' (overview with the
 * terminal below), 'overview' (no terminal). `terminal` is a term.js model, `cols` its columns.
 */
export function sessionScreen({ session: s, mode = 'overview', messages = [], terminal: term = null, cols = 80, drawerHeight = 320, typed = '', queue = null, lastSeconds = null, termTyped = '', fontSize = 13, narrow = false, after = '', termFocused = true }) {
  let main;
  if (mode === 'full') {
    main = html`<div class="ive-session-terminal-full flex-1 flex flex-col min-h-0" data-session-terminal-drawer="full">${drawerBar(s, { full: true })}<div class="ive-terminal-slot" data-terminal-slot="${s.id}" data-terminal-mode="full"><div class="ive-terminal-portal" data-terminal-session="${s.id}"><div class="flex-1 flex flex-col relative" style="min-height: 0px;">${terminalArea(s, term, { cols, fontSize, focused: termFocused })}${terminalComposer(s, { typed: termTyped, lastSeconds, narrow })}</div></div></div></div>`;
  } else {
    const drawer = mode === 'drawer';
    const padBottom = (drawer ? 0 : 0) + 131 + (queue ? 60 : 0);
    main = html`${brief(s, messages)}<div class="flex-1 flex flex-col min-h-0 bg-x-bg x-canvas ive-conversation select-text relative"><span hidden data-find-anchor="chat"></span>${chatControls(s)}<div class="flex-1 overflow-y-auto px-3 md:px-4 py-3 scrollbar-thin flex flex-col" data-session-scroll="${s.id}" data-stick=""><div class="ive-conversation-layout w-full mx-auto flex-1 flex flex-row gap-6 relative justify-between"><div class="flex-1 min-w-0 flex flex-col justify-between"><div class="flex-1 space-y-1.5 transition-all duration-300 ease-in-out" style="padding-bottom: ${padBottom}px;">${transcript(messages, { sessionId: s.id })}${after || ''}</div></div></div></div>${composer(s, { typed, drawerOpen: drawer, bottom: 0, queue })}</div>${drawer ? html`<div class="ive-session-drawer" data-session-terminal-drawer="open" style="height: ${drawerHeight}px;">${drawerBar(s)}<div class="ive-terminal-slot" data-terminal-slot="${s.id}" data-terminal-mode="drawer"><div class="ive-terminal-portal" data-terminal-session="${s.id}"><div class="flex-1 flex flex-col relative" style="min-height: 0px;"><div class="px-3 py-1 border-b border-x-line text-[11px]">${modeStrip(s, 'terminal-perms')}</div>${terminalArea(s, term, { cols, fontSize, focused: termFocused })}</div></div></div></div>` : ''}`;
  }
  return html`<div class="ive-session-screen flex-1 flex min-h-0 min-w-0 relative" data-session-view="${s.id}" data-grid-cell-session="${s.id}"><div class="ive-session-main flex-1 flex flex-col min-h-0 min-w-0 relative">${main}</div></div>`;
}
