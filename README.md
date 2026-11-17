# AIFOREU website preview

Static website files for the AIFOREU design preview. The development repository and its history are kept separately.

Main preview: https://d0ublemm.github.io/aiforeu-preview/

The organization address https://aiforeu.github.io/aiforeu-preview/ redirects
here, preserving the page, query and fragment. Publish website exports only to
`d0ubleMM/aiforeu-preview` (`main:/`). The organization repository publishes only
its redirect folder (`main:/docs`), and must not receive mirrored website exports.

## Homepage

The near-black opening fills the viewport and retains its small film. It blends into the original grey
3D room with one white desk at a time: Voice, Desktop, Workflows and VerkehrsAI.
Visitors select a desk with the direct selectors or previous/next buttons.
Normal page scrolling, reduced motion, static artwork and direct-link fallbacks
remain available. The compact product overview follows the room. The original
closing animation is restored: its words drift apart as visitors scroll, and
the contact button moves to the centre. Reverse scrolling restores the text;
reduced motion and no-JavaScript retain the readable static closing section.

- `assets/home-story.*`: opening film, navigation background and statement.
- `assets/office-room.*` and `assets/aiforeu-gallery/`: interactive desks.
- `assets/aiforeu-room/`: stills rendered from the same desk models.

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

`projekte.html` shows the three areas of the platform with the same desk
pictures as the homepage, and each project has one line on how it belongs to
the others.

## Generated artwork

Pictures and clips were generated with Higgsfield. The raw output and the briefs
are kept in `.higgsfield-local/`, which is not published.

- `scripts/build-home-media.sh`: rebuilds every clip as a seamless loop and takes
  each still picture from the first frame of its loop, so nothing shifts when a
  clip starts to play. Needs ffmpeg with libx264 and Python with Pillow:
  `FFMPEG=/path/to/ffmpeg PYTHON=/path/to/python scripts/build-home-media.sh`.
- The homepage reuses the original gallery through `assets/office-room.js`.
  The older flight and pinned scroll entry points are not mounted.

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
