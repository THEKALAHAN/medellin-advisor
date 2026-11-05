import type { Metadata } from "next";
import { Suspense } from "react";

import { FeaturedHeader, FeaturedProperties } from "@/components/home/FeaturedProperties";
import { Hero } from "@/components/home/Hero";
import { ValuePillars } from "@/components/home/ValuePillars";
import { PropertyGridSkeleton } from "@/components/property/PropertyGrid";
import { buildSearchOptions, loadFacetsSafely } from "@/components/search/options";
import { SearchBar } from "@/components/search/SearchBar";
import { WebSiteJsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

/** Buscador con comunas de las facetas; mientras cargan (o si fallan) usa el catálogo. */
async function HeroSearch() {
  const facets = await loadFacetsSafely();
  return <SearchBar options={buildSearchOptions(facets)} />;
}

export default function HomePage() {
  return (
    <>
      <WebSiteJsonLd />
      <Hero
        search={
          <Suspense fallback={<SearchBar options={buildSearchOptions(null)} />}>
            <HeroSearch />
          </Suspense>
        }
      />

      <section aria-labelledby="destacadas-title" className="container-editorial py-20 lg:py-28">
        <FeaturedHeader />
        <div className="mt-12 lg:mt-16">
          <Suspense fallback={<PropertyGridSkeleton count={6} />}>
            <FeaturedProperties />
          </Suspense>
        </div>
      </section>

      <ValuePillars />
    </>
  );
}
