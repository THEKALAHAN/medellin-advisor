import type { ReactNode } from "react";

import { ArchMark } from "@/components/layout/Logo";
import { IconAdvisory, IconCity, IconExperience, IconShield } from "@/components/ui/icons";

/**
 * Sección institucional. Solo títulos e iconos: las descripciones se añadirán cuando exista
 * contenido institucional aprobado (no se inventan afirmaciones sobre la empresa).
 */
const PILLARS: { title: string; icon: ReactNode }[] = [
  { title: "Experiencia en el mercado", icon: <IconExperience size={30} /> },
  { title: "Asesoría personalizada", icon: <IconAdvisory size={30} /> },
  { title: "Conocimiento de la ciudad", icon: <IconCity size={30} /> },
  { title: "Transacciones seguras", icon: <IconShield size={30} /> },
];

export function ValuePillars() {
  return (
    <section
      id="nosotros"
      aria-labelledby="nosotros-title"
      className="relative scroll-mt-20 overflow-hidden bg-forest text-ivory"
    >
      <ArchMark className="pointer-events-none absolute -top-10 -right-10 h-72 w-56 text-champagne/10 md:h-96 md:w-72" />
      <div className="container-editorial relative py-20 lg:py-28">
        <p className="eyebrow flex items-center gap-4 text-champagne">
          <span className="rule-gold" aria-hidden="true" />
          Medellin Advisors
        </p>
        <h2 id="nosotros-title" className="text-title mt-5 max-w-xl text-ivory">
          Acerca de nosotros
        </h2>

        <ul className="mt-14 grid grid-cols-1 gap-x-10 min-[480px]:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((pillar) => (
            <li
              key={pillar.title}
              className="flex items-center gap-5 border-t border-ivory/20 py-7 min-[480px]:flex-col min-[480px]:items-start min-[480px]:pb-10"
            >
              <span className="text-champagne">{pillar.icon}</span>
              <h3 className="text-[1.6rem] leading-tight text-ivory">{pillar.title}</h3>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
