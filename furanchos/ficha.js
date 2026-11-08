(function () {
  var D = window.RecunchosDatos;
  var root = document.getElementById("ficha");
  var id = new URLSearchParams(location.search).get("id");
  var current = null;

  function tr(key) {
    var I = window.RecunchosIdioma;
    return (I && I.t && I.t(key)) || "";
  }

  function reportHref(name) {
    var I = window.RecunchosIdioma;
    var ui = I && I.lang ? I.lang() : "gl";
    var body = "Ficha: " + (name || "") + "\nEnlace: " + location.href +
      "\nIdioma de la interfaz: " + ui + "\nTexto legal mostrado: es v2.1.5\nMotivo:\n";
    return "mailto:holarecunchos@hotmail.com?subject=" + encodeURIComponent("Denunciar") +
      "&body=" + encodeURIComponent(body);
  }

  function setReport(name) {
    var link = document.getElementById("denunciar");
    if (link) link.href = reportHref(name);
  }

  function show(html) {
    root.innerHTML = html;
  }

  if (!id) {
    show("<p class=\"err\">" + D.esc(tr("ficha.missingId")) + "</p>");
    setReport("");
    return;
  }

  function render(row, session) {
    document.title = row.name + " — Recunchos";
    setReport(row.name);
    var photo = D.photoUrl(row.cover_photo_id);
    var place = [row.municipality, row.comarca, row.province].filter(Boolean).join(" · ");
    var code = (function () {
      var label = D.statusLabel(row);
      if (label === "Abierto") return "abierto";
      if (label === "Abrimos") return "abrimos";
      if (label === "Cerrado") return "cerrado";
      return "";
    })();
    var today = D.todayHours(row);
    var statusClass = code === "abierto" || code === "abrimos" ? "open" : "";
    var statusText = code ? tr("status." + code) : tr("ficha.noToday");
    if (today) statusText += " · " + today;
    else if (!code) statusText = tr("ficha.noTodayHours");
    var wines = D.listText(row.wine_types);
    var food = D.listText(row.food).concat(D.listText(row.menu));
    var maps = D.mapsUrl(row);
    var dial = D.dialablePhone(row.phone);
    var phoneLine = row.phone ? D.formatPhone(row.phone) : tr("ficha.noPhone");
    var S = window.RecunchosSesion;
    var address = row.address || tr("ficha.noAddress");
    if (row.coords_approximate && row.address) address += tr("ficha.approx");
    var cover = photo
      ? '<img class="cover" alt="" src="' + D.esc(photo) + '">'
      : '<div class="cover-ph" aria-hidden="true">' + D.esc((row.name || "?").slice(0, 1)) + "</div>";
    var back = "/entrar/?next=" + encodeURIComponent(S ? S.safeNext(location.pathname + location.search) : "/");
    var actions = "";
    if (maps) actions += '<a href="' + D.esc(maps) + '" rel="noopener">' + D.esc(tr("ficha.arrive")) + "</a>";
    if (D.isGaliciaPlace(row)) {
      actions += session
        ? '<button type="button" class="outline" id="sellar">' + D.esc(tr("ficha.seal")) + "</button>"
        : '<a class="outline" href="' + D.esc(back) + '">' + D.esc(tr("ficha.seal")) + "</a>";
    }
    if (dial) actions += '<a class="outline" href="tel:' + D.esc(dial) + '">' + D.esc(tr("ficha.call")) + "</a>";
    actions += session
      ? '<button type="button" class="outline" id="seguir">' + D.esc(tr("ficha.follow")) + "</button>"
      : '<a class="outline" href="' + D.esc(back) + '">' + D.esc(tr("ficha.follow")) + "</a>";
    var season = row.season_label ? "<p class=\"soft\">" + D.esc(tr("ficha.season") + row.season_label) + "</p>" : "";
    show(
      cover +
      "<section><p class=\"kicker\">" + D.esc(row.local_type_label || "Furancho") + "</p>" +
      "<h2 style=\"font-size:1.8rem\">" + D.esc(row.name) + "</h2>" +
      "<p class=\"zone\">" + D.esc(place) + "</p>" +
      "<p class=\"status-line " + statusClass + "\">" + D.esc(statusText) + "</p>" +
      (actions ? '<div class="actions">' + actions + "</div>" : "") +
      '<p class="soft" id="accion-nota"></p>' +
      "</section>" +
      "<section class=\"block\"><h2>" + D.esc(tr("ficha.week")) + "</h2>" + D.hoursHtml(row) +
      (row.closed_note ? "<p class=\"soft\">" + D.esc(row.closed_note) + "</p>" : "") +
      season +
      "</section>" +
      "<section class=\"block\"><h2>" + D.esc(tr("ficha.address")) + "</h2><p>" + D.esc(address) + "</p><p class=\"soft\">" + D.esc(phoneLine) + "</p></section>" +
      "<section class=\"block\"><h2>" + D.esc(tr("ficha.wines").replace(/:\s*$/, "") + " / " + tr("ficha.tapas").replace(/:\s*$/, "")) + "</h2><p>" +
      D.esc(wines.length ? tr("ficha.wines") + wines.join(", ") : tr("ficha.noWines")) + "</p><p class=\"soft\">" +
      D.esc(food.length ? tr("ficha.tapas") + food.join(", ") : tr("ficha.noTapas")) + "</p></section>" +
      (row.description ? "<section class=\"block\"><h2>" + D.esc(tr("ficha.house")) + "</h2><p>" + D.esc(row.description) + "</p></section>" : "") +
      "<div class=\"mini-map\" id=\"mapa-ficha\" role=\"region\" aria-label=\"" + D.esc(tr("map.ficha")) + "\"></div>"
    );
    var nota = document.getElementById("accion-nota");
    var seguir = document.getElementById("seguir");
    var sellar = document.getElementById("sellar");
    function notaText(text) { if (nota) nota.textContent = text || ""; }
    if (seguir && S && session) {
      S.isFollowing(row.id).then(function (on) {
        seguir.textContent = on ? tr("ficha.following") : tr("ficha.follow");
        seguir.setAttribute("aria-pressed", on ? "true" : "false");
      });
      seguir.addEventListener("click", function () {
        var on = seguir.getAttribute("aria-pressed") === "true";
        seguir.disabled = true;
        S.setFollow(row.id, !on).then(function (result) {
          seguir.disabled = false;
          if (!result.ok) return notaText(result.message);
          seguir.textContent = on ? tr("ficha.follow") : tr("ficha.following");
          seguir.setAttribute("aria-pressed", on ? "false" : "true");
          notaText(on ? tr("follow.stopped") : tr("follow.now"));
        });
      });
    }
    if (sellar && S && session) {
      sellar.addEventListener("click", function () {
        sellar.disabled = true;
        notaText(tr("seal.checking"));
        S.seal(row.id).then(function (result) {
          sellar.disabled = false;
          notaText(result.message);
        });
      });
    }
    if (row.lat != null && row.lng != null && window.L) {
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
  }

  function load(session) {
    return D.loadOne(id).then(function (row) {
      if (!row) {
        show("<p class=\"err\">" + D.esc(tr("ficha.missing")) + "</p>");
        setReport("");
        return;
      }
      current = { row: row, session: session };
      render(row, session);
    });
  }

  var S = window.RecunchosSesion;
  (S ? S.verify() : Promise.resolve(null)).then(function (session) {
    return load(session);
  }).catch(function () {
    show("<p class=\"err\">" + D.esc(tr("ficha.fail")) + "</p>");
  });

  document.addEventListener("recunchos:idioma", function () {
    setReport(current && current.row ? current.row.name : "");
    if (!current) return;
    render(current.row, current.session);
  });
})();
