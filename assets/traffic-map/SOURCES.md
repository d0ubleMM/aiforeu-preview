# Osnabrück aerial-to-vector sequence

Real location: Berliner Platz, Osnabrück (8.051861 E, 52.275667 N).
The timing and line reveal are an illustrative animation, not software analysis.

## Aerial imagery

Unmodified GetMap responses from LGLN's public DOP20 WMS, requested in EPSG:3857 on 2026-11-12. Exact request URLs and geographic bounds are recorded in map-data.json. Three views are aligned to the same projection: city, district and junction.

Source: https://opendata.lgln.niedersachsen.de/doorman/noauth/dop_wms?SERVICE=WMS&REQUEST=GetCapabilities
Attribution: LGLN (2026), Creative Commons Attribution 4.0 International.
License: https://creativecommons.org/licenses/by/4.0/
The animation adds dimming and public vector outlines on top of the original images at runtime.

## Street and building geometry

OpenStreetMap contributors, extracted from the public Overpass API on 2026-11-12.
Bounding box: south 52.2737, west 8.0498, north 52.2777, east 8.0543.
Way geometry for highway and building tags, projected into EPSG:3857 metres relative to the image centre. No internal AIFOREU models, plans, prompts or analysis data are included.

Source: https://overpass-api.de/api/interpreter
Copyright: https://www.openstreetmap.org/copyright
ODbL 1.0: https://opendatacommons.org/licenses/odbl/1-0/
The extracted vector data in map-data.json is provided under ODbL 1.0.

All assets are served locally. Website visitors do not contact a map or imagery service.
