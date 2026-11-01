(function () {
  var S = window.RecunchosSesion;
  S.verify().then(function (session) {
    if (!session) {
      location.replace("/entrar/?next=" + encodeURIComponent(S.safeNext("/perfil/")));
      return;
    }
    var name = S.displayName(session.user) || "Tu cuenta";
    document.getElementById("nombre").textContent = name;
    document.getElementById("correo").textContent = session.user.email || "";
  });
})();
