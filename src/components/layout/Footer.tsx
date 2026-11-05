import { cacheLife } from "next/cache";
import Link from "next/link";

import { IconPin } from "@/components/ui/icons";

import { Logo } from "./Logo";
import { MAIN_NAV } from "./nav";

/** URL pública de la capa ArcGIS (fuente de los datos mostrados). */
const DATA_SOURCE_URL =
  "https://www.medellin.gov.co/servidormapas/rest/services/vivienda_ciudad_terri/VM_Oferta_Comercial_Oime/MapServer/1";

/** El año se calcula en un ámbito cacheado (Cache Components no permite Date en el render). */
async function CurrentYear() {
  "use cache";
  cacheLife("days");
  return <>{new Date().getFullYear()}</>;
}

export function Footer() {
  return (
    <footer id="contacto" className="scroll-mt-24 bg-forest text-ivory">
      <div className="container-editorial grid gap-12 py-16 md:grid-cols-[1.4fr_1fr_1fr] md:gap-10 lg:py-20">
        <div className="max-w-sm">
          <Logo tone="light" />
          <p className="mt-6 text-sm leading-relaxed text-ivory/75">
            Portal de búsqueda de propiedades en Medellín.
          </p>
          <p className="mt-6 inline-flex items-center gap-2 text-sm text-ivory/90">
            <IconPin size={18} className="text-champagne" />
            Medellín, Colombia
          </p>
        </div>

        <nav aria-label="Pie de página">
          <h2 className="eyebrow text-champagne">Navegación</h2>
          <ul className="mt-5 space-y-1">
            {MAIN_NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="inline-flex min-h-11 items-center text-sm text-ivory/80 transition-colors hover:text-champagne"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="eyebrow text-champagne">Información</h2>
          <ul className="mt-5 space-y-1">
            <li>
              <a
                href={DATA_SOURCE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center text-sm text-ivory/80 transition-colors hover:text-champagne"
              >
                Fuente de datos: Alcaldía de Medellín
                <span className="sr-only"> (abre en una pestaña nueva)</span>
              </a>
            </li>
            <li>
              <Link
                href="/propiedades#aviso-datos"
                className="inline-flex min-h-11 items-center text-sm text-ivory/80 transition-colors hover:text-champagne"
              >
                Aviso sobre los datos
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-ivory/10">
        <div className="container-editorial flex flex-col gap-2 py-6 text-xs text-ivory/60 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © <CurrentYear /> Medellin Advisors. Todos los derechos reservados.
          </p>
          <p>Medellín, Colombia</p>
        </div>
      </div>
    </footer>
  );
}
