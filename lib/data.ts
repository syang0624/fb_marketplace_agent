// PedalBot v3 — seller persona templates + fallback seeded listings.
//
// v3 does NOT use pre-seeded listings as the main path. They exist only as a
// fallback when the ScrapeCreators API fails during the demo, and the UI labels
// them with source "seeded_fallback".

import { Listing, SellerPersona } from "@/lib/types";

// --- Seller persona templates ----------------------------------------------
// Used to give simulated negotiations distinct, demonstrable behaviors. The
// `persona_from_listing` LLM mode produces these live; templates are the
// deterministic fallback and the source of the three demo archetypes.

export interface PersonaTemplate {
  name: string;
  style: string;
  concessionPattern: SellerPersona["concessionPattern"];
  hiddenInfo: string;
}

export const personaTemplates: PersonaTemplate[] = [
  {
    name: "Mike",
    style: "friendly and responsive",
    concessionPattern: "easy_drop",
    hiddenInfo: "has another buyer interested but prefers a quick pickup",
  },
  {
    name: "Sarah",
    style: "firm on price but willing to include extras",
    concessionPattern: "firm_price",
    hiddenInfo:
      "can include a saddle bag and spare tubes if buyer does not push too hard on price",
  },
  {
    name: "Dave",
    style: "brief and slightly evasive",
    concessionPattern: "condition_issue",
    hiddenInfo: "the bike had a fork replacement after a crash, revealed only when asked directly",
  },
  {
    name: "Jen",
    style: "slow replies but honest",
    concessionPattern: "slow_reply",
    hiddenInfo: "available only on Sunday afternoon",
  },
];

// Price floor multiplier per concession pattern — how low this seller will go.
const FLOOR_MULTIPLIER: Record<SellerPersona["concessionPattern"], number> = {
  easy_drop: 0.7,
  firm_price: 0.92,
  condition_issue: 0.78,
  slow_reply: 0.85,
};

// Build a deterministic SellerPersona from a listing using rotating templates.
// `index` keeps the three demo lanes distinct (easy / firm / condition issue).
export function personaFromTemplate(listing: Listing, index = 0): SellerPersona {
  const template = personaTemplates[index % personaTemplates.length];
  const floor = Math.max(Math.round(listing.price * FLOOR_MULTIPLIER[template.concessionPattern]), 5);
  return {
    name: template.name,
    style: template.style,
    priceFloor: Math.min(floor, listing.price),
    hiddenInfo: template.hiddenInfo,
    concessionPattern: template.concessionPattern,
  };
}

// Back-compat alias for the frontend (app/page.tsx). Same behavior as
// personaFromTemplate; `index` is optional and derived from the listing id.
export function getSellerPersona(listing: Listing, index?: number): SellerPersona {
  const resolvedIndex =
    index ?? (Number.isFinite(parseInt(listing.id, 10)) ? parseInt(listing.id, 10) - 1 : 0);
  return personaFromTemplate(listing, Math.max(0, resolvedIndex));
}

// --- Fallback seeded listings ----------------------------------------------
// Real bike data captured from Marketplace, reshaped into the v3 Listing model.
// Marked source "seeded_fallback" so the UI can badge them clearly.

function seeded(
  partial: Omit<Listing, "images" | "link" | "condition"> &
    Partial<Pick<Listing, "images" | "link" | "condition">>
): Listing {
  return {
    condition: "",
    ...partial,
    images: partial.images ?? (partial.image ? [partial.image] : []),
    link: partial.link ?? partial.url ?? "",
  };
}

export const fallbackListings: Listing[] = [
  seeded({
    id: "fallback-1",
    url: "https://www.facebook.com/marketplace/item/949813030755462/",
    title: "Comfortable Step-through Women's Bike",
    price: 65,
    fairValue: 90,
    condition: "Good",
    specs: "Step-through cruiser frame, geared, upright bars, comfort saddle, size small (~5'5\")",
    image:
      "https://scontent-sjc3-1.xx.fbcdn.net/v/t39.84726-6/660845486_1975701266359431_7571238812037129340_n.jpg",
    sellerName: "Marketplace Seller",
    distance: "6 mi away",
    location: "Oakland, CA",
    listingDateText: "3 days ago",
    availabilityText: "available",
    description:
      "Comfortable, easy-to-ride step-through cruiser with gears — good condition, just needs a little oil. Step-through frame, upright handlebars, cushioned saddle, kickstand. Brakes and gears work well. Local pickup Oakland.",
    source: "seeded_fallback",
    riskFlags: [],
  }),
  seeded({
    id: "fallback-2",
    url: "https://www.facebook.com/marketplace/item/1503580751149128/",
    title: "REI Novara X-R Mountain / Hybrid Bike",
    price: 95,
    fairValue: 130,
    condition: "Good (drivetrain issue)",
    specs: "Small frame (~5'4\"), hybrid/mountain geometry",
    image:
      "https://scontent-sjc3-1.xx.fbcdn.net/v/t39.84726-6/654344836_1059043643951958_4443841547276345281_n.jpg",
    sellerName: "Marketplace Seller",
    distance: "9 mi away",
    location: "San Francisco, CA",
    listingDateText: "5 days ago",
    availabilityText: "available",
    description:
      "Small frame bike that fits somebody around 5'4\". Good condition except it does not power the back wheel when pedaling — cause unknown.",
    source: "seeded_fallback",
    riskFlags: ["drivetrain issue: rear wheel not powered", "cause of fault unknown"],
  }),
  seeded({
    id: "fallback-3",
    url: "https://www.facebook.com/marketplace/item/2002892227106263/",
    title: "Trek 2300 Small Road Bike, 51-52 cm",
    price: 100,
    fairValue: 220,
    condition: "Used - Fair",
    specs: "Trek 2300 ZR 9000 alloy, 51-52cm, 27-speed Shimano Ultegra, Bontrager carbon fork, 19.6 lbs",
    image:
      "https://scontent-sjc6-1.xx.fbcdn.net/v/t39.84726-6/662076950_876523125417865_8160940716534133978_n.jpg",
    sellerName: "Marketplace Seller",
    distance: "12 mi away",
    location: "San Jose, CA",
    listingDateText: "2 days ago",
    availabilityText: "available",
    description:
      "Trek 2300 ZR 9000 Custom Alloy road bike, 51-52cm, made in USA, 27 speed Shimano Ultegra. Cash only. No price change.",
    source: "seeded_fallback",
    riskFlags: ["seller states no price change"],
  }),
  seeded({
    id: "fallback-4",
    url: "https://www.facebook.com/marketplace/item/819371031217917/",
    title: "Schwinn Fastback Aluminum Road Bike",
    price: 225,
    fairValue: 320,
    condition: "Used - Good",
    specs:
      "7005 aluminum road frame, 700c wheels, drop bars, Shimano triple drivetrain, SPD pedals included",
    image:
      "https://scontent-sjc3-1.xx.fbcdn.net/v/t39.84726-6/662308565_2299508373908319_1969563371482225677_n.jpg",
    sellerName: "Marketplace Seller",
    distance: "8 mi away",
    location: "San Francisco, CA",
    listingDateText: "1 day ago",
    availabilityText: "available",
    description:
      "Schwinn Fastback road bike in good working condition. Lightweight aluminum, road geometry, 700c wheels, drop bars with upgraded tape, Shimano triple crankset, SPD pedals included. Recently inspected, shifts and brakes work. $225 OBO.",
    source: "seeded_fallback",
    riskFlags: [],
  }),
  seeded({
    id: "fallback-5",
    url: "https://www.facebook.com/marketplace/item/1749614599345484/",
    title: "Factor One Road Bike",
    price: 3800,
    fairValue: 5200,
    condition: "Used - like new",
    specs: "2018 Factor One, full Dura-Ace Di2, ENVE wheelset, rim brakes, 58cm",
    image:
      "https://scontent-sjc3-1.xx.fbcdn.net/v/t39.84726-6/637266767_3039975079533772_1084340314368125365_n.jpg",
    sellerName: "Marketplace Seller",
    distance: "15 mi away",
    location: "San Francisco, CA",
    listingDateText: "1 week ago",
    availabilityText: "available",
    description: "2018 Factor One. Full Dura Ace Di2. ENVE wheelset. Rim brakes. Size 58cm.",
    source: "seeded_fallback",
    riskFlags: [],
  }),
];

// Back-compat alias for the frontend (app/page.tsx uses `demoListings`).
export const demoListings: Listing[] = fallbackListings;
