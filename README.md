# stuff

**Static stuff site** (vanilla JavaScript and CSS). The main page is a sortable **software** table for released/prototype builds: titles, tags, versions, platforms, release dates, checksums, downloads, and play links. `/quickstart/` is a separate table for quickstart templates. `/activity/` plots version releases over time (project hues are toggleable; quickstarts excluded). Supporting folders include `apps/`, `games/`, `prototype/`, `quickstart/`, and related assets.

## User guide

There is no install or build step; open `index.html` or use a local static server.

| Command | Description |
|--------|-------------|
| `make help` | Show available targets |
| `make serve` | Serve the repo on `127.0.0.1:8880` |

Requires **Python 3** for `make serve`.
