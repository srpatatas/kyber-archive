type Aspect = "Aggression" | "Command" | "Cunning" | "Vigilance";

interface BaseProps {
  aspect: Aspect | null;
  hp: number;
  unique: boolean;
  trait?: string;
}

const ASPECT_COLORS: Record<Aspect, string> = {
  Aggression: "Red",
  Command: "Green",
  Cunning: "Yellow",
  Vigilance: "Blue",
};

const BASE_MAP: Record<string, BaseProps> = {
  // ── Common 30HP (vanilla, no ability) ──────────────────────────
  // Aggression
  "Ancient Henge":          { aspect: "Aggression", hp: 30, unique: false },
  "Catacombs of Cadera":    { aspect: "Aggression", hp: 30, unique: false },
  "Death Watch Hideout":    { aspect: "Aggression", hp: 30, unique: false },
  "Dragonsnake Bog":        { aspect: "Aggression", hp: 30, unique: false },
  "Imperial Prison Complex": { aspect: "Aggression", hp: 30, unique: false },
  "KCM Mining Facility":    { aspect: "Aggression", hp: 30, unique: false },
  "Kestro City":            { aspect: "Aggression", hp: 30, unique: false },
  "Massassi Temple":        { aspect: "Aggression", hp: 30, unique: false },
  "Nadiri Dockyards":       { aspect: "Aggression", hp: 30, unique: false },
  "Naval Intelligence HQ":  { aspect: "Aggression", hp: 30, unique: false },
  "Spice Mines":            { aspect: "Aggression", hp: 30, unique: false },
  "The Nest":               { aspect: "Aggression", hp: 30, unique: false },
  // Command
  "Command Center":         { aspect: "Command", hp: 30, unique: false },
  "Echo Base":              { aspect: "Command", hp: 30, unique: false },
  "Emperor's Throne Room":  { aspect: "Command", hp: 30, unique: false },
  "Kryze Castle":           { aspect: "Command", hp: 30, unique: false },
  "Lair of Grievous":       { aspect: "Command", hp: 30, unique: false },
  "Maz Kanata's Castle":    { aspect: "Command", hp: 30, unique: false },
  "Nevarro City":           { aspect: "Command", hp: 30, unique: false },
  "Republic City":          { aspect: "Command", hp: 30, unique: false },
  "Resistance Headquarters": { aspect: "Command", hp: 30, unique: false },
  "Senate Rotunda":         { aspect: "Command", hp: 30, unique: false },
  "Theed Palace":           { aspect: "Command", hp: 30, unique: false },
  "Tipoca City":            { aspect: "Command", hp: 30, unique: false },
  // Cunning
  "Administrator's Tower":  { aspect: "Cunning", hp: 30, unique: false },
  "Amnesty Housing":        { aspect: "Cunning", hp: 30, unique: false },
  "Chopper Base":           { aspect: "Cunning", hp: 30, unique: false },
  "Coronet City":           { aspect: "Cunning", hp: 30, unique: false },
  "Emperor's Observatory":  { aspect: "Cunning", hp: 30, unique: false },
  "Freetown":               { aspect: "Cunning", hp: 30, unique: false },
  "Jabba's Palace":         { aspect: "Cunning", hp: 30, unique: false },
  "Level 1313":             { aspect: "Cunning", hp: 30, unique: false },
  "Mos Eisley":             { aspect: "Cunning", hp: 30, unique: false },
  "Mount Tantiss":          { aspect: "Cunning", hp: 30, unique: false },
  "Pyke Palace":            { aspect: "Cunning", hp: 30, unique: false },
  // Vigilance
  "Capital City":           { aspect: "Vigilance", hp: 30, unique: false },
  "City in the Clouds":     { aspect: "Vigilance", hp: 30, unique: false },
  "Dagobah Swamp":          { aspect: "Vigilance", hp: 30, unique: false },
  "Fortress of the Great Mothers": { aspect: "Vigilance", hp: 30, unique: false },
  "Nevarro City, Restored": { aspect: "Vigilance", hp: 30, unique: false },
  "Remnant Science Facility": { aspect: "Vigilance", hp: 30, unique: false },
  "Remote Village":         { aspect: "Vigilance", hp: 30, unique: false },
  "Rix Road":               { aspect: "Vigilance", hp: 30, unique: false },
  "Shield Generator Complex": { aspect: "Vigilance", hp: 30, unique: false },
  "Sundari":                { aspect: "Vigilance", hp: 30, unique: false },
  "The Crystal City":       { aspect: "Vigilance", hp: 30, unique: false },
  "Uscru Entertainment District": { aspect: "Vigilance", hp: 30, unique: false },

  // ── Force 28HP (Legends of the Force — Force token on attack) ──
  "Crystal Caves":          { aspect: "Cunning", hp: 28, unique: false, trait: "Force" },
  "Fortress Vader":         { aspect: "Aggression", hp: 28, unique: false, trait: "Force" },
  "Jedi Temple":            { aspect: "Command", hp: 28, unique: false, trait: "Force" },
  "Nightsister Lair":       { aspect: "Vigilance", hp: 28, unique: false, trait: "Force" },
  "Shadowed Undercity":     { aspect: "Vigilance", hp: 28, unique: false, trait: "Force" },
  "Starlight Temple":       { aspect: "Command", hp: 28, unique: false, trait: "Force" },
  "Strangled Cliffs":       { aspect: "Aggression", hp: 28, unique: false, trait: "Force" },
  "The Holy City":          { aspect: "Cunning", hp: 28, unique: false, trait: "Force" },

  // ── Splash 27HP (Lawless — Epic Action: play card ignoring 1 aspect penalty) ──
  "Aldhani Garrison":       { aspect: "Command", hp: 27, unique: false, trait: "Splash" },
  "Canto Bight":            { aspect: "Cunning", hp: 27, unique: false, trait: "Splash" },
  "Coaxium Mine":           { aspect: "Vigilance", hp: 27, unique: false, trait: "Splash" },
  "Contested Caverns":      { aspect: "Aggression", hp: 27, unique: false, trait: "Splash" },
  "Daimyo's Palace":        { aspect: "Vigilance", hp: 27, unique: false, trait: "Splash" },
  "Imperial Command Complex": { aspect: "Command", hp: 27, unique: false, trait: "Splash" },
  "Partisan Hideout":       { aspect: "Cunning", hp: 27, unique: false, trait: "Splash" },
  "Stygeon Spire":          { aspect: "Aggression", hp: 27, unique: false, trait: "Splash" },

  // ── Rare / Special bases (unique abilities, keep individual name) ──
  "Colossus":               { aspect: "Vigilance", hp: 35, unique: true },
  "Data Vault":             { aspect: "Command", hp: 33, unique: true },
  "Dooku's Palace":         { aspect: "Command", hp: 27, unique: true },
  "Droid Manufactory":      { aspect: "Command", hp: 24, unique: true },
  "Echo Caverns":           { aspect: "Cunning", hp: 20, unique: true },
  "Energy Conversion Lab":  { aspect: "Command", hp: 25, unique: true },
  "Executioner's Arena":    { aspect: "Aggression", hp: 27, unique: true },
  "First Battle Memorial":  { aspect: "Vigilance", hp: 27, unique: true },
  "Forward Command Post":   { aspect: "Vigilance", hp: 20, unique: true },
  "Great Pit of Carkoon":   { aspect: "Command", hp: 27, unique: true },
  "Jedha City":             { aspect: "Cunning", hp: 25, unique: true },
  "Lake Country":           { aspect: null, hp: 34, unique: true },
  "Alliance Outpost":       { aspect: "Vigilance", hp: 26, unique: true },
  "Citadel Research Center": { aspect: "Cunning", hp: 26, unique: true },
  "Mystic Monastery":       { aspect: "Command", hp: 25, unique: true },
  "Nabat Village":          { aspect: "Cunning", hp: 27, unique: true },
  "Pau City":               { aspect: "Vigilance", hp: 26, unique: true },
  "Petranaki Arena":        { aspect: "Cunning", hp: 26, unique: true },
  "Security Complex":       { aspect: "Vigilance", hp: 25, unique: true },
  "Shadow Collective Camp": { aspect: "Aggression", hp: 25, unique: true },
  "Shipbreaking Yard":      { aspect: "Aggression", hp: 26, unique: true },
  "Sundari Palace":         { aspect: "Cunning", hp: 27, unique: true },
  "Tarkintown":             { aspect: "Aggression", hp: 25, unique: true },
  "Temple of Destruction":  { aspect: "Aggression", hp: 25, unique: true },
  "Thermal Oscillator":     { aspect: "Aggression", hp: 27, unique: true },
  "Tomb of Eilram":         { aspect: "Cunning", hp: 25, unique: true },
  "Vergence Temple":        { aspect: "Vigilance", hp: 25, unique: true },
};

export interface NormalizedBase {
  key: string;
  display: string;
  aspect: string | null;
  hp: number;
}

export function normalizeBase(baseName: string): NormalizedBase {
  const props = BASE_MAP[baseName];

  if (!props) {
    return { key: baseName.toLowerCase(), display: baseName, aspect: null, hp: 0 };
  }

  if (props.unique) {
    return {
      key: `unique:${baseName.toLowerCase()}`,
      display: baseName,
      aspect: props.aspect,
      hp: props.hp,
    };
  }

  const color = props.aspect ? ASPECT_COLORS[props.aspect] : "Neutral";
  const trait = props.trait ? `${props.trait} ` : "";
  const display = `${trait}${color} ${props.hp}HP`;
  const key = `${(props.trait ?? "").toLowerCase()}:${(props.aspect ?? "neutral").toLowerCase()}:${props.hp}`;

  return { key, display, aspect: props.aspect, hp: props.hp };
}

export function getBaseAspectColor(baseName: string): string | null {
  const props = BASE_MAP[baseName];
  if (!props?.aspect) return null;
  return ASPECT_COLORS[props.aspect];
}
