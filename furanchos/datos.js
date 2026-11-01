(function (global) {
  var SUPABASE = "https://fwfwfbtzarmwalfaxelh.supabase.co";
  var KEY = "sb_publishable_uyool6N2lYnDmZ1cmcK8TQ_WmtMRdlU";
  var FIELDS = [
    "id", "name", "municipality", "comarca", "province", "address",
    "lat", "lng", "coords_approximate", "description", "wine_types", "food",
    "menu", "hours", "hours_note", "season_label", "today_status",
    "today_status_on", "closed", "closed_note", "cover_photo_id", "local_type_label",
    "phone", "autonomous_community", "local_type"
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

  function formatPhone(value) {
    return String(value || "").split("/").map(function (part) {
      var digits = part.replace(/\D/g, "");
      if (digits.length === 9) return digits.slice(0, 3) + " " + digits.slice(3, 6) + " " + digits.slice(6);
      return part.trim();
    }).filter(Boolean).join(" / ");
  }

  function dialablePhone(value) {
    var first = String(value || "").split(/[/,;]/)[0] || "";
    return first.replace(/[^\d+]/g, "");
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

  var SPAIN_COMMUNITIES = [
    { id: "asturias", name: "Asturias", localName: "Llagares", photo: "photos/stone.jpg", intro: "Llagares. La sidra nueva y las espichas se concentran de febrero a mayo. La visita suele pedirse con reserva." },
    { id: "pais-vasco", name: "País Vasco", localName: "Sidrerías", photo: "photos/cellar.jpg", intro: "Sidrerías. Temporada de txotx, de mediados de enero a abril o mayo. La sidra nueva se sirve en el caserío." },
    { id: "navarra", name: "Navarra", localName: "Sidrerías", photo: "photos/hills.jpg", intro: "Sidrerías. Temporada de enero a mayo. Cinco casas elaboran y guardan su propia sidra." },
    { id: "andalucia", name: "Andalucía", localName: "Mostos", photo: "photos/grapes.jpg", intro: "Mostos. De noviembre a la primavera. En Trebujena un bando municipal regula la venta temporal." },
    { id: "canarias", name: "Canarias", localName: "Guachinches", photo: "photos/vineyard.jpg", intro: "Guachinches. El viticultor vende el vino de su cosecha, como mucho cuatro meses al año, hasta que se acaba (Decreto 83/2013)." }
  ];

  function isGaliciaPlace(row) {
    var community = row.autonomous_community == null ? "Galicia" : row.autonomous_community;
    var kind = row.local_type == null ? "furancho" : row.local_type;
    return community === "Galicia" && kind === "furancho";
  }

  function placesInCommunity(list, name) {
    return list.filter(function (row) {
      return !isGaliciaPlace(row) && row.autonomous_community === name;
    });
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
    formatPhone: formatPhone,
    dialablePhone: dialablePhone,
    mapsUrl: mapsUrl,
    hoursHtml: hoursHtml,
    todayHours: todayHours,
    loadAll: loadAll,
    loadOne: loadOne,
    isGaliciaPlace: isGaliciaPlace,
    placesInCommunity: placesInCommunity,
    SPAIN_COMMUNITIES: SPAIN_COMMUNITIES
  };
})(window);
