import { readFileSync } from "node:fs";
import vm from "node:vm";

const context = { window: {} };
context.window = context;
vm.createContext(context);
vm.runInContext(readFileSync(new URL("../furanchos/filtros.js", import.meta.url), "utf8"), context);
const F = context.RecunchosFiltros;
const clock = F.clockFrom(new Date("2026-11-08T13:00:00Z"));
if (clock.date !== "2026-11-08" || clock.weekday !== 0) throw new Error("clock " + JSON.stringify(clock));

function mark(row) {
  if (row.fixture !== "prueba") throw new Error("fixture sin marca de prueba: " + row.name);
  return row;
}
const blank = F.blank();
function run(rows, extra) {
  return F.outcome(rows.map(mark), Object.assign({}, blank, extra), clock, extra.origin || null);
}
const names = (result) => result.rows.map((row) => row.name);

const conDatos = [
  { fixture: "prueba", name: "Casa A", municipality: "Moaña", province: "Pontevedra", comarca: "", address: "", wine_types: ["albariño"], food: ["empanada"], price_level: 1, rating: 4.5, review_count: 3, season_start: "2026-11-01", season_end: "2026-11-30", opens_on: null, listed_year: null, closed: false, hours: [{ days: [0], open: "13:00", close: "17:00" }], today_status: null, lat: 42.29, lng: -8.73 },
  { fixture: "prueba", name: "Casa B", municipality: "Vigo", province: "Pontevedra", comarca: "", address: "", wine_types: ["godello"], food: ["polbo"], price_level: 3, rating: 3, review_count: 1, season_start: "2026-01-01", season_end: "2026-06-01", opens_on: "2026-11-20", listed_year: null, closed: false, hours: [{ days: [1], open: "13:00", close: "17:00" }], today_status: "cerrado", today_status_on: "2026-11-08", lat: 42.24, lng: -8.72 },
  { fixture: "prueba", name: "Casa C", municipality: "Lugo", province: "Lugo", comarca: "", address: "", wine_types: [], food: [], price_level: null, rating: 0, review_count: 0, season_start: null, season_end: null, opens_on: null, listed_year: 2026, closed: false, hours: [], hours_note: "texto libre, non horario", today_status: null, lat: 43.01, lng: -7.56 }
];

if (F.zoneFor("Moaña") !== "O Morrazo") throw new Error("zone");
if (JSON.stringify(names(run(conDatos, { province: "Pontevedra" }))) !== JSON.stringify(["Casa A", "Casa B"])) throw new Error("province");
if (names(run(conDatos, { zone: "O Morrazo" })).join() !== "Casa A") throw new Error("zone filter");
if (names(run(conDatos, { wine: "albariño", food: "empanada" })).join() !== "Casa A") throw new Error("wine food");
const combo = run(conDatos, { wine: "albariño", food: "polbo" });
if (combo.code !== "empty" || combo.rows.length !== 0) throw new Error("combo empty " + combo.code);
if (names(run(conDatos, { maxPrice: 1 })).join() !== "Casa A") throw new Error("price known");
if (run(conDatos, { maxPrice: 1 }).code !== "partial") throw new Error("price partial keeps unknown out of the discard pile");
if (names(run(conDatos, { minRating: 4 })).join() !== "Casa A") throw new Error("rating known");
if (F.openState(conDatos[0], clock) !== "open") throw new Error("hours open");
if (F.openState(conDatos[1], clock) !== "shut") throw new Error("today cerrado");
if (F.openState(conDatos[2], clock) !== "unknown") throw new Error("closed false and empty hours stay unknown");
const open = run(conDatos, { openNow: true });
if (names(open).join() !== "Casa A" || open.code !== "partial") throw new Error("open now " + open.code + names(open));
if (names(run(conDatos, { inSeason: true })).join() !== "Casa A") throw new Error("season known");
if (names(run(conDatos, { opensSoon: true })).join() !== "Casa B") throw new Error("soon");
if (names(run(conDatos, { text: "vigo" })).join() !== "Casa B") throw new Error("text");
if (run(conDatos, {}).code !== "ok" || run(conDatos, {}).rows.length !== 3) throw new Error("reset");
if (names(run(conDatos, { radiusKm: 5, origin: F.PONTEVEDRA })).indexOf("Casa C") !== -1) throw new Error("radius");
if (run([{ fixture: "prueba", name: "Nada", province: "Pontevedra", municipality: "Vigo", price_level: null, rating: 0, review_count: 0, hours: [], closed: false }], { province: "Ourense" }).code !== "ourense") throw new Error("ourense");

const catalogo = [
  { fixture: "prueba", name: "Sen prezo", province: "Pontevedra", municipality: "Poio", price_level: null, rating: 0, review_count: 0, hours: [], hours_note: "sábado 12 a 15", closed: false, listed_year: 2024, today_status: null, season_start: "2026-11-01", season_end: "2026-11-30", opens_on: null, lat: 42.43, lng: -8.64 },
  { fixture: "prueba", name: "Sen nota", province: "A Coruña", municipality: "A Coruña", price_level: null, rating: 0, review_count: 0, hours: [], closed: false, today_status: null, season_start: null, season_end: null, opens_on: null, lat: 43.37, lng: -8.4 }
];
const cov = F.coverage(catalogo, clock);
if (cov.price || cov.rating || cov.openNow || cov.pending) throw new Error("catalog coverage " + JSON.stringify(cov));
if (!cov.season) throw new Error("season dates are readable");
for (const extra of [{ maxPrice: 1 }, { minRating: 4 }, { openNow: true }]) {
  const result = run(catalogo, extra);
  if (result.code !== "missing" || result.rows.length !== 0) throw new Error("missing must not look like no matches " + JSON.stringify(extra) + result.code);
}
const soloCeros = { fixture: "prueba", name: "Ceros", province: "Lugo", municipality: "Lugo", price_level: null, rating: 0, review_count: 0, hours: [], closed: false };
if (F.coverage([soloCeros], clock).rating) throw new Error("a zero is not a published rating");
if (run([soloCeros], { minRating: 4 }).code !== "missing") throw new Error("zero rating is unknown");

const datos = readFileSync(new URL("../furanchos/datos.js", import.meta.url), "utf8");
if (datos.includes("community_status") || datos.includes("listing_plan") || datos.includes("select=*")) {
  throw new Error("la consulta pública no puede pedir community_status, listing_plan ni select *");
}
console.log("filtros checks ok", clock.date, "open", names(open).join(","));
