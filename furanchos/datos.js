(function (global) {
  var SUPABASE = "https://fwfwfbtzarmwalfaxelh.supabase.co";
  var KEY = "sb_publishable_uyool6N2lYnDmZ1cmcK8TQ_WmtMRdlU";
  var FIELDS = [
    "id", "name", "municipality", "comarca", "province", "address",
    "lat", "lng", "coords_approximate", "description", "wine_types", "food",
    "menu", "hours", "hours_note", "season_label", "today_status",
    "today_status_on", "closed", "closed_note", "cover_photo_id", "local_type_label"
  ].join(",");

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function listText(value) {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value.map(function (item) {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") return item.name || item.label || "";
        return "";
      }).filter(Boolean);
    }
    return [];
  }

  function statusLabel(row) {
    if (row.closed) return "Cerrado";
    var raw = (row.today_status || "").toLowerCase();
    if (!raw) return "";
    var stamp = row.today_status_on ? String(row.today_status_on).slice(0, 10) : "";
    var today = new Date();
    var iso = today.toISOString().slice(0, 10);
    if (stamp && stamp !== iso) return "";
    if (raw === "abierto") return "Abierto";
    if (raw === "abrimos") return "Abrimos";
    if (raw === "cerrado") return "Cerrado";
    return "";
  }

  function photoUrl(id) {
    if (!id || typeof id !== "string") return "";
    if (/^https?:\/\//.test(id)) return id;
    if (id.indexOf("/") === -1 && id.indexOf(".") === -1) return "";
    return SUPABASE + "/storage/v1/object/public/visit-media/" + id.replace(/^\//, "");
  }

  function mapsUrl(row) {
    if (row.lat != null && row.lng != null) {
      return "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(row.lat + "," + row.lng);
    }
    var dest = [row.address, row.municipality, row.province].filter(Boolean).join(", ");
    if (!dest) return "";
    return "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(dest);
  }

  var WEEK = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

  function slotLine(slot) {
    if (typeof slot === "string") return slot.trim();
    if (!slot || typeof slot !== "object") return "";
    var day = slot.day || slot.weekday || slot.dia || slot.label || "";
    var state = slot.status || slot.state || "";
    var from = slot.from || slot.open || slot.start || "";
    var to = slot.to || slot.close || slot.end || "";
    var time = from && to ? from + "–" + to : (from || to || "");
    return [day, state, time].filter(Boolean).join(" · ");
  }

  function hourLines(hours) {
    if (typeof hours === "string" && hours.trim()) return [hours.trim()];
    if (!Array.isArray(hours)) return [];
    return hours.map(slotLine).filter(Boolean);
  }

  function todayHours(row) {
    var lines = hourLines(row.hours);
    var today = WEEK[new Date().getDay()];
    var match = lines.find(function (line) {
      return line.toLocaleLowerCase("es").indexOf(today) === 0;
    });
    return match || "";
  }

  function hoursHtml(row) {
    var bits = hourLines(row.hours).map(esc);
    var note = row.hours_note ? "<p class=\"soft\">" + esc(row.hours_note) + "</p>" : "";
    if (!bits.length) return "<p class=\"soft\">" + esc(row.hours_note || "Horario no publicado.") + "</p>";
    return "<ul class=\"week\">" + bits.map(function (bit) { return "<li>" + bit + "</li>"; }).join("") + "</ul>" + note;
  }

  function loadAll() {
    var url = SUPABASE + "/rest/v1/furanchos?select=" + FIELDS + "&hidden=eq.false&order=name.asc&limit=1000";
    return fetch(url, {
      headers: { apikey: KEY, Authorization: "Bearer " + KEY }
    }).then(function (res) {
      if (!res.ok) throw new Error("No se pudo cargar el listado");
      return res.json();
    });
  }

  function loadOne(id) {
    var url = SUPABASE + "/rest/v1/furanchos?select=" + FIELDS + "&id=eq." + encodeURIComponent(id) + "&hidden=eq.false&limit=1";
    return fetch(url, {
      headers: { apikey: KEY, Authorization: "Bearer " + KEY }
    }).then(function (res) {
      if (!res.ok) throw new Error("No se pudo cargar la ficha");
      return res.json().then(function (rows) { return rows[0] || null; });
    });
  }

  global.RecunchosDatos = {
    esc: esc,
    listText: listText,
    statusLabel: statusLabel,
    photoUrl: photoUrl,
    mapsUrl: mapsUrl,
    hoursHtml: hoursHtml,
    todayHours: todayHours,
    loadAll: loadAll,
    loadOne: loadOne
  };
})(window);
