# AIFOREU website preview

Static website files for the AIFOREU design preview. The development repository and its history are kept separately.

Main preview: https://d0ublemm.github.io/aiforeu-preview/

The organization address https://aiforeu.github.io/aiforeu-preview/ redirects
here, preserving the page, query and fragment. Publish website exports only to
`d0ubleMM/aiforeu-preview` (`main:/`). The organization repository publishes only
its redirect folder (`main:/docs`), and must not receive mirrored website exports.

## Homepage

The near-black opening carries a compact white/silver AIFOREU sculpture in the
background. Fourteen pieces assemble and separate with ordinary forward and
reverse scrolling. A short sticky section keeps the headline and contact
actions readable. Once scrolling stops, the sculpture stops rendering.

A shared grey stage separates the two main business areas. Agentario shows one example
from an incoming call through work in software to the next workflow step.
VerkehrsAI has an illustrative 3D junction with moving traffic and a drawing
plane that lifts above the model. The area selectors and example steps can be
selected directly. These areas use ordinary scrolling and do not switch
automatically as the visitor scrolls.

IVE and AnyUse follow as independent projects, with an IVE screenshot and an
explicitly labelled AnyUse example. The contact section follows in the normal
document flow, without a separate scroll runway.

Reduced motion uses a static opening. A pause control stops ambient movement
in the business examples.
Without JavaScript, both business areas and all links remain in the document,
and the opening uses a rendered still of the sculpture. The junction has vector
artwork if WebGL is unavailable.

- `assets/home-story.*`: full-screen opening, navigation and statement.
- `assets/mark-sculpture.*`, `mark-sculpture-scene.js` and `mark-sculpture/`: 3D opening, scroll poses and rendered fallbacks.
- `assets/business-scenes.*`: area layout and directly selectable example workflow.
- `assets/business-junction.js` and `.svg`: public illustrative geometry and fallback.
- `assets/aiforeu-room/`: original grey-room desk stills used on subpages.

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

Company and product pages share the dark header and grey room with the homepage.
Text and artwork occupy separate layout areas; the company page puts its row of
desks below the introduction. `assets/page-film.*` styles the opening and returns
the header to its light version over light page content. VerkehrsAI and the
VerkehrsOS research project share `verkehrsai.html`; the old address redirects.

Version changed stylesheets, scripts and media in their referencing pages.

## Projects page

`projekte.html` shows the three capabilities of Agentario with the original
desk pictures, and each project has one line on how it belongs to the others.

## Generated artwork

The current sculpture is built directly from `assets/aiforeu-mark.svg` using the
existing vendored Three.js distribution. The fallback WebP images are renders
of that same model. Materials, lighting and geometry are local; no external 3D
model or image-generation service is required. The earlier road-evolution atlas
is no longer mounted on the homepage.
Earlier pictures and clips were generated with Higgsfield. Their raw output and
briefs are kept in `.higgsfield-local/`, which is not published.

- `scripts/build-home-media.sh`: rebuilds every clip as a seamless loop and takes
  each still picture from the first frame of its loop, so nothing shifts when a
  clip starts to play. Needs ffmpeg with libx264 and Python with Pillow:
  `FFMPEG=/path/to/ffmpeg PYTHON=/path/to/python scripts/build-home-media.sh`.
- The homepage uses `assets/business-scenes.js`; the original desk-gallery
  entry point and older flight entry points are not mounted.

## Source synchronization

On 16 November 2026, Michael R's film-story update (`d194c38`) was integrated
back into the development templates and assets. The earlier preview (`55da84d`)
already contained the latest local export (`d515722`); all 415 exported files
matched before integration.

`preview-version.json` identifies the integrated development revision. Rebuilding
and exporting that source preserves the published pages, navigation, versioned
assets and deferred scripts. The static workplace fallback also keeps its artwork
inside narrow screens when motion or JavaScript is disabled.

Before another export, fetch this repository and bring any direct preview edits
back into the development source. Compare the export before pushing. The
development history and unpublished source material remain separate from this
public repository.
