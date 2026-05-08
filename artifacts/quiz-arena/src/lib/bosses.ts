// Progressive boss ladder — weakest anime → strongest. Each boss has its own
// signature visual + sound effect (referenced via animeVfx VfxKind / SfxKind).
import type { VfxKind, SfxKind } from "./animeVfx";

export type Boss = {
  id: string;
  name: string;          // boss display name
  anime: string;         // source anime
  emoji: string;         // avatar
  color: string;         // hsl theme color
  hp: number;
  // Damage on a wrong answer (the boss's attack on the player)
  attack: number;
  // Signature ability shown when the boss attacks
  signature: {
    name: string;
    tagline: string;
    glyph: string;
    fx: VfxKind;
    sfx: SfxKind;
  };
};

// Tier 1 (weakest) -> Tier 8 (strongest). Tuned so a full run is ~7-9 wins.
export const BOSSES: Boss[] = [
  {
    id: "spike",
    name: "Spike Spiegel",
    anime: "Cowboy Bebop",
    emoji: "🤠",
    color: "hsl(30 70% 55%)",
    hp: 50,
    attack: 6,
    signature: {
      name: "Jeet Kune Do",
      tagline: "Whatever happens, happens.",
      glyph: "👊",
      fx: "burst",
      sfx: "punch",
    },
  },
  {
    id: "kenshin",
    name: "Himura Kenshin",
    anime: "Rurouni Kenshin",
    emoji: "⚔️",
    color: "hsl(0 75% 55%)",
    hp: 70,
    attack: 8,
    signature: {
      name: "Hiten Mitsurugi-ryū",
      tagline: "Battōjutsu — Sōryūsen!",
      glyph: "🗡️",
      fx: "slash",
      sfx: "sword",
    },
  },
  {
    id: "muzan",
    name: "Muzan Kibutsuji",
    anime: "Demon Slayer",
    emoji: "🩸",
    color: "hsl(345 90% 50%)",
    hp: 95,
    attack: 11,
    signature: {
      name: "Spider Blood Art",
      tagline: "Threads of crimson devour all.",
      glyph: "🕷️",
      fx: "blood",
      sfx: "rumble",
    },
  },
  {
    id: "kaido",
    name: "Kaido of the Beasts",
    anime: "One Piece",
    emoji: "🐲",
    color: "hsl(15 85% 50%)",
    hp: 120,
    attack: 13,
    signature: {
      name: "Boro Breath",
      tagline: "Strongest creature alive.",
      glyph: "🔥",
      fx: "beam",
      sfx: "fire",
    },
  },
  {
    id: "dio",
    name: "DIO",
    anime: "JoJo's Bizarre Adventure",
    emoji: "🟡",
    color: "hsl(50 100% 55%)",
    hp: 145,
    attack: 15,
    signature: {
      name: "ZA WARUDO — MUDA RUSH",
      tagline: "Toki yo tomare!",
      glyph: "⏱️",
      fx: "stand",
      sfx: "punch",
    },
  },
  {
    id: "sukuna",
    name: "Ryomen Sukuna",
    anime: "Jujutsu Kaisen",
    emoji: "⛩️",
    color: "hsl(0 85% 55%)",
    hp: 175,
    attack: 18,
    signature: {
      name: "Malevolent Shrine",
      tagline: "Cleave. Dismantle.",
      glyph: "⛩️",
      fx: "domain",
      sfx: "domain",
    },
  },
  {
    id: "gilgamesh",
    name: "Gilgamesh",
    anime: "Fate",
    emoji: "👑",
    color: "hsl(48 100% 60%)",
    hp: 210,
    attack: 21,
    signature: {
      name: "Enuma Elish",
      tagline: "Sword of Rupture — kneel.",
      glyph: "🌌",
      fx: "beam",
      sfx: "blast",
    },
  },
  {
    id: "beerus",
    name: "Beerus, God of Destruction",
    anime: "Dragon Ball",
    emoji: "🟣",
    color: "hsl(290 80% 55%)",
    hp: 260,
    attack: 25,
    signature: {
      name: "Hakai",
      tagline: "Erased from existence.",
      glyph: "💥",
      fx: "burst",
      sfx: "rumble",
    },
  },
];

export function getBoss(index: number): Boss {
  return BOSSES[Math.min(index, BOSSES.length - 1)];
}
