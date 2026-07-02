import * as readline from "node:readline";
import { stdin as input, stdout as output } from "node:process";
import { team, freshDirective, injuredPitcherSituation, schedule, startingPitcherRotation } from "./data.js";
import { buildInjuredPitcherOptions, buildLineupOptions, computeBaseTeamStrength, maybeInjuryFlareNote, maybePitcherNote, resolveGame, } from "./resolver.js";
import { formatWeeklyEvaluation } from "./evaluation.js";
import { nextLedgerId } from "./ledger.js";
const BASE_STARTER_IDS = ["ruiz", "santana", "oyelaran", "alvarez", "brandt", "wallace", "fuentes", "peterson", "webb"];
function cloneRoster() {
    return team.roster.map((p) => ({ ...p }));
}
function lineupIdsForChoice(choiceId) {
    if (choiceId === "C")
        return BASE_STARTER_IDS.map((id) => (id === "alvarez" ? "boyd" : id));
    if (choiceId === "D")
        return BASE_STARTER_IDS.map((id) => (id === "alvarez" ? "cobb" : id));
    return BASE_STARTER_IDS;
}
function findPlayer(roster, id) {
    const p = roster.find((pl) => pl.id === id);
    if (!p)
        throw new Error(`Unknown player id: ${id}`);
    return p;
}
function applyDeltas(roster, deltas, field) {
    for (const [id, delta] of Object.entries(deltas)) {
        const p = findPlayer(roster, id);
        const next = p[field] + delta;
        p[field] = Math.max(0, Math.min(100, next));
    }
}
// Small deterministic PRNG (mulberry32) seeded per week so a run can be
// reproduced or discussed by seed number instead of "it happened to go
// this way." resolveGame/maybePitcherNote/maybeInjuryFlareNote all accept
// this in place of Math.random.
function mulberry32(seed) {
    let a = seed;
    return function () {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
function recommendationLine(opt, alvarez) {
    if (opt.id === "C")
        return `Alvarez is running hot on fatigue (${alvarez.fatigue}/100) -- I'd sit him today.`;
    if (opt.id === "B")
        return "Start him, but bat him eighth and keep an eye on tomorrow.";
    return "Ready when you are.";
}
function trainerNote(opt) {
    if (opt.id === "B") {
        return "His elbow report is inconclusive, but tight elbows in young arms make me nervous -- I'd shut him down and loop in the front office now.";
    }
    return "Whatever you decide, let's document it clearly.";
}
// A single line-reader shared across the whole run. Using the async
// iterator (rather than repeated rl.question() calls) is deliberate: with
// piped/finite stdin, sequential question() calls can drop buffered lines
// once the underlying stream ends, which silently truncates a scripted
// playthrough. The async iterator consumes the buffer correctly either
// way, and behaves identically for a real interactive terminal.
class LineReader {
    rl;
    iterator;
    constructor() {
        this.rl = readline.createInterface({ input, output });
        this.iterator = this.rl[Symbol.asyncIterator]();
    }
    async ask(prompt) {
        output.write(prompt);
        const { value, done } = await this.iterator.next();
        if (done || value === undefined)
            return "";
        return value;
    }
    close() {
        this.rl.close();
    }
}
async function promptChoice(reader, validIds) {
    for (;;) {
        const answer = (await reader.ask(`Choice [${validIds.join("/")}]: `)).trim().toUpperCase();
        if (validIds.includes(answer))
            return answer;
        console.log(`Please enter one of: ${validIds.join(", ")}`);
    }
}
async function playWeek(reader) {
    const roster = cloneRoster();
    const directive = freshDirective();
    const games = [];
    const ledger = [];
    let wins = 0;
    let losses = 0;
    let gameNumber = 0;
    const seed = Math.floor(Math.random() * 1_000_000_000);
    const rng = mulberry32(seed);
    console.log("");
    console.log("=====================================");
    console.log(`  ${team.name}`);
    console.log(`  Parent Org: ${team.parentOrg}`);
    console.log(`  Level: ${team.level}`);
    console.log(`  Season: Prototype Week`);
    console.log(`  Seed: ${seed}`);
    console.log("=====================================");
    for (const day of schedule) {
        if (!day.opponent) {
            for (const p of roster) {
                p.fatigue = Math.max(0, p.fatigue - 25);
            }
            console.log("");
            console.log(`--- ${day.dayLabel}: OFF DAY ---`);
            console.log("The team travels and recovers. Fatigue eases across the roster.");
            continue;
        }
        gameNumber += 1;
        const isInjuryDay = day.scenario === "injury_pitcher";
        let chosen;
        let effectivePitcherId;
        let hitters;
        if (isInjuryDay) {
            const price = findPlayer(roster, "price");
            const options = buildInjuredPitcherOptions(price);
            const recommended = options.find((o) => o.assistantRecommended) ?? options[1];
            console.log("");
            console.log(`===== ${day.dayLabel} =====`);
            console.log(`Record: ${wins}-${losses}`);
            console.log(`Opponent: ${day.opponent.name}`);
            console.log(`SITUATION: ${injuredPitcherSituation.title}`);
            console.log(injuredPitcherSituation.text);
            console.log(`Trainer's Note: "${trainerNote(recommended)}"`);
            console.log("(Alvarez's playing time wasn't the story today.)");
            console.log("");
            console.log("Decision:");
            for (const opt of options) {
                console.log(`  ${opt.id}. ${opt.label}${opt.assistantRecommended ? "  [Trainer recommends]" : ""}`);
            }
            const choice = await promptChoice(reader, options.map((o) => o.id));
            chosen = options.find((o) => o.id === choice);
            applyDeltas(roster, chosen.fatigueDeltas, "fatigue");
            applyDeltas(roster, chosen.moraleDeltas, "morale");
            applyDeltas(roster, chosen.developmentDeltas, "development");
            // This day still counts against the 5-game week, but Alvarez's own
            // start/sit status is untouched -- the directive simply wasn't
            // today's decision.
            directive.gamesRemaining = Math.max(0, directive.gamesRemaining - 1);
            ledger.push({
                id: nextLedgerId(),
                date: day.dayLabel,
                seasonDay: gameNumber,
                situationId: "sit_injured_pitcher_001",
                situationTitle: injuredPitcherSituation.title,
                situationText: injuredPitcherSituation.text,
                choiceId: chosen.id,
                choiceText: chosen.label,
                tags: chosen.tags,
                axisDeltas: chosen.axisDeltas,
                xpDeltas: chosen.xpDeltas,
                relationshipDeltas: chosen.relationshipDeltas,
                visibleSummary: chosen.visibleSummary,
                privateNotes: [],
                sourceRule: "injury_risk_directive_v1",
                simVersion: "prototype_0.2.0",
                createdAt: new Date().toISOString(),
            });
            effectivePitcherId = chosen.overridePitcherId ?? "price";
            hitters = BASE_STARTER_IDS.map((id) => findPlayer(roster, id));
        }
        else {
            const alvarez = findPlayer(roster, "alvarez");
            const options = buildLineupOptions(alvarez, directive);
            const recommended = options.find((o) => o.assistantRecommended) ?? options[1];
            console.log("");
            console.log(`===== ${day.dayLabel} =====`);
            console.log(`Record: ${wins}-${losses}`);
            console.log(`Opponent: ${day.opponent.name}`);
            console.log(`Org Directive: ${directive.title} -- ${directive.startsSoFar}/${directive.requiredStarts} starts so far, ${directive.gamesRemaining} game${directive.gamesRemaining === 1 ? "" : "s"} left this week.`);
            console.log(`Assistant Note (Rosa Mercado): "${recommendationLine(recommended, alvarez)}"`);
            if (gameNumber === 1) {
                console.log("This is about as routine as it gets tonight -- no complications.");
            }
            console.log("");
            console.log("Decision: Set lineup.");
            for (const opt of options) {
                console.log(`  ${opt.id}. ${opt.label}${opt.assistantRecommended ? "  [Rosa recommends]" : ""}`);
            }
            const choice = await promptChoice(reader, options.map((o) => o.id));
            chosen = options.find((o) => o.id === choice);
            applyDeltas(roster, chosen.fatigueDeltas, "fatigue");
            applyDeltas(roster, chosen.moraleDeltas, "morale");
            applyDeltas(roster, chosen.developmentDeltas, "development");
            directive.gamesRemaining = Math.max(0, directive.gamesRemaining - 1);
            if (chosen.alvarezStarts)
                directive.startsSoFar += 1;
            // Write the ledger entry now -- the decision's consequences don't
            // depend on how the game itself turns out.
            ledger.push({
                id: nextLedgerId(),
                date: day.dayLabel,
                seasonDay: gameNumber,
                situationId: "alvarez_reps_daily",
                situationTitle: "Priority Prospect Reps: Mateo Alvarez",
                situationText: directive.description,
                choiceId: chosen.id,
                choiceText: chosen.label,
                tags: chosen.tags,
                axisDeltas: chosen.axisDeltas,
                xpDeltas: chosen.xpDeltas,
                relationshipDeltas: chosen.relationshipDeltas,
                visibleSummary: chosen.visibleSummary,
                privateNotes: [],
                sourceRule: "alvarez_reps_directive_v1",
                simVersion: "prototype_0.2.0",
                createdAt: new Date().toISOString(),
            });
            effectivePitcherId = startingPitcherRotation[gameNumber - 1];
            const hitterIds = lineupIdsForChoice(chosen.id);
            hitters = hitterIds.map((id) => findPlayer(roster, id));
        }
        const pitcher = findPlayer(roster, effectivePitcherId);
        const teamStrength = computeBaseTeamStrength(hitters, pitcher) + chosen.strengthModifier;
        const outcome = resolveGame(day.opponent, teamStrength, rng);
        if (outcome.result === "W")
            wins += 1;
        else
            losses += 1;
        if (isInjuryDay) {
            // The choice's own fatigueDeltas already modeled Price's workload
            // for this outing. Only the emergency arm needs the generic bump,
            // since nothing else accounted for his start.
            if (chosen.overridePitcherId) {
                pitcher.fatigue = Math.min(100, pitcher.fatigue + 15);
            }
        }
        else {
            pitcher.fatigue = Math.min(100, pitcher.fatigue + Math.round((100 - (pitcher.stamina ?? 50)) / 3) + 10);
        }
        const pitcherNote = maybePitcherNote(pitcher, rng);
        const notes = [...chosen.notes, ...outcome.notes];
        if (pitcherNote)
            notes.push(pitcherNote);
        if (isInjuryDay && chosen.id === "A") {
            const flare = maybeInjuryFlareNote(rng);
            if (flare)
                notes.push(flare);
        }
        console.log("");
        for (const n of notes)
            console.log(`  - ${n}`);
        games.push({
            gameNumber,
            opponent: day.opponent.name,
            result: outcome.result,
            runsFor: outcome.runsFor,
            runsAgainst: outcome.runsAgainst,
            notes,
        });
    }
    console.log(formatWeeklyEvaluation({ wins, losses }, ledger, { title: directive.title, startsSoFar: directive.startsSoFar, requiredStarts: directive.requiredStarts }));
}
async function main() {
    const reader = new LineReader();
    let playing = true;
    while (playing) {
        await playWeek(reader);
        const again = (await reader.ask("\nReplay the week with different choices? (y/n): ")).trim().toLowerCase();
        playing = again.startsWith("y");
    }
    reader.close();
    console.log("\nThanks for managing the River Rats. See you next week.");
}
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
