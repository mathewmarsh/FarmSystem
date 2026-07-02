import { computeIdentityAxes, computeMasteryXp, computeRelationshipTrust, deriveBookLabels, deriveEarlyRead, groupedReasonsByTrack, } from "./ledger.js";
const ACTIVE_TRACKS = ["player_development", "health_management", "organizational_trust"];
const TRACK_LABEL = {
    player_development: "Player Development",
    health_management: "Health Management",
    organizational_trust: "Organizational Trust",
    winning: "Winning",
    clubhouse_culture: "Clubhouse Culture",
    communication: "Communication",
    promotion_readiness: "Promotion Readiness",
};
// The weekly evaluation is three views of the same ledger, printed one
// after another: what you earned, who you're becoming, and who noticed.
export function formatWeeklyEvaluation(record, ledger, directiveSummary) {
    const xp = computeMasteryXp(ledger);
    const grouped = groupedReasonsByTrack(ledger);
    const axisTotals = computeIdentityAxes(ledger);
    const bookLabels = deriveBookLabels(axisTotals);
    const trust = computeRelationshipTrust(ledger);
    const lines = [];
    lines.push("");
    lines.push("=====================================");
    lines.push("           WEEKLY EVALUATION");
    lines.push("=====================================");
    lines.push(`Record: ${record.wins}-${record.losses}`);
    lines.push("");
    lines.push("-- Mastery XP --");
    for (const track of ACTIVE_TRACKS) {
        const total = xp[track] ?? 0;
        lines.push(`${TRACK_LABEL[track]}: ${total >= 0 ? "+" : ""}${total} XP`);
        for (const group of grouped[track] ?? []) {
            const sign = group.amount >= 0 ? "+" : "-";
            const countSuffix = group.count > 1 ? ` x${group.count}` : "";
            lines.push(`  ${sign} ${group.reason}${countSuffix}`);
        }
        if (track === "organizational_trust") {
            lines.push(`  ${formatDirectiveCompletion(directiveSummary)}`);
        }
    }
    lines.push("");
    lines.push("-- The Book on You --");
    for (const [axis, amount] of Object.entries(axisTotals)) {
        lines.push(`  ${axis}: ${amount >= 0 ? "+" : ""}${amount}`);
    }
    lines.push(`  Reputation: ${bookLabels.join(", ")}`);
    if (bookLabels.length === 1 && bookLabels[0] === "Still Finding His Footing") {
        const earlyRead = deriveEarlyRead(axisTotals);
        if (earlyRead)
            lines.push(`  Early Read: ${earlyRead}`);
    }
    lines.push("");
    lines.push("-- Trust Dashboard --");
    for (const rel of trust) {
        const parts = [];
        if (rel.trust !== 0)
            parts.push(`trust ${rel.trust >= 0 ? "+" : ""}${rel.trust}`);
        if (rel.respect !== 0)
            parts.push(`respect ${rel.respect >= 0 ? "+" : ""}${rel.respect}`);
        if (rel.morale !== 0)
            parts.push(`morale ${rel.morale >= 0 ? "+" : ""}${rel.morale}`);
        lines.push(`  ${rel.targetName} (${rel.audience}): ${parts.join(", ") || "no change"}`);
    }
    lines.push("=====================================");
    return lines.join("\n");
}
function formatDirectiveCompletion(summary) {
    if (summary.startsSoFar >= summary.requiredStarts) {
        return `Directive fully satisfied -- ${summary.startsSoFar}/${summary.requiredStarts} required starts reached.`;
    }
    return `Directive ended at ${summary.startsSoFar}/${summary.requiredStarts} required starts -- short of the front office's target.`;
}
