// Top-10 iconic abilities per anime. Each has emoji glyph(s), color (HSL), tagline, and SFX kind.
export type AnimeKey = "jjk" | "dbz" | "ds" | "op" | "jojo" | "fate";

export type AnimeAbility = {
  anime: AnimeKey;
  animeLabel: string;
  character: string;
  name: string;
  glyph: string;          // big symbol(s) shown center
  color: string;          // hsl(...) used for glow/text
  tagline?: string;       // small text shown briefly
  fx: VfxKind;            // visual style preset
  sfx: SfxKind;           // sound preset
};

export type VfxKind =
  | "slash"        // diagonal blade
  | "beam"         // horizontal energy beam
  | "burst"        // expanding shockwave
  | "domain"       // dome / collapsing rings
  | "flames"       // rising flames
  | "lightning"    // crackling bolts
  | "stars"        // star bursts
  | "bubbles"      // water/bubbles
  | "ice"          // frost
  | "stand"        // jojo aura punches
  | "blood";       // red mist
export type SfxKind =
  | "sword" | "blast" | "thunder" | "domain" | "fire" | "bubble" | "punch" | "rumble" | "ice";

export const ABILITIES: AnimeAbility[] = [
  // ===== Jujutsu Kaisen =====
  { anime: "jjk", animeLabel: "JJK", character: "Gojo", name: "Hollow Purple", glyph: "🟣", color: "hsl(280 90% 60%)", tagline: "Imaginary Mass", fx: "beam", sfx: "blast" },
  { anime: "jjk", animeLabel: "JJK", character: "Gojo", name: "Unlimited Void", glyph: "🌀", color: "hsl(220 90% 65%)", tagline: "Domain Expansion", fx: "domain", sfx: "domain" },
  { anime: "jjk", animeLabel: "JJK", character: "Sukuna", name: "Malevolent Shrine", glyph: "⛩️", color: "hsl(0 80% 55%)", tagline: "Cleave & Dismantle", fx: "domain", sfx: "domain" },
  { anime: "jjk", animeLabel: "JJK", character: "Yuji", name: "Black Flash", glyph: "✊", color: "hsl(260 95% 50%)", tagline: "2.5x impact!", fx: "burst", sfx: "punch" },
  { anime: "jjk", animeLabel: "JJK", character: "Megumi", name: "Mahoraga", glyph: "🐺", color: "hsl(45 100% 55%)", tagline: "Eight-Handled Sword", fx: "slash", sfx: "sword" },
  { anime: "jjk", animeLabel: "JJK", character: "Nanami", name: "Ratio Technique", glyph: "⚖️", color: "hsl(40 90% 55%)", tagline: "7:3 weak point", fx: "slash", sfx: "sword" },
  { anime: "jjk", animeLabel: "JJK", character: "Toji", name: "Heavenly Restriction", glyph: "🗡️", color: "hsl(0 0% 80%)", tagline: "Pure physical might", fx: "slash", sfx: "sword" },
  { anime: "jjk", animeLabel: "JJK", character: "Jogo", name: "Maximum Meteor", glyph: "☄️", color: "hsl(15 95% 55%)", tagline: "Disaster Flame", fx: "flames", sfx: "fire" },
  { anime: "jjk", animeLabel: "JJK", character: "Mahito", name: "Idle Transfiguration", glyph: "🫧", color: "hsl(170 60% 60%)", tagline: "Soul reshape", fx: "burst", sfx: "rumble" },
  { anime: "jjk", animeLabel: "JJK", character: "Kashimo", name: "Mythical Beast Amber", glyph: "⚡", color: "hsl(50 100% 55%)", tagline: "Lightning storm", fx: "lightning", sfx: "thunder" },

  // ===== Dragon Ball =====
  { anime: "dbz", animeLabel: "DBZ", character: "Goku", name: "Kamehameha", glyph: "🌊", color: "hsl(190 95% 55%)", tagline: "Ka-me-ha-me-HA!", fx: "beam", sfx: "blast" },
  { anime: "dbz", animeLabel: "DBZ", character: "Goku", name: "Spirit Bomb", glyph: "🔵", color: "hsl(200 90% 60%)", tagline: "Lend me your energy!", fx: "burst", sfx: "blast" },
  { anime: "dbz", animeLabel: "DBZ", character: "Vegeta", name: "Final Flash", glyph: "🟡", color: "hsl(50 100% 55%)", tagline: "Burn in oblivion!", fx: "beam", sfx: "blast" },
  { anime: "dbz", animeLabel: "DBZ", character: "Vegeta", name: "Galick Gun", glyph: "🟣", color: "hsl(280 90% 55%)", tagline: "Galick... GUN!", fx: "beam", sfx: "blast" },
  { anime: "dbz", animeLabel: "DBZ", character: "Gohan", name: "Father-Son Kamehameha", glyph: "💥", color: "hsl(180 95% 60%)", tagline: "For my father!", fx: "beam", sfx: "blast" },
  { anime: "dbz", animeLabel: "DBZ", character: "Trunks", name: "Burning Attack", glyph: "🔥", color: "hsl(25 95% 55%)", tagline: "Burning Attack!", fx: "flames", sfx: "fire" },
  { anime: "dbz", animeLabel: "DBZ", character: "Piccolo", name: "Special Beam Cannon", glyph: "🟢", color: "hsl(140 80% 55%)", tagline: "Makankōsappō!", fx: "beam", sfx: "blast" },
  { anime: "dbz", animeLabel: "DBZ", character: "Frieza", name: "Death Ball", glyph: "🟠", color: "hsl(30 95% 55%)", tagline: "Behold true power", fx: "burst", sfx: "blast" },
  { anime: "dbz", animeLabel: "DBZ", character: "Cell", name: "Solar Kamehameha", glyph: "☀️", color: "hsl(48 100% 60%)", tagline: "Perfect form", fx: "beam", sfx: "blast" },
  { anime: "dbz", animeLabel: "DBZ", character: "Beerus", name: "Hakai", glyph: "🟣", color: "hsl(290 80% 50%)", tagline: "Destruction", fx: "burst", sfx: "rumble" },

  // ===== Demon Slayer =====
  { anime: "ds", animeLabel: "Demon Slayer", character: "Tanjiro", name: "Hinokami Kagura", glyph: "🌞", color: "hsl(15 95% 55%)", tagline: "Sun Breathing", fx: "flames", sfx: "fire" },
  { anime: "ds", animeLabel: "Demon Slayer", character: "Tanjiro", name: "Water Wheel", glyph: "💧", color: "hsl(200 95% 60%)", tagline: "Water Breathing", fx: "bubbles", sfx: "bubble" },
  { anime: "ds", animeLabel: "Demon Slayer", character: "Zenitsu", name: "Thunderclap & Flash", glyph: "⚡", color: "hsl(55 100% 60%)", tagline: "God Speed", fx: "lightning", sfx: "thunder" },
  { anime: "ds", animeLabel: "Demon Slayer", character: "Zenitsu", name: "Honoikazuchi no Kami", glyph: "🐉", color: "hsl(50 100% 55%)", tagline: "Fire Tiger", fx: "lightning", sfx: "thunder" },
  { anime: "ds", animeLabel: "Demon Slayer", character: "Inosuke", name: "Beast Breathing", glyph: "🐗", color: "hsl(0 0% 70%)", tagline: "Sixth Fang", fx: "slash", sfx: "sword" },
  { anime: "ds", animeLabel: "Demon Slayer", character: "Rengoku", name: "Flame Tiger", glyph: "🔥", color: "hsl(20 100% 55%)", tagline: "Set your heart ablaze!", fx: "flames", sfx: "fire" },
  { anime: "ds", animeLabel: "Demon Slayer", character: "Giyu", name: "Dead Calm", glyph: "🌊", color: "hsl(210 90% 55%)", tagline: "11th Form", fx: "bubbles", sfx: "bubble" },
  { anime: "ds", animeLabel: "Demon Slayer", character: "Shinobu", name: "Insect Dance", glyph: "🦋", color: "hsl(285 80% 65%)", tagline: "Butterfly Dance", fx: "stars", sfx: "sword" },
  { anime: "ds", animeLabel: "Demon Slayer", character: "Mitsuri", name: "Love Breathing", glyph: "💖", color: "hsl(330 90% 65%)", tagline: "Catlove Shower", fx: "stars", sfx: "sword" },
  { anime: "ds", animeLabel: "Demon Slayer", character: "Muichiro", name: "Mist Breathing 7th", glyph: "🌫️", color: "hsl(180 30% 75%)", tagline: "Obscuring Clouds", fx: "burst", sfx: "sword" },

  // ===== One Piece =====
  { anime: "op", animeLabel: "One Piece", character: "Luffy", name: "Gum-Gum Red Hawk", glyph: "👊", color: "hsl(0 90% 55%)", tagline: "Fire fist!", fx: "flames", sfx: "punch" },
  { anime: "op", animeLabel: "One Piece", character: "Luffy", name: "Gear 5 Bajrang Gun", glyph: "🌕", color: "hsl(45 95% 65%)", tagline: "Sun God Nika", fx: "burst", sfx: "punch" },
  { anime: "op", animeLabel: "One Piece", character: "Zoro", name: "Three-Sword Style: Purgatory Onigiri", glyph: "⚔️", color: "hsl(140 70% 50%)", tagline: "Santōryū", fx: "slash", sfx: "sword" },
  { anime: "op", animeLabel: "One Piece", character: "Zoro", name: "King of Hell: Three-Sword Dragon Twister", glyph: "🐉", color: "hsl(0 0% 30%)", tagline: "Haki imbued", fx: "slash", sfx: "sword" },
  { anime: "op", animeLabel: "One Piece", character: "Sanji", name: "Diable Jambe", glyph: "🦵", color: "hsl(15 95% 55%)", tagline: "Flambage Shot!", fx: "flames", sfx: "fire" },
  { anime: "op", animeLabel: "One Piece", character: "Ace", name: "Fire Fist", glyph: "🔥", color: "hsl(20 100% 55%)", tagline: "Hiken!", fx: "flames", sfx: "fire" },
  { anime: "op", animeLabel: "One Piece", character: "Whitebeard", name: "Gura Gura Quake", glyph: "🟦", color: "hsl(220 80% 55%)", tagline: "Crack the world", fx: "burst", sfx: "rumble" },
  { anime: "op", animeLabel: "One Piece", character: "Kaido", name: "Boro Breath", glyph: "🐲", color: "hsl(0 90% 50%)", tagline: "Strongest creature", fx: "beam", sfx: "fire" },
  { anime: "op", animeLabel: "One Piece", character: "Akainu", name: "Magma Fist", glyph: "🌋", color: "hsl(10 95% 50%)", tagline: "Dai Funka!", fx: "flames", sfx: "fire" },
  { anime: "op", animeLabel: "One Piece", character: "Aokiji", name: "Ice Age", glyph: "❄️", color: "hsl(195 90% 70%)", tagline: "Ice-Ice Fruit", fx: "ice", sfx: "ice" },

  // ===== JoJo =====
  { anime: "jojo", animeLabel: "JoJo", character: "Jotaro", name: "Star Platinum: ORA ORA ORA!", glyph: "💜", color: "hsl(275 80% 60%)", tagline: "Time stop", fx: "stand", sfx: "punch" },
  { anime: "jojo", animeLabel: "JoJo", character: "DIO", name: "The World: MUDA MUDA!", glyph: "🟡", color: "hsl(50 100% 55%)", tagline: "ZA WARUDO", fx: "stand", sfx: "punch" },
  { anime: "jojo", animeLabel: "JoJo", character: "Giorno", name: "Gold Experience Requiem", glyph: "🟨", color: "hsl(50 100% 60%)", tagline: "Return to zero", fx: "burst", sfx: "rumble" },
  { anime: "jojo", animeLabel: "JoJo", character: "Josuke", name: "Crazy Diamond", glyph: "💎", color: "hsl(190 80% 65%)", tagline: "DORARARA!", fx: "stand", sfx: "punch" },
  { anime: "jojo", animeLabel: "JoJo", character: "Bruno", name: "Sticky Fingers", glyph: "🤐", color: "hsl(195 70% 55%)", tagline: "Zipper", fx: "burst", sfx: "punch" },
  { anime: "jojo", animeLabel: "JoJo", character: "Joseph", name: "Hamon Overdrive", glyph: "🌟", color: "hsl(48 100% 60%)", tagline: "Sunlight Yellow", fx: "stars", sfx: "blast" },
  { anime: "jojo", animeLabel: "JoJo", character: "Jolyne", name: "Stone Free", glyph: "🧵", color: "hsl(190 80% 55%)", tagline: "String unraveled", fx: "stand", sfx: "punch" },
  { anime: "jojo", animeLabel: "JoJo", character: "Kakyoin", name: "Emerald Splash", glyph: "💚", color: "hsl(140 80% 55%)", tagline: "Hierophant Green", fx: "burst", sfx: "blast" },
  { anime: "jojo", animeLabel: "JoJo", character: "Polnareff", name: "Silver Chariot Rapier", glyph: "⚔️", color: "hsl(0 0% 85%)", tagline: "Lightning thrust", fx: "slash", sfx: "sword" },
  { anime: "jojo", animeLabel: "JoJo", character: "Diavolo", name: "King Crimson: Time Erasure", glyph: "🟥", color: "hsl(0 90% 50%)", tagline: "Epitaph", fx: "burst", sfx: "rumble" },

  // ===== Fate =====
  { anime: "fate", animeLabel: "Fate", character: "Saber", name: "Excalibur", glyph: "⚔️", color: "hsl(48 100% 65%)", tagline: "Sword of Promised Victory", fx: "beam", sfx: "blast" },
  { anime: "fate", animeLabel: "Fate", character: "Archer", name: "Unlimited Blade Works", glyph: "🗡️", color: "hsl(35 80% 55%)", tagline: "I am the bone of my sword", fx: "domain", sfx: "domain" },
  { anime: "fate", animeLabel: "Fate", character: "Gilgamesh", name: "Gate of Babylon", glyph: "✨", color: "hsl(48 100% 55%)", tagline: "King's Treasury", fx: "stars", sfx: "sword" },
  { anime: "fate", animeLabel: "Fate", character: "Gilgamesh", name: "Enuma Elish", glyph: "🌌", color: "hsl(280 80% 60%)", tagline: "Sword of Rupture", fx: "beam", sfx: "blast" },
  { anime: "fate", animeLabel: "Fate", character: "Rider", name: "Bellerophon", glyph: "🐎", color: "hsl(195 80% 60%)", tagline: "Bridle of Chivalry", fx: "burst", sfx: "rumble" },
  { anime: "fate", animeLabel: "Fate", character: "Lancer", name: "Gáe Bolg", glyph: "🔱", color: "hsl(0 90% 55%)", tagline: "Pierce the heart", fx: "slash", sfx: "sword" },
  { anime: "fate", animeLabel: "Fate", character: "Berserker", name: "Nine Lives", glyph: "💪", color: "hsl(0 0% 60%)", tagline: "Twelve Labors", fx: "burst", sfx: "punch" },
  { anime: "fate", animeLabel: "Fate", character: "Caster (Medea)", name: "Rule Breaker", glyph: "🗝️", color: "hsl(290 70% 60%)", tagline: "All Spells Must Be Broken", fx: "slash", sfx: "sword" },
  { anime: "fate", animeLabel: "Fate", character: "Iskandar", name: "Ionian Hetairoi", glyph: "🏇", color: "hsl(40 90% 55%)", tagline: "Army of the King", fx: "domain", sfx: "rumble" },
  { anime: "fate", animeLabel: "Fate", character: "Karna", name: "Vasavi Shakti", glyph: "🌟", color: "hsl(45 100% 60%)", tagline: "O Sun, Abide to Death", fx: "beam", sfx: "thunder" },
];

export function randomAbility(): AnimeAbility {
  return ABILITIES[Math.floor(Math.random() * ABILITIES.length)];
}
