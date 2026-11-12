// Scene "review": every change comes back to you. The session "Review the changes" is open at
// Session level; the sidebar's Review entry opens the Code Review side panel with the working
// diff and its file tree (two modified files), "Fullscreen" opens the full code review,
// "Unified View" switches the layout and the diff scrolls a little. Demo data for the Orbit
// project (the diff matches the session's own `git diff --stat`); no provider runs.
import { script } from '../lib/timeline.js';
import { shell, header } from '../lib/ui.js';
import { parseDiff, reviewSessionScreen, reviewFullscreen } from '../lib/review.js';

const WS = { id: 'orbit', name: 'Orbit', color: 'rgb(16, 185, 129)' };
const sessions = () => [
  { id: 'interface', name: 'Build the workspace', cli: 'claude', model: 'sonnet', state: 'done', age: '1m ago' },
  { id: 'api', name: 'Connect the API', cli: 'codex', model: 'default', state: 'done', age: '1m ago' },
  { id: 'checks', name: 'Check the sign-in flow', cli: 'claude', model: 'sonnet', state: 'done', age: '1m ago' },
  { id: 'review', name: 'Review the changes', cli: 'claude', model: 'opus', state: 'done', age: '1m ago' },
];

// The working-tree diff of the Orbit story: Sidebar.jsx +18 −2, api.js +24 −6.
export const DIFF = `diff --git a/src/components/layout/Sidebar.jsx b/src/components/layout/Sidebar.jsx
index 4b1c2d3..9e8f7a6 100644
--- a/src/components/layout/Sidebar.jsx
+++ b/src/components/layout/Sidebar.jsx
@@ -1,6 +1,8 @@
 import { useMemo } from 'react'
 import ConnectionStatus from './ConnectionStatus'
 import CostToday from './CostToday'
+import ThemeToggle from './ThemeToggle'
+import { useTheme } from '../../hooks/useTheme'
 import { useShortcuts } from '../../hooks/useShortcuts'

 export default function Sidebar({ projects, onSelect }) {
@@ -284,12 +286,26 @@ export default function Sidebar({ projects, onSelect }) {
   const shortcuts = useShortcuts()
+  const { theme, toggleTheme } = useTheme()
+  const nextTheme = theme === 'dark' ? 'light' : 'dark'

   return (
     <aside className="sidebar" aria-label="Projects">
       <ProjectList projects={projects} onSelect={onSelect} />
-      <footer className="sidebar-footer">
-        <ConnectionStatus />
+      <footer className="sidebar-footer" data-theme={theme}>
+        <div className="sidebar-footer-row">
+          <ConnectionStatus />
+          <ThemeToggle
+            theme={theme}
+            label={\`Switch to \${nextTheme} theme\`}
+            onToggle={toggleTheme}
+            size="sm"
+            className="sidebar-theme-toggle"
+          />
+        </div>
+        <p className="sidebar-footer-hint">
+          The theme follows your system until you switch it.
+        </p>
         <CostToday />
       </footer>
     </aside>
diff --git a/src/lib/api.js b/src/lib/api.js
index 7c3e9a0..b51d2f4 100644
--- a/src/lib/api.js
+++ b/src/lib/api.js
@@ -40,13 +40,31 @@ export async function request(path, options = {}) {
   return response.json()
 }

-export async function listSessions() {
-  const response = await request('/api/sessions')
-  return response.sessions
-}
+/** One page of sessions, newest first.
+ *  Pass the returned cursor to get the next page. */
+export async function listSessions({ cursor = null, limit = 50 } = {}) {
+  const params = new URLSearchParams({ limit: String(limit) })
+  if (cursor) params.set('cursor', cursor)
+  const response = await request(\`/api/sessions?\${params}\`)
+  return {
+    sessions: response.sessions,
+    nextCursor: response.next_cursor ?? null,
+  }
+}
+
+export async function listAllSessions() {
+  const sessions = []
+  let cursor = null
+  do {
+    const page = await listSessions({ cursor })
+    sessions.push(...page.sessions)
+    cursor = page.nextCursor
+  } while (cursor)
+  return sessions
+}

 export function sessionEvents(onEvent) {
-  const socket = new WebSocket(\`\${WS_BASE}/events\`)
-  socket.onmessage = (event) => onEvent(JSON.parse(event.data))
+  const socket = new WebSocket(\`\${WS_BASE}/events?stream=sessions\`)
+  socket.onmessage = (event) => onEvent({ type: 'session', ...JSON.parse(event.data) })
   return socket
 }
`;
const FILES = parseDiff(DIFF);

function init() {
  return { sessions: sessions(), panel: false, full: false, view: 'split' };
}

const s = script();
s.hold(0.9);
// The sidebar's Review entry (on narrow stages the sidebar is hidden: the panel opens without a pointer move).
s.click('button[data-nav="review"]', { dur: 0.8, after: 0.1 }, (st) => { st.panel = true; });
s.mark('Side panel');
s.hold(1.6);
s.click('[data-demo-review-fullscreen]', { dur: 0.8, after: 0.1 }, (st) => { st.full = true; });
s.mark('Fullscreen');
s.hold(1.0);
s.click('[data-demo-review-view="unified"]', { dur: 0.7, after: 0.1 }, (st) => { st.view = 'unified'; });
s.mark('Unified view');
s.hold(0.6);
const posterAt = s.t;
s.moveTo('[data-demo-review-diff]', { dur: 0.5, offset: { x: 0.6, y: 0.6 } });
s.hold(0.4);
s.scroll('[data-demo-review-diff]', 300, { from: 0, dur: 0.9 });
s.hold(2.4);

export default {
  id: 'review',
  title: 'Every change comes back to you',
  script: s.build(),
  poster: posterAt,
  fit: { width: 1600, minScale: 0.72 },
  init,
  /** Live toggles for a visitor: Review in the sidebar, Fullscreen, Split/Unified, Collapse to Sidebar. */
  interact(e, st) {
    const b = e.target.closest('button');
    if (!b) return false;
    if (b.matches('[data-nav="review"]')) { st.panel = true; return true; }
    if (b.hasAttribute('data-demo-review-fullscreen')) { st.full = true; return true; }
    if (b.hasAttribute('data-demo-review-view')) { st.view = b.getAttribute('data-demo-review-view') === 'unified' ? 'unified' : 'split'; return true; }
    if (/Collapse to Sidebar/.test(b.textContent)) { st.full = false; st.panel = true; return true; }
    return false;
  },
  render(st, ctx) {
    const session = st.sessions[3];
    const narrow = ctx.width < 900;
    const main = reviewSessionScreen({ session, files: FILES, panel: st.panel, narrow });
    return shell({
      sidebar: ctx.width >= 1000,
      // The sidebar marks Review as the current place while the header keeps the session's breadcrumb.
      view: st.panel ? 'review' : 'session',
      header: header({ view: 'session', workspace: WS, session, sidebarOpen: ctx.width >= 1000 }),
      workspace: WS, sessions: st.sessions, activeId: session.id,
      main,
      overlays: st.full ? reviewFullscreen({ files: FILES, view: st.view, workspace: WS.id, narrow: ctx.width < 800 }) : '',
    });
  },
};
