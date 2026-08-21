// Seeds/repopulates the product catalog. Safe to re-run any time — upsert
// matches on `slug` (stable, never changes), so this updates existing rows
// in place instead of throwing duplicate-key errors or creating dupes.
//
// Run: node prisma/seed.js

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// price = kobo (NGN), priceUSD = cents. priceUSD is an authored display
// price, not a live FX conversion — update both by hand if you reprice.
const AR_MEDIUM = "Archival pigment print on canvas, embedded S.A.I. augmented reality layer";

const products = [
  // ── Verified real pieces (images sourced from Guardian Nigeria's 2021 feature) ──
  {
    slug: "mammon",
    name: "Mammon",
    series: "S.A.I. Series",
    edition: "04 / 1111",
    size: "Standard — 20×28in",
    dimensions: "20 × 28 in / 51 × 71 cm",
    medium: AR_MEDIUM,
    year: 2024,
    price: 35000000,
    priceUSD: 22000,
    description: "Edition 4 of 1,111 — a study in inherited excess, scanned to reveal its second, moving layer.",
    imageUrl: "https://cdn.guardian.ng/wp-content/uploads/2021/08/IMG_2098.jpeg",
  },
  {
    slug: "ojuelegba",
    name: "Ojuelegba",
    series: "S.A.I. Series",
    edition: "07 / 1111",
    size: "Standard — 20×28in",
    dimensions: "20 × 28 in / 51 × 71 cm",
    medium: AR_MEDIUM,
    year: 2024,
    price: 35000000,
    priceUSD: 22000,
    description: "Edition 7 of 1,111 — named for the Lagos junction, built from the geometry of its noise.",
    imageUrl: "https://cdn.guardian.ng/wp-content/uploads/2021/08/IMG_2101.jpeg",
  },
  {
    slug: "eko-market",
    name: "Eko Market",
    series: "S.A.I. Series",
    edition: "11 / 1111",
    size: "Standard — 20×28in",
    dimensions: "20 × 28 in / 51 × 71 cm",
    medium: AR_MEDIUM,
    year: 2024,
    price: 35000000,
    priceUSD: 22000,
    description: "Edition 11 of 1,111 — market color and motion, systematically abstracted.",
    imageUrl: "https://cdn.guardian.ng/wp-content/uploads/2021/08/IMG_2103.jpeg",
  },
  {
    slug: "nature-of-being",
    name: "Nature of Being",
    series: "S.A.I. Series",
    edition: "01 / 1111",
    size: "Large — 28×40in",
    dimensions: "28 × 40 in / 71 × 102 cm",
    medium: AR_MEDIUM,
    year: 2023,
    price: 55000000,
    priceUSD: 34500,
    description: "Edition 1 of 1,111 — the collection's founding piece.",
    imageUrl: "https://cdn.guardian.ng/wp-content/uploads/2021/08/IMG_2099.jpeg",
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
    size: "Standard — 20×28in",
    dimensions: "20 × 28 in / 51 × 71 cm",
    medium: AR_MEDIUM,
    year: 2024,
    price: 40000000,
    priceUSD: 25000,
    description: "[Placeholder — staging only] Edition 2 of 1,111.",
    imageUrl: "https://picsum.photos/seed/1111-lagos-interlude/1200/1500",
  },
  {
    slug: "second-sight",
    name: "Second Sight",
    series: "S.A.I. Series",
    edition: "03 / 1111",
    size: "Standard — 20×28in",
    dimensions: "20 × 28 in / 51 × 71 cm",
    medium: AR_MEDIUM,
    year: 2024,
    price: 45000000,
    priceUSD: 28000,
    description: "[Placeholder — staging only] Edition 3 of 1,111.",
    imageUrl: "https://picsum.photos/seed/1111-second-sight/1200/1500",
  },
  {
    slug: "ancestral-frequency",
    name: "Ancestral Frequency",
    series: "S.A.I. Series",
    edition: "05 / 1111",
    size: "Standard — 20×28in",
    dimensions: "20 × 28 in / 51 × 71 cm",
    medium: AR_MEDIUM,
    year: 2024,
    price: 48000000,
    priceUSD: 30000,
    description: "[Placeholder — staging only] Edition 5 of 1,111.",
    imageUrl: "https://picsum.photos/seed/1111-ancestral-frequency/1200/1500",
  },
  {
    slug: "wade-in-static",
    name: "Wade in Static",
    series: "S.A.I. Series",
    edition: "06 / 1111",
    size: "Standard — 20×28in",
    dimensions: "20 × 28 in / 51 × 71 cm",
    medium: AR_MEDIUM,
    year: 2025,
    price: 50000000,
    priceUSD: 31000,
    description: "[Placeholder — staging only] Edition 6 of 1,111.",
    imageUrl: "https://picsum.photos/seed/1111-wade-in-static/1200/1500",
  },
  {
    slug: "ile-ori",
    name: "Ilé-Orí",
    series: "S.A.I. Series",
    edition: "08 / 1111",
    size: "Standard — 20×28in",
    dimensions: "20 × 28 in / 51 × 71 cm",
    medium: AR_MEDIUM,
    year: 2025,
    price: 52000000,
    priceUSD: 32500,
    description: "[Placeholder — staging only] Edition 8 of 1,111.",
    imageUrl: "https://picsum.photos/seed/1111-ile-ori/1200/1500",
  },
  {
    slug: "threshold-study-i",
    name: "Threshold Study I",
    series: "S.A.I. Series",
    edition: "09 / 1111",
    size: "Large — 28×40in",
    dimensions: "28 × 40 in / 71 × 102 cm",
    medium: AR_MEDIUM,
    year: 2025,
    price: 60000000,
    priceUSD: 37500,
    description: "[Placeholder — staging only] Edition 9 of 1,111.",
    imageUrl: "https://picsum.photos/seed/1111-threshold-study-i/1200/1500",
  },
  {
    slug: "obsidian-choir",
    name: "Obsidian Choir",
    series: "S.A.I. Series",
    edition: "10 / 1111",
    size: "Large — 28×40in",
    dimensions: "28 × 40 in / 71 × 102 cm",
    medium: AR_MEDIUM,
    year: 2025,
    price: 65000000,
    priceUSD: 40500,
    description: "[Placeholder — staging only] Edition 10 of 1,111.",
    imageUrl: "https://picsum.photos/seed/1111-obsidian-choir/1200/1500",
  },
  {
    slug: "unfolding",
    name: "Unfolding",
    series: "S.A.I. Series",
    edition: "12 / 1111",
    size: "Large — 28×40in",
    dimensions: "28 × 40 in / 71 × 102 cm",
    medium: AR_MEDIUM,
    year: 2025,
    price: 75000000,
    priceUSD: 47000,
    description: "[Placeholder — staging only] Edition 12 of 1,111.",
    imageUrl: "https://picsum.photos/seed/1111-unfolding/1200/1500",
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
