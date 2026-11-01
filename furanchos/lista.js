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
  var map = L.map("mapa", { scrollWheelZoom: true });
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);
  var layer = L.layerGroup().addTo(map);
  var lastBounds = [];
  map.setView([42.5, -8.4], 8);

  function pin(row) {
    var label = D.statusLabel(row);
    var kind = label === "Abierto" || label === "Abrimos" ? "open" : "shut";
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
    var noun = scope === "galicia" ? (items.length === 1 ? " furancho" : " furanchos") : (items.length === 1 ? " casa" : " casas");
    estado.textContent = items.length + noun;
    lista.innerHTML = items.map(function (row) {
      var photo = D.photoUrl(row.cover_photo_id);
      var pic = photo
        ? '<img class="avatar" alt="" src="' + D.esc(photo) + '">'
        : '<span class="ph" aria-hidden="true">' + D.esc((row.name || "?").slice(0, 1)) + "</span>";
      var place = [row.municipality, row.province].filter(Boolean).join(" · ");
      var label = D.statusLabel(row);
      var pill = "";
      if (label === "Abierto") pill = '<span class="pill open">Abierto</span>';
      else if (label === "Abrimos") pill = '<span class="pill soon">Abrimos</span>';
      else if (label === "Cerrado") pill = '<span class="pill">Cerrado</span>';
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
    concello.innerHTML = '<option value="">Todos los concellos</option>';
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
      return '<button type="button" class="community" data-id="' + D.esc(item.id) + '">' +
        '<img alt="" src="' + D.esc(item.photo) + '">' +
        '<span class="copy"><h2>' + D.esc(item.name) + '</h2>' +
        '<p class="local">' + D.esc(item.localName) + '</p>' +
        '<p class="casas">' + count + (count === 1 ? " casa" : " casas") + "</p></span></button>";
    }).join("");
  }

  function setScope(next) {
    scope = next;
    var community = D.SPAIN_COMMUNITIES.filter(function (item) { return item.id === next; })[0];
    explore.className = "explore " + (next === "galicia" ? "region-galicia" : community ? "region-community" : "region-espana");
    document.getElementById("tab-galicia").setAttribute("aria-pressed", next === "galicia" ? "true" : "false");
    document.getElementById("tab-espana").setAttribute("aria-pressed", next === "galicia" ? "false" : "true");
    if (community) {
      document.getElementById("community-name").textContent = community.name;
      document.getElementById("community-local").textContent = community.localName;
      document.getElementById("community-intro").textContent = community.intro;
    }
    if (next !== "espana") draw();
  }

  document.getElementById("modo-lista").addEventListener("click", function () { mode("lista"); });
  document.getElementById("modo-mapa").addEventListener("click", function () { mode("mapa"); });
  document.getElementById("tab-galicia").addEventListener("click", function () { setScope("galicia"); });
  document.getElementById("tab-espana").addEventListener("click", function () { setScope("espana"); });
  document.getElementById("volver").addEventListener("click", function () { setScope("espana"); });
  document.getElementById("comunidades").addEventListener("click", function (event) {
    var card = event.target.closest(".community");
    if (card) setScope(card.getAttribute("data-id"));
  });

  D.loadAll().then(function (data) {
    rows = data || [];
    fillConcellos();
    paintCommunities();
    draw();
  }).catch(function () {
    estado.textContent = "No se ha podido cargar el listado.";
  });
  q.addEventListener("input", draw);
  concello.addEventListener("change", draw);
})();
