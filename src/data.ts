import type { Directive, Opponent, Player, ScheduledDay, StaffMember, Team } from "./types.js";

// ---- Roster -----------------------------------------------------------
// 9 starters, 4 bench, 5 pitchers = 18. Kept inside the 14-18 range from
// the design doc; sized to the illustrative example rather than trimmed
// further, since the roster itself costs nothing extra to simulate.

export const roster: Player[] = [
  // Starting hitters
  { id: "ruiz", name: "Deshawn Ruiz", position: "C", role: "regular", isPitcher: false, bat: 52, defense: 68, fatigue: 30, morale: 60, development: 35 },
  { id: "santana", name: "Miguel Santana", position: "1B", role: "regular", isPitcher: false, bat: 58, defense: 55, fatigue: 25, morale: 62, development: 40 },
  { id: "oyelaran", name: "Kenji Osei", position: "2B", role: "regular", isPitcher: false, bat: 54, defense: 60, fatigue: 28, morale: 58, development: 45 },
  { id: "alvarez", name: "Mateo Alvarez", position: "SS", role: "priority_prospect", isPitcher: false, bat: 48, defense: 62, fatigue: 55, morale: 60, development: 40 },
  { id: "brandt", name: "Tyler Brandt", position: "3B", role: "regular", isPitcher: false, bat: 56, defense: 50, fatigue: 32, morale: 55, development: 38 },
  { id: "wallace", name: "Andre Wallace", position: "LF", role: "regular", isPitcher: false, bat: 60, defense: 52, fatigue: 30, morale: 57, development: 42 },
  { id: "fuentes", name: "Diego Fuentes", position: "CF", role: "regular", isPitcher: false, bat: 57, defense: 65, fatigue: 27, morale: 61, development: 44 },
  { id: "peterson", name: "Jamal Peterson", position: "RF", role: "regular", isPitcher: false, bat: 59, defense: 54, fatigue: 29, morale: 59, development: 41 },
  { id: "webb", name: "Marcus Webb", position: "DH", role: "regular", isPitcher: false, bat: 61, defense: 35, fatigue: 26, morale: 56, development: 37 },

  // Bench -- Cobb lives here on purpose: he's the veteran competing with
  // Alvarez for playing time, not a starter who happens to sit sometimes.
  { id: "miller", name: "Sam Miller", position: "OF/1B", role: "bench", isPitcher: false, bat: 50, defense: 58, fatigue: 15, morale: 55, development: 30 },
  { id: "ford", name: "Nate Ford", position: "C", role: "bench", isPitcher: false, bat: 40, defense: 60, fatigue: 10, morale: 52, development: 25 },
  { id: "boyd", name: "Curtis Boyd", position: "IF", role: "bench", isPitcher: false, bat: 45, defense: 57, fatigue: 12, morale: 53, development: 27 },
  { id: "cobb", name: "Ray Cobb", position: "3B/DH", role: "veteran", isPitcher: false, bat: 63, defense: 40, fatigue: 20, morale: 50, development: 20 },

  // Pitchers
  { id: "price", name: "Jonah Price", position: "SP", role: "regular", isPitcher: true, bat: 0, defense: 0, pitch: 62, stamina: 55, fatigue: 20, morale: 58, development: 46 },
  { id: "owens", name: "Malik Owens", position: "SP", role: "regular", isPitcher: true, bat: 0, defense: 0, pitch: 58, stamina: 60, fatigue: 18, morale: 56, development: 43 },
  { id: "lindqvist", name: "Trevor Lindqvist", position: "SP", role: "regular", isPitcher: true, bat: 0, defense: 0, pitch: 55, stamina: 58, fatigue: 16, morale: 54, development: 39 },
  { id: "navarro", name: "Eli Navarro", position: "RP", role: "regular", isPitcher: true, bat: 0, defense: 0, pitch: 60, stamina: 30, fatigue: 22, morale: 57, development: 41 },
  { id: "kwan", name: "Danny Kwan", position: "RP", role: "regular", isPitcher: true, bat: 0, defense: 0, pitch: 52, stamina: 35, fatigue: 19, morale: 55, development: 36 },
];

export const team: Team = {
  name: "Richmond River Rats",
  parentOrg: "Cincinnati Kings",
  level: "High-A",
  roster,
};

export const assistantManager: StaffMember = {
  id: "mercado",
  name: "Rosa Mercado",
  role: "assistant_manager",
  style: "development_first",
  strength: "Rest logic -- reads fatigue accurately and rarely oversells a tired player.",
  weakness: "Conservative lineups -- tends to undersell hot bats.",
};

export function freshDirective(): Directive {
  return {
    id: "alvarez-reps",
    title: "Priority Prospect Reps: Mateo Alvarez",
    description:
      "The parent organization wants 19-year-old SS Mateo Alvarez to start at least 4 of the next 5 games.",
    reason: "He is a priority prospect and needs reps against High-A pitching.",
    risk: "He is currently fatigued and has been scuffling at the plate.",
    playerId: "alvarez",
    requiredStarts: 4,
    gamesRemaining: 5,
    startsSoFar: 0,
    priority: "high",
  };
}

export const injuredPitcherSituation = {
  title: "Tight Elbow, Important Start",
  text: "Your top pitching prospect, Jonah Price, says his elbow feels tight. The trainer's report is inconclusive. The parent organization still wants him to make his start because a regional pitching coordinator is attending tonight.",
};

export const opponents: Record<string, Opponent> = {
  dayton: { name: "Dayton", strength: 55 },
  lynchburg: { name: "Lynchburg", strength: 58 },
};

export const schedule: ScheduledDay[] = [
  { dayLabel: "May 7", opponent: opponents.dayton },
  { dayLabel: "May 8", opponent: opponents.dayton },
  { dayLabel: "May 9", opponent: null }, // off day
  { dayLabel: "May 10", opponent: opponents.lynchburg },
  { dayLabel: "May 11", opponent: opponents.lynchburg, scenario: "injury_pitcher" },
  { dayLabel: "May 12", opponent: opponents.lynchburg },
];

export const startingPitcherRotation = ["price", "owens", "lindqvist", "price", "owens"];
