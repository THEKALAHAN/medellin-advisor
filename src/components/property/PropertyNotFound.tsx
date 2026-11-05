import Link from "next/link";

/**
 * Contenido 404 de fichas (renderizado en el servidor, funciona sin JavaScript).
 * Se usa para identificadores mal formados, inexistentes o excluidos por la política de calidad.
 */
export function PropertyNotFound() {
  return (
    <div className="container-editorial py-20 lg:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <p className="eyebrow text-champagne-deep">Error 404</p>
        <h1 className="text-title mt-5 text-forest">Propiedad no encontrada</h1>
        <p className="text-lead mt-5 text-muted">
          No existe una propiedad con este identificador, o el registro se omite por presentar datos
          inconsistentes en la fuente (precios de relleno o valores fuera de rango).
        </p>
        <Link href="/propiedades" className="btn btn-primary mt-10">
          Ver todas las propiedades
        </Link>
      </div>
    </div>
  );
}
