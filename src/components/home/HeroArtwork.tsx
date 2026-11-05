/**
 * Panorámica ilustrada: terraza en altura con Medellín y la cordillera al atardecer.
 * Es una ilustración vectorial (sin peso de imagen) usada mientras no exista una
 * fotografía arquitectónica con licencia. Se identifica como «Ilustración» en el hero.
 */

// Ventanas iluminadas: posiciones fijas (deterministas) para no depender de Math.random.
const LIGHTS: [number, number][] = [
  [212, 600], [236, 586], [262, 612], [318, 574], [344, 598], [372, 560], [398, 590],
  [452, 548], [478, 572], [504, 530], [532, 560], [588, 520], [612, 546], [640, 508],
  [668, 538], [724, 500], [752, 526], [780, 488], [806, 514], [862, 498], [890, 470],
  [918, 504], [972, 482], [1000, 508], [1028, 470], [1084, 494], [1112, 520], [1140, 488],
  [1196, 512], [1224, 538], [1252, 506], [1306, 530], [1334, 556], [1362, 524], [1418, 552],
];

export function HeroArtwork() {
  return (
    <svg
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMax slice"
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="hero-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0f1f1a" />
          <stop offset=".55" stopColor="#2c4a3f" />
          <stop offset=".82" stopColor="#8a7350" />
          <stop offset="1" stopColor="#c6a36a" />
        </linearGradient>
        <radialGradient id="hero-sun" cx="1180" cy="430" r="260" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#e9cf9c" stopOpacity=".55" />
          <stop offset="1" stopColor="#e9cf9c" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="1600" height="900" fill="url(#hero-sky)" />
      <circle cx="1180" cy="430" r="260" fill="url(#hero-sun)" />

      {/* Cordilleras del Valle de Aburrá (tres planos) */}
      <path
        d="M0 420 120 360l110 34 140-96 120 70 150-108 130 82 140-64 150 90 130-54 160 86 150-60 100 40v400H0Z"
        fill="#3d5a4c"
        opacity=".75"
      />
      <path
        d="M0 488 150 430l120 40 160-84 140 72 170-60 120 52 170-70 160 76 140-40 140 62 130-30v380H0Z"
        fill="#2a463c"
      />
      <path d="M0 560 200 520l220 30 260-46 240 40 260-36 220 34 200-24v400H0Z" fill="#1f392f" />

      {/* Ciudad en el valle */}
      <g fill="#162b23">
        <path d="M120 640V590h40v-24h30v74ZM200 640v-70h36v-30h26v100ZM300 640v-86h44v86ZM360 640v-112h30v-20h22v132Z" />
        <path d="M430 640v-96h52v96ZM500 640v-128h34v-26h28v154ZM580 640v-104h46v104ZM640 640v-140h40v140Z" />
        <path d="M700 640v-118h52v118ZM770 640v-150h30v-30h30v180ZM850 640v-128h46v128ZM910 640v-160h40v160Z" />
        <path d="M970 640v-136h52v136ZM1040 640v-116h44v116ZM1100 640v-148h36v148ZM1150 640v-108h50v108Z" />
        <path d="M1220 640v-126h38v126ZM1280 640v-96h52v96ZM1350 640v-118h34v118ZM1400 640v-88h56v88ZM1470 640v-70h60v70Z" />
      </g>
      <g fill="#e2c48e">
        {LIGHTS.map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width="3" height="4" opacity=".75" />
        ))}
      </g>

      {/* Terraza en primer plano: piso, baranda de vidrio y jardinera */}
      <path d="M0 760h1600v140H0Z" fill="#101d18" />
      <path d="M0 760h1600" stroke="#c6a36a" strokeWidth="1.5" opacity=".7" />
      <g stroke="#c6a36a" strokeWidth="1.2" opacity=".45">
        <path d="M0 668h1600" />
        {Array.from({ length: 17 }, (_, i) => (
          <path key={i} d={`M${i * 100} 668v92`} />
        ))}
      </g>
      <rect x="0" y="668" width="1600" height="92" fill="#c6a36a" opacity=".05" />
      <path d="M1330 760v-58h200v58" fill="#0d1814" stroke="#c6a36a" strokeOpacity=".35" />
      <path
        d="M1360 702c10-60 40-90 70-110M1430 702c0-70 20-110 50-140M1400 702c-20-50-50-70-80-80M1470 702c20-40 40-60 70-70"
        stroke="#3f5f4f"
        strokeWidth="3"
        fill="none"
      />
    </svg>
  );
}
