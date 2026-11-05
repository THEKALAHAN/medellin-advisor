"use client";

import { useRouter } from "next/navigation";
import type { FormEvent, ReactNode } from "react";

/**
 * Formulario GET hacia /propiedades con mejora progresiva.
 * - Sin JavaScript: envío GET nativo (los parámetros vacíos los ignora la validación de la API).
 * - Con JavaScript: navegación del cliente con una URL limpia (sin parámetros vacíos).
 * - Al cambiar la comuna se vacía el barrio, que pertenece a la comuna anterior.
 */
export function SearchForm({
  children,
  className,
  ariaLabel,
}: {
  children: ReactNode;
  className?: string;
  ariaLabel: string;
}) {
  const router = useRouter();

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const params = new URLSearchParams();
    for (const [key, value] of new FormData(event.currentTarget)) {
      if (typeof value === "string" && value.trim() !== "") params.set(key, value.trim());
    }
    const query = params.toString();
    router.push(query ? `/propiedades?${query}` : "/propiedades");
  };

  const onChange = (event: FormEvent<HTMLFormElement>) => {
    const target = event.target;
    if (target instanceof HTMLSelectElement && target.name === "commune") {
      const neighborhood = event.currentTarget.elements.namedItem("neighborhood");
      if (neighborhood instanceof HTMLSelectElement) {
        neighborhood.value = "";
        neighborhood.disabled = true;
      }
    }
  };

  return (
    <form
      method="get"
      action="/propiedades"
      role="search"
      aria-label={ariaLabel}
      className={className}
      onSubmit={onSubmit}
      onChange={onChange}
    >
      {children}
    </form>
  );
}
