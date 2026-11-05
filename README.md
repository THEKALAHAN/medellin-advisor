# Nota:
Leer primero el README.md, ya que el documento actual fue realizado mediante un prompt para poder , mientras el documento mencionado fue redactado personalmente, allí hablo de todo lo que implicó el desarrollo de este proyecto, decisiones que tomé, tecnologías que utilicé y del uso de herramientas de IA. Este puede ser leído una vez se tenga el contexto del otro documento.

- [README principal — Historia, decisiones y desarrollo](./README_PRINCIPAL.md)
- [README técnico — Instalación, configuración y funcionamiento](./README_TECNICO.md)

# Medellin Advisors


Portal inmobiliario para explorar ofertas de venta y arriendo en Medellín. La búsqueda está inspirada en la de los portales premium: se filtra por operación, tipo de inmueble, comuna, barrio, precio, área, habitaciones, baños y estrato, con un listado y un mapa sincronizados y una ficha para cada propiedad.

Los datos provienen de una fuente pública oficial de la Alcaldía de Medellín. Son **ofertas históricas registradas en agosto de 2023**: el portal no las presenta como disponibles ni con precios actuales, y lo indica en todas las páginas.

## Contenido

- [Fuente de datos](#fuente-de-datos)
- [Tecnologías](#tecnologías)
- [Requisitos](#requisitos)
- [Instalación y ejecución local](#instalación-y-ejecución-local)
- [Variables de entorno](#variables-de-entorno)
- [Compilación](#compilación)
- [Despliegue en Vercel](#despliegue-en-vercel)
- [Arquitectura](#arquitectura)
- [Decisiones técnicas](#decisiones-técnicas)
- [Rendimiento](#rendimiento)
- [SEO y accesibilidad](#seo-y-accesibilidad)
- [Seguridad](#seguridad)
- [Compatibilidad](#compatibilidad)
- [Uso de inteligencia artificial](#uso-de-inteligencia-artificial)

## Fuente de datos

| | |
|---|---|
| Servicio | ArcGIS REST de la Alcaldía de Medellín, `VM_Oferta_Comercial_Oime` |
| Capa | `Investigaciones Internet` (ID 1), puntos en WGS84 |
| Documentación | <https://www.medellin.gov.co/servidormapas/rest/services/vivienda_ciudad_terri/VM_Oferta_Comercial_Oime/MapServer/1> |
| Registros | 28.425, de los cuales 28.357 se muestran (68 se excluyen por calidad de datos) |
| Periodo | `updated_at` entre el 18 y el 27 de agosto de 2023; la capa no se actualiza |

**Por qué esta fuente.** Es pública, oficial y está georreferenciada. Además, tiene los campos que necesita un portal inmobiliario: precio, área, habitaciones, baños, garajes, estrato, comuna, barrio y amenidades. Su API admite filtros, orden, paginación y estadísticas en el servidor, así que nunca hace falta descargar el conjunto completo.

**Reglas de tratamiento** (detalladas en `CLAUDE.md` §3.1):

- No se inventan propiedades, precios, ubicaciones, fotografías ni amenidades. La fuente no incluye imágenes; las tarjetas y las fichas usan ilustraciones identificadas como tales.
- Un valor `null` significa «no reportado» y nunca se convierte en 0.
- Una política declarativa de calidad excluye los precios de relleno (111.111, 1.111.111…) y los valores fuera de rango. Las cifras de esa política se publican en `GET /api/properties` → `meta.exclusionPolicy`.
- Nunca se solicitan ni se muestran `phone`, `agency` ni `description`, porque pueden contener datos personales.
- La interfaz no enlaza a los anuncios originales: el proyecto es demostrativo y esos enlaces de 2023 pueden ya no existir. El campo `sourceUrl` se conserva en la API interna, que no se ha modificado.
- No se excluyen registros por antigüedad: se muestran todos los que cumplen la política de calidad y el aviso de datos históricos acompaña cada página.

## Tecnologías

| Área | Elección |
|---|---|
| Framework | Next.js 16 (App Router, Cache Components, Partial Prefetching, Turbopack) |
| UI | React 19, TypeScript en modo estricto, Tailwind CSS 4 |
| Mapa | Leaflet 1.9 + react-leaflet 5 con teselas de OpenStreetMap, cargado solo en el cliente y bajo demanda |
| Tipografía | Cormorant Garamond y Manrope mediante `next/font` (autoalojadas) |
| Calidad | ESLint (`eslint-config-next`) y `tsc --noEmit` |
| Despliegue | Vercel |

No hay base de datos ni librería de componentes: la iconografía es SVG propio para no añadir dependencias.

## Requisitos

- Node.js **20.9 o superior** (lo exige Next.js 16). Verificado con Node 26.
- npm 10 o superior.
- Acceso a Internet hacia `www.medellin.gov.co` (datos) y `tile.openstreetmap.org` (mapa).

## Instalación y ejecución local

```bash
git clone <url-del-repositorio>
cd premium_propiedades
npm ci            # instala las versiones exactas de package-lock.json
npm run dev       # http://localhost:3000
```

Para comprobar la conexión con la fuente antes de arrancar:

```bash
node scripts/test-arcgis.mjs      # conteo de registros
node scripts/inspect-arcgis.mjs   # inspección de campos y valores
```

## Variables de entorno

Ninguna es obligatoria. El archivo `.env.example` sirve de plantilla: se copia a `.env.local`.

| Variable | Uso | Valor por defecto |
|---|---|---|
| `SITE_URL` | URL pública definitiva (p. ej. `https://www.dominio.com`). Se usa en canonical, Open Graph, `sitemap.xml` y `robots.txt`. | En Vercel se usa `VERCEL_PROJECT_PRODUCTION_URL` (automática); en local, `http://localhost:3000` |
| `ARCGIS_TIMEOUT_MS` | Tiempo máximo de cada consulta a ArcGIS (1–60000 ms) | `10000` |

## Compilación

```bash
npm run lint        # ESLint
npx tsc --noEmit    # comprobación de tipos
npm run build       # compilación de producción
npm run start       # sirve la compilación en http://localhost:3000
```

`/` se prerenderiza como página estática. `/propiedades` y `/propiedades/[id]` se prerenderizan parcialmente: se envía primero un esqueleto estático y después se transmiten los datos.

## Despliegue en Vercel

Proyecto **demostrativo**, sin uso comercial. Dominio previsto: `ptmedellinadvisorjplu.vercel.app`.

> Estado comprobado el 4 de noviembre de 2026: el subdominio responde `404 DEPLOYMENT_NOT_FOUND`, es decir, aún no está asignado a ningún despliegue. Todos los subdominios de `vercel.app` resuelven en DNS, así que eso no prueba que el nombre esté libre ni que pertenezca a esta cuenta. Se confirma al crear el proyecto.

### Configuración

| Ajuste | Valor |
|---|---|
| Framework Preset | Next.js (detección automática) |
| Install / Build / Output | Los predeterminados (`npm install`, `next build`, `.next`) |
| Node.js | 22.x o 24.x (Next.js 16 exige ≥ 20.9; probado en local con Node 26) |
| `vercel.json` | No es necesario |
| Variables obligatorias | Ninguna |

### Variables de entorno

| Variable | Cuándo | Valor |
|---|---|---|
| `SITE_URL` | Recomendable cuando el dominio esté confirmado | `https://ptmedellinadvisorjplu.vercel.app` |
| `ARCGIS_TIMEOUT_MS` | Solo si la latencia desde la región lo requiere | `10000` (por defecto) |

Sin `SITE_URL`, se usa `VERCEL_PROJECT_PRODUCTION_URL`, que Vercel define en la compilación. Si el proyecto se llama `ptmedellinadvisorjplu` y no se añade un dominio propio, el resultado es el mismo. `robots.txt` y `sitemap.xml` se generan durante la compilación: si se cambia `SITE_URL`, hay que volver a desplegar.

### Pasos

1. Subir el repositorio a GitHub (hoy no tiene commits ni remoto).
2. En Vercel: *Add New → Project → Import*, con el nombre de proyecto `ptmedellinadvisorjplu` para obtener ese subdominio.
3. *Settings → Domains*: confirmar que `ptmedellinadvisorjplu.vercel.app` está asignado a producción.
4. *Settings → Environment Variables*: añadir `SITE_URL` (Production) y volver a desplegar.
5. Ejecutar la lista de verificación posterior al despliegue.

### Verificación posterior al despliegue

- `/robots.txt` y `/sitemap.xml` usan `https://ptmedellinadvisorjplu.vercel.app`.
- ArcGIS responde desde Vercel: `/api/properties?operation=venta` devuelve 200 y `meta.complete: true`. Desde `curl` local el firewall del dominio devolvió 403; desde Node.js responde con normalidad.
- La caché del CDN distingue la query string:
  - `/api/properties?operation=venta` y `?operation=arriendo` devuelven totales distintos (13.862 y 14.495);
  - la segunda petición a cada URL trae `x-vercel-cache: HIT` con sus propios datos.
- Los errores no se cachean: las respuestas 400 llevan `Cache-Control: no-store`, por ejemplo `/api/properties?operation=xx`.
- Las cabeceras de seguridad están presentes (ver [Seguridad](#seguridad)) y el mapa carga teselas sin errores de CSP en la consola.
- Latencia desde la región de las funciones. Por defecto es Washington (`iad1`); ArcGIS está en Colombia. La región se cambia en *Settings → Functions*.

### Limitaciones conocidas

- La caché de `use cache` vive en memoria y no se comparte entre instancias serverless ni sobrevive a un despliegue. En Vercel, la protección frente a la latencia de ArcGIS es el CDN (`s-maxage` de 24 h).
- La primera consulta a ArcGIS tras un periodo de inactividad ha superado 10 s en dos ocasiones. Provoca un 504 que no se cachea; el siguiente intento suele responder.
- Las teselas son las estándar de OpenStreetMap, con su atribución visible. Su política de uso no admite tráfico intensivo: sirve para una demostración, no para un servicio con mucho tráfico.
- La barra de herramientas de Vercel en los despliegues de vista previa (`vercel.live`) queda bloqueada por la CSP. Producción no se ve afectada.

## Arquitectura

```
src/
├── app/                      Rutas (App Router)
│   ├── page.tsx              Inicio: buscador, destacadas y presentación
│   ├── propiedades/          Listado con filtros, mapa y paginación
│   │   └── [id]/             Ficha individual
│   ├── api/properties/       API interna JSON (listado y facetas)
│   ├── robots.ts, sitemap.ts, icon.svg, apple-icon.png, favicon.ico
│   └── not-found.tsx
├── components/               Componentes de interfaz (home, layout, map, property, search, ui)
├── lib/
│   ├── arcgis/               Cliente HTTP de ArcGIS (solo servidor): timeout, validación, errores tipados
│   ├── properties/           Dominio: listas blancas, validación de parámetros, WHERE seguro,
│   │                         política de calidad, normalización, servicio cacheado y facetas
│   ├── seo/                  Política de indexación del listado
│   ├── api/                  Respuestas JSON y Cache-Control
│   └── site.ts               URL pública y metadatos compartidos
├── proxy.ts                  404 real para identificadores de ficha mal formados
└── types/property.ts         Tipos del dominio y de las respuestas
```

Flujo de datos: **componentes de servidor → servicio (`lib/properties/service.ts`, con `use cache`) → cliente ArcGIS**.

- Los componentes visuales nunca llaman a ArcGIS directamente.
- La API interna (`/api/properties`, `/api/properties/facets`) usa los mismos servicios y desacopla al frontend del proveedor.
- Los parámetros de la URL se validan contra listas blancas antes de construir el `WHERE`: no se inserta texto libre en el SQL.

## Decisiones técnicas

- **Server Components por defecto.** Solo son de cliente:
  - el formulario de búsqueda (mejora progresiva: sin JavaScript funciona como `GET` nativo);
  - el menú móvil;
  - el explorador listado–mapa;
  - el mapa;
  - el enlace «Volver a los resultados».
- **Caché con Cache Components.** `use cache` + `cacheLife` + `cacheTag`, con la consulta ya resuelta como clave.
  - Los datos válidos se cachean 24 h; los fallos de la fuente, solo unos segundos.
  - Los errores cruzan la frontera de la caché como `{ ok, value | error }`, porque en producción Next.js oculta las excepciones lanzadas dentro de `use cache`.
- **Paginación en el servidor**, con orden estable (`objectid` como desempate). Las facetas se calculan con consultas estadísticas, sin descargar registros.
- **Mapa compatible con `<Activity>`.**
  - Next.js 16 oculta las páginas en lugar de desmontarlas.
  - `LeafletMapContainer` crea y destruye el mapa en el mismo efecto, para que no se reutilice una instancia destruida al volver al listado.
- **Volver a los resultados.**
  - Si la ficha se abrió desde el listado, se usa `router.back()`: conserva filtros, página, orden y desplazamiento, sin recargar.
  - Si se accedió por enlace directo o desde una pestaña nueva, enlaza a la última búsqueda de la sesión o a `/propiedades`.
- **Estados explícitos.** Carga (esqueletos con las mismas proporciones), vacío, página fuera de rango, parámetros inválidos y fuente no disponible, con un botón de reintento.

## Rendimiento

- JavaScript inicial: ~185 KB comprimidos con gzip, casi todo del runtime de React y Next.js.
  - El mapa (Leaflet, ~45 KB comprimidos con gzip) es un fragmento aparte que solo se descarga en escritorio o al abrir el modo Mapa en móvil.
- Fuentes autoalojadas con `next/font` (`display: swap`, precarga y ajuste de métricas para evitar saltos de diseño).
- Sin imágenes rasterizadas en las páginas. Las ilustraciones son SVG en línea, sin peticiones adicionales.
- `outFields` explícitos y páginas de 12, 24 o 48 registros.
- Las métricas de Lighthouse medidas se recogen en el informe de la fase de auditoría. Son mediciones de laboratorio, no datos de usuarios reales.

## SEO y accesibilidad

- **Metadatos.**
  - Título, descripción, canonical, Open Graph y Twitter Cards por página.
  - La imagen Open Graph es institucional (`public/og-image.png`), creada con el logotipo, la tipografía y la paleta del sitio.
- **Indexación del listado** (`src/lib/seo/listing.ts`).
  - Se indexan las combinaciones de operación, tipo y comuna, con su paginación.
  - Llevan `noindex, follow`:
    - el orden y el tamaño de página;
    - los rangos de precio o área, los mínimos de habitaciones o baños, el estrato y el barrio;
    - los parámetros inválidos;
    - los resultados vacíos y las páginas fuera de rango.
- **Fichas.** Las inexistentes o excluidas por calidad responden «Propiedad no encontrada» con `noindex`. Los identificadores mal formados responden con un 404 real.
- **`sitemap.xml`.** Incluye el inicio, el listado y las 44 búsquedas por operación y comuna (46 URL).
  - Las ~28.000 fichas no se listan: hacerlo exigiría una consulta nueva de identificadores en la capa de datos, que está cerrada.
  - Las fichas siguen siendo rastreables e indexables mediante los enlaces del listado.
- **Datos estructurados.** `WebSite` en el inicio y `BreadcrumbList` en el listado y las fichas. No se publica `Offer` ni `RealEstateListing`: las ofertas son históricas y esos tipos las presentarían como vigentes.
- **Accesibilidad.**
  - HTML semántico, encabezados jerárquicos y enlace «Saltar al contenido».
  - Foco visible y áreas táctiles de al menos 44 px.
  - Contraste AA en el texto y al menos 3:1 en el borde de los campos del formulario.
  - Marcadores del mapa operables con teclado; controles de zoom en español.
  - Animación de entrada del hero:
    - parte de una opacidad parcial, de modo que el titular es legible desde el primer fotograma;
    - solo anima `opacity` y `transform`;
    - se anula con `prefers-reduced-motion`.

## Seguridad

Cabeceras definidas en `next.config.ts` para todas las rutas:

| Cabecera | Valor |
|---|---|
| `Content-Security-Policy` | `default-src 'self'`; `img-src` admite las teselas de `tile.openstreetmap.org`; `frame-ancestors 'none'`, `object-src 'none'`, `form-action 'self'` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | Desactiva cámara, micrófono, geolocalización, pagos, USB y Topics |
| `X-Frame-Options` | `DENY` |

Además, `poweredByHeader: false`.

**Por qué la CSP no usa nonces.** Admite `'unsafe-inline'` en scripts y estilos, siguiendo la modalidad «sin nonces» de la guía de Next.js:
- los nonces obligan a renderizar todo de forma dinámica y son incompatibles con Partial Prerendering;
- Leaflet posiciona el mapa con estilos en línea.

En desarrollo se añaden `'unsafe-eval'` y WebSocket para la recarga en caliente.

**Otros aspectos:**
- No hay claves ni secretos: la fuente es pública y no requiere autenticación, y no existen variables `NEXT_PUBLIC_*`.
- HTTPS y HSTS los gestiona Vercel.

## Compatibilidad

Pruebas automatizadas sobre la compilación de producción, en navegadores de escritorio con emulación de viewport:

- **Navegadores:** Chrome for Testing 157 y Firefox.
- **Anchos:** 1440, 820 y 375 px.
- **Escenarios:** listado y mapa, filtros, paginación, navegación listado → ficha → regreso, fichas por URL directa, teclado y consola sin errores ni violaciones de CSP.

**No probado:**
- Safari/WebKit: el binario de WebKit de Playwright no se pudo instalar en el sistema de desarrollo (Arch Linux).
- Dispositivos físicos.

## Uso de inteligencia artificial

El proyecto se desarrolló con **Claude Code** (Anthropic) como asistente de programación, trabajando por etapas.

**Qué hizo el asistente:**

- consultar la API real antes de modelar los datos;
- proponer cada etapa antes de implementarla;
- escribir el código;
- ejecutar las comprobaciones (lint, tipos, compilación y pruebas en navegador).

**Qué quedó a cargo del autor:**

- los requisitos;
- la identidad visual;
- las restricciones sobre los datos (no inventar información, tratar `null` como «no reportado», no exponer datos de contacto);
- la revisión y aprobación de cada etapa.

Las reglas de trabajo con el asistente están en `CLAUDE.md`.
