import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";

import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, socialMetadata } from "@/lib/site";

import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: SITE_URL,
  title: {
    default: `${SITE_NAME} · Bienes raíces en Medellín`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  // Cada página define su propio canonical; aquí solo la base compartida de redes sociales.
  ...socialMetadata({
    title: `${SITE_NAME} · Bienes raíces en Medellín`,
    description:
      "Explora ofertas inmobiliarias de venta y arriendo en Medellín por comuna, tipo de inmueble y precio.",
  }),
};

export const viewport: Viewport = {
  themeColor: "#172D25",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-CO" className={`${cormorant.variable} ${manrope.variable} antialiased`}>
      <body className="flex min-h-svh flex-col">
        <a
          href="#contenido"
          className="sr-only z-50 bg-forest px-4 py-3 text-ivory focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:inline-flex focus:min-h-11 focus:items-center"
        >
          Saltar al contenido
        </a>
        <Header />
        <main id="contenido" className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
