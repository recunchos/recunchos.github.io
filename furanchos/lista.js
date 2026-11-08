(function () {
  var D = window.RecunchosDatos;
  var lista = document.getElementById("lista");
  var estado = document.getElementById("estado");
  var q = document.getElementById("q");
  var concello = document.getElementById("concello");
  var stage = document.getElementById("stage");
  var explore = document.getElementById("explore");
  var rows = [];
  var scope = "galicia";
  var ready = false;

  function tr(key) {
    var I = window.RecunchosIdioma;
    var value = I && I.t ? I.t(key) : "";
    return value || "";
  }

  function statusCode(row) {
    var label = D.statusLabel(row);
    if (label === "Abierto") return "abierto";
    if (label === "Abrimos") return "abrimos";
    if (label === "Cerrado") return "cerrado";
    return "";
  }

  function scopeFromHash() {
    var hash = (location.hash || "").replace(/^#/, "");
    if (hash === "espana" || hash === "por-espana") return "espana";
    return "galicia";
  }
  var map = L.map("mapa", { scrollWheelZoom: true });
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);
  var layer = L.layerGroup().addTo(map);
  var lastBounds = [];
  map.setView([42.5, -8.4], 8);

  function pin(row) {
    var code = statusCode(row);
    var kind = code === "abierto" || code === "abrimos" ? "open" : "shut";
    return L.divIcon({
      className: "pin",
      html: '<div style="width:18px;height:18px;border-radius:99px;border:2px solid #fff;box-shadow:0 2px 6px rgba(40,20,20,.35);background:' + (kind === "open" ? "#1F5F8B" : "#5A7084") + '"></div>',
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });
  }

  function pool() {
    if (scope === "galicia") return rows.filter(D.isGaliciaPlace);
    var community = D.SPAIN_COMMUNITIES.filter(function (item) { return item.id === scope; })[0];
    if (!community) return [];
    return D.placesInCommunity(rows, community.name);
  }

  function shown() {
    var items = pool();
    if (scope !== "galicia") return items;
    var text = q.value.trim().toLocaleLowerCase("es");
    var zone = concello.value;
    return items.filter(function (row) {
      if (zone && row.municipality !== zone) return false;
      if (!text) return true;
      return (row.name + " " + (row.municipality || "")).toLocaleLowerCase("es").indexOf(text) !== -1;
    });
  }

  function draw() {
    var items = shown();
    var noun = scope === "galicia"
      ? tr(items.length === 1 ? "explore.oneFurancho" : "explore.manyFuranchos")
      : tr(items.length === 1 ? "explore.oneCasa" : "explore.manyCasas");
    estado.textContent = items.length + " " + noun;
    lista.innerHTML = items.map(function (row) {
      var photo = D.photoUrl(row.cover_photo_id);
      var pic = photo
        ? '<img class="avatar" alt="" src="' + D.esc(photo) + '">'
        : '<span class="ph" aria-hidden="true">' + D.esc((row.name || "?").slice(0, 1)) + "</span>";
      var place = [row.municipality, row.province].filter(Boolean).join(" · ");
      var code = statusCode(row);
      var pill = "";
      if (code === "abierto") pill = '<span class="pill open">' + D.esc(tr("status.abierto")) + "</span>";
      else if (code === "abrimos") pill = '<span class="pill soon">' + D.esc(tr("status.abrimos")) + "</span>";
      else if (code === "cerrado") pill = '<span class="pill">' + D.esc(tr("status.cerrado")) + "</span>";
      return '<li><a class="row" href="ficha.html?id=' + encodeURIComponent(row.id) + '">' + pic +
        "<div><h2>" + D.esc(row.name) + "</h2><p>" + D.esc(place) + "</p></div>" + pill + "</a></li>";
    }).join("");

    layer.clearLayers();
    var bounds = [];
    lastBounds = bounds;
    items.forEach(function (row) {
      if (row.lat == null || row.lng == null) return;
      var marker = L.marker([row.lat, row.lng], { icon: pin(row) }).addTo(layer);
      marker.bindTooltip(row.name + (row.municipality ? " · " + row.municipality : ""), { direction: "top", offset: [0, -8] });
      marker.on("click", function () {
        location.href = "ficha.html?id=" + encodeURIComponent(row.id);
      });
      bounds.push([row.lat, row.lng]);
    });
    if (bounds.length) map.fitBounds(bounds, { padding: [24, 24], maxZoom: 12 });
    setTimeout(function () { map.invalidateSize(); }, 60);
  }

  function mode(next) {
    stage.className = "stage mode-" + next;
    document.getElementById("modo-lista").setAttribute("aria-pressed", next === "lista" ? "true" : "false");
    document.getElementById("modo-mapa").setAttribute("aria-pressed", next === "mapa" ? "true" : "false");
    setTimeout(function () {
      map.invalidateSize();
      if (lastBounds.length) map.fitBounds(lastBounds, { padding: [24, 24], maxZoom: 12 });
    }, 80);
  }

  function fillConcellos() {
    var current = concello.value;
    var zones = {};
    rows.filter(D.isGaliciaPlace).forEach(function (row) { if (row.municipality) zones[row.municipality] = true; });
    concello.innerHTML = '<option value="">' + D.esc(tr("explore.allTowns")) + "</option>";
    Object.keys(zones).sort(function (a, b) { return a.localeCompare(b, "es"); }).forEach(function (name) {
      var opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      concello.appendChild(opt);
    });
    if (zones[current]) concello.value = current;
  }

  function paintCommunities() {
    var root = document.getElementById("comunidades");
    root.innerHTML = D.SPAIN_COMMUNITIES.map(function (item) {
      var count = D.placesInCommunity(rows, item.name).length;
      var intro = tr("community." + item.id) || item.intro;
      var noun = tr(count === 1 ? "explore.oneCasa" : "explore.manyCasas");
      return '<button type="button" class="community" data-id="' + D.esc(item.id) + '">' +
        '<img alt="" src="' + D.esc(item.photo) + '">' +
        '<span class="copy"><h2>' + D.esc(item.name) + '</h2>' +
        '<p class="local">' + D.esc(item.localName) + '</p>' +
        '<p class="casas">' + count + " " + D.esc(noun) + "</p>" +
        '<p class="intro">' + D.esc(intro) + "</p></span></button>";
    }).join("");
  }

  function setScope(next) {
    scope = next;
    var community = D.SPAIN_COMMUNITIES.filter(function (item) { return item.id === next; })[0];
    explore.className = "explore " + (next === "galicia" ? "region-galicia" : community ? "region-community" : "region-espana");
    var galiciaTab = document.getElementById("tab-galicia");
    var spainTab = document.getElementById("tab-espana");
    var onGalicia = next === "galicia";
    galiciaTab.setAttribute("aria-pressed", onGalicia ? "true" : "false");
    galiciaTab.setAttribute("aria-selected", onGalicia ? "true" : "false");
    spainTab.setAttribute("aria-pressed", onGalicia ? "false" : "true");
    spainTab.setAttribute("aria-selected", onGalicia ? "false" : "true");
    if (community) {
      document.getElementById("community-name").textContent = community.name;
      document.getElementById("community-local").textContent = community.localName;
      document.getElementById("community-intro").textContent = tr("community." + community.id) || community.intro;
    }
    if (next !== "espana") draw();
  }

  document.getElementById("modo-lista").addEventListener("click", function () { mode("lista"); });
  document.getElementById("modo-mapa").addEventListener("click", function () { mode("mapa"); });
  function goScope(next) {
    var hash = next === "espana" ? "#espana" : "#galicia";
    if (location.hash !== hash && (next === "galicia" || next === "espana")) {
      history.replaceState(null, "", hash);
    }
    setScope(next);
  }
  document.getElementById("tab-galicia").addEventListener("click", function () { goScope("galicia"); });
  document.getElementById("tab-espana").addEventListener("click", function () { goScope("espana"); });
  document.getElementById("volver").addEventListener("click", function () { goScope("espana"); });
  document.getElementById("comunidades").addEventListener("click", function (event) {
    var card = event.target.closest(".community");
    if (card) setScope(card.getAttribute("data-id"));
  });

  function refreshCopy() {
    fillConcellos();
    paintCommunities();
    if (scope !== "espana") draw();
  }

  D.loadAll().then(function (data) {
    rows = data || [];
    ready = true;
    setScope(scopeFromHash());
    refreshCopy();
  }).catch(function () {
    estado.textContent = tr("explore.fail");
  });
  window.addEventListener("hashchange", function () { setScope(scopeFromHash()); });
  document.addEventListener("recunchos:idioma", refreshCopy);
  q.addEventListener("input", draw);
  concello.addEventListener("change", draw);
})();
