(function () {
  var CATALOG_URL = window.__STUFF_CATALOG_URL__;
  var PAGE_KIND = window.__STUFF_PAGE_KIND__ || "released";
  if (!CATALOG_URL) {
    console.error("catalog.js: set window.__STUFF_CATALOG_URL__ before loading");
    return;
  }

  var statusEl = document.getElementById("status");
  var rowsEl = document.getElementById("rows");

  function showStatus(msg, isError) {
    statusEl.hidden = false;
    statusEl.textContent = msg;
    statusEl.classList.toggle("error", !!isError);
  }

  function shortSha(hex) {
    if (!hex || hex.length < 16) return hex || "—";
    return hex.slice(0, 8) + "…" + hex.slice(-6);
  }

  function playHref(gameKey, version, w, h) {
    var u = new URL("play.html", window.location.href);
    u.searchParams.set("game", gameKey);
    u.searchParams.set("version", version);
    if (w != null) u.searchParams.set("w", String(w));
    if (h != null) u.searchParams.set("h", String(h));
    return u.pathname + u.search + u.hash;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function escapeAttr(s) {
    return escapeHtml(s).replace(/'/g, "&#39;");
  }

  function hasPlayable(row) {
    return !!(row.playUrl && (row.platform === "wasm" || row.platform === "web"));
  }

  async function load() {
    var catalog;
    try {
      var res = await fetch(CATALOG_URL, { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      catalog = await res.json();
    } catch (e) {
      showStatus(
        "Could not load catalog from S3. Check CORS, the bucket URL, and that CI has published this catalog.",
        true
      );
      return;
    }

    var games = catalog.games || {};
    var flat = [];
    var platformOrder = ["wasm", "web", "macos", "windows"];

    for (var gameKey of Object.keys(games)) {
      var g = games[gameKey] || {};
      var name = g.display_name || gameKey;
      var versions = g.versions || {};
      for (var ver of Object.keys(versions)) {
        var v = versions[ver] || {};
        var released = v.released_at || "—";
        var iframe = v.iframe || {};
        var platforms = v.platforms || {};
        for (var pi = 0; pi < platformOrder.length; pi++) {
          var p = platformOrder[pi];
          var info = platforms[p];
          if (!info || !info.zip_url) continue;
          flat.push({
            gameKey: gameKey,
            name: name,
            version: ver,
            platform: p,
            released: released,
            sha256: info.sha256 || "—",
            zipUrl: info.zip_url,
            playUrl: info.play_url,
            iframeW: iframe.width,
            iframeH: iframe.height,
          });
        }
      }
    }

    var po = { wasm: 0, web: 1, macos: 2, windows: 3 };
    flat.sort(function (a, b) {
      if (a.name !== b.name) return a.name.localeCompare(b.name);
      if (a.version !== b.version) return b.version.localeCompare(a.version, undefined, { numeric: true });
      return (po[a.platform] ?? 9) - (po[b.platform] ?? 9);
    });

    if (flat.length === 0) {
      showStatus(
        PAGE_KIND === "prototype"
          ? "No prototype builds in catalog yet. Run mindsweeper-js CI (non-PR) with AWS OIDC configured."
          : "Catalog is empty. Publish released builds (all three platforms) with AWS OIDC configured.",
        false
      );
      return;
    }

    statusEl.hidden = true;
    var frag = document.createDocumentFragment();
    for (var i = 0; i < flat.length; i++) {
      var row = flat[i];
      var tr = document.createElement("tr");
      var sha = row.sha256;
      var playCell = hasPlayable(row)
        ? '<a href="' +
          escapeAttr(playHref(row.gameKey, row.version, row.iframeW, row.iframeH)) +
          '">Play in browser</a>'
        : "—";

      tr.innerHTML =
        "<td>" +
        escapeHtml(row.name) +
        "</td>" +
        "<td><code>" +
        escapeHtml(row.version) +
        "</code></td>" +
        "<td>" +
        escapeHtml(row.platform) +
        "</td>" +
        "<td>" +
        escapeHtml(row.released) +
        "</td>" +
        '<td class="sha">' +
        '<span class="sha-short" title="' +
        escapeHtml(sha) +
        '">' +
        escapeHtml(shortSha(sha)) +
        "</span>" +
        '<span class="actions">' +
        '<button type="button" class="btn copy-sha" data-sha="' +
        escapeAttr(sha) +
        '">Copy</button>' +
        "</span></td>" +
        '<td><a href="' +
        escapeAttr(row.zipUrl) +
        '" download rel="noopener">ZIP</a></td>' +
        "<td>" +
        playCell +
        "</td>";
      frag.appendChild(tr);
    }
    rowsEl.appendChild(frag);

    rowsEl.addEventListener("click", function (ev) {
      var btn = ev.target.closest(".copy-sha");
      if (!btn || !btn.dataset.sha) return;
      navigator.clipboard.writeText(btn.dataset.sha).then(
        function () {
          btn.textContent = "Copied";
          setTimeout(function () {
            btn.textContent = "Copy";
          }, 1500);
        },
        function () {}
      );
    });
  }

  load();
})();
