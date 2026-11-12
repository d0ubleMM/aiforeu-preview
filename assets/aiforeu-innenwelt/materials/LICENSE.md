# Street materials

These locally served photographic texture maps are from Poly Haven and licensed
CC0 1.0: https://polyhaven.com/license and https://creativecommons.org/publicdomain/zero/1.0/.
Commercial use and redistribution are permitted. Original authors and asset pages:

- Asphalt 02 — Rob Tuytel — https://polyhaven.com/a/asphalt_02
- Brick Wall 001 — Dimitrios Savva (photography), Rob Tuytel (processing) — https://polyhaven.com/a/brick_wall_001
- Concrete Floor 02 — https://polyhaven.com/a/concrete_floor_02
- Clay Roof Tiles — https://polyhaven.com/a/clay_roof_tiles
- Bark Brown 02 — https://polyhaven.com/a/bark_brown_02
- White Plaster 02 — https://polyhaven.com/a/white_plaster_02

`sources.json` records every original download URL and byte size. The 1K original
JPEGs were converted to WebP without resizing: quality 82 for albedo/roughness,
quality 92 for OpenGL normal maps. Total delivered map data: 4,506,944 bytes.
No third-party network request is required at runtime. Branching trees, leaf
geometry, street details and the world-space projection shader are authored here.

## Workforce furniture

- Wood Table 001 — https://polyhaven.com/a/wood_table_001 — CC0 1.0.

The three wood albedo, OpenGL normal and ARM maps are the unmodified original
1K JPEGs (482,020 bytes total), served locally. Their original URLs and SHA-256
hashes are appended to `sources.json`. Existing street maps above are unchanged.
The articulated microphone, furniture and their procedural fallback textures
were adapted from the project's interior realism study.
