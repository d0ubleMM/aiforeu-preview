// Home screen, the composer queue, the "waiting for a reply" rows and the notification toast of
// the IVE 1.0.17 frontend as markup functions. Markup copied from DOM dumps of the app
// (scripts/demos/snapshot.mjs: start-queue and loop-detect stories); app.css styles it.
// Demo data for the Orbit project; nothing runs a provider.
//
//   homeScreen({ typed, date, recent })            HomeScreen: goal composer + "Continue working"
//   conversationScreen({ session, messages, ... })  Overview of a session with pending/responding rows
//   queuePanel({ text, state })                     ComposerQueue: UP NEXT, Queued | Sent
//   toast(message)                                  NotificationToast region (warning)
//   activityLabel(steps, running)                   lib/conversationPresentation.js rules
import { html, raw } from './dom.js';
import { ic, chatControls, stepCard, rich, providerLogo, header } from './ui.js';
import { str } from './dom.js';

/* ── Home (HomeScreen + HomeStartControls) ── */
export function homeScreen({ typed = '', date = 'Friday 23 October', recent = [], workspace = { name: 'Orbit' } } = {}) {
  return html`<div class="ive-home flex-1 overflow-y-auto" data-home-screen="" data-stick-off="">
<h1 class="sr-only">Home</h1>
<div class="ive-home-inner">
<p class="t-meta ive-home-date">${date}</p>
<form class="x-composer ive-home-composer"><textarea data-home-composer="true" aria-label="What do you want to work on?" placeholder="What do you want to work on? Type / for commands, @ for files" rows="2">${typed}</textarea><div class="ive-home-composer-row"><span class="ive-header-fill"></span><button type="submit" data-home-start="true" class="ive-btn ive-btn--primary"${typed ? '' : raw(' disabled=""')}>Start</button></div></form>
<section class="ive-continue-panel ive-control-surface" aria-labelledby="continue-work-title">
<header class="ive-panel-heading"><span class="ive-panel-icon">${ic('folder-open', 15)}</span><div><p class="ive-eyebrow">Your workspace</p><h2 id="continue-work-title">Continue working</h2></div></header>
<div class="ive-recent-sessions">${recent.map((s) => html`<button type="button" class="ive-recent-session" title="Open ${s.name}" data-key="${s.id}">${ic('terminal', 14, 'shrink-0 text-x-muted')}<span class="min-w-0 flex-1"><span class="block truncate font-semibold text-x-ink">${s.name}</span><span class="mt-1 flex items-center gap-2 text-xs text-x-muted"><span class="h-1.5 w-1.5 shrink-0 rounded-full ${s.state === 'running' ? 'bg-x-running' : s.state === 'waiting' ? 'bg-x-waiting' : 'bg-x-good'}"></span>${s.state === 'running' ? 'Running' : s.state === 'waiting' ? 'Needs your reply' : 'Done'}<span class="truncate">· ${workspace.name}</span></span></span>${ic('arrow-right', 14, 'shrink-0 text-x-muted')}</button>`)}</div>
<button type="button" class="ive-text-action">${ic('search', 13)} Find a session ${ic('arrow-right', 13)}</button>
</section></div></div>`;
}

/** The 44 px header on Home: the app's address there is "ive/home". */
export const homeHeader = (workspace) => raw(str(header({ view: 'home', workspace })).replace('title="ive">ive<', 'title="ive/home">ive/home<'));

/** The one-line overview: "Waiting for a response" while the reply is pending, "Working on your request" while output streams. */
export function briefLine(s, messages = [], { pending = false } = {}) {
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  const lastReply = [...messages].reverse().find((m) => m.role === 'assistant' && m.text);
  let cls = 'is-done', label = 'Reply ready', last = lastReply ? lastReply.text : (lastUser ? lastUser.text : '');
  if (s.state === 'running') { cls = 'is-running'; label = pending ? 'Waiting for a response' : 'Working on your request'; last = lastUser ? lastUser.text : ''; }
  else if (s.state === 'waiting') { cls = 'is-waiting'; label = s.detail || 'Needs your reply'; last = lastUser ? lastUser.text : ''; }
  const plain = String(last).replace(/`/g, '');
  return html`<section class="ive-session-brief" aria-label="Session overview" data-session-brief="true"><div class="ive-session-brief-line"><button type="button" class="ive-brief-toggle" aria-expanded="false"><span class="ive-brief-dot ${cls}"></span><strong>${label}</strong>${ic('chevron-down', 14)}</button><span class="ive-brief-last" title="${plain}">${plain}</span></div></section>`;
}

const BTN8 = 'w-8 h-8 flex items-center justify-center rounded-lg';
/** The floating composer of a session (Composer.jsx): while the agent works, Enter queues and the submit shows a clock. */
export function composerBar(s, { typed = '', drawerOpen = false, bottom = 32, queue = null } = {}) {
  const running = s.state === 'running';
  const who = s.cli === 'codex' ? 'Codex' : 'Claude';
  const placeholder = running ? `${who} is working. Write your next message, Enter queues it.` : 'Type a task or instruction for the agent...';
  return html`<div class="absolute left-0 right-0 p-4 pointer-events-none select-none transition-all duration-300 ease-in-out z-20" style="bottom: ${bottom}px;"><div class="max-w-5xl w-full mx-auto flex flex-col gap-2 pointer-events-auto">${queue || ''}<div class="ive-aside-entry"><button type="button" title="Ask about this task without interrupting it. You can also type /btw followed by a question.">${ic('message-square', 13)} Ask on the side <kbd>/btw</kbd></button></div><form class="x-composer ive-session-composer flex items-end gap-2 p-1.5 pl-3"><input multiple="" class="hidden" type="file"><button type="button" class="${BTN8} text-x-muted hover:text-x-ink-secondary hover:bg-x-hover transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0" title="Attach images or text files (or paste / drag &amp; drop). Type @ for project files and folders.">${ic('paperclip', 14)}</button><textarea rows="1" placeholder="${placeholder}" class="flex-1 resize-none bg-transparent text-x-ink placeholder-x-muted text-[13px] leading-5 focus:outline-none py-1.5 disabled:cursor-not-allowed max-h-32 scrollbar-thin" style="min-height: 32px; height: 32px;">${typed}</textarea><button type="button" class="${BTN8} border transition-colors duration-[80ms] shrink-0 bg-x-surface border-x-line text-x-muted hover:text-x-ink-secondary hover:bg-x-hover disabled:opacity-40 disabled:cursor-not-allowed" title="Dictate prompt">${ic('mic', 14)}</button>${running ? html`<button type="button" class="h-8 px-2.5 rounded-lg border border-x-accent-ink/30 bg-x-accent-ink/15 text-x-accent-ink hover:bg-x-accent-ink/25 hover:border-x-accent-ink/45 transition-all shrink-0 flex items-center justify-center gap-1" title="Cancel output for ${s.cli}">${ic('square', 12)}<span class="hidden sm:inline text-[11px] font-semibold">Cancel</span></button>` : ''}<button type="button" class="${BTN8} border transition-all ${drawerOpen ? 'bg-x-accent/10 border-x-accent/20 text-x-accent hover:bg-x-accent/20' : 'bg-x-surface border-x-line text-x-muted hover:text-x-ink-secondary hover:bg-x-hover'}" title="Toggle PTY Terminal Drawer" data-demo-terminal-toggle="">${ic('terminal', 14)}</button><button type="submit"${typed ? '' : raw(' disabled=""')} class="${BTN8} bg-x-accent hover:bg-x-accent-ink text-x-on-accent disabled:opacity-40 disabled:hover:bg-x-accent transition-colors duration-[80ms] shadow-x-1 shrink-0" title="${running ? `Add to queue, sends when ${who} is done (Enter)` : 'Submit command (Enter)'}"${running ? raw(' aria-label="Add to queue"') : ''}>${ic(running ? 'clock' : 'send', 14)}</button></form></div></div>`;
}

/* ── the running group's label, as lib/conversationPresentation.js decides it ── */
export function activityLabel(steps, running) {
  if (!running) return `Activity · ${steps.length} ${steps.length === 1 ? 'step' : 'steps'}`;
  const step = steps[steps.length - 1];
  if (step && typeof step.description === 'string' && step.description.trim()) return step.description.trim();
  const name = String(step?.tool || '').toLowerCase();
  if (/search|grep|glob/.test(name)) return 'Finding relevant files';
  if (/read/.test(name)) return 'Reading project files';
  if (/write|edit|patch|update/.test(name)) return 'Updating files';
  if (/bash|shell|exec/.test(name)) return 'Running a project command';
  if (name) return 'Working with a connected service';
  return 'Working on your request';
}

const P = (text) => html`<div class="space-y-2 text-[13px] leading-6 text-x-ink/95 break-words font-sans"><div><p class="my-1.5 text-x-ink/90 leading-6 font-sans">${rich(text)}</p></div></div>`;
const actions = (time) => html`<div class="ive-conversation-message-actions"><time>${time || ''}</time><button type="button" aria-label="Copy message" title="Copy message">${ic('copy', 13)}</button></div>`;

/** Conversation rows like ui.transcript(), with the app's running-group labels. */
export function conversation(messages, { sessionId = 's' } = {}) {
  const rows = messages.map((m, i) => {
    const id = m.id || `${sessionId}-${i}`;
    if (m.role === 'user') {
      return html`<article id="msg-${id}" data-key="${id}" data-chat-message-row="true" data-chat-message-id="${id}" data-chat-role="user" data-chat-role-label="you" data-chat-timeline-row="true" class="ive-conversation-message is-user"><div class="ive-conversation-content">${P(m.text)}</div>${actions(m.time)}</article>`;
    }
    const steps = m.steps || [];
    const running = !!m.running;
    const parts = [];
    if (steps.length || running) {
      const label = activityLabel(steps, running);
      parts.push(html`<div class="ive-conversation-process" data-key="${id}-p"><div class="min-w-0"><div class="ive-conversation-activity"><button type="button" aria-expanded="${m.open ? 'true' : 'false'}" class="ive-conversation-activity-toggle">${running ? ic('loader-circle', 14, 'animate-spin') : ic('check', 14)}<span>${label}</span>${ic('chevron-down', 13, m.open ? '' : '-rotate-90')}</button>${m.open && steps.length ? html`<div class="border-t border-x-line-subtle p-3 space-y-3 bg-x-surface-2/30">${steps.map((st, k) => stepCard(st, { latest: running && k === steps.length - 1 }))}</div>` : ''}</div>${m.text && m.inline ? html`<div class="mt-2 text-x-ink/95">${P(m.text)}</div>` : ''}</div></div>`);
    }
    if (m.text && !m.inline) {
      parts.push(html`<article id="msg-${id}-t" data-key="${id}-t" data-chat-message-row="true" data-chat-message-id="${id}-t" data-chat-role="assistant" data-chat-role-label="agent" data-chat-timeline-row="true" class="ive-conversation-message is-assistant"><div class="ive-conversation-content">${P(m.text)}</div>${actions(m.time)}</article>`);
    }
    return parts;
  });
  return html`<div class="ive-conversation-transcript"><div>${rows}</div></div>`;
}

/** "Waiting for a reply…" with the provider mark and the three dots (data-awaiting-reply). */
export const replyPending = (cli = 'claude') => html`<div class="ive-reply-pending" data-awaiting-reply="true" role="status" aria-live="polite">${raw(String(providerLogo(cli).__raw).replace('w-3.5 h-3.5', 'w-5 h-5'))}<span class="ive-reply-dots" aria-hidden="true"><i></i><i></i><i></i></span><span>Waiting for a reply…</span></div>`;

/** "Assistant is responding… 5s" under the transcript while output streams. */
export const responding = (seconds) => html`<div role="status" class="flex items-center gap-2 text-x-muted text-[11px] pl-1 select-none"><span>Assistant is responding…</span><span class="rounded border border-x-good/20 bg-x-good/10 px-1.5 py-0.5 text-[11px] font-mono text-x-good">${seconds}s</span></div>`;

/* ── ComposerQueue: UP NEXT ── */
export function queuePanel({ text, state = 'queued', cli = 'claude' } = {}) {
  const who = cli === 'codex' ? 'Codex' : 'Claude';
  const queued = state === 'queued';
  return html`<section aria-label="Message queue" data-composer-queue="true" class="flex flex-col gap-1.5 rounded-xl border border-x-line bg-x-surface px-2.5 py-2 shadow-x-1"><div class="flex flex-wrap items-center gap-x-2 gap-y-1 px-0.5 text-[11px]"><span class="inline-flex items-center gap-1 font-mono uppercase tracking-wide font-bold text-x-ink-secondary">${ic('clock', 11)} Up next${queued ? ' · 1' : ''}</span>${queued ? html`<span role="status" class="text-x-muted">Sends when ${who} finishes this turn.</span>` : ''}</div><ol class="flex max-h-40 flex-col gap-1 overflow-y-auto scrollbar-thin" aria-label="Queued messages"><li data-queue-state="${state}" class="flex items-start gap-2 border-b border-x-line-subtle px-2 py-1.5 last:border-b-0"><span class="mt-px inline-flex shrink-0 items-center gap-1 px-1.5 py-px font-mono text-[10px] font-bold uppercase tracking-wide text-x-ink-secondary" title="${queued ? 'Waits for the turn to end, then goes out' : 'The session took it, waiting for the transcript'}">${queued ? ic('clock', 10) : ic('loader-circle', 10, 'animate-spin')}${queued ? 'Queued' : 'Sent'}</span><div class="min-w-0 flex-1"><p class="line-clamp-2 whitespace-pre-wrap break-words text-[12px] leading-[18px] text-x-ink">${text}</p></div><div class="flex shrink-0 items-center gap-0.5">${queued ? html`<button type="button" aria-label="Edit queued message" title="Back into the message box to edit" class="rounded p-1 text-x-muted hover:bg-x-hover hover:text-x-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-x-focus">${ic('pencil', 12)}</button><button type="button" aria-label="Remove queued message" title="Remove, it will not be sent" class="rounded p-1 text-x-muted hover:bg-x-hover hover:text-x-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-x-focus">${ic('x', 12)}</button>` : html`<button type="button" aria-label="Hide from queue" title="Hide this row" class="rounded p-1 text-x-muted hover:bg-x-hover hover:text-x-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-x-focus">${ic('x', 12)}</button>`}</div></li></ol></section>`;
}

/* ── NotificationToast region (one warning notice) ── */
export function toast(message, { tone = 'warning' } = {}) {
  return html`<section class="ive-toasts ive-notification-region" aria-label="Notifications"><div class="ive-notification-stack"><div class="ive-notification-shell"><article class="ive-notice ive-notice--${tone}" aria-label="${tone} notification"><div class="ive-notice-heading"><span class="ive-notice-symbol">${ic('triangle-alert', 15)}</span><div class="ive-notice-copy"><p class="ive-notice-message" role="status">${message}</p></div><button class="ive-notice-close" aria-label="Dismiss notification">${ic('x', 14)}</button></div></article></div></div></section>`;
}

/**
 * The session Overview with the rows the app shows while an agent works: the pending-reply row
 * (`pending`), the responding status (`respondingFor` seconds) and the composer queue (`queue`).
 */
export function conversationScreen({ session: s, messages = [], typed = '', queue = null, pending = false, respondingFor = null, drawerOpen = false }) {
  const padBottom = queue ? 243 : 163;
  return html`<div class="ive-session-screen flex-1 flex min-h-0 min-w-0 relative" data-session-view="${s.id}" data-grid-cell-session="${s.id}"><div class="ive-session-main flex-1 flex flex-col min-h-0 min-w-0 relative">${briefLine(s, messages, { pending })}<div class="flex-1 flex flex-col min-h-0 bg-x-bg x-canvas ive-conversation select-text relative"><span hidden data-find-anchor="chat"></span>${chatControls(s)}<div class="flex-1 overflow-y-auto px-3 md:px-4 py-3 scrollbar-thin flex flex-col" data-session-scroll="${s.id}" data-stick=""><div class="ive-conversation-layout w-full mx-auto flex-1 flex flex-row gap-6 relative justify-between"><div class="flex-1 min-w-0 flex flex-col justify-between"><div class="flex-1 space-y-1.5 transition-all duration-300 ease-in-out" style="padding-bottom: ${padBottom}px;">${conversation(messages, { sessionId: s.id })}${pending ? replyPending(s.cli) : ''}${respondingFor != null ? responding(respondingFor) : ''}</div></div></div></div>${composerBar(s, { typed, drawerOpen, bottom: 32, queue })}</div></div></div>`;
}
