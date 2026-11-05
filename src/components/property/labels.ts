/**
 * Etiquetas de presentación para campos de la ficha. Solo traducen nombres de campos de la
 * fuente; no añaden ni interpretan datos.
 */
import type { AmenityCode } from "@/types/property";

export const AMENITY_LABELS: Record<AmenityCode, string> = {
  swimming_pool: "Piscina",
  gym: "Gimnasio",
  elevator: "Ascensor",
  sauna: "Sauna",
  turkish: "Baño turco",
  jacuzzi: "Jacuzzi",
  bbq: "Zona BBQ",
  balcony: "Balcón",
  green_area: "Zonas verdes",
  garden: "Jardín",
  childrens_area: "Zona infantil",
  sports_fields: "Canchas deportivas",
  communal_hall: "Salón social",
  coworking: "Coworking",
  air_conditioning: "Aire acondicionado",
  furnished: "Amoblado",
  laundry_area: "Zona de ropas",
  servant_room: "Cuarto de servicio",
  storage_room: "Cuarto útil",
  guest_parking: "Parqueadero de visitantes",
  covered_parking: "Parqueadero cubierto",
  frontdesk: "Portería",
  cctv: "Circuito cerrado de TV",
};

/** Valores reales de `category` (verificados con groupBy). */
export const CATEGORY_LABELS: Record<string, string> = {
  RESIDENCIAL: "Residencial",
  COMERCIAL: "Comercial",
  OFICINA_CONSULTORIO: "Oficina o consultorio",
  INDUSTRIAL: "Industrial",
  LOTE: "Lote",
};
