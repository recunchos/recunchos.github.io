(function () {
  var D = window.RecunchosDatos;
  var lista = document.getElementById("lista");
  var estado = document.getElementById("estado");
  var F = window.RecunchosFiltros;
  var q = document.getElementById("q");
  var nota = document.getElementById("filtro-nota");
  var stage = document.getElementById("stage");
  var explore = document.getElementById("explore");
  var rows = [];
  var scope = "galicia";
  var ready = false;
  var filters = F.blank();
  var origin = null;
  var originKind = "";
  var sortMode = "recomendados";
  var more = false;
  var loadError = false;

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
    var color = "#C4A35A";
    if (code === "abierto" || code === "abrimos") color = "#1F5F8B";
    else if (code === "cerrado" || row.closed === true) color = "#5A7084";
    return L.divIcon({
      className: "pin",
      html: '<div style="width:18px;height:18px;border-radius:99px;border:2px solid #fff;box-shadow:0 2px 6px rgba(40,20,20,.35);background:' + color + '"></div>',
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

  function ordered(items) {
    if (sortMode === "cerca" && origin) return F.sortDistance(items, origin);
    return F.sortRecommended(items);
  }

  function missingText(gap) {
    var keys = { price: "explore.missingPrice", rating: "explore.missingRating", hours: "explore.missingHours", season: "explore.missingSeason" };
    return gap.map(function (name) { return tr(keys[name]); }).filter(Boolean).join(" ");
  }

  function draw() {
    if (loadError) {
      estado.textContent = tr("explore.fail");
      lista.innerHTML = "";
      layer.clearLayers();
      return;
    }
    if (!ready) {
      estado.textContent = tr("explore.loading");
      return;
    }
    var source = pool();
    var result = { rows: source, code: "ok", gap: [] };
    if (scope === "galicia") {
      filters.text = q.value;
      result = F.outcome(source, filters, F.clockFrom(new Date()), origin);
    }
    var items = scope === "galicia" ? ordered(result.rows) : source;
    var noun = scope === "galicia"
      ? tr(items.length === 1 ? "explore.oneFurancho" : "explore.manyFuranchos")
      : tr(items.length === 1 ? "explore.oneCasa" : "explore.manyCasas");
    if (scope === "galicia" && result.code === "ourense") estado.textContent = tr("explore.emptyOurense");
    else if (scope === "galicia" && result.code === "missing") estado.textContent = missingText(result.gap);
    else if (scope === "galicia" && result.code === "emptyKnown") estado.textContent = tr("explore.emptyKnown");
    else if (scope === "galicia" && result.code === "empty") estado.textContent = tr("explore.empty");
    else estado.textContent = items.length + " " + noun + (result.code === "partial" ? " " + tr("explore.partialGap") : "");
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

  function chip(label, pressed, onPress) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "chip";
    button.textContent = label;
    button.setAttribute("aria-pressed", pressed ? "true" : "false");
    button.addEventListener("click", onPress);
    return button;
  }

  function gapChip(label, detailKey) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "chip chip--gap";
    button.textContent = label;
    button.setAttribute("aria-pressed", "false");
    button.setAttribute("aria-disabled", "true");
    button.setAttribute("aria-describedby", "datos-nota");
    button.addEventListener("click", function () {
      nota.hidden = false;
      nota.textContent = tr(detailKey);
    });
    return button;
  }

  function paintFilters() {
    var quick = document.getElementById("chips-quick");
    var prov = document.getElementById("chips-prov");
    var zoneBox = document.getElementById("chips-zone");
    var radio = document.getElementById("chips-radio");
    var wine = document.getElementById("chips-wine");
    var food = document.getElementById("chips-food");
    var price = document.getElementById("chips-price");
    quick.innerHTML = "";
    prov.innerHTML = "";
    zoneBox.innerHTML = "";
    radio.innerHTML = "";
    wine.innerHTML = "";
    food.innerHTML = "";
    price.innerHTML = "";
    var galiciaAll = rows.filter(D.isGaliciaPlace);
    var clock = F.clockFrom(new Date());
    var cov = ready ? F.coverage(galiciaAll, clock) : null;
    if (cov && !cov.price) filters.maxPrice = null;
    if (cov && !cov.rating) filters.minRating = null;
    if (cov && !cov.openNow) filters.openNow = false;
    if (cov && !cov.season) filters.inSeason = false;
    function toggle(key) {
      return function () {
        filters[key] = !filters[key];
        paintFilters();
        draw();
      };
    }
    if (!ready) quick.appendChild(gapChip(tr("explore.openNow"), "explore.hoursGap"));
    else if (cov.openNow) quick.appendChild(chip(tr("explore.openNow"), filters.openNow, toggle("openNow")));
    else quick.appendChild(gapChip(tr("explore.openNow"), "explore.hoursGap"));
    quick.appendChild(chip(tr("explore.opensSoon"), filters.opensSoon, toggle("opensSoon")));
    if (!ready) quick.appendChild(gapChip(tr("explore.inSeason"), "explore.missingSeason"));
    else if (cov.season) quick.appendChild(chip(tr("explore.inSeason"), filters.inSeason, toggle("inSeason")));
    else quick.appendChild(gapChip(tr("explore.inSeason"), "explore.missingSeason"));
    quick.appendChild(chip(tr("explore.near"), originKind === "you", function () { askLocation(); }));
    quick.appendChild(chip(tr("explore.fromPv"), originKind === "pontevedra", function () { usePontevedra(); }));
    quick.appendChild(gapChip(tr("explore.pending"), "explore.pendingGap"));
    quick.appendChild(chip(more ? tr("explore.less") : tr("explore.more"), more, function () {
      more = !more;
      document.getElementById("more-filters").hidden = !more;
      paintFilters();
    }));
    prov.appendChild(chip(tr("explore.all"), filters.province === "all", function () { filters.province = "all"; filters.zone = "all"; paintFilters(); draw(); }));
    F.PROVINCES.forEach(function (name) {
      prov.appendChild(chip(name, filters.province === name, function () {
        filters.province = name;
        filters.zone = "all";
        paintFilters();
        draw();
      }));
    });
    var galicia = rows.filter(D.isGaliciaPlace).filter(function (row) {
      return filters.province === "all" || row.province === filters.province;
    });
    zoneBox.appendChild(chip(tr("explore.all"), filters.zone === "all", function () { filters.zone = "all"; paintFilters(); draw(); }));
    F.zonesIn(galicia).forEach(function (name) {
      zoneBox.appendChild(chip(name, filters.zone === name, function () { filters.zone = name; paintFilters(); draw(); }));
    });
    document.getElementById("radio-block").hidden = !origin;
    document.getElementById("lab-radio").textContent = tr("explore.radius") + (origin ? " " + (originKind === "you" ? tr("explore.near") : "Pontevedra") : "");
    F.RADIUS.forEach(function (km) {
      radio.appendChild(chip(km + " km", filters.radiusKm === km, function () { filters.radiusKm = km; paintFilters(); draw(); }));
    });
    radio.appendChild(chip(tr("explore.noLimit"), filters.radiusKm == null, function () { filters.radiusKm = null; paintFilters(); draw(); }));
    wine.appendChild(chip(tr("explore.allWine"), filters.wine === "all", function () { filters.wine = "all"; paintFilters(); draw(); }));
    F.WINES.forEach(function (name) {
      wine.appendChild(chip(name, filters.wine === name, function () { filters.wine = name; paintFilters(); draw(); }));
    });
    food.appendChild(chip(tr("explore.anyFood"), filters.food === "all", function () { filters.food = "all"; paintFilters(); draw(); }));
    F.FOODS.forEach(function (name) {
      food.appendChild(chip(name, filters.food === name, function () { filters.food = name; paintFilters(); draw(); }));
    });
    if (cov && cov.price) {
      price.appendChild(chip(tr("explore.price1"), filters.maxPrice === 1, function () { filters.maxPrice = filters.maxPrice === 1 ? null : 1; paintFilters(); draw(); }));
      price.appendChild(chip(tr("explore.price2"), filters.maxPrice === 2, function () { filters.maxPrice = filters.maxPrice === 2 ? null : 2; paintFilters(); draw(); }));
    } else {
      price.appendChild(gapChip(tr("explore.price1"), "explore.priceGap"));
      price.appendChild(gapChip(tr("explore.price2"), "explore.priceGap"));
    }
    if (cov && cov.rating) {
      price.appendChild(chip(tr("explore.rating4"), filters.minRating === 4, function () { filters.minRating = filters.minRating === 4 ? null : 4; paintFilters(); draw(); }));
    } else {
      price.appendChild(gapChip(tr("explore.rating4"), "explore.ratingGap"));
    }
    var bits = [tr("explore.pendingGap"), tr("explore.priceLevels")];
    if (cov && !cov.price) bits.push(tr("explore.priceGap"));
    if (cov && !cov.rating) bits.push(tr("explore.ratingGap"));
    if (cov && !cov.openNow) bits.push(tr("explore.hoursGap"));
    document.getElementById("datos-nota").textContent = ready ? bits.filter(Boolean).join(" ") : "";
    document.getElementById("orden-recomendados").setAttribute("aria-pressed", sortMode === "recomendados" ? "true" : "false");
    document.getElementById("orden-cerca").setAttribute("aria-pressed", sortMode === "cerca" ? "true" : "false");
    if (!origin) nota.hidden = true;
  }

  function usePontevedra() {
    origin = F.PONTEVEDRA;
    originKind = "pontevedra";
    if (filters.radiusKm == null) filters.radiusKm = 25;
    nota.hidden = false;
    nota.textContent = tr("explore.pvNote");
    paintFilters();
    draw();
  }

  function askLocation() {
    if (!navigator.geolocation) {
      nota.hidden = false;
      nota.textContent = tr("explore.noGeo");
      return;
    }
    navigator.geolocation.getCurrentPosition(function (pos) {
      origin = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      originKind = "you";
      if (filters.radiusKm == null) filters.radiusKm = 25;
      nota.hidden = false;
      nota.textContent = tr("explore.nearNote");
      paintFilters();
      draw();
    }, function () {
      nota.hidden = false;
      nota.textContent = tr("explore.noGeo");
    }, { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 });
  }

  function resetFilters() {
    filters = F.blank();
    origin = null;
    originKind = "";
    sortMode = "recomendados";
    q.value = "";
    nota.hidden = true;
    nota.textContent = "";
    paintFilters();
    draw();
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
    paintFilters();
    paintCommunities();
    if (scope !== "espana") draw();
  }

  D.loadAll().then(function (data) {
    rows = data || [];
    ready = true;
    loadError = false;
    setScope(scopeFromHash());
    refreshCopy();
  }).catch(function () {
    loadError = true;
    ready = false;
    estado.textContent = tr("explore.fail");
    lista.innerHTML = "";
  });
  window.addEventListener("hashchange", function () { setScope(scopeFromHash()); });
  document.addEventListener("recunchos:idioma", refreshCopy);
  q.addEventListener("input", draw);
  document.getElementById("limpiar").addEventListener("click", resetFilters);
  document.getElementById("orden-recomendados").addEventListener("click", function () { sortMode = "recomendados"; paintFilters(); draw(); });
  document.getElementById("orden-cerca").addEventListener("click", function () {
    sortMode = "cerca";
    if (originKind !== "you") askLocation();
    else { paintFilters(); draw(); }
  });
  paintFilters();
})();
