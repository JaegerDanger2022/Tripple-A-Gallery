import type { Artist, Artwork } from "./types";

export const ARTIST: Artist = {
  name: "Maren Holloway",
  based: "Edinburgh, Scotland",
  born: 1984,
  bio: [
    "Maren Holloway works between Edinburgh and the north Berwickshire coast. Her recent paintings, drawings and small editions trace a slow, repeating conversation with weather, sediment, and the rooms they pass through.",
    "Trained at the Ruskin and the Royal Drawing School, she has exhibited at Ingleby (Edinburgh), Karsten Schubert (London) and the Drawing Room residency at Skye Sketches. Works are held in the collections of the Fleming Foundation and the British Council.",
  ],
  statement:
    "The work is mostly about staying still long enough for something to arrive. A field, a wall, the same north light at four in the afternoon — repeated until it becomes a piece of furniture you can use.",
};

export const ARTWORKS: Artwork[] = [
  {
    id: "a01",
    title: "Field Study No. 4",
    year: 2024,
    medium: "Oil on linen",
    dimensions: "120 × 90 cm",
    edition: "Original work, 1 of 1",
    price: 4800,
    category: "Painting",
    color: "#c9bba1",
    accent: "#7a6a4f",
    series: "Field Studies",
    blurb:
      "A muted topography of pigment and pause. From a series of nine paintings made over a single winter on the Berwickshire coast.",
  },
  {
    id: "a02",
    title: "Quiet Interior, March",
    year: 2023,
    medium: "Oil on board",
    dimensions: "60 × 80 cm",
    edition: "Original work, 1 of 1",
    price: 3200,
    category: "Painting",
    color: "#e3ddd2",
    accent: "#3b3a36",
    series: "Interiors",
    blurb:
      "The studio interior, observed across an afternoon. One of three small panels begun the week the river thawed.",
  },
  {
    id: "a03",
    title: "Form 12 (Carmine)",
    year: 2025,
    medium: "Acrylic and graphite on board",
    dimensions: "45 × 60 cm",
    edition: "Original work, 1 of 1",
    price: 2400,
    category: "Painting",
    color: "#b94a3b",
    accent: "#2a1815",
    series: "Forms",
    blurb:
      "From an ongoing set of small panels operating as carefully tuned chords — chromatic intervals struck with restraint.",
  },
  {
    id: "a04",
    title: "Salt Plate III",
    year: 2024,
    medium: "Cyanotype on cotton paper",
    dimensions: "30 × 40 cm",
    edition: "Edition of 12",
    price: 480,
    category: "Print",
    color: "#243a5c",
    accent: "#0e1726",
    series: "Salt Plates",
    blurb:
      "Worked as a slow film — exposures measured in afternoons, in tides. Each print is hand-coated and individually marked.",
  },
  {
    id: "a05",
    title: "Two Vessels",
    year: 2022,
    medium: "Charcoal on Arches",
    dimensions: "70 × 100 cm",
    edition: "Original drawing, 1 of 1",
    price: 1800,
    category: "Drawing",
    color: "#d6d0c4",
    accent: "#1a1a1a",
    series: "Drawings",
    blurb:
      "A study of weight and shadow — written, almost, more than drawn. Held in pencil and a single dark line.",
  },
  {
    id: "a06",
    title: "Inland Sea",
    year: 2024,
    medium: "Oil and wax on panel",
    dimensions: "90 × 140 cm",
    edition: "Original work, 1 of 1",
    price: 6800,
    category: "Painting",
    color: "#7b8a7a",
    accent: "#1f2a1f",
    series: "Field Studies",
    blurb:
      "From the same season as Field Study No. 4 — broader, slower, weather rolling in from the left edge.",
  },
  {
    id: "a07",
    title: "Notation (Six Lines)",
    year: 2025,
    medium: "Letterpress on Somerset",
    dimensions: "38 × 56 cm",
    edition: "Edition of 40",
    price: 220,
    category: "Print",
    color: "#f0ece2",
    accent: "#5a5448",
    series: "Notations",
    blurb:
      "Notations sit between score and concrete poem — quiet instructions for an unnamed instrument. Printed by hand at Glasgow Print Studio.",
  },
  {
    id: "a08",
    title: "Greenhouse, 04:12",
    year: 2023,
    medium: "Charcoal and chalk on Somerset",
    dimensions: "80 × 100 cm",
    edition: "Original drawing, 1 of 1",
    price: 2200,
    category: "Drawing",
    color: "#2b3a2c",
    accent: "#0c130c",
    series: "Drawings",
    blurb: "Single bulb, long looking. The plants do most of the speaking.",
  },
  {
    id: "a09",
    title: "Folded Light I",
    year: 2025,
    medium: "Gouache on board",
    dimensions: "30 × 30 cm",
    edition: "Original work, 1 of 1",
    price: 1400,
    category: "Painting",
    color: "#e8b86c",
    accent: "#3a2a10",
    series: "Folded Light",
    blurb:
      "Part of an ongoing series revisiting the same gesture across changing palettes. A small painting that holds an afternoon's warmth.",
  },
  {
    id: "a10",
    title: "Shore Notation II",
    year: 2024,
    medium: "Cyanotype and graphite",
    dimensions: "24 × 32 cm",
    edition: "Edition of 18",
    price: 320,
    category: "Print",
    color: "#3e5a78",
    accent: "#0a1422",
    series: "Salt Plates",
    blurb: "A small marker from a longer walk. Marked, dated and signed verso.",
  },
];

export const CATEGORIES = ["All", "Painting", "Drawing", "Print"] as const;
export const SERIES = [...new Set(ARTWORKS.map((a) => a.series))];

export function getVariants(a: Artwork) {
  const out = [
    {
      id: "print-sm",
      label: "Print, small",
      sub: "A4 · open edition · giclée",
      price: Math.round(a.price * 0.06 + 80),
    },
    {
      id: "print",
      label: "Print, standard",
      sub: `${a.dimensions} · giclée on Hahnemühle`,
      price: Math.round(a.price * 0.15 + 140),
    },
  ];
  if (a.edition.startsWith("Original")) {
    out.push({
      id: "original",
      label: "Original",
      sub: "1 of 1 · signed verso",
      price: a.price,
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
