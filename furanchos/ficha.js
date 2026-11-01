(function () {
  var D = window.RecunchosDatos;
  var root = document.getElementById("ficha");
  var id = new URLSearchParams(location.search).get("id");
  if (!id) {
    root.innerHTML = "<p class=\"err\">No hay ninguna ficha seleccionada.</p>";
    return;
  }
  D.loadOne(id).then(function (row) {
    if (!row) {
      root.innerHTML = "<p class=\"err\">No encontramos esta ficha.</p>";
      return;
    }
    document.title = row.name + " — Recunchos";
    var photo = D.photoUrl(row.cover_photo_id);
    var place = [row.municipality, row.comarca, row.province].filter(Boolean).join(" · ");
    var label = D.statusLabel(row);
    var today = D.todayHours(row);
    var statusClass = label === "Abierto" || label === "Abrimos" ? "open" : "";
    var statusText = label ? label : "Sin estado de hoy";
    if (today) statusText += " · " + today;
    else if (!label) statusText = "Horario de hoy no publicado";
    var wines = D.listText(row.wine_types);
    var food = D.listText(row.food).concat(D.listText(row.menu));
    var maps = D.mapsUrl(row);
    var dial = D.dialablePhone(row.phone);
    var phoneLine = row.phone ? D.formatPhone(row.phone) : "Teléfono no indicado.";
    var S = window.RecunchosSesion;
    var address = row.address || "Dirección no publicada.";
    if (row.coords_approximate && row.address) address += " La posición del mapa es aproximada.";
    var cover = photo
      ? '<img class="cover" alt="" src="' + D.esc(photo) + '">'
      : '<div class="cover-ph" aria-hidden="true">' + D.esc((row.name || "?").slice(0, 1)) + "</div>";
    return (S ? S.verify() : Promise.resolve(null)).then(function (session) {
      var back = "/entrar/?next=" + encodeURIComponent(S ? S.safeNext(location.pathname + location.search) : "/");
      var actions = "";
      if (maps) actions += '<a href="' + D.esc(maps) + '" rel="noopener">Cómo llegar</a>';
      if (D.isGaliciaPlace(row)) {
        actions += session
          ? '<button type="button" class="outline" id="sellar">Sellar</button>'
          : '<a class="outline" href="' + D.esc(back) + '">Sellar</a>';
      }
      if (dial) actions += '<a class="outline" href="tel:' + D.esc(dial) + '">Llamar</a>';
      actions += session
        ? '<button type="button" class="outline" id="seguir">Seguir</button>'
        : '<a class="outline" href="' + D.esc(back) + '">Seguir</a>';
      root.innerHTML =
        cover +
        "<section><p class=\"kicker\">" + D.esc(row.local_type_label || "Furancho") + "</p>" +
        "<h2 style=\"font-size:1.8rem\">" + D.esc(row.name) + "</h2>" +
        "<p class=\"zone\">" + D.esc(place) + "</p>" +
        "<p class=\"status-line " + statusClass + "\">" + D.esc(statusText) + "</p>" +
        (actions ? '<div class="actions">' + actions + "</div>" : "") +
        '<p class="soft" id="accion-nota"></p>' +
        "</section>" +
        "<section class=\"block\"><h2>Horario de la semana</h2>" + D.hoursHtml(row) +
        (row.closed_note ? "<p class=\"soft\">" + D.esc(row.closed_note) + "</p>" : "") +
        (row.season_label ? "<p class=\"soft\">Temporada: " + D.esc(row.season_label) + "</p>" : "") +
        "</section>" +
        "<section class=\"block\"><h2>Dirección</h2><p>" + D.esc(address) + "</p><p class=\"soft\">" + D.esc(phoneLine) + "</p></section>" +
        "<section class=\"block\"><h2>Vinos y tapas</h2><p>" +
        D.esc(wines.length ? "Vinos: " + wines.join(", ") : "Sin vinos publicados.") + "</p><p class=\"soft\">" +
        D.esc(food.length ? "Tapas: " + food.join(", ") : "Sin tapas publicadas.") + "</p></section>" +
        (row.description ? "<section class=\"block\"><h2>La casa</h2><p>" + D.esc(row.description) + "</p></section>" : "") +
        "<div class=\"mini-map\" id=\"mapa-ficha\"></div>";
      var nota = document.getElementById("accion-nota");
      var seguir = document.getElementById("seguir");
      var sellar = document.getElementById("sellar");
      function notaText(text) { if (nota) nota.textContent = text || ""; }
      if (seguir && S) {
        S.isFollowing(row.id).then(function (on) {
          seguir.textContent = on ? "Siguiendo" : "Seguir";
          seguir.setAttribute("aria-pressed", on ? "true" : "false");
        });
        seguir.addEventListener("click", function () {
          var on = seguir.getAttribute("aria-pressed") === "true";
          seguir.disabled = true;
          S.setFollow(row.id, !on).then(function (result) {
            seguir.disabled = false;
            if (!result.ok) return notaText(result.message);
            seguir.textContent = on ? "Seguir" : "Siguiendo";
            seguir.setAttribute("aria-pressed", on ? "false" : "true");
            notaText(on ? "Has dejado de seguir esta casa." : "Sigues esta casa.");
          });
        });
      }
      if (sellar && S) {
        sellar.addEventListener("click", function () {
          sellar.disabled = true;
          notaText("Comprobando que estás cerca de la casa…");
          S.seal(row.id).then(function (result) {
            sellar.disabled = false;
            notaText(result.message);
          });
        });
      }
      if (row.lat != null && row.lng != null) {
        var map = L.map("mapa-ficha", { scrollWheelZoom: false }).setView([row.lat, row.lng], 14);
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 18,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);
        L.marker([row.lat, row.lng], {
          icon: L.divIcon({
            className: "pin",
            html: '<div style="width:18px;height:18px;border-radius:99px;border:2px solid #fff;box-shadow:0 2px 6px rgba(40,20,20,.35);background:#1F5F8B"></div>',
            iconSize: [18, 18],
            iconAnchor: [9, 9]
          })
        }).addTo(map);
        setTimeout(function () { map.invalidateSize(); }, 80);
      }
    });
  }).catch(function () {
    root.innerHTML = "<p class=\"err\">No se ha podido cargar la ficha.</p>";
  });
})();
