# CLAUDE.md — Medellín Real Estate

## 1. Contexto del proyecto

Estamos construyendo una aplicación web inmobiliaria para una prueba técnica de selección laboral.

El objetivo es crear un portal inmobiliario moderno, rápido, responsive y optimizado para buscadores, inspirado en la experiencia de búsqueda de Airbnb.

La aplicación presentará información inmobiliaria real de Medellín utilizando una API pública de la Alcaldía de Medellín.

El producto debe parecer una aplicación inmobiliaria profesional, no un dashboard administrativo ni una plantilla genérica.

## 2. Stack tecnológico

- Next.js con App Router.
- React.
- TypeScript en modo estricto.
- Tailwind CSS.
- ESLint.
- shadcn/ui para componentes cuando aporten valor.
- Lucide React para iconografía.
- ArcGIS REST API como fuente de datos.
- Leaflet y OpenStreetMap para el mapa interactivo, si se implementa.
- Git y GitHub para control de versiones.
- Vercel para despliegue.

No instalar dependencias innecesarias.

Antes de instalar cualquier dependencia, explicar brevemente su utilidad.

## 3. Fuente de datos oficial

API:

https://www.medellin.gov.co/servidormapas/rest/services/vivienda_ciudad_terri/VM_Oferta_Comercial_Oime/MapServer/1/query

Documentación:

https://www.medellin.gov.co/servidormapas/rest/services/vivienda_ciudad_terri/VM_Oferta_Comercial_Oime/MapServer/1

Capa seleccionada: Investigaciones Internet (ID: 1).

Es una capa geográfica de puntos que contiene información de ofertas inmobiliarias.

Campos identificados en la documentación:

- price
- private_area_m2
- total_area_m2
- bedrooms_number
- bathrooms_number
- parking_number
- stratum
- commercial_type
- type
- status
- original_address
- original_neighborhood
- neighborhood_calculated
- commune_calculated
- latitude
- longitude
- description
- link
- swimming_pool
- gym
- elevator
- balcony
- air_conditioning
- created_at
- updated_at

IMPORTANTE:

Antes de implementar la integración, consultar la API y verificar los registros reales, sus valores, formatos y disponibilidad.

No asumir que todos los campos tienen valores.

No inventar propiedades, precios, ubicaciones, fotografías ni características.

No confundir valores nulos con valores iguales a cero.

Respetar los nombres y significados originales de los campos.

### 3.1 Hallazgos verificados de la API (consultas reales, noviembre de 2026)

Datos de la capa:

- 28.425 registros. 28.163 tienen precio, área, coordenadas y barrio.
- Datos históricos: `updated_at` entre el 18 y el 27 de agosto de 2023 (`year` = 2023 salvo un registro). La capa no se actualiza.
- ArcGIS Server 11.5, coordenadas WGS84 (wkid 4326), 85 campos, sin `domain` y con alias iguales al nombre.
- `maxRecordCount` = 10.000 por petición. Soporta `resultOffset`, `resultRecordCount`, `orderByFields` (incluida la expresión `price/private_area_m2`), `returnIdsOnly`, `groupByFieldsForStatistics`, `returnDistinctValues`, GeoJSON y PBF.
- SQL admitido en `where`: operadores estándar, `IN`, `NOT (...)`, `LIKE`, `UPPER()` y aritmética. `TRIM()` NO está soportado (error 400).
- `orderByFields` y `outStatistics` aceptan expresiones `CASE WHEN ... END` (verificado). Los alias de estadísticas vuelven en minúsculas.
- `/query` acepta POST (form-urlencoded); el cliente lo usa para no depender de la longitud de la URL.
- Desde Node.js responde HTTP 200 con `Access-Control-Allow-Origin: *`. `curl` recibió 403 del firewall del dominio. Desde Vercel aún no está verificado.
- Latencia habitual: conteo ~70–130 ms; 24 registros con campos explícitos ~130 ms; facetas 120–360 ms por consulta. La primera petición tras un periodo de inactividad puede superar 10 s (observado dos veces): provoca un 504 que no se cachea.
- No hay fotografías ni adjuntos (`hasAttachments: false`). Nunca inventar imágenes.

Campos a utilizar:

- Área principal: `private_area_m2`. `total_area_m2` es igual en el 99,93 % de los registros.
- Garajes: `garages_number`. `parking_number` es NULL en el 100 % de los registros: no usarlo.
- Etiquetas legibles: `tipo_inmueble` y `tipo_comercio`.
- `status` solo aplica a ventas (NULL en todos los arriendos; USADO 13.861 y NUEVO 17). No se usa como filtro.
- Nunca solicitar ni exponer `phone` ni `agency`. Las descripciones pueden contener datos de contacto.

Disponibilidad (sobre 28.425):

| Campo | NULL | 0 | Válido |
|---|---|---|---|
| price | 0 | 0 | 100 % |
| private_area_m2 | 0 | 20 | 99,93 % |
| bedrooms_number | 8.169 (todos no residenciales) | 259 | 70,35 % |
| bathrooms_number | 1.357 | 1.450 | 90,12 % |
| garages_number | 9.516 | 0 | 66,52 % |
| stratum | 78 | 166 | 99,14 % (valores 0–7; el 0 y el 7 no están documentados) |
| commune_calculated / neighborhood_calculated | 243 | — | 99,15 % (sin comuna = sin códigos) |
| coordenadas | 0 | 0 | 100 % |

Valores reales:

- `commercial_type`: SELL, RENT.
- `type`: APARTAMENTO, CASA, OFICINA, LOCAL, BODEGA, CONSULTORIO, LOTE, ESTUDIO, CASA_LOTE, HABITACION.
- `commune_calculated`: 16 comunas y 5 corregimientos. El 50 % de los registros está en EL POBLADO.
- `neighborhood_calculated`: 286 nombres, pero 290 barrios reales. Algunos nombres traen espacios sobrantes ("La Verde ", "B. Cerro  El Volador") y cuatro se repiten en dos comunas (Las Palmas, Las Playas, San Pablo, Suburbano El Llano).
- `codigo_comuna` + `codigo_barrio` es un identificador único (290 combinaciones, cada una con un solo nombre). Es el ÚNICO identificador de barrio que se usa; el nombre solo se muestra.

Reglas para NULL y 0:

- NULL significa "no reportado": se conserva como `null` y nunca se convierte en 0.
- 0 solo aparece si la fuente lo publica.
- Las amenidades valen 1 o NULL: NULL no significa "no tiene". Filtrar solo como "tiene X" (`= 1`).
- Los filtros mínimos (habitaciones, baños) excluyen los NULL. La interfaz debe indicarlo.

Política de calidad de datos (`src/lib/properties/data-policy.ts`):

- Se aplica a todas las consultas (listado y facetas) y se publica en `meta.exclusionPolicy` con la cantidad por regla y el total excluido (68 de 28.425; incluidos 28.357).
- Diseño declarativo: cada regla define la condición que la incumple. La inclusión es `NOT (r1 OR r2 …)` y los conteos se calculan con las mismas condiciones en una sola consulta `SUM(CASE …)`, así que las cifras no pueden divergir del filtro.
- Reglas de exclusión:
  - `missing-required-fields`: precio nulo o ≤ 0, u operación o tipo desconocidos (0 registros; protege la coherencia entre total y datos).
  - `placeholder-price`: repunits de 6 a 12 dígitos (111.111, 1.111.111, …). Son los únicos valores de dígitos repetidos en la fuente (34 arriendos de apartamentos). No se amplía a otros dígitos para no excluir precios legítimos por coincidencia.
  - `area-max`: área mayor de 100.000 m² (3).
  - `sale-min-price`: ventas por debajo de 20 millones (6).
  - `sale-max-price-per-m2`: ventas por encima de 100 M/m², solo con área reportada (8). Se mantiene provisionalmente; NO se baja a 40 M/m².
  - `rent-min-price`: arriendos por debajo de 300.000 (18).
  - `rent-max-price-per-m2`: arriendos por encima de 500.000/m², solo con área reportada y excepto locales de menos de 10 m² (14).
- Área 0 o 1 m² = "no reportada":
  - El registro se conserva con su precio, con `areaM2: null` y `pricePerM2: null`.
  - No participa en filtros de área.
  - En los ordenamientos por área y precio/m² va siempre al final (`CASE` en `orderByFields`).
  - En la interfaz se mostrará como «Área no reportada».
  - Nunca deducir áreas de la descripción.
- Indicadores de calidad (`qualityFlags` en cada propiedad y conteos en `meta.qualityFlags`): marcan sin excluir.
  - `AREA_NOT_REPORTED` (26).
  - `HIGH_SALE_PRICE_PER_M2`: venta de más de 30 M/m², pendiente de revisión (46).
  - `PRICE_PER_M2_CHECK_EXEMPT`: local de menos de 10 m² que supera 500.000/m² (16). Incluye al menos un caso dudoso: 1,24 m² a 65 M.
- Comparaciones de precio/m² con multiplicación (`price > X * private_area_m2`) para no dividir por cero.
- No usar límites absolutos de arriendo: hay oficinas reales de más de 9.000 m² arrendadas por más de 500 millones.
- No ocultar exclusiones en silencio: cualquier cambio de la política debe actualizar las reglas publicadas.

Estratos:

- Se conservan los valores originales (0–7 y null) en `stratum`.
- El filtro convencional solo ofrece 1–6 (`stratum=1..6`).
- Los registros con 0, 7 o null siguen apareciendo en los resultados sin filtro de estrato y se cuentan aparte en `facets.strataOutsideFilter`.
- No se interpreta ni se inventa el significado de 0 o 7.

Presentación:

- Indicar siempre que son ofertas históricas de agosto de 2023 (`meta.dataPeriod` y `meta.disclaimer`).
- No presentarlas como disponibles ni con precios actuales.
- El enlace `sourceUrl` puede ya no estar disponible. La interfaz no lo muestra (fase 6); la API interna lo conserva.

Filtros disponibles (`GET /api/properties`):

- `operation`: venta | arriendo.
- `type`: apartamento, casa, oficina, local, bodega, consultorio, lote, estudio, casa-lote, habitacion.
- `commune`: slug de la lista blanca. Se filtra por `codigo_comuna`.
- `neighborhood`: identificador `CC-BB` (p. ej. `10-14`), o slug del barrio junto con `commune` (p. ej. `commune=santa-elena&neighborhood=las-palmas`).
  - El slug se resuelve a códigos con las facetas.
  - Un slug sin `commune` responde 400, porque hay nombres repetidos.
  - Un slug inexistente responde 400.
  - Un identificador de otra comuna responde 400.
- `stratum`: 1–6.
- `minPrice`, `maxPrice`, `minArea`, `maxArea`. Los de área solo consideran áreas reportadas.
- `bedrooms` y `bathrooms`: mínimos (>=); excluyen los NULL.
- `sort`: default, price_asc, price_desc, area_asc, area_desc, price_m2_asc, price_m2_desc.
- `page`: 1–100.000.
  - Una página mayor que `totalPages` responde 200 vacío con `pageOutOfRange: true`, `hasPreviousPage: false` y caché corta.
  - Con 0 resultados, `totalPages` es 0 y solo la página 1 es válida.
- `limit`: exactamente 12, 24 o 48 (24 por defecto).
- Parámetros desconocidos, repetidos o inválidos responden 400 con detalle.

Facetas (`GET /api/properties/facets`, sin parámetros; en Server Components usar `getPropertyFacets()`):

- Totales.
- Operaciones.
- Tipos con sus conteos por operación.
- Comunas: código, slug, nombre y conteos.
- Barrios: `id` `CC-BB`, códigos, slug único dentro de su comuna, nombre limpio y conteos.
- Registros sin ubicación.
- Estratos 1–6 y estratos fuera del filtro.
- Rangos de precio y de área (solo área reportada) por operación.

Todos los conteos usan la misma política que el listado y coinciden con sus totales (verificado). Son por operación, no cruzados con otros filtros.

## 4. Arquitectura

Utilizar Next.js App Router.

Separar responsabilidades:

- app/: páginas y rutas.
- components/: componentes reutilizables.
- lib/: servicios, utilidades y configuración.
- types/: tipos e interfaces TypeScript.

La API externa debe consumirse desde el servidor.

Crear una capa de servicios para consultar y normalizar los registros.

No realizar llamadas directas a ArcGIS desde los componentes visuales.

Implementar una ruta interna de API cuando sea necesario para desacoplar el frontend del proveedor de datos.

No utilizar base de datos en la primera versión.

### 4.1 Capa de datos implementada

- `src/types/property.ts`: tipos del dominio.
  - `Property`, `PropertySearchQuery`, `Pagination`, `DatasetMeta` y `PropertyFacets`.
  - Las respuestas de ambos endpoints.
- `src/lib/arcgis/config.ts`: URL, campos explícitos (incluido `codigo_barrio`) y timeout (10 s; `ARCGIS_TIMEOUT_MS` opcional, 1–60000). Es `server-only`.
- `src/lib/arcgis/client.ts`: POST con timeout y validación de la respuesta. Es `server-only`.
  - Funciones: `queryCount`, `queryFeatures` y `queryStatistics` (groupBy y estadísticas).
  - Errores tipados con `ArcGisError` y su `kind`: timeout, network, http, upstream e invalid_response.
- `src/lib/properties/catalog.ts`: listas blancas.
  - Operaciones, tipos, comunas (slug → `codigo_comuna` + nombre) y estratos del filtro.
  - Ordenamientos (con `CASE` para áreas no reportadas), tamaños de página y `AREA_KNOWN_SQL`.
- `src/lib/properties/slug.ts`: `slugify`, patrones de slug y de identificador de barrio, limpieza de espacios.
- `src/lib/properties/query-params.ts`: validación estricta y síncrona. Produce una referencia de barrio aún sin resolver (id o slug).
- `src/lib/properties/where-clause.ts`: construcción del `where`.
  - Los valores salen de listas blancas, son números validados o son códigos solo de dígitos.
  - No se usa texto libre en el SQL.
- `src/lib/properties/data-policy.ts`: reglas de exclusión, indicadores de calidad, umbrales y aviso de datos históricos.
- `src/lib/properties/normalize.ts`: validación campo a campo y conversión a `Property`.
  - Área ≤ 1 → `null`.
  - Calcula `neighborhoodId` y `qualityFlags`.
  - Los registros inválidos se cuentan en `invalidRecordsSkipped`.
- `src/lib/properties/cached-outcome.ts`: patrón `{ ok, value | error }` para cruzar la frontera de `use cache`, y perfil diario.
- `src/lib/properties/service.ts`: `resolveSearchQuery`, `searchProperties`, `getDatasetMeta` (conteos en una sola consulta) y `getPropertyById`.
  - `getPropertyById` (fase 3, autorizado): consulta `objectid = N AND (DATA_POLICY_WHERE)` con `resultRecordCount = 1` y `PROPERTY_DETAIL_FIELDS`.
  - Devuelve `PropertyDetail | null`: un registro inexistente o excluido por calidad da `null`.
  - El identificador se valida con `parsePropertyId` (entero 1–2147483647, sin ceros a la izquierda).
  - Caché 24 h con el patrón `CachedOutcome`.
- Ficha individual: `objectid` es único (28.425 valores distintos, sin nulos; `link` no es único).
  - No se solicita ni se muestra `description`, porque puede contener teléfonos y nombres.
  - Amenidades: solo los 23 campos de `PROPERTY_AMENITY_FIELDS` con significado inequívoco; valen 1 o null, nunca 0, y null significa «no reportada».
  - En la base de datos son booleanos: para filtrar se usa `campo = true` (`= 1` da error 400).
- `src/proxy.ts`: devuelve un 404 real para fichas con identificador mal formado (comprobación solo de formato, sin consultar datos).
  - Con Partial Prefetching, la ficha envía antes el App Shell con estado 200; un identificador bien formado pero inexistente o excluido muestra «Propiedad no encontrada» renderizado en el servidor con `noindex` y estado HTTP 200.
  - `notFound()` dentro de la página solo se dibuja en el cliente, por eso no se usa allí.
- `src/lib/properties/facets.ts`: `getPropertyFacets` y `resolveNeighborhoodSlug` (4 consultas estadísticas, todo o nada).
- `src/lib/api/responses.ts`: políticas `Cache-Control`, respuestas JSON y traducción de errores a 502/504/500.
- `src/app/api/properties/route.ts` y `src/app/api/properties/facets/route.ts`: rutas finas sobre los servicios.

Reglas de consulta:

- `outFields` siempre explícito (nunca `*`).
- `orderByFields` siempre termina en `objectid ASC` para que la paginación sea estable. Verificado con recorridos completos sin duplicados ni saltos.
- Nunca descargar todos los registros; las facetas usan solo estadísticas.

### 4.2 Estrategia de caché (Next.js 16 con Cache Components)

- `cacheComponents: true` y `partialPrefetching: true` en `next.config.ts`.
- Caché de datos con `"use cache"` + `cacheLife` + `cacheTag` (`arcgis-properties`, `arcgis-facets`). La clave es la consulta ya resuelta: filtros distintos producen entradas distintas.
  - Éxito: `{ stale: 3600, revalidate: 86400, expire: 604800 }`, es decir, 24 h.
  - Página fuera de rango: perfil `minutes`.
  - Fallo de ArcGIS: perfil `seconds`, para no fijar errores en caché.
- En producción, Next.js oculta los errores lanzados dentro de `use cache`. Por eso las funciones cacheadas devuelven `{ ok, value | error }` y el error se vuelve a lanzar fuera del ámbito cacheado.
- `Cache-Control` para el CDN (`src/lib/api/responses.ts`):
  - `long` (`s-maxage=86400, stale-while-revalidate=604800`): solo para datos completos y páginas en rango.
  - `short` (`s-maxage=60`): metadatos incompletos (`meta.complete: false`) o `pageOutOfRange`.
  - `no-store`: errores (400/5xx).
- La caché en memoria de `use cache` no persiste entre instancias serverless ni entre despliegues: en Vercel la protección real es el CDN.
- PENDIENTE, comprobar en Vercel tras el primer despliegue:
  - que la clave de caché del CDN incluye la query string, porque si no las respuestas de filtros distintos se mezclarían;
  - que ArcGIS responde a las IPs de Vercel;
  - la latencia desde la región elegida.
  - El comportamiento del CDN NO está verificado: no afirmarlo hasta probarlo.
- `use cache` no puede ir en el cuerpo de un Route Handler: va en funciones auxiliares del servicio.
- Datos de la URL (`params`, `searchParams`): leerlos siempre dentro de un componente envuelto en `<Suspense>`. Si se leen fuera, aparece la advertencia «encountered URL data outside of Suspense» y la navegación deja de ser instantánea (ejemplo: `src/app/propiedades/[id]/page.tsx`).
- Navegación y `<Activity>`: con Cache Components, Next.js no desmonta las páginas al navegar; las oculta con `<Activity>`.
  - Al ocultarse se ejecutan las limpiezas de los efectos, pero el estado se conserva.
  - Los recursos externos con ciclo de vida propio deben crearse y destruirse en el mismo efecto.
  - Leaflet: no usar `MapContainer` de react-leaflet (conserva un mapa destruido y produce «appendChild» y «Map container is being reused»). Usar `src/components/map/LeafletMapContainer.tsx`.
- Regreso desde las fichas (`BackToResults`):
  - Si la ficha se abrió desde el listado en la misma pestaña, usa `router.back()`, con verificación de la longitud del historial.
  - En otro caso enlaza al último listado de la sesión o a `/propiedades`.
- Antes de usar APIs de Next.js, consultar `node_modules/next/dist/docs/` (ver AGENTS.md).

## 5. Rendimiento

El rendimiento es un criterio prioritario de evaluación.

Aplicar:

- Server Components por defecto.
- Client Components solamente cuando sean necesarios.
- Caché y revalidación de datos.
- Selección explícita de campos.
- Paginación desde el servidor.
- Manejo de respuestas lentas y errores.
- Carga dinámica del mapa.
- Optimización de imágenes.
- Evitar dependencias pesadas innecesarias.

No descargar todos los registros si no es necesario.

No bloquear la visualización inicial esperando la carga del mapa.

## 6. Diseño y experiencia de usuario

Crear una experiencia visual inspirada en Airbnb y los portales inmobiliarios premium.

Características:

- Diseño minimalista y elegante.
- Interfaz responsive con enfoque mobile-first.
- Tipografía legible.
- Jerarquía visual clara.
- Tarjetas inmobiliarias atractivas.
- Filtros intuitivos.
- Búsqueda por ubicación.
- Filtros por precio, tipo de inmueble y operación, según los datos disponibles.
- Información de habitaciones, baños y área cuando exista.
- Estados de carga, vacío y error.
- Navegación accesible.

El mapa interactivo debe complementar el listado, no perjudicar el rendimiento.

Evitar diseños genéricos de dashboard.

## 7. SEO y accesibilidad

Implementar:

- Metadatos por página.
- Títulos y descripciones adecuados.
- HTML semántico.
- Encabezados jerárquicos.
- Navegación accesible.
- Textos alternativos.
- URLs descriptivas.
- Datos estructurados únicamente cuando correspondan a información real y verificable.

No presentar los datos de la API como información en tiempo real si no existe garantía de actualización inmediata.

### 7.1 Implementación (fase 5)

- URL pública en `src/lib/site.ts`, con esta prioridad:
  1. `SITE_URL`;
  2. `VERCEL_PROJECT_PRODUCTION_URL`;
  3. `http://localhost:PORT`.
- `metadataBase` va en el layout.
- Open Graph y Twitter: usar siempre `socialMetadata()`.
  - Next.js combina los metadatos de forma superficial: un `openGraph` de página sustituye el del layout.
- Canonical por página (inicio, listado indexable y fichas). El layout no define canonical.
- Política de indexación del listado (`src/lib/seo/listing.ts`):
  - indexables: `operation`, `type`, `commune` y `page`;
  - cualquier otro parámetro, un valor inválido, un resultado vacío, una página fuera de rango o un error de la fuente → `noindex, follow`.
- `robots.ts` bloquea solo `/api/`.
- `sitemap.ts` contiene el inicio, el listado y las búsquedas operación × comuna.
  - No incluye fichas, porque requeriría una consulta nueva de identificadores: decisión pendiente.
- JSON-LD (`src/components/seo/JsonLd.tsx`): `WebSite` en el inicio y `BreadcrumbList` en el listado y las fichas. Nunca `Offer` ni `RealEstateListing`: los anuncios son históricos y esos tipos los presentarían como vigentes.
- Cabeceras de seguridad y CSP sin nonces en `next.config.ts`, compatibles con PPR. Cualquier origen externo nuevo (teselas, scripts) debe añadirse a la CSP.
- Animación `reveal` del hero: parte de una opacidad parcial, no de 0, para que el titular cuente como LCP.
- Iconos y Open Graph:
  - `icon.svg`, `apple-icon.png` y `favicon.ico` se generaron desde `ArchMark`;
  - `public/og-image.png` es una imagen estática institucional (logotipo, tipografías y paleta). Se declara en `socialMetadata()` y no con la convención `opengraph-image`, porque las páginas que definen su propio `openGraph` perdían la imagen.
- `sitemap.ts` escapa `&` manualmente: Next.js no lo hace.

## 8. Calidad del código

- TypeScript estricto.
- Componentes pequeños y reutilizables.
- Código legible.
- Evitar duplicación.
- Evitar el uso indiscriminado de any.
- Validar los datos externos antes de utilizarlos.
- Manejar errores explícitamente.
- Mantener una estructura coherente.
- No dejar código innecesario ni funcionalidades falsas.

Ejecutar ESLint y TypeScript antes de considerar terminada una funcionalidad.

## 9. Documentación

El README debe explicar:

- Objetivo del proyecto.
- Fuente de datos y justificación.
- Arquitectura.
- Tecnologías utilizadas.
- Instalación.
- Ejecución local.
- Variables de entorno, si existen.
- Decisiones técnicas.
- Estrategia de rendimiento.
- Uso de herramientas de inteligencia artificial.
- Despliegue en Vercel.

## 10. Forma de trabajo con Claude

Trabajar por etapas y no intentar construir toda la aplicación en una sola operación.

Antes de implementar una etapa:

1. Analizar los requisitos.
2. Revisar los archivos existentes.
3. Proponer una solución técnica.
4. Identificar dependencias necesarias.
5. Explicar brevemente las decisiones.

Después de cada etapa:

1. Ejecutar las comprobaciones correspondientes.
2. Corregir errores.
3. Resumir los archivos modificados.
4. Indicar cómo probar el resultado.

No modificar archivos ajenos al alcance de la tarea sin justificación.

No eliminar configuraciones existentes sin explicar previamente la necesidad.

No inventar información de la API.

Priorizar siempre calidad, rendimiento, mantenibilidad y experiencia de usuario.