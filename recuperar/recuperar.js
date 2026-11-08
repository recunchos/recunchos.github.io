(function () {
  var S = window.RecunchosSesion;
  var form = document.getElementById("form");
  var error = document.getElementById("error");
  var ok = document.getElementById("ok");
  var shown = "";
  var okShown = false;

  function tr(key) {
    var I = window.RecunchosIdioma;
    return (I && I.t && I.t(key)) || "";
  }

  function emailOk(value) {
    var email = String(value || "").trim();
    return email.includes("@") && email.includes(".") && email.charAt(0) !== "@" && email.slice(-1) !== "@";
  }

  function show(code) {
    shown = code || "";
    okShown = false;
    ok.hidden = true;
    form.email.setAttribute("aria-invalid", shown === "err.email" ? "true" : "false");
    if (!shown) {
      error.hidden = true;
      error.textContent = "";
      return;
    }
    error.textContent = tr(shown);
    error.hidden = false;
    if (shown === "err.email") form.email.focus();
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (!emailOk(form.email.value)) return show("err.email");
    show("");
    var button = form.querySelector("button[type=submit]");
    button.disabled = true;
    S.requestRecovery(form.email.value).then(function (result) {
      button.disabled = false;
      if (!result.ok) {
        var key = result.code === "email" ? "err.email" : result.code === "rate" ? "err.rate" : result.code === "offline" ? "err.offline" : "recover.fail";
        return show(key);
      }
      shown = "";
      okShown = true;
      ok.textContent = tr("recover.sent");
      ok.hidden = false;
      form.email.setAttribute("aria-invalid", "false");
      form.querySelectorAll("input, button").forEach(function (el) { el.disabled = true; });
    });
  });
  document.addEventListener("recunchos:idioma", function () {
    if (shown) error.textContent = tr(shown);
    if (okShown) ok.textContent = tr("recover.sent");
  });
})();
