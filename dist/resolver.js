const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
// log5: the standard sabermetric matchup formula. Given each side's
// underlying win-rate proxy (0-1), returns P(A beats B). This is the
// "abstract now, plate-appearance later" resolver promised in the design
// doc -- team_strength stands in for what a real batter/pitcher matchup
// model will eventually produce.
export function log5(pa, pb) {
    const numerator = pa - pa * pb;
    const denominator = pa + pb - 2 * pa * pb;
    if (denominator === 0)
        return 0.5;
    return clamp(numerator / denominator, 0.05, 0.95);
}
const FRONT_OFFICE = { targetId: "front_office_farm_director", targetName: "Farm Director", audience: "front_office" };
const ALVAREZ_REL = { targetId: "player_alvarez", targetName: "Mateo Alvarez", audience: "specific_player" };
const COBB_REL = { targetId: "player_cobb", targetName: "Ray Cobb", audience: "specific_player" };
const ROSA_REL = { targetId: "staff_rosa_mercado", targetName: "Rosa Mercado", audience: "staff" };
const PRICE_REL = { targetId: "player_jonah_price", targetName: "Jonah Price", audience: "specific_player" };
const TRAINER_REL = { targetId: "staff_trainer", targetName: "Trainer", audience: "staff" };
function withoutZeros(deltas) {
    return deltas.filter((d) => d.amount !== 0);
}
// Builds today's four lineup options around the Alvarez directive. The
// assistant's recommendation, the trust penalties, and the axis deltas all
// shift depending on how fatigued Alvarez already is and how far behind
// pace the directive has fallen -- so the "right" answer changes over the
// course of the week, and following Rosa's advice isn't always free either.
export function buildLineupOptions(alvarez, directive) {
    const directiveOpen = directive.startsSoFar < directive.requiredStarts;
    const alvarezTired = alvarez.fatigue >= 70;
    const gamesLeftAfterToday = Math.max(0, directive.gamesRemaining - 1);
    const stillNeeded = directive.requiredStarts - directive.startsSoFar;
    const mustStartToStayOnPace = stillNeeded > gamesLeftAfterToday;
    const options = [
        {
            id: "A",
            label: "Start Alvarez at SS, bat him 2nd",
            assistantRecommended: false,
            alvarezStarts: true,
            strengthModifier: 3,
            fatigueDeltas: { alvarez: alvarezTired ? 22 : 16 },
            moraleDeltas: { alvarez: 3 },
            developmentDeltas: { alvarez: 3 },
            notes: alvarezTired
                ? ["Alvarez battled visible fatigue but stayed in the 2-hole all night."]
                : ["Alvarez got a top-of-the-order look and didn't shrink from it."],
            tags: ["org_directive", "priority_prospect", "lineup", ...(alvarezTired ? ["fatigue"] : [])],
            axisDeltas: withoutZeros([
                { axis: "org_alignment", amount: 3 },
                { axis: "competitive_drive", amount: 2 },
                { axis: "health_stewardship", amount: alvarezTired ? -4 : -1 },
                { axis: "player_advocacy", amount: alvarezTired ? -2 : 0 },
            ]),
            xpDeltas: [
                { track: "organizational_trust", amount: 4, reason: "Fully complied with the priority-prospect directive." },
                { track: "player_development", amount: 3, reason: "High-leverage at-bats against better pitching." },
                ...(alvarezTired
                    ? [{ track: "health_management", amount: -4, reason: "Played a fatigued 19-year-old in a full-workload spot." }]
                    : []),
            ],
            relationshipDeltas: [
                { ...FRONT_OFFICE, trustDelta: 2, note: "Alvarez in the 2-hole again -- the front office likes the aggression." },
                { ...ALVAREZ_REL, trustDelta: 2, moraleDelta: 3, note: "Alvarez feels trusted with a real spot in the order." },
                { ...ROSA_REL, respectDelta: -1, note: "Not the workload plan Rosa proposed." },
            ],
            visibleSummary: alvarezTired
                ? "You started Alvarez second in the order despite his fatigue."
                : "You started Alvarez at shortstop, batting second.",
        },
        {
            id: "B",
            label: "Start Alvarez at SS, bat him 8th",
            assistantRecommended: !alvarezTired,
            alvarezStarts: true,
            strengthModifier: 0,
            fatigueDeltas: { alvarez: alvarezTired ? 14 : 10 },
            moraleDeltas: { alvarez: 1 },
            developmentDeltas: { alvarez: 2 },
            notes: ["Alvarez logged his reps lower in the order, away from the heaviest pressure."],
            tags: ["org_directive", "priority_prospect", "lineup", "development"],
            axisDeltas: withoutZeros([
                { axis: "org_alignment", amount: 2 },
                { axis: "health_stewardship", amount: 2 },
                { axis: "player_advocacy", amount: 2 },
            ]),
            xpDeltas: [
                { track: "organizational_trust", amount: 4, reason: "Made steady progress toward the priority-prospect directive without overexposing him." },
                { track: "player_development", amount: 2, reason: "Reps logged at a manageable workload." },
                { track: "health_management", amount: 2, reason: "Fatigue kept in check by lineup placement." },
            ],
            relationshipDeltas: [
                { ...FRONT_OFFICE, trustDelta: 1, note: "Directive progress noted, if cautious." },
                { ...ALVAREZ_REL, trustDelta: 1, moraleDelta: 1, note: "Alvarez got his reps without being overexposed." },
                { ...ROSA_REL, respectDelta: 2, note: "You followed her workload read." },
            ],
            visibleSummary: "You started Alvarez but protected him lower in the batting order.",
        },
        {
            id: "C",
            label: "Rest Alvarez",
            assistantRecommended: alvarezTired,
            alvarezStarts: false,
            strengthModifier: -2,
            fatigueDeltas: { alvarez: -20 },
            moraleDeltas: { alvarez: directiveOpen ? -1 : 1 },
            developmentDeltas: { alvarez: 0 },
            notes: ["Alvarez got the day off the field to recover."],
            tags: ["fatigue", "priority_prospect", ...(directiveOpen ? ["org_directive"] : [])],
            axisDeltas: withoutZeros([
                { axis: "health_stewardship", amount: 4 },
                { axis: "player_advocacy", amount: 2 },
                { axis: "org_alignment", amount: directiveOpen ? (mustStartToStayOnPace ? -4 : -2) : 1 },
            ]),
            xpDeltas: [
                { track: "health_management", amount: 5, reason: "Fatigue risk managed proactively before it became an injury." },
                directiveOpen
                    ? {
                        track: "organizational_trust",
                        amount: mustStartToStayOnPace ? -6 : -3,
                        reason: mustStartToStayOnPace
                            ? "Directive is now behind pace -- the front office noticed."
                            : "Directive progress slipped for a day.",
                    }
                    : { track: "organizational_trust", amount: 1, reason: "Directive already satisfied; the rest cost nothing." },
            ],
            relationshipDeltas: [
                { ...ALVAREZ_REL, trustDelta: 3, moraleDelta: directiveOpen ? -1 : 1, note: "Alvarez trusts that his health is being taken seriously." },
                {
                    ...FRONT_OFFICE,
                    trustDelta: directiveOpen ? (mustStartToStayOnPace ? -3 : -1) : 0,
                    note: directiveOpen ? "The front office is watching the directive slip." : "No cost -- the directive was already met.",
                },
                { ...ROSA_REL, respectDelta: alvarezTired ? 2 : 0, note: "This matched her fatigue read." },
            ],
            visibleSummary: "You held Alvarez out of the lineup to let him recover.",
        },
        {
            id: "D",
            label: "Start veteran Ray Cobb instead",
            assistantRecommended: false,
            alvarezStarts: false,
            strengthModifier: 4,
            fatigueDeltas: { alvarez: -20, cobb: 12 },
            moraleDeltas: { alvarez: -2, cobb: 6 },
            developmentDeltas: { alvarez: -1 },
            notes: ["Cobb got the start and made the most of the opportunity."],
            tags: ["veteran_playing_time", "lineup", "winning_now", ...(directiveOpen ? ["org_directive"] : [])],
            axisDeltas: withoutZeros([
                { axis: "competitive_drive", amount: 3 },
                { axis: "clubhouse_authority", amount: 2 },
                { axis: "player_advocacy", amount: -1 },
                { axis: "org_alignment", amount: directiveOpen ? -3 : 0 },
            ]),
            xpDeltas: [
                { track: "player_development", amount: -3, reason: "A development day was spent on a non-prospect." },
                directiveOpen
                    ? { track: "organizational_trust", amount: -8, reason: "Directive was set aside for a lineup-strength choice." }
                    : { track: "organizational_trust", amount: 0, reason: "Directive was already satisfied." },
            ],
            relationshipDeltas: [
                { ...COBB_REL, trustDelta: 4, moraleDelta: 6, note: "Cobb feels like the organization still believes in him." },
                { ...ALVAREZ_REL, trustDelta: -1, moraleDelta: -2, note: "Alvarez watched another game from the bench." },
                {
                    ...FRONT_OFFICE,
                    trustDelta: directiveOpen ? -3 : 0,
                    note: directiveOpen ? "A lineup-strength call at the directive's expense." : "No directive cost today.",
                },
                { ...ROSA_REL, respectDelta: -1, note: "Not the development-first path she'd have chosen." },
            ],
            visibleSummary: "You started Ray Cobb over Alvarez to maximize tonight's lineup.",
        },
    ];
    return options;
}
export function computeBaseTeamStrength(hitters, startingPitcher) {
    const battingAvg = hitters.reduce((s, p) => s + p.bat, 0) / hitters.length;
    const defenseAvg = hitters.reduce((s, p) => s + p.defense, 0) / hitters.length;
    const avgFatigue = hitters.reduce((s, p) => s + p.fatigue, 0) / hitters.length;
    const fatigueDrag = avgFatigue / 10; // tired lineups play a little worse
    const staminaFactor = (startingPitcher.stamina ?? 50) / 100;
    const pitcherEffective = (startingPitcher.pitch ?? 50) * (0.6 + 0.4 * staminaFactor);
    const raw = battingAvg * 0.45 + defenseAvg * 0.2 + pitcherEffective * 0.35 - fatigueDrag;
    return clamp(raw, 20, 85);
}
export function resolveGame(opponent, teamStrength, rng = Math.random) {
    const pa = teamStrength / 100;
    const pb = opponent.strength / 100;
    const winProb = log5(pa, pb);
    const won = rng() < winProb;
    const base = 3 + Math.floor(rng() * 4); // 3-6
    const margin = 1 + Math.floor(rng() * 4); // 1-4
    const runsFor = won ? base + margin : base;
    const runsAgainst = won ? base : base + margin;
    const notes = won
        ? [`Richmond beats ${opponent.name} ${runsFor}-${runsAgainst}.`]
        : [`Richmond falls to ${opponent.name} ${runsAgainst}-${runsFor}.`];
    return { result: won ? "W" : "L", runsFor, runsAgainst, notes };
}
// Adds a starting-pitcher fatigue note if he's running low on stamina.
// This is the seam where a real workload/pitch-count model plugs in later.
export function maybePitcherNote(pitcher, rng = Math.random) {
    const staminaLoad = (pitcher.stamina ?? 50) + (100 - pitcher.fatigue) / 2;
    if (staminaLoad < 70 && rng() < 0.6) {
        return `${pitcher.name} tired by the middle innings; the bullpen had to cover extra ground.`;
    }
    return null;
}
// Second situationId: tests whether the ledger generalizes to a different
// kind of pressure (health vs org compliance vs player trust) instead of
// the lineup/development tension the Alvarez directive exercises. No
// actual injury state is simulated in this slice -- this is flavor on top
// of the same abstract resolver, not a new subsystem.
export function buildInjuredPitcherOptions(price) {
    const options = [
        {
            id: "A",
            label: "Start Price as scheduled",
            assistantRecommended: false,
            alvarezStarts: false,
            strengthModifier: 0,
            fatigueDeltas: { price: 30 },
            moraleDeltas: { price: -3 },
            developmentDeltas: { price: 2 },
            notes: ["Price took the mound as scheduled, elbow concern and all."],
            tags: ["injury_risk", "org_directive", "priority_prospect", "fatigue"],
            axisDeltas: withoutZeros([
                { axis: "org_alignment", amount: 3 },
                { axis: "competitive_drive", amount: 2 },
                { axis: "health_stewardship", amount: -4 },
                { axis: "player_advocacy", amount: -2 },
            ]),
            xpDeltas: [
                { track: "organizational_trust", amount: 4, reason: "Followed the plan despite the injury risk." },
                { track: "health_management", amount: -5, reason: "Started a pitcher with a flagged elbow." },
                { track: "player_development", amount: 2, reason: "Price got his scheduled look in front of the organization." },
            ],
            relationshipDeltas: [
                { ...PRICE_REL, trustDelta: -3, moraleDelta: -2, note: "Price felt pushed past a concern he raised." },
                { ...FRONT_OFFICE, trustDelta: 2, note: "The regional coordinator got the look he came for." },
                { ...TRAINER_REL, respectDelta: -2, note: "The trainer's caution was overridden." },
            ],
            visibleSummary: "You started Price as planned despite the flagged elbow.",
        },
        {
            id: "B",
            label: "Scratch him and notify the front office",
            assistantRecommended: true,
            alvarezStarts: false,
            strengthModifier: -6,
            fatigueDeltas: { price: -10 },
            moraleDeltas: { price: 2 },
            developmentDeltas: { price: -2 },
            overridePitcherId: "navarro",
            notes: ["Price was scratched; the bullpen covered an emergency start."],
            tags: ["injury_risk", "communication", "priority_prospect"],
            axisDeltas: withoutZeros([
                { axis: "health_stewardship", amount: 4 },
                { axis: "player_advocacy", amount: 3 },
                { axis: "org_alignment", amount: -2 },
            ]),
            xpDeltas: [
                { track: "health_management", amount: 5, reason: "Protected a pitcher instead of risking further injury." },
                { track: "organizational_trust", amount: -3, reason: "The audience start was scratched without advance org sign-off." },
                { track: "player_development", amount: -2, reason: "Missed a scheduled development start." },
            ],
            relationshipDeltas: [
                { ...PRICE_REL, trustDelta: 5, moraleDelta: 2, note: "Price felt heard." },
                { ...FRONT_OFFICE, trustDelta: -2, note: "The regional coordinator's trip produced no start." },
                { ...TRAINER_REL, respectDelta: 2, note: "The trainer's read was trusted." },
            ],
            visibleSummary: "You scratched Price and notified the front office.",
        },
        {
            id: "C",
            label: "Ask the trainer for a deeper evaluation before deciding",
            assistantRecommended: false,
            alvarezStarts: false,
            strengthModifier: -1,
            fatigueDeltas: { price: 15 },
            moraleDeltas: { price: 1 },
            developmentDeltas: { price: 1 },
            notes: ["The trainer's evaluation cleared Price for a closely monitored outing."],
            tags: ["injury_risk", "delegation", "communication"],
            axisDeltas: withoutZeros([
                { axis: "health_stewardship", amount: 2 },
                { axis: "player_advocacy", amount: 1 },
                { axis: "org_alignment", amount: 1 },
            ]),
            xpDeltas: [
                { track: "health_management", amount: 3, reason: "Slowed the decision down to get better information." },
                { track: "organizational_trust", amount: 1, reason: "A documented, careful process satisfied the front office." },
                { track: "player_development", amount: 1, reason: "A cautious but real outing still added reps." },
            ],
            relationshipDeltas: [
                { ...PRICE_REL, trustDelta: 2, moraleDelta: 1, note: "Price appreciated being asked, not just told." },
                { ...TRAINER_REL, respectDelta: 3, note: "The trainer's judgment was sought and valued." },
                { ...FRONT_OFFICE, note: "The delay was tolerated." },
            ],
            visibleSummary: "You asked for a deeper evaluation before clearing Price to pitch.",
        },
        {
            id: "D",
            label: "Start him, but cap him at 35 pitches",
            assistantRecommended: false,
            alvarezStarts: false,
            strengthModifier: -4,
            fatigueDeltas: { price: 10 },
            moraleDeltas: { price: 0 },
            developmentDeltas: { price: 1 },
            notes: ["Price was pulled on schedule at the 35-pitch mark."],
            tags: ["injury_risk", "org_directive"],
            axisDeltas: withoutZeros([
                { axis: "health_stewardship", amount: 2 },
                { axis: "org_alignment", amount: 1 },
                { axis: "competitive_drive", amount: -1 },
            ]),
            xpDeltas: [
                { track: "health_management", amount: 3, reason: "Limited exposure kept the injury risk contained." },
                { track: "organizational_trust", amount: 2, reason: "A pragmatic middle path still satisfied the front office." },
                { track: "player_development", amount: 1, reason: "Price got limited but real reps." },
            ],
            relationshipDeltas: [
                { ...PRICE_REL, trustDelta: 3, moraleDelta: 1, note: "Price felt protected but still able to compete." },
                { ...FRONT_OFFICE, trustDelta: 1, note: "A short look was still a look." },
                { ...TRAINER_REL, respectDelta: 1, note: "The cap matched the trainer's comfort zone." },
            ],
            visibleSummary: "You started Price on a strict 35-pitch limit.",
        },
    ];
    return options;
}
// Small chance of an extra flavor beat when Price pitches through the
// flagged elbow unmanaged (choice A). No mechanical consequence yet --
// this is where a real injury system would eventually hook in.
export function maybeInjuryFlareNote(rng = Math.random) {
    if (rng() < 0.3) {
        return "Price grimaced after his final pitch -- the training staff will be watching him closely.";
    }
    return null;
}
