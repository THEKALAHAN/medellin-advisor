import Link from "next/link";

/** 404 general del sitio (rutas inexistentes e identificadores de ficha mal formados). */
export default function NotFound() {
  return (
    <div className="container-editorial py-20 lg:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <p className="eyebrow text-champagne-deep">Error 404</p>
        <h1 className="text-title mt-5 text-forest">Página no encontrada</h1>
        <p className="text-lead mt-5 text-muted">
          La dirección no corresponde a ninguna página ni propiedad de Medellin Advisors.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link href="/propiedades" className="btn btn-primary">
            Ver todas las propiedades
          </Link>
          <Link href="/" className="btn btn-outline text-forest">
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
