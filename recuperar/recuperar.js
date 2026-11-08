(function () {
  var S = window.RecunchosSesion;
  var form = document.getElementById("form");
  var error = document.getElementById("error");
  var ok = document.getElementById("ok");
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    error.hidden = true;
    ok.hidden = true;
    var button = form.querySelector("button[type=submit]");
    button.disabled = true;
    S.requestRecovery(form.email.value).then(function (result) {
      button.disabled = false;
      var I = window.RecunchosIdioma;
      var tr = function (key) { return (I && I.t && I.t(key)) || ""; };
      if (!result.ok) {
        var key = result.code === "email" ? "err.email" : result.code === "rate" ? "err.rate" : result.code === "offline" ? "err.offline" : "recover.fail";
        error.textContent = tr(key);
        error.hidden = false;
        return;
      }
      ok.textContent = tr("recover.sent");
      ok.hidden = false;
      form.querySelectorAll("input, button").forEach(function (el) { el.disabled = true; });
    });
  });
})();
