import { readFileSync } from "node:fs";
import vm from "node:vm";

const store = new Map();
const navigations = [];
const calls = [];
const context = {
  console,
  setTimeout,
  URL,
  URLSearchParams,
  history: {
    replaceState(_a, _b, url) {
      context.location.hash = "";
      context.location.search = "";
      context.location.href = "https://recunchos.github.io" + url;
    }
  },
  location: {
    origin: "https://recunchos.github.io",
    pathname: "/confirmar/",
    search: "?next=https://evil.example/phish",
    hash: "#access_token=token-1&refresh_token=refresh-1&expires_in=3600&token_type=bearer&type=signup",
    href: "https://recunchos.github.io/confirmar/?next=https://evil.example/phish#access_token=token-1"
  },
  localStorage: {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key)
  },
  document: {
    readyState: "loading",
    addEventListener() {},
    querySelectorAll() { return []; }
  },
  fetch(url, options) {
    calls.push({ url: String(url), options });
    if (String(url).includes("/auth/v1/user") && (!options || options.method == null)) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ id: "user-1", email: "ana@example.invalid" })
      });
    }
    return Promise.reject(new Error("unexpected fetch " + url));
  }
};
context.window = context;
vm.createContext(context);
vm.runInContext(readFileSync(new URL("../i18n.js", import.meta.url), "utf8"), context);
vm.runInContext(readFileSync(new URL("../idioma.js", import.meta.url), "utf8"), context);
vm.runInContext(readFileSync(new URL("../sesion.js", import.meta.url), "utf8"), context);

const S = context.RecunchosSesion;
if (S.confirmUrl !== "https://recunchos.github.io/confirmar/") throw new Error("confirm url");
const cases = [
  ["/app/", "/"],
  ["/app/explorar", "/"],
  ["https://evil.example/phish", "/"],
  ["//evil.example", "/"],
  ["/\\evil", "/"],
  ["javascript:alert(1)", "/"],
  ["/perfil/?ok=1", "/perfil/?ok=1"],
  ["/entrar/", "/entrar/"]
];
for (const [input, expected] of cases) {
  const got = S.webNext(input);
  if (got !== expected) throw new Error("webNext " + input + " -> " + got);
}

const result = await S.applyCallback(context.location.hash, context.location.search);
if (!result.ok || result.type !== "signup") throw new Error("callback result " + JSON.stringify(result));
if (context.location.hash || context.location.search) throw new Error("token left in url");
if (navigations.length) throw new Error("navigated");
const saved = JSON.parse(store.get("sb-fwfwfbtzarmwalfaxelh-auth-token"));
if (saved.access_token !== "token-1" || saved.user.id !== "user-1") throw new Error("session not saved");
if (calls.some((call) => /signup|recover|delete/i.test(call.url))) throw new Error("mail or delete call");
console.log("callback checks ok");
