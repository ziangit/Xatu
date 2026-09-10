import type { Guide, Rule } from "@/lib/schema";
import { yoshimapGuide } from "@/lib/schema/fixtures/yoshimap-sand-staraptor";

/**
 * Demo-only data: the acceptance fixture extended with turn 2–3 branches so the
 * demo has something to reveal on every turn. Each added rule is lifted from
 * prose already in the fixture's `reason`/`gameplan` text — the fixture itself
 * stays the untouched Phase 1 acceptance gate.
 */

const demoRulesByPlan: Record<string, Rule[]> = {
  "plan-default": [
    {
      id: "demo-r-chomp-t2",
      turn: 2,
      conditions: [{ kind: "opponentSwitchesIn", species: "Garchomp" }],
      actions: [
        { species: "Milotic", action: { move: "Icy Wind" } },
        { species: "Tyranitar", action: { move: "Knock Off" } },
      ],
      reason:
        "The expected pivot. Icy Wind blunts Garchomp's speed while Knock Off " +
        "takes its Life Orb — momentum stays with you.",
    },
    {
      id: "demo-r-gambit-t3",
      turn: 3,
      conditions: [{ kind: "opponentSwitchesIn", species: "Kingambit" }],
      actions: [{ species: "Milotic", action: { move: "Haze" } }],
      reason:
        "Defiant turns your Icy Winds into free attack boosts for Kingambit — " +
        "Haze resets it before it snowballs.",
    },
  ],
  "plan-sylveon": [
    {
      id: "demo-r-tailwind-t2",
      turn: 2,
      conditions: [{ kind: "tailwindUp", side: "opponent" }],
      actions: [
        { species: "Gholdengo", action: { protect: true } },
        { species: "Milotic", action: { move: "Icy Wind" } },
      ],
      reason:
        "Stall their Tailwind turns out with Protect and pivots, then set your " +
        "own speed control.",
    },
  ],
  "plan-tr": [
    {
      id: "demo-r-tr-t3",
      turn: 3,
      conditions: [{ kind: "trickRoomUp" }],
      actions: [
        { species: "Sinistcha", action: { move: "Rage Powder" } },
        { species: "Milotic", action: { move: "Scald" } },
      ],
      reason:
        "Rage Powder soaks the hits while Scald fishes for burns — Trick Room " +
        "has at most two turns left at this point.",
    },
  ],
};

export const demoGuide: Guide = {
  ...yoshimapGuide,
  matchups: yoshimapGuide.matchups.map((mu) => ({
    ...mu,
    plans: mu.plans.map((plan) => ({
      ...plan,
      rules: [...plan.rules, ...(demoRulesByPlan[plan.id] ?? [])],
    })),
  })),
};

/**
 * The regulation these ten were played in. Stated here rather than taken from
 * `FORMATS[0]`, which is whatever regulation is *current* — a sample's
 * regulation describes the paste, so it moves only when the set is replaced,
 * which is what this constant makes deliberate. Replacing the set (2026-08-13,
 * then 2026-09-10) means revisiting this line with it.
 */
export const SAMPLE_FORMAT = "[Gen 9 Champions] VGC 2026 Reg M-C";

/**
 * Sample teams offered by the builder's "use existing" and the lookup demo's
 * "or try" row. User-chosen 2026-09-10 from the first weekend of Regulation
 * M-C online tournaments, and explicitly **temporary** — a snapshot of an
 * opening metagame, meant to be replaced once M-C settles. The previous M-B
 * set is in git history if it is ever wanted back.
 *
 * All ten fetched verbatim from pokepast.es: the export text round-trips
 * losslessly through `importTeamText`, so picking a sample is indistinguishable
 * from pasting the same link yourself. Do not hand-trim EVs, natures or the
 * trailing whitespace Showdown emits.
 *
 * `label` is ours: a short archetype tag that fits a picker row. The paste's
 * own title and URL are recorded above each entry so provenance survives.
 */
export const SAMPLE_TEAMS: { label: string; text: string }[] = [
  // Salamence Big Six — by LenVGC
  // https://pokepast.es/7f7e07bf0f953b0a
  {
    label: "Salamence Big Six",
    text: `Salamence @ Salamencite  
Ability: Intimidate  
EVs: 2 HP / 32 SpA / 32 Spe  
Timid Nature  
- Hyper Voice  
- Flamethrower  
- Draco Meteor  
- Protect  

Floette-Eternal @ Floettite  
Ability: Flower Veil  
EVs: 20 HP / 21 Def / 5 SpA / 20 Spe  
Modest Nature  
- Moonblast  
- Dazzling Gleam  
- Light of Ruin  
- Protect  

Basculegion @ Life Orb  
Ability: Adaptability  
EVs: 4 HP / 31 Atk / 11 Def / 20 Spe  
Adamant Nature  
- Wave Crash  
- Last Respects  
- Aqua Jet  
- Protect  

Sneasler @ White Herb  
Ability: Unburden  
EVs: 20 HP / 31 Def / 15 Spe  
Jolly Nature  
- Fake Out  
- Dire Claw  
- Close Combat  
- Rock Tomb  

Kingambit @ Chople Berry  
Ability: Defiant  
EVs: 31 HP / 25 Atk / 2 Def / 8 Spe  
Adamant Nature  
- Kowtow Cleave  
- Low Kick  
- Iron Head  
- Sucker Punch  

Whimsicott @ Focus Sash  
Ability: Prankster  
EVs: 2 HP / 32 SpA / 32 Spe  
Timid Nature  
- Moonblast  
- Encore  
- Tailwind  
- Protect  

`,
  },
  // Sand Salamence — by LenVGC
  // https://pokepast.es/8d10dc6e316e86b0
  {
    label: "Salamence Sand",
    text: `Salamence @ Salamencite  
Ability: Intimidate  
EVs: 2 Atk / 32 SpA / 32 Spe  
Serious Nature  
- Double-Edge  
- Hyper Voice  
- Tailwind  
- Protect  

Sneasler @ Psychic Seed  
Ability: Unburden  
EVs: 2 HP / 32 Atk / 32 Spe  
Jolly Nature  
- Dire Claw  
- Close Combat  
- Throat Chop  
- Protect  

Indeedee @ Choice Scarf  
Ability: Psychic Surge  
EVs: 2 HP / 32 SpA / 32 Spe  
Timid Nature  
- Expanding Force  
- Dazzling Gleam  
- Trick  
- Mystical Fire  

Tyranitar @ Tyranitarite  
Ability: Sand Stream  
EVs: 32 HP / 32 Atk / 2 SpD  
Adamant Nature  
- Knock Off  
- Rock Slide  
- Dragon Dance  
- Protect  

Excadrill @ Focus Sash  
Ability: Sand Rush  
EVs: 2 HP / 32 Atk / 32 Spe  
Adamant Nature  
- Rock Slide  
- Iron Head  
- High Horsepower  
- Protect  

Milotic @ Sitrus Berry  
Ability: Competitive  
EVs: 32 HP / 11 Def / 10 SpA / 13 Spe  
Modest Nature  
- Scald  
- Ice Beam  
- Icy Wind  
- Protect  

`,
  },
  // Salamence Charizard — by LenVGC
  // https://pokepast.es/ede01efa45931c7c
  {
    label: "Salamence + Charizard",
    text: `Salamence @ Salamencite  
Ability: Intimidate  
EVs: 2 HP / 32 SpA / 32 Spe  
Hasty Nature  
- Hyper Voice  
- Tailwind  
- Double-Edge  
- Protect  

Charizard @ Charizardite Y  
Ability: Blaze  
EVs: 22 HP / 20 Def / 11 SpA / 13 Spe  
Modest Nature  
- Heat Wave  
- Weather Ball  
- Ancient Power  
- Protect  

Rillaboom @ Sitrus Berry  
Ability: Grassy Surge  
EVs: 32 HP / 5 Atk / 21 SpD / 8 Spe  
Adamant Nature  
- Fake Out  
- Wood Hammer  
- Grassy Glide  
- U-turn  

Kingambit @ Life Orb  
Ability: Defiant  
EVs: 30 HP / 32 Atk / 1 SpD / 3 Spe  
Adamant Nature  
- Kowtow Cleave  
- Iron Head  
- Sucker Punch  
- Protect  

Sylveon @ Fairy Feather  
Ability: Pixilate  
EVs: 9 HP / 22 Def / 20 SpA / 15 Spe  
Modest Nature  
- Hyper Beam  
- Hyper Voice  
- Quick Attack  
- Detect  

Sneasler @ Grassy Seed  
Ability: Unburden  
EVs: 32 HP / 10 Atk / 7 Def / 17 Spe  
Adamant Nature  
- Fake Out  
- Close Combat  
- Dire Claw  
- Protect  

`,
  },
  // Baxcalibur Ninetales — by LenVGC
  // https://pokepast.es/134747480705edc0
  {
    label: "Baxcalibur + Ninetales",
    text: `Baxcalibur @ Baxcalibrite  
Ability: Thermal Exchange  
EVs: 32 HP / 23 Atk / 5 SpD / 6 Spe  
Adamant Nature  
- Glaive Rush  
- Ice Shard  
- Swords Dance  
- Protect  

Ninetales-Alola @ Light Clay  
Ability: Snow Warning  
EVs: 5 HP / 7 Def / 22 SpA / 32 Spe  
Timid Nature  
- Aurora Veil  
- Blizzard  
- Moonblast  
- Protect  

Sneasler @ Grassy Seed  
Ability: Unburden  
EVs: 32 HP / 10 Atk / 7 Def / 17 Spe  
Adamant Nature  
- Close Combat  
- Dire Claw  
- Coaching  
- Fake Out  

Basculegion @ Mystic Water  
Ability: Adaptability  
EVs: 20 Atk / 14 Def / 32 Spe  
Jolly Nature  
- Last Respects  
- Aqua Jet  
- Wave Crash  
- Protect  

Rillaboom @ Miracle Seed  
Ability: Grassy Surge  
EVs: 17 HP / 32 Atk / 9 SpD / 8 Spe  
Adamant Nature  
- Fake Out  
- Grassy Glide  
- Wood Hammer  
- High Horsepower  

Incineroar @ Sitrus Berry  
Ability: Intimidate  
EVs: 30 HP / 21 Def / 13 SpD / 2 Spe  
Impish Nature  
- Fake Out  
- Flare Blitz  
- Darkest Lariat  
- Parting Shot  

`,
  },
  // Baxcalibur Staraptor Balance — by LenVGC
  // https://pokepast.es/01069fa4762c8613
  {
    label: "Baxcalibur Balance",
    text: `Baxcalibur @ Baxcalibrite  
Ability: Thermal Exchange  
EVs: 32 HP / 25 Atk / 3 SpD / 6 Spe  
Adamant Nature  
- Icicle Crash  
- Glaive Rush  
- Ice Shard  
- Protect  

Staraptor @ Staraptite  
Ability: Intimidate  
EVs: 29 HP / 1 Atk / 4 SpD / 32 Spe  
Jolly Nature  
- Close Combat  
- Brave Bird  
- Roost  
- Protect  

Volcarona @ Grassy Seed  
Ability: Flame Body  
EVs: 22 HP / 21 Def / 23 Spe  
Timid Nature  
- Quiver Dance  
- Heat Wave  
- Giga Drain  
- Protect  

Rillaboom @ Occa Berry  
Ability: Grassy Surge  
EVs: 32 HP / 5 Atk / 21 SpD / 8 Spe  
Adamant Nature  
- Wood Hammer  
- Grassy Glide  
- U-turn  
- Fake Out  

Basculegion @ Life Orb  
Ability: Adaptability  
EVs: 4 HP / 28 Atk / 2 Def / 32 Spe  
Adamant Nature  
- Protect  
- Wave Crash  
- Last Respects  
- Aqua Jet  

Whimsicott @ Focus Sash  
Ability: Prankster  
EVs: 2 HP / 32 SpA / 32 Spe  
Modest Nature  
- Tailwind  
- Moonblast  
- Encore  
- Tickle  

`,
  },
  // New Perish Snorlax — by LenVGC
  // https://pokepast.es/60458cc1a20c2440
  {
    label: "Perish + Rillaboom",
    text: `Gengar @ Gengarite  
Ability: Cursed Body  
EVs: 30 HP / 19 Def / 1 SpA / 11 SpD / 5 Spe  
Modest Nature  
- Perish Song  
- Shadow Ball  
- Sludge Bomb  
- Protect  

Snorlax @ Leftovers  
Ability: Thick Fat  
EVs: 32 HP / 32 Def / 2 SpD  
Relaxed Nature  
- Yawn  
- Encore  
- Fissure  
- Protect  

Incineroar @ Sitrus Berry  
Ability: Intimidate  
EVs: 31 HP / 21 Def / 14 SpD  
Relaxed Nature  
- Flare Blitz  
- Parting Shot  
- Fake Out  
- Protect  

Scrafty @ Focus Sash  
Ability: Intimidate  
EVs: 32 HP / 32 Def / 2 SpD  
Impish Nature  
- Close Combat  
- Knock Off  
- Fake Out  
- Protect  

Dragonite @ Life Orb  
Ability: Inner Focus  
EVs: 32 HP / 26 Atk / 8 Spe  
Adamant Nature  
- Dragon Claw  
- Low Kick  
- Extreme Speed  
- Protect  

Rillaboom @ Eject Button  
Ability: Grassy Surge  
EVs: 32 HP / 4 Def / 30 SpD  
Sassy Nature  
- Grassy Glide  
- U-turn  
- Fake Out  
- Protect  

`,
  },
  // Lucario CM — by LenVGC
  // https://pokepast.es/36cd120de5ec394c
  {
    label: "Lucario Z Balance",
    text: `Lucario @ Lucarionite Z  
Ability: Inner Focus  
EVs: 17 HP / 32 Def / 17 Spe  
Timid Nature  
- Aura Sphere  
- Calm Mind  
- Flash Cannon  
- Protect  

Aerodactyl @ Aerodactylite  
Ability: Unnerve  
EVs: 2 HP / 32 Atk / 32 Spe  
Jolly Nature  
- Rock Slide  
- Tailwind  
- Dual Wingbeat  
- Wide Guard  

Incineroar @ Sitrus Berry  
Ability: Intimidate  
EVs: 31 HP / 21 Def / 7 SpD / 7 Spe  
Impish Nature  
- Flare Blitz  
- Throat Chop  
- Parting Shot  
- Fake Out  

Rillaboom @ Miracle Seed  
Ability: Grassy Surge  
EVs: 17 HP / 32 Atk / 9 SpD / 8 Spe  
Adamant Nature  
- Grassy Glide  
- U-turn  
- Fake Out  
- Wood Hammer  

Primarina @ Leftovers  
Ability: Liquid Voice  
EVs: 28 HP / 1 Def / 14 SpA / 23 Spe  
Modest Nature  
- Hyper Voice  
- Moonblast  
- Calm Mind  
- Protect  

Sneasler @ Grassy Seed  
Ability: Unburden  
EVs: 32 HP / 10 Atk / 7 Def / 17 Spe  
Adamant Nature  
- Close Combat  
- Dire Claw  
- Swords Dance  
- Protect  

`,
  },
  // Golisopod Rain Team — by LenVGC
  // https://pokepast.es/11f6986b45453ef1
  {
    label: "Golisopod Rain",
    text: `Golisopod @ Golisopite  
Ability: Emergency Exit  
EVs: 32 HP / 32 Atk / 2 SpD  
Adamant Nature  
- Leech Life  
- Iron Head  
- Close Combat  
- Protect  

Swampert @ Swampertite  
Ability: Damp  
EVs: 11 HP / 32 Atk / 23 Spe  
Adamant Nature  
- Wave Crash  
- Earthquake  
- Ice Punch  
- Protect  

Grimmsnarl @ Light Clay  
Ability: Prankster  
EVs: 32 HP / 19 Def / 15 SpD  
Calm Nature  
- Foul Play  
- Parting Shot  
- Reflect  
- Light Screen  

Pelipper @ Focus Sash  
Ability: Drizzle  
EVs: 32 SpA / 32 Spe  
Timid Nature  
- Hurricane  
- Weather Ball  
- Tailwind  
- Wide Guard  

Archaludon @ Leftovers  
Ability: Stamina  
EVs: 32 HP / 6 SpA / 25 SpD / 3 Spe  
Modest Nature  
- Electro Shot  
- Dragon Pulse  
- Flash Cannon  
- Protect  

Sinistcha @ Sitrus Berry  
Ability: Hospitality  
EVs: 32 HP / 13 Def / 21 SpD  
Relaxed Nature  
- Matcha Gotcha  
- Rage Powder  
- Trick Room  
- Protect  

`,
  },
  // Hard Trick Room — by LenVGC
  // https://pokepast.es/a01935f376869c15
  {
    label: "Psyspam Trick Room",
    text: `Crabominable @ Crabominite  
Ability: Hyper Cutter  
EVs: 32 HP / 32 Atk / 2 SpD  
Brave Nature  
- Ice Hammer  
- Drain Punch  
- Rock Slide  
- Protect  

Camerupt @ Cameruptite  
Ability: Solid Rock  
EVs: 32 HP / 2 Def / 32 SpA  
Quiet Nature  
- Heat Wave  
- Ancient Power  
- Earth Power  
- Protect  

Indeedee-F @ Rocky Helmet  
Ability: Psychic Surge  
EVs: 32 HP / 32 Def / 2 SpD  
Relaxed Nature  
- Trick Room  
- Helping Hand  
- Follow Me  
- Psychic  

Hatterene @ Life Orb  
Ability: Magic Bounce  
EVs: 27 HP / 7 Def / 32 SpA  
Quiet Nature  
- Expanding Force  
- Dazzling Gleam  
- Trick Room  
- Protect  

Armarouge @ Psychic Seed  
Ability: Flash Fire  
EVs: 29 HP / 1 Def / 32 SpA / 4 SpD  
Quiet Nature  
- Trick Room  
- Aura Sphere  
- Heat Wave  
- Expanding Force  

Gallade @ Sitrus Berry  
Ability: Sharpness  
EVs: 32 HP / 32 Atk / 2 Def  
Brave Nature  
- Trick Room  
- Wide Guard  
- Psycho Cut  
- Sacred Sword  

`,
  },
  // Blastoise Terrain — by LenVGC
  // https://pokepast.es/0addcf1b3a357c71
  {
    label: "Blastoise Terrain Pulse",
    text: `Blastoise @ Blastoisinite  
Ability: Rain Dish  
Modest Nature  
- Water Spout  
- Terrain Pulse  
- Shell Smash  
- Protect  

Hawlucha @ Hawluchanite  
Ability: Limber  
Jolly Nature  
- Cross Chop  
- Dual Wingbeat  
- Entrainment  
- Detect  

Snorlax @ Leftovers  
Ability: Thick Fat  
Relaxed Nature  
- Fissure  
- Smack Down  
- Stockpile  
- Protect  

Indeedee-F @ Rocky Helmet  
Ability: Psychic Surge  
Bold Nature  
- Alluring Voice  
- Follow Me  
- Trick Room  
- Heal Pulse  

Rillaboom @ Occa Berry  
Ability: Grassy Surge  
Adamant Nature  
- Grassy Glide  
- Wood Hammer  
- High Horsepower  
- Fake Out  

Incineroar @ Sitrus Berry  
Ability: Intimidate  
Relaxed Nature  
- Flare Blitz  
- Parting Shot  
- Fake Out  
- Assurance  

`,
  },
];
