import type { Artist, Artwork } from "./types";

export const ARTIST: Artist = {
  name: "Ama Antwiwaa Amponsah",
  based: "United Kingdom",
  born: 2006,
  bio: [
    "Ama Antwiwaa Amponsah — known as Triple \"A\" — is a young British/Ghanaian autistic artist who began practicing visual arts around age three. Diagnosed with Autism Spectrum Disorder early on, she found solace and expression through art, developing a language built from drawing, painting, collage, and layered textures.",
    "Her expressive portrait series, mixed-media collages, and mini installations have gained international recognition. A piece selected as the cover image for The Lancet Child & Adolescent Health (February 2024) and a solo showing at the GUBA Foundation's Autism Awareness & Acceptance Exhibition in London brought her work to a wide audience — including Lord Paul Boateng, Danny Sapani, June Sarpong, and Hugh Quarshie. She is a recipient of the GUBA Rising Star Award (2023).",
  ],
  statement:
    "Through colour, form, and texture I communicate what words cannot reach. Each piece is a world built from layers — cardboard, paint, cut paper — woven together into something that holds emotion, memory, and meaning all at once.",
};

// Static fallback — replaced by Firestore data at runtime.
// Lot numbers mirror the actual image filenames.
const LOT_COLORS = [
  { color: "#c9a87c", accent: "#5c3d1e" },
  { color: "#b85c4a", accent: "#3a1a14" },
  { color: "#7a9e8a", accent: "#1f3a2a" },
  { color: "#d4b8a0", accent: "#5a3e2b" },
  { color: "#4a6a9e", accent: "#1a2a4a" },
  { color: "#e8c86c", accent: "#5a3a10" },
];

const AAA_LOTS = Array.from({ length: 31 }, (_, i) => `AAA${i + 1}`);
const TA_LOTS = [4,5,6,7,9,10,11,12,13,14,15,16,17,18,19,20,21].map((n) => `TA${n}`);
const TRIPPLE_LOTS = ["Tripple A 1", "Tripple A 2", "Tripple A 3"];

export const ARTWORKS: Artwork[] = [...AAA_LOTS, ...TA_LOTS, ...TRIPPLE_LOTS].map(
  (lotNumber, i) => ({
    id: lotNumber,
    lotNumber,
    price: 0,
    category: "",
    ...LOT_COLORS[i % LOT_COLORS.length],
    order: i,
  })
);

export const CATEGORIES = ["All", "Painting", "Drawing", "Print"] as const;
export const SERIES = [...new Set(ARTWORKS.map((a) => a.series))];

export function getVariants(a: Artwork) {
  const out = [
    {
      id: "print-sm",
      label: "Print, small",
      sub: "A4 · open edition · giclée",
      price: Math.round((a.price || 200) * 0.06 + 80),
    },
    {
      id: "print",
      label: "Print, standard",
      sub: `${a.dimensions ?? "Standard size"} · giclée on Hahnemühle`,
      price: Math.round((a.price || 200) * 0.15 + 140),
    },
  ];
  if (!a.edition || a.edition.startsWith("Original")) {
    out.push({
      id: "original",
      label: "Original",
      sub: "1 of 1 · signed verso",
      price: a.price || 0,
    });
  } else if (a.edition.startsWith("Edition")) {
    out.push({
      id: "edition",
      label: "Numbered edition",
      sub: a.edition.toLowerCase() + " · signed",
      price: a.price,
    });
  }
  return out;
}
