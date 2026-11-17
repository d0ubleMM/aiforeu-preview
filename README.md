# AIFOREU website preview

Static website files for the AIFOREU design preview. The development repository and its history are kept separately.

Main preview: https://d0ublemm.github.io/aiforeu-preview/

The organization address https://aiforeu.github.io/aiforeu-preview/ redirects
here, preserving the page, query and fragment. Publish website exports only to
`d0ubleMM/aiforeu-preview` (`main:/`). The organization repository publishes only
its redirect folder (`main:/docs`), and must not receive mirrored website exports.

## Homepage

The near-black opening fills the viewport. A hand-drawn isometric street develops
through twelve epochs, from a muddy path and horse carriages through cobbles,
early motorcars and concrete roads to a green city with flying cars. The time
lapse plays independently of scrolling, with pause, replay and a position slider.

A shared grey stage separates the two main business areas. Agentario shows one example
from an incoming call through work in software to the next workflow step.
VerkehrsAI has an illustrative 3D junction with moving traffic and a drawing
plane that lifts above the model. The area selectors and example steps can be
selected directly. The document scrolls normally, without pinned sections or
automatic area changes caused by scrolling.

IVE and AnyUse follow as independent projects, with an IVE screenshot and an
explicitly labelled AnyUse example. The contact section follows in the normal
document flow, without a separate scroll runway.

Reduced motion disables automatic movement. A pause control stops ambient
movement; the introduction also pauses offscreen and while the menu is open.
Without JavaScript, both business areas and all links remain in the document,
and the opening illustration uses a static first frame. The junction has vector
artwork if WebGL is unavailable.

- `assets/home-story.*`: full-screen opening, navigation and statement.
- `assets/road-evolution.*` and `assets/road-evolution/`: illustrated opening and playback.
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

The road-evolution illustration was generated with the built-in Imagegen tool.
Its twelve frames share one WebP atlas; playback uses a canvas reveal between
stages. Original artwork and prompt history remain in the development repository.
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
