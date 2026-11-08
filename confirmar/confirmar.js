(function () {
  var S = window.RecunchosSesion;
  var estado = document.getElementById("estado");
  var form = document.getElementById("clave");
  var error = document.getElementById("clave-error");
  var result = { ok: false, code: "missing" };

  function tr(key) {
    var I = window.RecunchosIdioma;
    return (I && I.t && I.t(key)) || "";
  }

  function messageKey() {
    if (result.saved) return "confirm.saved";
    if (result.ok && result.type === "recovery") return "confirm.recovery";
    if (result.ok) return "confirm.ok";
    if (result.code === "otp_expired" || result.code === "access_denied") return "confirm.expired";
    if (result.code === "pkce_unsupported") return "confirm.pkce";
    if (result.code === "missing") return "confirm.missing";
    if (result.code === "offline") return "err.offline";
    return "confirm.invalid";
  }

  function paint() {
    estado.textContent = tr(messageKey());
    form.hidden = !(result.ok && result.type === "recovery" && !result.saved);
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    error.hidden = true;
    var button = form.querySelector("button[type=submit]");
    button.disabled = true;
    S.updatePassword(form.password.value).then(function (response) {
      button.disabled = false;
      if (!response.ok) {
        error.textContent = response.message || tr(response.code === "offline" ? "err.offline" : "confirm.invalid");
        error.hidden = false;
        return;
      }
      result.saved = true;
      paint();
    });
  });

  function run() {
    S.applyCallback(location.hash, location.search).then(function (response) {
      result = response || { ok: false, code: "invalid" };
      paint();
    });
  }

  document.addEventListener("recunchos:idioma", paint);
  window.addEventListener("hashchange", run);
  run();
})();
