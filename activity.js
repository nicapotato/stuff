/* Stuff /activity — version release timeline. Projects map to hues;
 * click toggles, double-click isolates, click isolated hue re-adds others,
 * Reset restores all. Fails loudly when catalogs cannot be loaded.
 */
(function () {
  "use strict";

  var CATALOG_BASE = window.__STUFF_CATALOG_BASE__;
  var catalogBaseOverride = new URLSearchParams(window.location.search).get("catalogBase");
  if (catalogBaseOverride) CATALOG_BASE = catalogBaseOverride;
  if (!CATALOG_BASE) {
    throw new Error("activity.js: set window.__STUFF_CATALOG_BASE__ before loading");
  }

  var statusEl = document.getElementById("status");
  var legendEl = document.getElementById("activityLegend");
  var resetBtn = document.getElementById("activityReset");
  var canvas = document.getElementById("activityChart");
  var tooltipEl = document.getElementById("activityTooltip");
  if (!statusEl || !legendEl || !resetBtn || !canvas || !tooltipEl) {
    throw new Error("activity.js: missing required DOM nodes");
  }

  var ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("activity.js: canvas 2d context unavailable");

  /** @type {{key:string,name:string,hue:number,visible:boolean}[]} */
  var projects = [];
  /** @type {Record<string,{key:string,name:string,hue:number,visible:boolean}>} */
  var projectByKey = Object.create(null);
  /** @type {{t:number,iso:string,projectKey:string,name:string,version:string,maturity:string,category:string}[]} */
  var events = [];
  /** When set, only this project is visible (double-click isolate). */
  var isolatedKey = null;
  var clickTimer = null;
  var hoverEvent = null;
  var dpr = Math.max(1, window.devicePixelRatio || 1);

  var PAD = { top: 28, right: 24, bottom: 44, left: 168 };

  function showStatus(msg, isError) {
    statusEl.hidden = false;
    statusEl.classList.toggle("error", !!isError);
    statusEl.classList.toggle("banner--load-fail", !!isError);
    if (isError) {
      statusEl.innerHTML =
        '<div class="banner-error-title">ERROR</div>' +
        '<div class="banner-error-detail">' +
        escapeHtml(msg) +
        "</div>";
    } else {
      statusEl.textContent = msg;
    }
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function catalogBaseTrimmed() {
    return String(CATALOG_BASE).replace(/\/+$/, "");
  }

  async function fetchCatalogJson(url) {
    try {
      var res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      return null;
    }
  }

  function releasedAtMs(raw) {
    if (raw == null || raw === "") return NaN;
    var t = new Date(raw).getTime();
    return Number.isNaN(t) ? NaN : t;
  }

  function hashHue(key) {
    var h = 0;
    for (var i = 0; i < key.length; i++) {
      h = (h * 31 + key.charCodeAt(i)) >>> 0;
    }
    return h % 360;
  }

  function hueColor(hue, alpha) {
    return "hsla(" + hue + ", 72%, 62%, " + (alpha == null ? 1 : alpha) + ")";
  }

  function collectEvents(doc, maturity, category, out) {
    if (!doc) return;
    var rootKey = category === "apps" ? "apps" : "games";
    var bucket = doc[rootKey] || {};
    var keys = Object.keys(bucket);
    for (var i = 0; i < keys.length; i++) {
      var gameKey = keys[i];
      var g = bucket[gameKey] || {};
      var name = g.display_name || gameKey;
      var projectKey = category + "/" + gameKey;
      var versions = g.versions || {};
      var verKeys = Object.keys(versions);
      for (var vi = 0; vi < verKeys.length; vi++) {
        var version = verKeys[vi];
        var v = versions[version] || {};
        var t = releasedAtMs(v.released_at);
        if (Number.isNaN(t)) continue;
        out.push({
          t: t,
          iso: String(v.released_at),
          projectKey: projectKey,
          name: name,
          version: version,
          maturity: maturity,
          category: category,
        });
      }
    }
  }

  function syncResetEnabled() {
    var allOn = projects.every(function (p) {
      return p.visible;
    });
    resetBtn.disabled = allOn && isolatedKey == null;
  }

  function setAllVisible() {
    isolatedKey = null;
    for (var i = 0; i < projects.length; i++) projects[i].visible = true;
    syncLegend();
    syncResetEnabled();
    draw();
  }

  function toggleProject(key) {
    var p = projectByKey[key];
    if (!p) return;
    if (isolatedKey === key) {
      // Click isolated hue → re-add other hues.
      setAllVisible();
      return;
    }
    if (isolatedKey != null) {
      // Leaving isolate: turn this one on (and keep current isolate off unless same).
      isolatedKey = null;
      p.visible = !p.visible;
    } else {
      p.visible = !p.visible;
    }
    // Never allow zero visible projects — fail soft by re-enabling the clicked one.
    var any = projects.some(function (x) {
      return x.visible;
    });
    if (!any) p.visible = true;
    syncLegend();
    syncResetEnabled();
    draw();
  }

  function isolateProject(key) {
    var p = projectByKey[key];
    if (!p) return;
    isolatedKey = key;
    for (var i = 0; i < projects.length; i++) {
      projects[i].visible = projects[i].key === key;
    }
    syncLegend();
    syncResetEnabled();
    draw();
  }

  function syncLegend() {
    var buttons = legendEl.querySelectorAll("button.activity-hue");
    for (var i = 0; i < buttons.length; i++) {
      var btn = buttons[i];
      var key = btn.getAttribute("data-key");
      var p = projectByKey[key];
      if (!p) continue;
      btn.classList.toggle("is-off", !p.visible);
      btn.classList.toggle("is-isolated", isolatedKey === key);
      btn.setAttribute("aria-pressed", p.visible ? "true" : "false");
    }
  }

  function mountLegend() {
    legendEl.hidden = false;
    legendEl.innerHTML = "";
    var frag = document.createDocumentFragment();
    for (var i = 0; i < projects.length; i++) {
      var p = projects[i];
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "activity-hue";
      btn.setAttribute("data-key", p.key);
      btn.setAttribute("aria-pressed", "true");
      btn.title = "Click to toggle · double-click to isolate";
      btn.innerHTML =
        '<span class="activity-hue-swatch" style="background:' +
        hueColor(p.hue) +
        '"></span>' +
        '<span class="activity-hue-label">' +
        escapeHtml(p.name) +
        "</span>";

      (function (projectKey) {
        btn.addEventListener("click", function () {
          if (clickTimer) clearTimeout(clickTimer);
          clickTimer = setTimeout(function () {
            clickTimer = null;
            toggleProject(projectKey);
          }, 220);
        });
        btn.addEventListener("dblclick", function (ev) {
          ev.preventDefault();
          if (clickTimer) {
            clearTimeout(clickTimer);
            clickTimer = null;
          }
          isolateProject(projectKey);
        });
      })(p.key);

      frag.appendChild(btn);
    }
    legendEl.appendChild(frag);
  }

  function visibleProjects() {
    return projects.filter(function (p) {
      return p.visible;
    });
  }

  function layoutMetrics() {
    var cssW = canvas.clientWidth || canvas.width / dpr;
    var lanes = Math.max(1, visibleProjects().length);
    var laneH = 36;
    var cssH = PAD.top + PAD.bottom + lanes * laneH;
    cssH = Math.max(280, Math.min(720, cssH));
    return { cssW: cssW, cssH: cssH, laneH: laneH, lanes: lanes };
  }

  function resizeCanvas() {
    var m = layoutMetrics();
    canvas.style.height = m.cssH + "px";
    canvas.width = Math.round(m.cssW * dpr);
    canvas.height = Math.round(m.cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return m;
  }

  function plotBounds(m) {
    return {
      x0: PAD.left,
      x1: m.cssW - PAD.right,
      y0: PAD.top,
      y1: m.cssH - PAD.bottom,
    };
  }

  function timeDomain(visibleEvents) {
    if (!visibleEvents.length) {
      var now = Date.now();
      return { t0: now - 86400000 * 30, t1: now };
    }
    var t0 = visibleEvents[0].t;
    var t1 = visibleEvents[0].t;
    for (var i = 1; i < visibleEvents.length; i++) {
      if (visibleEvents[i].t < t0) t0 = visibleEvents[i].t;
      if (visibleEvents[i].t > t1) t1 = visibleEvents[i].t;
    }
    if (t0 === t1) {
      t0 -= 86400000 * 3;
      t1 += 86400000 * 3;
    } else {
      var pad = (t1 - t0) * 0.06;
      t0 -= pad;
      t1 += pad;
    }
    return { t0: t0, t1: t1 };
  }

  function xForTime(t, bounds, domain) {
    var span = domain.t1 - domain.t0;
    if (span <= 0) return bounds.x0;
    return bounds.x0 + ((t - domain.t0) / span) * (bounds.x1 - bounds.x0);
  }

  function formatTick(t) {
    var d = new Date(t);
    try {
      return new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(d);
    } catch (e) {
      return d.toISOString().slice(0, 10);
    }
  }

  function draw() {
    var m = resizeCanvas();
    var bounds = plotBounds(m);
    var vis = visibleProjects();
    var visibleEvents = events.filter(function (ev) {
      var p = projectByKey[ev.projectKey];
      return p && p.visible;
    });
    var domain = timeDomain(visibleEvents);

    ctx.clearRect(0, 0, m.cssW, m.cssH);
    ctx.fillStyle = "#12161c";
    ctx.fillRect(0, 0, m.cssW, m.cssH);

    // Axes
    ctx.strokeStyle = "#2d3540";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bounds.x0, bounds.y0);
    ctx.lineTo(bounds.x0, bounds.y1);
    ctx.lineTo(bounds.x1, bounds.y1);
    ctx.stroke();

    // Time ticks
    var tickN = Math.max(3, Math.min(7, Math.floor((bounds.x1 - bounds.x0) / 120)));
    ctx.fillStyle = "#9aa3ad";
    ctx.font = "12px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (var ti = 0; ti <= tickN; ti++) {
      var tt = domain.t0 + ((domain.t1 - domain.t0) * ti) / tickN;
      var tx = xForTime(tt, bounds, domain);
      ctx.strokeStyle = "#222831";
      ctx.beginPath();
      ctx.moveTo(tx, bounds.y0);
      ctx.lineTo(tx, bounds.y1);
      ctx.stroke();
      ctx.fillStyle = "#9aa3ad";
      ctx.fillText(formatTick(tt), tx, bounds.y1 + 10);
    }

    var laneIndex = Object.create(null);
    for (var li = 0; li < vis.length; li++) laneIndex[vis[li].key] = li;

    var plotH = bounds.y1 - bounds.y0;
    var laneH = plotH / Math.max(1, vis.length);

    // Lane labels + guides
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (var lj = 0; lj < vis.length; lj++) {
      var yp = bounds.y0 + laneH * (lj + 0.5);
      ctx.strokeStyle = "#1a2028";
      ctx.beginPath();
      ctx.moveTo(bounds.x0, yp);
      ctx.lineTo(bounds.x1, yp);
      ctx.stroke();
      ctx.fillStyle = hueColor(vis[lj].hue);
      ctx.font = "12px system-ui, -apple-system, sans-serif";
      var label = vis[lj].name;
      if (label.length > 22) label = label.slice(0, 21) + "…";
      ctx.fillText(label, bounds.x0 - 10, yp);
    }

    // Points
    for (var ei = 0; ei < visibleEvents.length; ei++) {
      var ev = visibleEvents[ei];
      var lane = laneIndex[ev.projectKey];
      if (lane == null) continue;
      var p = projectByKey[ev.projectKey];
      var x = xForTime(ev.t, bounds, domain);
      var y = bounds.y0 + laneH * (lane + 0.5);
      var r = hoverEvent === ev ? 7 : 5;
      ctx.beginPath();
      ctx.fillStyle = hueColor(p.hue, 0.95);
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      if (hoverEvent === ev) {
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    if (!visibleEvents.length) {
      ctx.fillStyle = "#9aa3ad";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "14px system-ui, -apple-system, sans-serif";
      ctx.fillText("No visible releases — reset hues or enable a project.", (bounds.x0 + bounds.x1) / 2, (bounds.y0 + bounds.y1) / 2);
    }
  }

  function eventAt(clientX, clientY) {
    var rect = canvas.getBoundingClientRect();
    var x = clientX - rect.left;
    var y = clientY - rect.top;
    var m = layoutMetrics();
    var bounds = plotBounds(m);
    var vis = visibleProjects();
    var visibleEvents = events.filter(function (ev) {
      var p = projectByKey[ev.projectKey];
      return p && p.visible;
    });
    var domain = timeDomain(visibleEvents);
    var laneIndex = Object.create(null);
    for (var i = 0; i < vis.length; i++) laneIndex[vis[i].key] = i;
    var plotH = bounds.y1 - bounds.y0;
    var laneH = plotH / Math.max(1, vis.length);
    var best = null;
    var bestD = 12;
    for (var ei = 0; ei < visibleEvents.length; ei++) {
      var ev = visibleEvents[ei];
      var lane = laneIndex[ev.projectKey];
      if (lane == null) continue;
      var px = xForTime(ev.t, bounds, domain);
      var py = bounds.y0 + laneH * (lane + 0.5);
      var d = Math.hypot(px - x, py - y);
      if (d < bestD) {
        bestD = d;
        best = ev;
      }
    }
    return best;
  }

  function showTooltip(ev, clientX, clientY) {
    if (!ev) {
      tooltipEl.hidden = true;
      return;
    }
    var when;
    try {
      when = new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(ev.t));
    } catch (e) {
      when = ev.iso;
    }
    tooltipEl.hidden = false;
    tooltipEl.innerHTML =
      "<strong>" +
      escapeHtml(ev.name) +
      "</strong><br>" +
      escapeHtml(ev.version) +
      " · " +
      escapeHtml(ev.maturity) +
      "<br>" +
      escapeHtml(when);
    var wrap = canvas.parentElement.getBoundingClientRect();
    var left = clientX - wrap.left + 12;
    var top = clientY - wrap.top + 12;
    tooltipEl.style.left = left + "px";
    tooltipEl.style.top = top + "px";
  }

  canvas.addEventListener("mousemove", function (ev) {
    var hit = eventAt(ev.clientX, ev.clientY);
    if (hit !== hoverEvent) {
      hoverEvent = hit;
      draw();
    }
    showTooltip(hit, ev.clientX, ev.clientY);
    canvas.style.cursor = hit ? "pointer" : "default";
  });

  canvas.addEventListener("mouseleave", function () {
    hoverEvent = null;
    tooltipEl.hidden = true;
    draw();
  });

  resetBtn.addEventListener("click", function () {
    setAllVisible();
  });

  window.addEventListener("resize", function () {
    draw();
  });

  async function load() {
    showStatus("Loading catalogs…", false);
    var base = catalogBaseTrimmed();
    var tuples = [
      [base + "/games/released/catalog.json", "released", "games"],
      [base + "/games/prototype/catalog.json", "prototype", "games"],
      [base + "/games/quickstart/catalog.json", "quickstart", "games"],
      [base + "/apps/released/catalog.json", "released", "apps"],
      [base + "/apps/prototype/catalog.json", "prototype", "apps"],
      [base + "/apps/quickstart/catalog.json", "quickstart", "apps"],
    ];

    var docs;
    try {
      docs = await Promise.all(
        tuples.map(function (t) {
          return fetchCatalogJson(t[0]);
        })
      );
    } catch (e) {
      showStatus("Failed to fetch catalogs: " + (e && e.message ? e.message : e), true);
      throw e;
    }

    var any = false;
    var collected = [];
    for (var i = 0; i < docs.length; i++) {
      if (docs[i]) any = true;
      collectEvents(docs[i], tuples[i][1], tuples[i][2], collected);
    }
    if (!any) {
      showStatus("Nothing Available", true);
      throw new Error("no catalogs returned");
    }
    if (!collected.length) {
      showStatus("No version releases with timestamps found in catalogs.", true);
      throw new Error("no dated version events");
    }

    events = collected.sort(function (a, b) {
      return a.t - b.t;
    });

    var seen = Object.create(null);
    var list = [];
    for (var ei = 0; ei < events.length; ei++) {
      var ev = events[ei];
      if (seen[ev.projectKey]) continue;
      seen[ev.projectKey] = true;
      list.push({
        key: ev.projectKey,
        name: ev.name,
        hue: 0,
        visible: true,
      });
    }
    list.sort(function (a, b) {
      return a.name.localeCompare(b.name);
    });
    // Spread hues evenly; fall back to hash if only one.
    for (var pi = 0; pi < list.length; pi++) {
      list[pi].hue =
        list.length === 1 ? hashHue(list[pi].key) : Math.round((pi * 360) / list.length);
      projectByKey[list[pi].key] = list[pi];
    }
    projects = list;

    statusEl.hidden = true;
    mountLegend();
    syncResetEnabled();
    draw();
  }

  load();
})();
