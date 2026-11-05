import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * Content-Security-Policy sin nonces (modalidad «Without Nonces» de la guía de Next.js).
 * Los nonces obligan a renderizar todas las páginas de forma dinámica y son incompatibles con
 * Partial Prerendering, que usa este proyecto. Por eso `script-src` admite 'unsafe-inline' (los
 * datos de hidratación de Next.js van en scripts en línea); el resto de directivas limita
 * orígenes, marcos, formularios y objetos.
 * - img-src: teselas de OpenStreetMap (Leaflet) y data:/blob: (iconos de Leaflet).
 * - style-src 'unsafe-inline': Leaflet posiciona el mapa con estilos en línea.
 * - Fuentes autoalojadas por next/font: font-src 'self'.
 * - Desarrollo: 'unsafe-eval' (pilas de error de React) y WebSocket para la recarga en caliente.
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://tile.openstreetmap.org",
  "font-src 'self'",
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // El sitio no usa cámara, micrófono, geolocalización ni pagos.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()" },
  // Equivalente heredado de frame-ancestors 'none' para navegadores antiguos.
  { key: "X-Frame-Options", value: "DENY" },
];

const nextConfig: NextConfig = {
  // Cache Components: habilita `use cache` + `cacheLife`, el mecanismo de caché
  // recomendado por la documentación de Next.js 16 (ver src/lib/properties/service.ts).
  cacheComponents: true,
  // La documentación pide declararlo explícitamente junto a cacheComponents.
  partialPrefetching: true,
  // No anunciar la tecnología del servidor (cabecera X-Powered-By).
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
