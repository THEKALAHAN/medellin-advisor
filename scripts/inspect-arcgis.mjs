// Script TEMPORAL de inspección de la capa ArcGIS (estructura, calidad, paginación, rendimiento).
// Uso: node scripts/inspect-arcgis.mjs
// fetch nativo, sin dependencias. Nunca descarga los 28.425 registros completos.
// Por privacidad no imprime los campos "phone" ni "agency".

const LAYER =
  "https://www.medellin.gov.co/servidormapas/rest/services/vivienda_ciudad_terri/VM_Oferta_Comercial_Oime/MapServer/1";
const QUERY = `${LAYER}/query`;
const TIMEOUT_MS = 20_000;
const HIDDEN = new Set(["phone", "agency"]);

const CLAUDE_MD_FIELDS = [
  "price", "private_area_m2", "total_area_m2", "bedrooms_number", "bathrooms_number",
  "parking_number", "stratum", "commercial_type", "type", "status", "original_address",
  "original_neighborhood", "neighborhood_calculated", "commune_calculated", "latitude",
  "longitude", "description", "link", "swimming_pool", "gym", "elevator", "balcony",
  "air_conditioning", "created_at", "updated_at",
];

const failures = [];

async function get(url, params, { raw = false } = {}) {
  const u = new URL(url);
  u.search = new URLSearchParams(params).toString();
  const t0 = performance.now();
  const res = await fetch(u, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  const buf = await res.arrayBuffer();
  const ms = performance.now() - t0;
  if (!res.ok) throw new Error(`HTTP ${res.status} en ${u}`);
  if (raw) return { ms, bytes: buf.byteLength };
  const data = JSON.parse(new TextDecoder().decode(buf));
  if (data.error) throw new Error(`ArcGIS error ${JSON.stringify(data.error)} en ${u}`);
  return { data, ms, bytes: buf.byteLength };
}

async function safe(label, fn) {
  try {
    return await fn();
  } catch (e) {
    failures.push(`${label}: ${e.message}`);
    return undefined;
  }
}

const count = (where) =>
  safe(`count(${where})`, async () =>
    (await get(QUERY, { where, returnCountOnly: "true", f: "json" })).data.count);

const pct = (n, total) => (n === undefined ? "N/D" : `${((n / total) * 100).toFixed(2)} %`);
const section = (t) => console.log(`\n${"=".repeat(70)}\n${t}\n${"=".repeat(70)}`);
const redact = (attrs) => Object.fromEntries(Object.entries(attrs).filter(([k]) => !HIDDEN.has(k)));

// ---------------------------------------------------------------- 1. Metadatos
section("1. METADATOS (f=pjson)");
const meta = await safe("metadatos", async () => (await get(LAYER, { f: "pjson" })).data);
if (meta) {
  console.log({
    name: meta.name,
    description: meta.description,
    type: meta.type,
    geometryType: meta.geometryType,
    currentVersion: meta.currentVersion,
    maxRecordCount: meta.maxRecordCount,
    capabilities: meta.capabilities,
    supportedQueryFormats: meta.supportedQueryFormats,
    supportsStatistics: meta.supportsStatistics,
    supportsAdvancedQueries: meta.supportsAdvancedQueries,
    spatialReference: meta.extent?.spatialReference,
    extent: meta.extent && [meta.extent.xmin, meta.extent.ymin, meta.extent.xmax, meta.extent.ymax],
    displayField: meta.displayField,
    hasAttachments: meta.hasAttachments,
    copyrightText: meta.copyrightText,
  });
  console.log("advancedQueryCapabilities:", meta.advancedQueryCapabilities);
  const aliasDiff = meta.fields.filter((f) => f.alias !== f.name).length;
  const withDomain = meta.fields.filter((f) => f.domain).length;
  console.log(`\nCampos: ${meta.fields.length} | alias distintos del nombre: ${aliasDiff} | con domain: ${withDomain}`);
  console.table(meta.fields.map((f) => ({ name: f.name, type: f.type.replace("esriFieldType", ""), alias: f.alias, length: f.length ?? "" })));
}

// ---------------------------------------------------------------- 2. Registros
section("2. 10 REGISTROS (outFields=*, returnGeometry=true)");
const sample = await safe("muestra 10", async () =>
  (await get(QUERY, { where: "1=1", outFields: "*", returnGeometry: "true", resultRecordCount: "10", f: "json" })).data);
if (sample) {
  console.log(`features: ${sample.features.length} | exceededTransferLimit: ${sample.exceededTransferLimit} | SR: ${JSON.stringify(sample.spatialReference)}`);
  for (const f of sample.features.slice(0, 3)) console.log(JSON.stringify({ attributes: redact(f.attributes), geometry: f.geometry }));
  console.log("(Se muestran 3 de 10 completos; resumen de los 10:)");
  console.table(sample.features.map(({ attributes: a, geometry: g }) => ({
    oid: a.objectid, op: a.commercial_type, type: a.type, status: a.status, price: a.price,
    priv: a.private_area_m2, tot: a.total_area_m2, bed: a.bedrooms_number, bath: a.bathrooms_number,
    park: a.parking_number, gar: a.garages_number, str: a.stratum, comuna: a.commune_calculated,
    barrio: a.neighborhood_calculated, lat: a.latitude, geomY: g?.y,
  })));
}
if (meta) {
  const names = new Set(meta.fields.map((f) => f.name));
  const missing = CLAUDE_MD_FIELDS.filter((f) => !names.has(f));
  console.log(`\nCampos de CLAUDE.md presentes: ${CLAUDE_MD_FIELDS.length - missing.length}/${CLAUDE_MD_FIELDS.length}`);
  console.log(`Ausentes: ${missing.length ? missing.join(", ") : "ninguno"}`);
  console.log(`Campos extra no listados en CLAUDE.md: ${[...names].filter((n) => !CLAUDE_MD_FIELDS.includes(n)).join(", ")}`);
}

// ---------------------------------------------------------------- 3. Calidad
section("3. CALIDAD DE DATOS (returnCountOnly por condición)");
const total = await count("1=1");
console.log(`Total: ${total}`);

const numeric = ["price", "private_area_m2", "total_area_m2", "bedrooms_number", "bathrooms_number", "parking_number", "garages_number", "stratum"];
const textual = ["neighborhood_calculated", "commune_calculated", "type", "commercial_type", "status"];

const rows = [];
for (const f of numeric) {
  const [nulls, zeros, neg, pos] = await Promise.all([
    count(`${f} IS NULL`), count(`${f} = 0`), count(`${f} < 0`), count(`${f} > 0`),
  ]);
  rows.push({ campo: f, nulos: nulls, ceros: zeros, negativos: neg, "válidos(>0)": pos, "% válido": pct(pos, total) });
}
for (const f of textual) {
  const [nulls, empty, filled] = await Promise.all([
    // TRIM() no es soportado por este servidor (error 400); se usa comparación estándar con ''.
    count(`${f} IS NULL`), count(`${f} = ''`), count(`${f} IS NOT NULL AND ${f} <> ''`),
  ]);
  rows.push({ campo: f, nulos: nulls, "vacíos('')": empty, "válidos(texto)": filled, "% válido": pct(filled, total) });
}
// Coordenadas: no nulas, distintas de 0 y dentro de un rectángulo amplio del Valle de Aburrá.
const coordWhere = "latitude IS NOT NULL AND longitude IS NOT NULL AND latitude BETWEEN 6.0 AND 6.5 AND longitude BETWEEN -75.8 AND -75.3";
const [coordNull, coordZero, coordValid] = await Promise.all([
  count("latitude IS NULL OR longitude IS NULL"), count("latitude = 0 OR longitude = 0"), count(coordWhere),
]);
rows.push({ campo: "latitude+longitude", nulos: coordNull, ceros: coordZero, "válidos(>0)": coordValid, "% válido": pct(coordValid, total) });
console.table(rows);

const combos = {
  "precio>0 y área privada>0": "price > 0 AND private_area_m2 > 0",
  "anterior + coordenadas válidas": `price > 0 AND private_area_m2 > 0 AND ${coordWhere}`,
  "anterior + barrio": `price > 0 AND private_area_m2 > 0 AND ${coordWhere} AND neighborhood_calculated IS NOT NULL`,
  "private_area_m2 = total_area_m2": "private_area_m2 = total_area_m2",
  "RENT con precio > 50.000.000": "commercial_type = 'RENT' AND price > 50000000",
  "RENT con precio < 300.000": "commercial_type = 'RENT' AND price < 300000",
  "SELL con precio < 20.000.000": "commercial_type = 'SELL' AND price < 20000000",
  "SELL con precio > 50.000.000.000": "commercial_type = 'SELL' AND price > 50000000000",
  "área privada > 10.000 m²": "private_area_m2 > 10000",
  "área privada < 10 m² (>0)": "private_area_m2 > 0 AND private_area_m2 < 10",
  "APARTAMENTO/CASA sin habitaciones (null)": "type IN ('APARTAMENTO','CASA') AND bedrooms_number IS NULL",
  "APARTAMENTO/CASA con 0 habitaciones": "type IN ('APARTAMENTO','CASA') AND bedrooms_number = 0",
  "status NULL y operación RENT": "status IS NULL AND commercial_type = 'RENT'",
};
const comboRows = [];
for (const [label, where] of Object.entries(combos)) {
  const n = await count(where);
  comboRows.push({ condición: label, registros: n, "%": pct(n, total) });
}
console.table(comboRows);

// ---------------------------------------------------------------- 4. Valores distintos
section("4. VALORES DISTINTOS (groupByFieldsForStatistics)");
const groupStats = JSON.stringify([{ statisticType: "count", onStatisticField: "objectid", outStatisticFieldName: "n" }]);
for (const f of ["type", "tipo_inmueble", "commercial_type", "tipo_comercio", "status", "category", "stratum", "commune_calculated", "codigo_comuna"]) {
  const r = await safe(`groupBy ${f}`, async () =>
    (await get(QUERY, { where: "1=1", groupByFieldsForStatistics: f, outStatistics: groupStats, orderByFields: "n DESC", f: "json" })).data);
  if (!r) continue;
  console.log(`\n${f} (${r.features.length} valores):`);
  console.log(r.features.map((x) => `${JSON.stringify(x.attributes[f])}: ${x.attributes.n}`).join(" | "));
}
const nbh = await safe("distinct barrios", async () =>
  (await get(QUERY, { where: "1=1", outFields: "neighborhood_calculated", returnDistinctValues: "true", returnCountOnly: "true", returnGeometry: "false", f: "json" })).data.count);
console.log(`\nneighborhood_calculated: ${nbh} valores distintos (solo conteo)`);

// ---------------------------------------------------------------- 5. Paginación
section("5. PAGINACIÓN");
const page = (offset, n, order = "objectid ASC", extra = {}) =>
  get(QUERY, { where: "1=1", outFields: "objectid,price", returnGeometry: "false", orderByFields: order, resultOffset: String(offset), resultRecordCount: String(n), f: "json", ...extra });

await safe("paginación offset", async () => {
  const [p1, p2] = await Promise.all([page(0, 5), page(5, 5)]);
  const a = p1.data.features.map((f) => f.attributes.objectid);
  const b = p2.data.features.map((f) => f.attributes.objectid);
  console.log(`resultOffset=0 → ${a.join(",")} | resultOffset=5 → ${b.join(",")}`);
  console.log(`Sin solapamiento: ${!a.some((x) => b.includes(x))} | resultRecordCount respetado: ${a.length === 5 && b.length === 5} | exceededTransferLimit: ${p1.data.exceededTransferLimit}`);
});
await safe("orderByFields", async () => {
  const d = await page(0, 5, "price DESC, objectid ASC");
  const prices = d.data.features.map((f) => f.attributes.price);
  console.log(`orderByFields=price DESC → ${prices.join(", ")} | descendente: ${prices.every((p, i) => i === 0 || prices[i - 1] >= p)}`);
  const last = await page(total - 3, 10);
  console.log(`Última página (offset ${total - 3}, pide 10) → ${last.data.features.length} registros, exceededTransferLimit: ${last.data.exceededTransferLimit ?? "(ausente)"}`);
});
await safe("returnIdsOnly", async () => {
  const r = await get(QUERY, { where: "commercial_type = 'SELL'", returnIdsOnly: "true", f: "json" });
  console.log(`returnIdsOnly (SELL) → ${r.data.objectIds.length} ids, objectIdFieldName=${r.data.objectIdFieldName}, ${(r.bytes / 1024).toFixed(1)} KB, ${Math.round(r.ms)} ms`);
});
await safe("límite máximo", async () => {
  const r = await page(0, 20000, "objectid ASC");
  console.log(`resultRecordCount=20000 (solo objectid,price) → devolvió ${r.data.features.length}, exceededTransferLimit: ${r.data.exceededTransferLimit}, ${(r.bytes / 1024).toFixed(0)} KB`);
  const r2 = await get(QUERY, { where: "1=1", outFields: "objectid", returnGeometry: "false", f: "json" });
  console.log(`Sin resultRecordCount → devolvió ${r2.data.features.length}, exceededTransferLimit: ${r2.data.exceededTransferLimit}`);
});

// ---------------------------------------------------------------- 6. Rendimiento
section("6. RENDIMIENTO (3 repeticiones secuenciales, mediana)");
const CARD_FIELDS = "objectid,commercial_type,type,price,private_area_m2,bedrooms_number,bathrooms_number,garages_number,stratum,neighborhood_calculated,commune_calculated";
const perfCases = {
  "conteo": { where: "1=1", returnCountOnly: "true", f: "json" },
  "10 registros, *, sin geometría": { where: "1=1", outFields: "*", returnGeometry: "false", resultRecordCount: "10", f: "json" },
  "10 registros, *, con geometría": { where: "1=1", outFields: "*", returnGeometry: "true", resultRecordCount: "10", f: "json" },
  "100 registros, *, sin geometría": { where: "1=1", outFields: "*", returnGeometry: "false", resultRecordCount: "100", f: "json" },
  "100 registros, *, con geometría": { where: "1=1", outFields: "*", returnGeometry: "true", resultRecordCount: "100", f: "json" },
  "100 registros, campos de tarjeta, con geometría": { where: "1=1", outFields: CARD_FIELDS, returnGeometry: "true", resultRecordCount: "100", f: "json" },
  "24 registros filtrados+ordenados (SELL, Laureles, price DESC)": { where: "commercial_type='SELL' AND commune_calculated='LAURELES'", outFields: CARD_FIELDS, returnGeometry: "true", orderByFields: "price DESC, objectid ASC", resultRecordCount: "24", f: "json" },
  "1000 puntos para mapa (objectid,price, geojson)": { where: "1=1", outFields: "objectid,price", returnGeometry: "true", resultRecordCount: "1000", f: "geojson" },
  "facetas: groupBy commune_calculated": { where: "1=1", groupByFieldsForStatistics: "commune_calculated", outStatistics: groupStats, f: "json" },
};
const perfRows = [];
for (const [label, params] of Object.entries(perfCases)) {
  const times = [];
  let bytes = 0;
  for (let i = 0; i < 3; i++) {
    const r = await safe(`perf ${label}`, () => get(QUERY, params, { raw: true }));
    if (r) { times.push(r.ms); bytes = r.bytes; }
  }
  times.sort((a, b) => a - b);
  perfRows.push({
    consulta: label,
    "mediana ms": times.length ? Math.round(times[Math.floor(times.length / 2)]) : "N/D",
    "min–max ms": times.length ? `${Math.round(times[0])}–${Math.round(times.at(-1))}` : "N/D",
    KB: (bytes / 1024).toFixed(1),
  });
}
console.table(perfRows);

// ---------------------------------------------------------------- Fallos
section("CONSULTAS QUE NO PUDIERON COMPLETARSE");
console.log(failures.length ? failures.join("\n") : "Ninguna");
