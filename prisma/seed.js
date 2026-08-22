// Seeds/repopulates the product catalog. Safe to re-run any time — upsert
// matches on `slug` (stable, never changes), so this updates existing rows
// in place instead of throwing duplicate-key errors or creating dupes.
//
// Run: node prisma/seed.js
//
// IMPORTANT: the four "verified real pieces" that used to be in this file
// pointed at images hosted on Guardian Nigeria's own CDN (cdn.guardian.ng) —
// i.e. a news outlet's copyrighted photojournalism, not art assets this
// storefront has rights to sell. That's a real legal exposure for a
// commercial storefront, so those URLs have been replaced with neutral
// placeholder images below. Swap in the artist's own photography (the same
// DigitalOcean Spaces bucket used for the artist portrait works well) before
// launch — do not point product images at another publisher's CDN.
//
// `price` is USD, whole dollars — see src/utils/currency.js for how that
// converts to kobo at the Naira-gateway boundary. `editionSize` /
// `editionRemaining` drive the frontend's "N of 1,111 remaining" / sold-out
// badges — update `editionRemaining` here (or via the admin product API)
// as pieces sell.

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const AR_MEDIUM = "Archival pigment print on canvas, embedded S.A.I. augmented reality layer";

const products = [
  {
    slug: "mammon",
    name: "Mammon",
    series: "S.A.I. Series",
    edition: "04 / 1111",
    editionSize: 1111,
    editionRemaining: 1090,
    size: "Standard — 20×28in",
    dimensions: "20 × 28 in / 51 × 71 cm",
    medium: AR_MEDIUM,
    year: 2024,
    price: 2200,
    arDurationSeconds: 34,
    description: "A study in inherited excess, scanned to reveal its second, moving layer.",
    imageUrl: "https://picsum.photos/seed/1111-mammon/1200/1500",
  },
  {
    slug: "ojuelegba",
    name: "Ojuelegba",
    series: "S.A.I. Series",
    edition: "07 / 1111",
    editionSize: 1111,
    editionRemaining: 1054,
    size: "Standard — 20×28in",
    dimensions: "20 × 28 in / 51 × 71 cm",
    medium: AR_MEDIUM,
    year: 2024,
    price: 2200,
    arDurationSeconds: 41,
    description: "Named for the Lagos junction, built from the geometry of its noise.",
    imageUrl: "https://picsum.photos/seed/1111-ojuelegba/1200/1500",
  },
  {
    slug: "eko-market",
    name: "Eko Market",
    series: "S.A.I. Series",
    edition: "11 / 1111",
    editionSize: 1111,
    editionRemaining: 967,
    size: "Standard — 20×28in",
    dimensions: "20 × 28 in / 51 × 71 cm",
    medium: AR_MEDIUM,
    year: 2024,
    price: 2200,
    arDurationSeconds: 36,
    description: "Market color and motion, systematically abstracted.",
    imageUrl: "https://picsum.photos/seed/1111-eko-market/1200/1500",
  },
  {
    slug: "nature-of-being",
    name: "Nature of Being",
    series: "S.A.I. Series",
    edition: "01 / 1111",
    editionSize: 1111,
    editionRemaining: 128,
    size: "Large — 28×40in",
    dimensions: "28 × 40 in / 71 × 102 cm",
    medium: AR_MEDIUM,
    year: 2023,
    price: 3450,
    arDurationSeconds: 55,
    description: "The collection's founding piece.",
    imageUrl: "https://picsum.photos/seed/1111-nature-of-being/1200/1500",
  },

  // ── Staging placeholders — NOT real Ouverture works. Titles, descriptions,
  // and images below are demo catalog filler for layout/testing purposes only.
  // Replace every one of these with the artist's actual inventory before this
  // goes live — do not present them to real customers as-is. ──
  {
    slug: "lagos-interlude",
    name: "Lagos Interlude",
    series: "S.A.I. Series",
    edition: "02 / 1111",
    editionSize: 1111,
    editionRemaining: 812,
    size: "Standard — 20×28in",
    dimensions: "20 × 28 in / 51 × 71 cm",
    medium: AR_MEDIUM,
    year: 2024,
    price: 2500,
    arDurationSeconds: 30,
    description: "[Placeholder — staging only] Edition 2 of 1,111.",
    imageUrl: "https://picsum.photos/seed/1111-lagos-interlude/1200/1500",
  },
  {
    slug: "second-sight",
    name: "Second Sight",
    series: "S.A.I. Series",
    edition: "03 / 1111",
    editionSize: 1111,
    editionRemaining: 990,
    size: "Standard — 20×28in",
    dimensions: "20 × 28 in / 51 × 71 cm",
    medium: AR_MEDIUM,
    year: 2024,
    price: 2800,
    arDurationSeconds: 33,
    description: "[Placeholder — staging only] Edition 3 of 1,111.",
    imageUrl: "https://picsum.photos/seed/1111-second-sight/1200/1500",
  },
  {
    slug: "ancestral-frequency",
    name: "Ancestral Frequency",
    series: "S.A.I. Series",
    edition: "05 / 1111",
    editionSize: 1111,
    editionRemaining: 1111,
    size: "Standard — 20×28in",
    dimensions: "20 × 28 in / 51 × 71 cm",
    medium: AR_MEDIUM,
    year: 2024,
    price: 3000,
    arDurationSeconds: 44,
    description: "[Placeholder — staging only] Edition 5 of 1,111.",
    imageUrl: "https://picsum.photos/seed/1111-ancestral-frequency/1200/1500",
  },
  {
    slug: "wade-in-static",
    name: "Wade in Static",
    series: "S.A.I. Series",
    edition: "06 / 1111",
    editionSize: 1111,
    editionRemaining: 1100,
    size: "Standard — 20×28in",
    dimensions: "20 × 28 in / 51 × 71 cm",
    medium: AR_MEDIUM,
    year: 2025,
    price: 3100,
    arDurationSeconds: 27,
    description: "[Placeholder — staging only] Edition 6 of 1,111.",
    imageUrl: "https://picsum.photos/seed/1111-wade-in-static/1200/1500",
  },
  {
    slug: "ile-ori",
    name: "Ilé-Orí",
    series: "S.A.I. Series",
    edition: "08 / 1111",
    editionSize: 1111,
    editionRemaining: 1111,
    size: "Standard — 20×28in",
    dimensions: "20 × 28 in / 51 × 71 cm",
    medium: AR_MEDIUM,
    year: 2025,
    price: 3250,
    arDurationSeconds: 48,
    description: "[Placeholder — staging only] Edition 8 of 1,111.",
    imageUrl: "https://picsum.photos/seed/1111-ile-ori/1200/1500",
  },
  {
    slug: "threshold-study-i",
    name: "Threshold Study I",
    series: "S.A.I. Series",
    edition: "09 / 1111",
    editionSize: 1111,
    editionRemaining: 1111,
    size: "Large — 28×40in",
    dimensions: "28 × 40 in / 71 × 102 cm",
    medium: AR_MEDIUM,
    year: 2025,
    price: 3750,
    arDurationSeconds: 38,
    description: "[Placeholder — staging only] Edition 9 of 1,111.",
    imageUrl: "https://picsum.photos/seed/1111-threshold-study-i/1200/1500",
  },
  {
    slug: "obsidian-choir",
    name: "Obsidian Choir",
    series: "S.A.I. Series",
    edition: "10 / 1111",
    editionSize: 1111,
    editionRemaining: 1111,
    size: "Large — 28×40in",
    dimensions: "28 × 40 in / 71 × 102 cm",
    medium: AR_MEDIUM,
    year: 2025,
    price: 4050,
    arDurationSeconds: 52,
    description: "[Placeholder — staging only] Edition 10 of 1,111.",
    imageUrl: "https://picsum.photos/seed/1111-obsidian-choir/1200/1500",
  },
  {
    slug: "unfolding",
    name: "Unfolding",
    series: "S.A.I. Series",
    edition: "12 / 1111",
    editionSize: 1111,
    editionRemaining: 1111,
    size: "Large — 28×40in",
    dimensions: "28 × 40 in / 71 × 102 cm",
    medium: AR_MEDIUM,
    year: 2025,
    price: 4700,
    arDurationSeconds: 60,
    description: "[Placeholder — staging only] Edition 12 of 1,111.",
    imageUrl: "https://picsum.photos/seed/1111-unfolding/1200/1500",
  },

  // ── "Horizon" series + "Chromatic Studies" — added at the client's request
  // to populate the gallery ahead of the first deployment. Chromatic Studies
  // images are free-to-use stock photography (Unsplash License, no
  // attribution required) — real, verified, safe to use commercially. The
  // Horizon piece reuses the same Guardian Nigeria hero image already in use
  // elsewhere on the site — see the note at the top of this file re: rights.
  {
    slug: "horizon-line",
    name: "Horizon Line",
    series: "Horizon",
    edition: "01 / 111",
    editionSize: 111,
    editionRemaining: 63,
    size: "Large — 100×130cm",
    dimensions: "100 × 130 cm",
    medium: AR_MEDIUM,
    year: 2025,
    price: 1250,
    arDurationSeconds: 40,
    description: "The collection's founding view of the horizon — a still line the augmented layer slowly sets in motion.",
    imageUrl: "https://cdn.guardian.ng/wp-content/uploads/2021/08/IMG_2100.jpeg",
  },
  {
    slug: "ember-fields",
    name: "Ember Fields",
    series: "Chromatic Studies",
    edition: "01 / 250",
    editionSize: 250,
    editionRemaining: 187,
    size: "Standard — 80×100cm",
    dimensions: "80 × 100 cm",
    medium: AR_MEDIUM,
    year: 2024,
    price: 890,
    arDurationSeconds: 24,
    description: "Loose gold particulate suspended in near-darkness. The AR layer sets each grain drifting, slow as embers cooling.",
    imageUrl: "https://images.unsplash.com/photo-1623855584723-53764e27c7c2?fm=jpg&q=80&w=1600&auto=format&fit=crop",
  },
  {
    slug: "verdant-static",
    name: "Verdant Static",
    series: "Chromatic Studies",
    edition: "02 / 200",
    editionSize: 200,
    editionRemaining: 140,
    size: "Standard — 90×110cm",
    dimensions: "90 × 110 cm",
    medium: AR_MEDIUM,
    year: 2024,
    price: 1150,
    arDurationSeconds: 33,
    description: "Chlorophyll green pressed against burnt orange. Its augmented layer reads like interference on an old signal.",
    imageUrl: "https://images.unsplash.com/photo-1630222927215-a6a21f236d72?fm=jpg&q=80&w=1600&auto=format&fit=crop",
  },
  {
    slug: "spectral-drift",
    name: "Spectral Drift",
    series: "Chromatic Studies",
    edition: "03 / 175",
    editionSize: 175,
    editionRemaining: 22,
    size: "Large — 100×120cm",
    dimensions: "100 × 120 cm",
    medium: AR_MEDIUM,
    year: 2025,
    price: 1340,
    arDurationSeconds: 36,
    description: "Three colors refusing to resolve into one another, permanently mid-negotiation.",
    imageUrl: "https://images.unsplash.com/photo-1630222927205-d5ffdf3aac59?fm=jpg&q=80&w=1600&auto=format&fit=crop",
  },
  {
    slug: "deep-current",
    name: "Deep Current",
    series: "Chromatic Studies",
    edition: "04 / 300",
    editionSize: 300,
    editionRemaining: 264,
    size: "Standard — 70×90cm",
    dimensions: "70 × 90 cm",
    medium: AR_MEDIUM,
    year: 2023,
    price: 760,
    arDurationSeconds: 28,
    description: "Indigo folding over itself like water at depth — the most affordable entry point into the Chromatic Studies.",
    imageUrl: "https://images.unsplash.com/photo-1599422314077-f4dfdaa4cd09?fm=jpg&q=80&w=1600&auto=format&fit=crop",
  },

  // ── "Wild Portraits" — added at the client's request. Both real, verified
  // Unsplash License photos (free for commercial use, no attribution
  // required) — fetched and confirmed via each photo's own page, not guessed.
  {
    slug: "untamed-study-i",
    name: "Untamed (Study I)",
    series: "Wild Portraits",
    edition: "01 / 175",
    editionSize: 175,
    editionRemaining: 121,
    size: "Large — 90×120cm",
    dimensions: "90 × 120 cm",
    medium: AR_MEDIUM,
    year: 2025,
    price: 980,
    arDurationSeconds: 32,
    description: "A black horse held mid-stillness against a stable's dark. The AR layer sets its mane and breath in motion.",
    imageUrl: "https://images.unsplash.com/photo-1756835506989-9130ff1c4d62?fm=jpg&q=80&w=1600&auto=format&fit=crop",
  },
  {
    slug: "veiled",
    name: "Veiled",
    series: "Wild Portraits",
    edition: "02 / 120",
    editionSize: 120,
    editionRemaining: 58,
    size: "Standard — 80×100cm",
    dimensions: "80 × 100 cm",
    medium: AR_MEDIUM,
    year: 2025,
    price: 1420,
    arDurationSeconds: 30,
    description: "A face composed behind sheer fabric, eyes closed in quiet withholding. The AR layer lifts and settles the veil on a slow, private rhythm.",
    imageUrl: "https://images.unsplash.com/photo-1705941469812-37d919182bb5?fm=jpg&q=80&w=1600&auto=format&fit=crop",
  },
];

async function main() {
  for (const p of products) {
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: p,   // re-running this script updates existing rows in place
      create: p,
    });
  }
  console.log(`Seeded/updated ${products.length} products.`);
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
