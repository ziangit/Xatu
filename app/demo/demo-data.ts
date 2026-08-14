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
 * Sample teams offered by the builder's "use existing" and the lookup demo's
 * "or try" row. User-chosen (2026-08-13), all Champions Reg M-B, all fetched
 * verbatim from pokepast.es — the export text round-trips losslessly, so a
 * sample behaves exactly like a team the reader pasted in themselves.
 *
 * `label` is ours: a short archetype tag that fits a picker row. The paste's
 * own title and URL are recorded above each entry so provenance survives.
 */
export const SAMPLE_TEAMS: { label: string; text: string }[] = [
  // Huyubare's Ranked Season M-4 3rd Place Team 442E6DPRET
  // https://pokepast.es/e9d1cbb36f03d559
  {
    label: "Mega Aerodactyl + Zard Y",
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
