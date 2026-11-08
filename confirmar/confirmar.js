(function () {
  var S = window.RecunchosSesion;
  var estado = document.getElementById("estado");
  var form = document.getElementById("clave");
  var error = document.getElementById("clave-error");
  var result = { ok: false, code: "missing" };
  var shown = "";

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

  function showError(code) {
    shown = code || "";
    form.password.setAttribute("aria-invalid", shown === "err.passwordMin" || shown === "err.passwordMix" ? "true" : "false");
    form.password2.setAttribute("aria-invalid", shown === "err.passwordMatch" ? "true" : "false");
    if (!shown) {
      error.hidden = true;
      error.textContent = "";
      return;
    }
    error.textContent = tr(shown);
    error.hidden = false;
    (shown === "err.passwordMatch" ? form.password2 : form.password).focus();
  }

  function paint() {
    estado.textContent = tr(messageKey());
    var open = result.ok && result.type === "recovery" && !result.saved;
    var wasHidden = form.hidden;
    form.hidden = !open;
    if (open && wasHidden) form.password.focus();
    if (shown) error.textContent = tr(shown);
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (!form.password.value || form.password.value.length < 8) return showError("err.passwordMin");
    var letter = false;
    try { letter = /\p{L}/u.test(form.password.value); }
    catch (err) { letter = /[A-Za-zÁÉÍÓÚÜÑáéíóúüñÀÈÒÇàèòç]/.test(form.password.value); }
    if (!/[0-9]/.test(form.password.value) || !letter) return showError("err.passwordMix");
    if (form.password.value !== form.password2.value) return showError("err.passwordMatch");
    showError("");
    var button = form.querySelector("button[type=submit]");
    button.disabled = true;
    S.updatePassword(form.password.value).then(function (response) {
      button.disabled = false;
      if (!response.ok) return showError(response.code || "confirm.invalid");
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
