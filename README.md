# AIFOREU website preview

Static website files for the AIFOREU design preview. The development repository and its history are kept separately.

Main preview: https://d0ublemm.github.io/aiforeu-preview/

The organization address https://aiforeu.github.io/aiforeu-preview/ redirects
here, preserving the page, query and fragment. Publish website exports only to
`d0ubleMM/aiforeu-preview` (`main:/`). The organization repository publishes only
its redirect folder (`main:/docs`), and must not receive mirrored website exports.

## Homepage

The opening shows a real Codex terminal run finding duplicate invoices in an
example database. The desktop and mobile cuts each have a matching poster.
The motion control can start or pause the recording. Reduced motion and
data-saving connections start with the poster.

The company uses black and white with original color photographs. Michael
Ramich and Maximilian Schwarz introduce themselves on the homepage and company
page. The contact page links to their profiles above the project form.
Agentario includes a playable delivery enquiry and the signed customer reference.
VerkehrsAI has its own research section. IVE shows its agent companions, followed
by AnyUse and the contact link.

## Navigation

Every page carries the same header. `Angebote` opens one panel with all pages,
grouped by audience (companies, municipalities and planning offices, open
source) plus the project overview; the phone menu lists the same pages. The
panel is a native `<details>`, so it opens without script; `assets/navigation.js`
adds closing by Escape, by a click elsewhere and when focus leaves it. The
header markup is repeated in each HTML file: change it in all of them together.
The main platform is Agentario. VerkehrsAI has one entry, including VerkehrsOS research.

## Languages

The company pages, Agentario and Voice share a language button. German is the
default. The 43-language selection includes all 24 EU official languages plus
19 other European national or regional languages. The current page, query
parameters and fragment survive a switch; the choice is retained on subsequent
pages. Visitor-entered text remains unchanged.

Translations are built in advance and served from `assets/i18n/`; there is no
visitor-side translation service. The additional languages are machine
translated, with editorial corrections to prominent copy. Browser checks do
not replace a native-language editorial review. Original product recordings,
logos and German Voice audio remain original; surrounding text and transcripts
follow the selected language.

## Subpages

The projects and workforce pages show Voice, Desktop, Workflows and VerkehrsAI
in four tabs. Each product page opens the relevant example directly. In the
workflow example visitors can review an offer for six monitors and toggle
approval. VerkehrsAI and the VerkehrsOS research project share `verkehrsai.html`.

## Media

`assets/hero-film/` contains the edited screen recording and matching stills.
The headshots in `assets/people/` are local copies of the two team members’
LinkedIn profile pictures. The site only contacts LinkedIn when a visitor
chooses a profile link.

## Source synchronization

On 16 November 2026, Michael R's film-story update (`d194c38`) was integrated
back into the development templates and assets. The earlier preview (`55da84d`)
already contained the latest local export (`d515722`); all 415 exported files
matched before integration.

`preview-version.json` identifies the integrated development revision. Rebuilding
and exporting that source preserves the published pages, navigation, versioned
assets and deferred scripts. The portrait and landscape posters follow device orientation.

Before another export, fetch this repository and bring any direct preview edits
back into the development source. Compare the export before pushing. The
development history and unpublished source material remain separate from this
public repository.
