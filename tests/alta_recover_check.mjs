import { readFileSync } from "node:fs";
import vm from "node:vm";

const calls = [];
let mock = { status: 200, json: {}, reject: false, badJson: false };
const context = {
  console,
  setTimeout,
  URL,
  URLSearchParams,
  atob,
  history: { replaceState() { context.location.hash = ""; context.location.search = ""; } },
  location: {
    origin: "https://recunchos.github.io",
    pathname: "/crear-cuenta/",
    search: "",
    hash: "",
    href: "https://recunchos.github.io/crear-cuenta/"
  },
  localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
  document: {
    documentElement: { dataset: {} },
    readyState: "loading",
    addEventListener() {},
    querySelector() { return null; },
    querySelectorAll() { return []; }
  },
  fetch(url, options) {
    calls.push({
      url: String(url),
      method: (options && options.method) || "GET",
      body: options && options.body
    });
    if (mock.reject) return Promise.reject(new Error("network"));
    return Promise.resolve({
      ok: mock.status >= 200 && mock.status < 300,
      status: mock.status,
      json: async () => {
        if (mock.badJson) throw new Error("bad json");
        return mock.json;
      }
    });
  }
};
context.window = context;
vm.createContext(context);
for (const file of ["i18n.js", "idioma.js", "sesion.js"]) {
  vm.runInContext(readFileSync(new URL("../" + file, import.meta.url), "utf8"), context);
}
const S = context.RecunchosSesion;
const t = context.RecunchosIdioma.t;
const fields = {
  name: "Proba interna Recunchos",
  email: "ensaio@example.invalid",
  password: "Abcdefghij1zzzzzzzzz",
  municipality: "Proba interna",
  accountKind: "comensal",
  ageConfirmed: true,
  termsAccepted: true,
  privacyAcknowledged: true
};
function ui(result) {
  if (!result.ok) return t(result.code || "err.signupFail");
  if (result.confirmEmail) return t(result.code || "err.confirmEmail");
  return "redirect";
}
async function run(spec) {
  mock = { status: 200, json: {}, reject: false, badJson: false, ...spec };
  calls.length = 0;
  return S.signUp(fields);
}
const realUser = {
  id: "11111111-1111-1111-1111-111111111111",
  aud: "authenticated",
  email: "ensaio@example.invalid",
  email_confirmed_at: null,
  identities: [{ id: "id-1", provider: "email" }]
};
let result = await run({ json: realUser });
if (!result.ok || !result.confirmEmail) throw new Error("top-level user must ask to confirm, not fail");
if (calls.length !== 1) throw new Error("signup must not retry");
if (!ui(result).includes("Revisa o correo")) throw new Error("confirm copy missing");

result = await run({ json: { user: realUser, session: null } });
if (!result.confirmEmail) throw new Error("wrapped user");

result = await run({ json: { id: realUser.id, aud: "authenticated", identities: [] } });
if (result.ok || result.code !== "err.existsConfirm") throw new Error("empty identities are not a new success");
if (calls.length !== 1) throw new Error("duplicate shape must not retry");

result = await run({ status: 500, json: { msg: "Error sending confirmation email", code: "unexpected_failure" } });
if (result.ok || result.confirmEmail || result.code !== "err.signupFail") throw new Error("server error became success");
if (ui(result).includes(result.message) && ui(result).includes("Error sending")) throw new Error("internal text leaked");
if (!ui(result).includes("non envíes o formulario outra vez")) throw new Error("truthful retry warning missing");

result = await run({ reject: true });
if (result.code !== "err.offline") throw new Error("network must stay offline, not signupFail");

calls.length = 0;
result = await S.signUp(Object.assign({}, fields, { ageConfirmed: false }));
if (result.code !== "err.age" || calls.length !== 0) throw new Error("age checkbox must block the request");

mock = { status: 200, json: {}, reject: false, badJson: false };
calls.length = 0;
result = await S.requestRecovery("ensaio@example.invalid");
if (!result.ok || calls.length !== 1) throw new Error("recovery request");
const sent = new URL(calls[0].url);
if (sent.pathname !== "/auth/v1/recover") throw new Error("recover path");
if (sent.searchParams.get("redirect_to") !== "https://recunchos.github.io/confirmar/") throw new Error("redirect_to query");
const body = JSON.parse(calls[0].body);
if (body.redirect_to || body.email !== "ensaio@example.invalid") throw new Error("recover body " + calls[0].body);

context.location.hash = "#access_token=token-recovery&refresh_token=r&expires_in=3600&type=recovery";
context.location.search = "";
context.fetch = function (url) {
  if (String(url).includes("/auth/v1/user")) {
    return Promise.resolve({ ok: true, status: 200, json: async () => ({ id: realUser.id, email: realUser.email }) });
  }
  return Promise.reject(new Error("unexpected " + url));
};
result = await S.applyCallback(context.location.hash, "");
if (!result.ok || result.type !== "recovery") throw new Error("recovery callback");
if (context.location.hash) throw new Error("recovery token left in the url");

if (S.webNext("https://evil.example/x") !== "/" || S.webNext("/app/eliminar-cuenta") !== "/") {
  throw new Error("redirect list");
}
console.log("alta recover checks ok");
