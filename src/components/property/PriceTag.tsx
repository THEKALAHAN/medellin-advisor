import { formatCOP } from "@/lib/format";
import type { OperationCode } from "@/types/property";

/** Precio publicado. En arriendo el valor de la fuente es mensual. */
export function PriceTag({
  price,
  operation,
  className = "",
}: {
  price: number;
  operation: OperationCode;
  className?: string;
}) {
  return (
    <p className={`flex min-w-0 flex-wrap items-baseline gap-x-1.5 text-forest ${className}`}>
      <span className="font-serif text-[1.65rem] leading-none font-semibold tracking-tight">
        {formatCOP(price)}
      </span>
      {operation === "RENT" && <span className="text-sm text-muted">/ mes</span>}
    </p>
  );
}
