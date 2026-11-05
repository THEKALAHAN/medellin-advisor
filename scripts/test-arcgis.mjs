// Script TEMPORAL de conectividad con la API ArcGIS de la Alcaldía de Medellín.
// Uso: node scripts/test-arcgis.mjs
// Solo solicita el conteo de registros. Usa fetch nativo, sin proxies ni cabeceras modificadas.

const ENDPOINT =
  "https://www.medellin.gov.co/servidormapas/rest/services/vivienda_ciudad_terri/VM_Oferta_Comercial_Oime/MapServer/1/query";
const TIMEOUT_MS = 10_000;

const url = new URL(ENDPOINT);
url.search = new URLSearchParams({
  where: "1=1",
  returnCountOnly: "true",
  f: "json",
}).toString();

const start = performance.now();
const elapsed = () => `${Math.round(performance.now() - start)} ms`;

try {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  const body = await res.text();

  console.log(`URL:               ${url}`);
  console.log(`Código HTTP:       ${res.status} ${res.statusText}`);
  console.log(`Tiempo respuesta:  ${elapsed()}`);
  console.log(`Content-Type:      ${res.headers.get("content-type")}`);
  console.log(`CORS (A-C-A-O):    ${res.headers.get("access-control-allow-origin") ?? "(no presente)"}`);

  if (!res.ok) {
    console.error(`Error: respuesta no exitosa. Inicio del cuerpo:\n${body.slice(0, 300)}`);
    process.exitCode = 1;
  } else {
    const data = JSON.parse(body);
    if (data.error) {
      // ArcGIS puede devolver HTTP 200 con un objeto de error en el cuerpo.
      console.error(`Error ArcGIS: ${JSON.stringify(data.error)}`);
      process.exitCode = 1;
    } else if (typeof data.count === "number") {
      console.log(`Registros:         ${data.count}`);
    } else {
      console.error(`Error: respuesta sin campo "count": ${body.slice(0, 300)}`);
      process.exitCode = 1;
    }
  }
} catch (err) {
  const reason =
    err?.name === "TimeoutError"
      ? `timeout tras ${TIMEOUT_MS / 1000} s`
      : `${err?.name}: ${err?.message}${err?.cause ? ` (causa: ${err.cause.code ?? err.cause.message})` : ""}`;
  console.error(`Fallo de la petición tras ${elapsed()}: ${reason}`);
  process.exitCode = 1;
}
