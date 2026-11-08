(function (global) {
  var ZONES = [
    { zone: "O Morrazo", names: ["Bueu", "Cangas", "Cangas do Morrazo", "Marín", "Moaña"] },
    { zone: "Vigo", names: ["Baiona", "Fornelos de Montes", "Gondomar", "Mos", "Nigrán", "Pazos de Borbén", "O Porriño", "Redondela", "Soutomaior", "Vigo"] },
    { zone: "Pontevedra", names: ["Barro", "Campo Lameiro", "Cerdedo-Cotobade", "Cotobade", "A Lama", "Poio", "Ponte Caldelas", "Pontevedra", "Vilaboa"] },
    { zone: "O Salnés", names: ["Cambados", "O Grove", "A Illa de Arousa", "Meaño", "Meis", "Ribadumia", "Sanxenxo", "Vilagarcía de Arousa", "Vilanova de Arousa"] },
    { zone: "Caldas", names: ["Caldas de Reis", "Catoira", "Pontecesures", "Portas", "Valga"] },
    { zone: "O Baixo Miño", names: ["A Guarda", "O Rosal", "Tomiño", "Tui"] },
    { zone: "O Condado", names: ["Arbo", "Crecente", "Mondariz", "Mondariz-Balneario", "As Neves", "Salceda de Caselas", "Salvaterra de Miño"] },
    { zone: "A Paradanta", names: ["A Cañiza", "Covelo"] },
    { zone: "O Ribeiro", names: ["A Arnoia", "Arnoia", "Beade", "Carballeda de Avia", "Castrelo de Miño", "Cenlle", "Cortegada", "Leiro", "Melón", "Ribadavia"] },
    { zone: "Santiago", names: ["Ames", "Boqueixón", "Brión", "Santiago de Compostela", "Teo", "Val do Dubra", "Vedra"] },
    { zone: "Terra de Lemos", names: ["Bóveda", "Monforte de Lemos", "Pantón", "A Pobra do Brollón", "O Saviñao", "Sober"] },
    { zone: "Ourense", names: ["Ourense", "Barbadás", "Toén", "Coles", "Pereiro de Aguiar", "San Cibrao das Viñas"] },
    { zone: "Allariz-Maceda", names: ["Allariz", "Maceda"] },
    { zone: "A Limia", names: ["Xinzo de Limia"] },
    { zone: "Verín", names: ["Verín", "Monterrei"] },
    { zone: "Valdeorras", names: ["O Barco de Valdeorras", "A Rúa"] },
    { zone: "O Carballiño", names: ["O Carballiño", "Maside"] },
    { zone: "Celanova", names: ["Celanova"] },
    { zone: "A Coruña", names: ["A Coruña", "Arteixo", "Oleiros"] },
    { zone: "Ferrol", names: ["Ferrol", "Narón"] },
    { zone: "Lugo", names: ["Lugo", "Portomarín"] },
    { zone: "A Mariña", names: ["Viveiro", "Ribadeo", "Foz"] }
  ];
  var ZONE_ORDER = ["O Morrazo", "Vigo", "O Salnés", "Pontevedra", "O Baixo Miño", "O Condado", "O Ribeiro", "A Paradanta", "Santiago", "Terra de Lemos", "Caldas", "Ourense", "Allariz-Maceda", "A Limia", "Verín", "Valdeorras", "O Carballiño", "Celanova", "A Coruña", "Ferrol", "Lugo", "A Mariña", "Sin zona"];
  var lookup = {};
  function fold(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
  }
  ZONES.forEach(function (item) {
    item.names.forEach(function (name) { lookup[fold(name)] = item.zone; });
  });
  function zoneFor(municipality) {
    return lookup[fold(municipality)] || "Sin zona";
  }
  function compareZones(a, b) {
    var ia = ZONE_ORDER.indexOf(a);
    var ib = ZONE_ORDER.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  }
  function madridDate(date) {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  }
  function plusDays(iso, days) {
    var parts = iso.split("-");
    var date = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  }
  function inSeason(row, today) {
    if (!row.season_start || !row.season_end) return false;
    return row.season_start <= today && today <= row.season_end;
  }
  function announcedOpen(row, today) {
    var next = row.opens_on && row.opens_on > today ? row.opens_on : (row.season_start && row.season_start > today ? row.season_start : "");
    if (!next) return "";
    return next > plusDays(today, 16) ? "" : next;
  }
  function openNow(row, today) {
    if (row.today_status && String(row.today_status_on || "").slice(0, 10) === today) {
      if (row.today_status === "cerrado") return false;
      if (row.today_status === "abierto" || row.today_status === "abrimos") return true;
    }
    if (row.closed || row.listed_year) return false;
    return false;
  }
  function distanceKm(a, b) {
    if (a.lat == null || a.lng == null || b.lat == null || b.lng == null) return Infinity;
    var lat = (b.lat - a.lat) * Math.PI / 180;
    var lng = (b.lng - a.lng) * Math.PI / 180;
    var p1 = a.lat * Math.PI / 180;
    var p2 = b.lat * Math.PI / 180;
    var h = Math.sin(lat / 2) * Math.sin(lat / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(lng / 2) * Math.sin(lng / 2);
    return 12742 * Math.asin(Math.min(1, Math.sqrt(h)));
  }
  function list(value) {
    return Array.isArray(value) ? value : [];
  }
  function matches(row, filters, today, origin) {
    if (filters.province !== "all" && row.province !== filters.province) return false;
    if (filters.zone !== "all" && zoneFor(row.municipality) !== filters.zone) return false;
    if (filters.wine !== "all" && list(row.wine_types).indexOf(filters.wine) === -1) return false;
    if (filters.food !== "all" && list(row.food).indexOf(filters.food) === -1) return false;
    if (filters.maxPrice && (row.price_level == null || Number(row.price_level) > filters.maxPrice)) return false;
    if (filters.minRating && Number(row.rating || 0) < filters.minRating) return false;
    if (filters.openNow && !openNow(row, today)) return false;
    if (filters.opensSoon && !announcedOpen(row, today)) return false;
    if (filters.inSeason && !inSeason(row, today)) return false;
    if (filters.radiusKm != null && origin && distanceKm(origin, row) > filters.radiusKm) return false;
    var text = String(filters.text || "").trim().toLowerCase();
    if (!text) return true;
    var hay = [row.name, row.municipality, row.comarca, zoneFor(row.municipality), row.province, row.address]
      .concat(list(row.wine_types), list(row.food)).join(" ").toLowerCase();
    return hay.indexOf(text) !== -1;
  }
  function sortRecommended(rows) {
    var counts = {};
    rows.forEach(function (row) { counts[row.province] = (counts[row.province] || 0) + 1; });
    var fixed = ["Pontevedra", "A Coruña", "Ourense", "Lugo"];
    function rank(province) {
      if (province === "Pontevedra") return -100000;
      return -((counts[province] || 0) * 100) + (fixed.indexOf(province) < 0 ? 50 : fixed.indexOf(province));
    }
    return rows.slice().sort(function (a, b) {
      var byProvince = rank(a.province) - rank(b.province);
      if (byProvince) return byProvince;
      var byRating = Number(b.rating || 0) - Number(a.rating || 0);
      if (byRating) return byRating;
      var byCount = Number(b.review_count || 0) - Number(a.review_count || 0);
      if (byCount) return byCount;
      return String(a.name).localeCompare(String(b.name), "es");
    });
  }
  function sortDistance(rows, origin) {
    return rows.slice().sort(function (a, b) {
      var da = distanceKm(origin, a);
      var db = distanceKm(origin, b);
      if (da !== db) return da - db;
      return String(a.name).localeCompare(String(b.name), "es");
    });
  }
  function zonesIn(rows) {
    var seen = {};
    rows.forEach(function (row) { seen[zoneFor(row.municipality)] = true; });
    return Object.keys(seen).sort(compareZones);
  }
  global.RecunchosFiltros = {
    PROVINCES: ["A Coruña", "Lugo", "Ourense", "Pontevedra"],
    WINES: ["albariño", "ribeiro", "mencía", "godello", "treixadura", "condado"],
    FOODS: ["empanada", "polbo", "queixo", "chourizo", "raxo", "pementos", "tortilla", "caldo"],
    RADIUS: [5, 10, 25, 50],
    PONTEVEDRA: { lat: 42.431, lng: -8.6446, label: "Pontevedra" },
    zoneFor: zoneFor,
    madridDate: madridDate,
    matches: matches,
    sortRecommended: sortRecommended,
    sortDistance: sortDistance,
    zonesIn: zonesIn,
    distanceKm: distanceKm,
    blank: function () {
      return { text: "", province: "all", zone: "all", wine: "all", food: "all", maxPrice: null, minRating: null, openNow: false, opensSoon: false, inSeason: false, radiusKm: null };
    }
  };
})(window);
