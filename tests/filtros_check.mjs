import { readFileSync } from "node:fs";
import vm from "node:vm";

const context = { window: {} };
context.window = context;
vm.createContext(context);
vm.runInContext(readFileSync(new URL("../furanchos/filtros.js", import.meta.url), "utf8"), context);
const F = context.RecunchosFiltros;
const today = "2026-11-08";
const rows = [
  { name: "Casa A", municipality: "Moaña", province: "Pontevedra", comarca: "", address: "", wine_types: ["albariño"], food: ["empanada"], price_level: 1, rating: 4.5, review_count: 3, season_start: "2026-11-01", season_end: "2026-11-30", opens_on: null, listed_year: null, closed: false, lat: 42.29, lng: -8.73 },
  { name: "Casa B", municipality: "Vigo", province: "Pontevedra", comarca: "", address: "", wine_types: ["godello"], food: ["polbo"], price_level: 3, rating: 3, review_count: 1, season_start: "2026-01-01", season_end: "2026-06-01", opens_on: "2026-11-20", listed_year: 2026, closed: false, lat: 42.24, lng: -8.72 },
  { name: "Casa C", municipality: "Lugo", province: "Lugo", comarca: "", address: "", wine_types: [], food: [], price_level: null, rating: 0, review_count: 0, season_start: "2026-12-01", season_end: "2027-03-01", opens_on: null, listed_year: 2026, closed: false, lat: 43.01, lng: -7.56 }
];
const blank = F.blank();
function run(extra) {
  const filters = Object.assign({}, blank, extra);
  return rows.filter((row) => F.matches(row, filters, today, extra.origin || null)).map((row) => row.name);
}
if (F.zoneFor("Moaña") !== "O Morrazo") throw new Error("zone");
if (JSON.stringify(run({ province: "Pontevedra" })) !== JSON.stringify(["Casa A", "Casa B"])) throw new Error("province");
if (JSON.stringify(run({ zone: "O Morrazo" })) !== JSON.stringify(["Casa A"])) throw new Error("zone filter");
if (JSON.stringify(run({ wine: "albariño", food: "empanada" })) !== JSON.stringify(["Casa A"])) throw new Error("wine food");
if (run({ wine: "albariño", food: "polbo" }).length !== 0) throw new Error("combo empty");
if (JSON.stringify(run({ maxPrice: 1 })) !== JSON.stringify(["Casa A"])) throw new Error("price");
if (run({ minRating: 4 }).join() !== "Casa A") throw new Error("rating");
if (run({ inSeason: true }).join() !== "Casa A") throw new Error("season");
if (run({ opensSoon: true }).join() !== "Casa B") throw new Error("soon");
if (run({ text: "vigo" }).join() !== "Casa B") throw new Error("text");
const ordered = F.sortRecommended(rows).map((row) => row.name);
if (ordered[0] === "Casa C") throw new Error("pontevedra should lead " + ordered);
if (run(blank).length !== 3) throw new Error("reset");
const far = run({ radiusKm: 5, origin: F.PONTEVEDRA });
if (far.indexOf("Casa C") !== -1) throw new Error("radius should drop Lugo");
console.log("filtros checks ok", ordered.join(","));
