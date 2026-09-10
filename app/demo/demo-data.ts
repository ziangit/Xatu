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
 * Sample teams offered by the builder’s "use existing" list and the lookup
 * demo’s "or try" row. Two regulations on purpose: M-C is current, but M-B
 * teams are still played and still worth planning against, so the list lets you
 * pick which set you are looking at rather than deciding for you.
 *
 * **Each entry states its own regulation.** Never derive it from `FORMATS[0]`:
 * that is whichever regulation is *current*, so the samples would relabel
 * themselves the moment the ladder rotated — which is exactly the bug that
 * shipped once already. A sample’s regulation describes the paste.
 *
 * The M-C ten are user-chosen from the opening weekend of M-C online
 * tournaments (2026-09-10) and are **temporary** — a snapshot of a metagame a
 * week old. The M-B eight have been here since 2026-08-13.
 *
 * All fetched verbatim from pokepast.es: the export text round-trips losslessly
 * through `importTeamText`, so picking a sample is indistinguishable from
 * pasting the same link yourself. Do not hand-trim EVs, natures, or the
 * trailing whitespace Showdown emits.
 *
 * `label` is ours: a short archetype tag that fits a picker row. The paste’s
 * own title and URL sit above each entry, and are the only provenance there is.
 */
export const SAMPLE_TEAMS: {
  label: string;
  format: string;
  text: string;
}[] = [
  // Salamence Big Six — by LenVGC
  // https://pokepast.es/7f7e07bf0f953b0a
  {
    label: "Salamence Big Six",
    format: "[Gen 9 Champions] VGC 2026 Reg M-C",
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
    format: "[Gen 9 Champions] VGC 2026 Reg M-C",
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
    format: "[Gen 9 Champions] VGC 2026 Reg M-C",
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
    format: "[Gen 9 Champions] VGC 2026 Reg M-C",
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
    format: "[Gen 9 Champions] VGC 2026 Reg M-C",
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
    format: "[Gen 9 Champions] VGC 2026 Reg M-C",
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
    format: "[Gen 9 Champions] VGC 2026 Reg M-C",
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
    format: "[Gen 9 Champions] VGC 2026 Reg M-C",
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
    format: "[Gen 9 Champions] VGC 2026 Reg M-C",
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
    format: "[Gen 9 Champions] VGC 2026 Reg M-C",
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
  // LenVGC's Gardevoir HTR Team 93U7AF0CAB — by VGCPastes
  // https://pokepast.es/b409f9d80e8f830b
  {
    label: "Gardevoir Trick Room",
    format: "[Gen 9 Champions] VGC 2026 Reg M-C",
    text: `Indeedee-F (F) @ Sitrus Berry  
Ability: Psychic Surge  
Level: 50  
EVs: 32 HP / 32 Def / 2 SpD  
Relaxed Nature  
- Terrain Pulse  
- Helping Hand  
- Follow Me  
- Trick Room  

Armarouge @ Life Orb  
Ability: Flash Fire  
Level: 50  
EVs: 29 HP / 32 SpA / 5 SpD  
Quiet Nature  
- Expanding Force  
- Armor Cannon  
- Trick Room  
- Protect  

Torkoal @ Charcoal  
Ability: Drought  
Level: 50  
EVs: 32 HP / 1 Def / 32 SpA / 1 SpD  
Quiet Nature  
- Eruption  
- Weather Ball  
- Helping Hand  
- Protect  

Kingambit @ Black Glasses  
Ability: Defiant  
Level: 50  
EVs: 32 HP / 32 Atk / 2 SpD  
Brave Nature  
- Kowtow Cleave  
- Sucker Punch  
- Low Kick  
- Swords Dance  

Gardevoir @ Gardevoirite  
Ability: Trace  
Level: 50  
EVs: 28 HP / 17 Def / 10 SpA / 11 Spe  
Modest Nature  
- Hyper Voice  
- Expanding Force  
- Trick Room  
- Protect  

Sneasler @ Psychic Seed  
Ability: Unburden  
Level: 50  
EVs: 1 HP / 32 Atk / 1 Def / 32 Spe  
Adamant Nature  
- Close Combat  
- Dire Claw  
- Throat Chop  
- Protect  

`,
  },
  // Huyubare's Ranked Season M-4 3rd Place Team 442E6DPRET
  // https://pokepast.es/e9d1cbb36f03d559
  {
    label: "Mega Aerodactyl + Zard Y",
    format: "[Gen 9 Champions] VGC 2026 Reg M-B",
    text: `Aerodactyl (M) @ Aerodactylite  
Ability: Unnerve  
Level: 50  
EVs: 16 HP / 18 Atk / 32 Spe  
Jolly Nature  
- Rock Slide  
- Dual Wingbeat  
- Ice Fang  
- Tailwind  

Kingambit (M) @ Focus Sash  
Ability: Defiant  
Level: 50  
EVs: 32 Atk / 2 SpD / 32 Spe  
Adamant Nature  
- Kowtow Cleave  
- Iron Head  
- Sucker Punch  
- Low Kick  

Farigiraf (F) @ Sitrus Berry  
Ability: Armor Tail  
Level: 50  
EVs: 29 HP / 21 Def / 16 SpD  
Quiet Nature  
- Psychic  
- Thunderbolt  
- Trick Room  
- Protect  

Sylveon (F) @ Fairy Feather  
Ability: Pixilate  
Level: 50  
EVs: 21 HP / 25 Def / 13 SpA / 7 Spe  
Modest Nature  
- Hyper Voice  
- Yawn  
- Quick Attack  
- Detect  

Charizard (M) @ Charizardite Y  
Ability: Blaze  
Level: 50  
EVs: 22 HP / 20 Def / 11 SpA / 13 Spe  
Modest Nature  
- Heat Wave  
- Solar Beam  
- Weather Ball  
- Protect  

Garchomp (M) @ Life Orb  
Ability: Rough Skin  
Level: 50  
EVs: 6 HP / 28 Atk / 32 Spe  
Jolly Nature  
- Earthquake  
- Dragon Claw  
- Stomping Tantrum  
- Protect  
`,
  },
  // kion_sion's Ranked Season M-4 356th Place Team
  // https://pokepast.es/081b17158a12aad4
  {
    label: "Mega Tyranitar sand",
    format: "[Gen 9 Champions] VGC 2026 Reg M-B",
    text: `Tyranitar @ Tyranitarite  
Ability: Sand Stream  
Level: 50  
EVs: 16 HP / 18 Atk / 32 Spe  
Jolly Nature  
- Knock Off  
- Rock Slide  
- Low Kick  
- Protect  

Excadrill @ Focus Sash  
Ability: Sand Rush  
Level: 50  
EVs: 31 Atk / 3 Def / 32 Spe  
Adamant Nature  
- Iron Head  
- High Horsepower  
- Rock Slide  
- Protect  

Sinistcha @ Colbur Berry  
Ability: Hospitality  
Level: 50  
EVs: 29 HP / 8 Def / 24 SpD / 5 Spe  
Bold Nature  
- Matcha Gotcha  
- Shadow Ball  
- Protect  
- Rage Powder  

Milotic @ Sitrus Berry  
Ability: Competitive  
Level: 50  
EVs: 18 HP / 22 Def / 11 SpA / 15 Spe  
Modest Nature  
- Scald  
- Ice Beam  
- Icy Wind  
- Protect  

Gholdengo @ Life Orb  
Ability: Good as Gold  
Level: 50  
EVs: 17 HP / 17 Def / 32 Spe  
Modest Nature  
- Shadow Ball  
- Make It Rain  
- Protect  
- Nasty Plot  

Staraptor @ Staraptite  
Ability: Intimidate  
Level: 50  
EVs: 15 HP / 19 Def / 32 Spe  
Jolly Nature  
- Brave Bird  
- Close Combat  
- Protect  
- Tailwind  
`,
  },
  // Jong One Moon's VR August Challenge Top 16 Team
  // https://pokepast.es/7162daf50fbbd097
  {
    label: "Mega Froslass + Sneasler",
    format: "[Gen 9 Champions] VGC 2026 Reg M-B",
    text: `Froslass @ Froslassite  
Ability: Cursed Body  
Modest Nature  
- Blizzard  
- Shadow Ball  
- Aurora Veil  
- Protect  

Scovillain @ Scovillainite  
Ability: Moody  
Bold Nature  
- Overheat  
- Giga Drain  
- Rage Powder  
- Protect  

Sneasler @ White Herb  
Ability: Unburden  
Adamant Nature  
- Gunk Shot  
- Close Combat  
- Fake Out  
- Protect  

Kingambit @ Black Glasses  
Ability: Defiant  
Adamant Nature  
- Kowtow Cleave  
- Sucker Punch  
- Swords Dance  
- Protect  

Basculegion @ Sitrus Berry  
Ability: Adaptability  
Adamant Nature  
- Wave Crash  
- Last Respects  
- Aqua Jet  
- Protect  

Lycanroc-Dusk @ Focus Sash  
Ability: Tough Claws  
Adamant Nature  
- Rock Slide  
- Close Combat  
- Accelerock  
- Protect  
`,
  },
  // zeen's Recreation of LexiconVGC's Grand Champions Festival Encore Champion Team EMHMY5SAK0
  // https://pokepast.es/4f4d18cccd280c1a
  {
    label: "Grimmsnarl screens + Zard Y",
    format: "[Gen 9 Champions] VGC 2026 Reg M-B",
    text: `Grimmsnarl (M) @ Light Clay  
Ability: Prankster  
Level: 50  
EVs: 31 HP / 20 Def / 15 SpD  
Sassy Nature  
- Spirit Break  
- Parting Shot  
- Reflect  
- Light Screen  

Basculegion (M) @ Choice Scarf  
Ability: Adaptability  
Level: 50  
EVs: 32 Atk / 2 Def / 32 Spe  
Jolly Nature  
- Last Respects  
- Wave Crash  
- Aqua Jet  
- Flip Turn  

Charizard @ Charizardite Y  
Ability: Blaze  
Level: 50  
EVs: 22 HP / 21 Def / 5 SpA / 18 Spe  
Modest Nature  
- Protect  
- Heat Wave  
- Weather Ball  
- Solar Beam  

Pelipper @ Sitrus Berry  
Ability: Drizzle  
Level: 50  
EVs: 31 HP / 7 Def / 15 SpA / 13 Spe  
Modest Nature  
- Hurricane  
- Weather Ball  
- Tailwind  
- Wide Guard  

Venusaur @ Focus Sash  
Ability: Chlorophyll  
Level: 50  
EVs: 2 HP / 32 SpA / 32 Spe  
Modest Nature  
- Sludge Bomb  
- Sleep Powder  
- Earth Power  
- Protect  

Archaludon @ Leftovers  
Ability: Stamina  
Level: 50  
EVs: 32 HP / 2 Def / 25 SpD / 7 Spe  
Calm Nature  
- Electro Shot  
- Dragon Pulse  
- Flash Cannon  
- Protect  
`,
  },
  // VR July Challenge Team Recreation T1VCT4PYJK
  // https://pokepast.es/c14e01047941281a
  {
    label: "Mega Staraptor + Delphox",
    format: "[Gen 9 Champions] VGC 2026 Reg M-B",
    text: `Staraptor (F) @ Staraptite  
Ability: Intimidate  
Level: 50  
EVs: 15 HP / 19 Atk / 32 Spe  
Jolly Nature  
- Brave Bird  
- Close Combat  
- Roost  
- Protect  

Delphox (F) @ Delphoxite  
Ability: Blaze  
Level: 50  
EVs: 7 HP / 18 Def / 9 SpA / 32 Spe  
Timid Nature  
- Heat Wave  
- Psychic  
- Encore  
- Protect  

Whimsicott (F) @ Occa Berry  
Ability: Prankster  
Level: 50  
EVs: 24 HP / 10 SpD / 32 Spe  
Timid Nature  
- Moonblast  
- Tailwind  
- Charm  
- Light Screen  

Glimmora (F) @ Focus Sash  
Ability: Toxic Debris  
Level: 50  
EVs: 2 Def / 32 SpA / 32 Spe  
Timid Nature  
- Power Gem  
- Sludge Bomb  
- Earth Power  
- Spiky Shield  

Garchomp (M) @ Life Orb  
Ability: Rough Skin  
Level: 50  
EVs: 2 HP / 32 Atk / 32 Spe  
Jolly Nature  
- Dragon Claw  
- Earthquake  
- Rock Slide  
- Protect  

Kingambit (M) @ Chople Berry  
Ability: Defiant  
Level: 50  
EVs: 32 HP / 26 Atk / 7 Def / 1 Spe  
Adamant Nature  
- Kowtow Cleave  
- Iron Head  
- Sucker Punch  
- Low Kick  
`,
  },
  // seita_poke's Ranked Season M-3 10th Place Team
  // https://pokepast.es/bafda91db6a9f6df
  {
    label: "Zard Y + Whimsicott",
    format: "[Gen 9 Champions] VGC 2026 Reg M-B",
    text: `Garchomp @ Life Orb  
Ability: Rough Skin  
Level: 50  
EVs: 2 HP / 32 Atk / 32 Spe  
Jolly Nature  
- Dragon Claw  
- Earthquake  
- Rock Slide  
- Protect  

Charizard @ Charizardite Y  
Ability: Blaze  
Level: 50  
EVs: 4 HP / 16 Def / 22 SpA / 24 Spe  
Modest Nature  
- Heat Wave  
- Solar Beam  
- Ancient Power  
- Protect  

Whimsicott @ Focus Sash  
Ability: Prankster  
Level: 50  
EVs: 2 HP / 32 SpA / 32 Spe  
Timid Nature  
- Moonblast  
- Tailwind  
- Encore  
- Protect  

Sylveon @ Fairy Feather  
Ability: Pixilate  
Level: 50  
EVs: 18 HP / 32 SpA / 16 Spe  
Modest Nature  
- Hyper Voice  
- Hyper Beam  
- Quick Attack  
- Detect  

Kingambit @ Black Glasses  
Ability: Supreme Overlord  
Level: 50  
EVs: 2 HP / 32 Atk / 32 Spe  
Adamant Nature  
- Kowtow Cleave  
- Iron Head  
- Sucker Punch  
- Low Kick  

Basculegion @ Mystic Water  
Ability: Adaptability  
Level: 50  
EVs: 6 HP / 32 Atk / 8 Def / 20 Spe  
Adamant Nature  
- Last Respects  
- Wave Crash  
- Aqua Jet  
- Protect  
`,
  },
  // Santino's Ranked Season M-3 36th Place Team
  // https://pokepast.es/293c35b1cce99977
  {
    label: "Mega Blastoise + Delphox",
    format: "[Gen 9 Champions] VGC 2026 Reg M-B",
    text: `Delphox @ Delphoxite  
Ability: Blaze  
Level: 50  
EVs: 24 HP / 1 Def / 21 SpA / 20 Spe  
Modest Nature  
- Protect  
- Nasty Plot  
- Heat Wave  
- Psyshock  

Blastoise @ Blastoisinite  
Ability: Rain Dish  
Level: 50  
EVs: 2 HP / 32 SpA / 32 Spe  
Modest Nature  
- Protect  
- Shell Smash  
- Water Spout  
- Dark Pulse  

Sneasler @ White Herb  
Ability: Unburden  
Level: 50  
EVs: 29 HP / 19 Def / 18 Spe  
Jolly Nature  
- Close Combat  
- Gunk Shot  
- Fake Out  
- Rain Dance  

Incineroar @ Sitrus Berry  
Ability: Intimidate  
Level: 50  
EVs: 31 HP / 21 Def / 14 Spe  
Impish Nature  
- Flare Blitz  
- Fake Out  
- Throat Chop  
- Parting Shot  

Sinistcha @ Kasib Berry  
Ability: Hospitality  
Level: 50  
EVs: 32 HP / 19 Def / 12 SpD / 3 Spe  
Bold Nature  
- Protect  
- Matcha Gotcha  
- Rage Powder  
- Life Dew  

Maushold-Four @ Focus Sash  
Ability: Friend Guard  
Level: 50  
EVs: 32 HP / 2 Def / 32 Spe  
Jolly Nature  
- Protect  
- Follow Me  
- Super Fang  
- Feint  
`,
  },
  // Rinya's Ranked Season M-3 2nd Place Team XRKCF3D3C8
  // https://pokepast.es/90159766947b173c
  {
    label: "Zard Y sun + Venusaur",
    format: "[Gen 9 Champions] VGC 2026 Reg M-B",
    text: `Charizard @ Charizardite Y  
Ability: Blaze  
Level: 50  
EVs: 28 HP / 27 Def / 11 SpA  
Modest Nature  
- Heat Wave  
- Weather Ball  
- Helping Hand  
- Protect  

Venusaur @ Life Orb  
Ability: Chlorophyll  
Level: 50  
EVs: 2 HP / 32 SpA / 32 Spe  
Modest Nature  
- Leaf Storm  
- Sludge Bomb  
- Earth Power  
- Protect  

Mamoswine @ Focus Sash  
Ability: Oblivious  
Level: 50  
EVs: 2 HP / 32 Atk / 32 Spe  
Jolly Nature  
- High Horsepower  
- Rock Tomb  
- Ice Shard  
- Protect  

Garchomp @ Choice Scarf  
Ability: Rough Skin  
Level: 50  
EVs: 2 HP / 32 Atk / 32 Spe  
Adamant Nature  
- Dragon Claw  
- Earthquake  
- Rock Slide  
- Stomping Tantrum  

Incineroar @ Sitrus Berry  
Ability: Intimidate  
Level: 50  
EVs: 32 HP / 10 Def / 14 SpD / 10 Spe  
Impish Nature  
- Flare Blitz  
- Throat Chop  
- Parting Shot  
- Fake Out  

Toxapex @ Leftovers  
Ability: Regenerator  
Level: 50  
EVs: 32 HP / 21 Def / 13 SpD  
Bold Nature  
- Toxic  
- Infestation  
- Wide Guard  
- Baneful Bunker  
`,
  },
];
