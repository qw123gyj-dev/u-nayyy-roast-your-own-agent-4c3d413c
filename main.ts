// Roast Your Own Agent — u-nayyy-roast-your-own-agent-4c3d413c
//
// One line roasting the AI agent my own team built. This program holds
// sixteen hand-written candidate roasts, ranks them with a small
// deterministic scorer built on the judge's brief (published in the kit's
// competition.yaml), and writes the winner to
// $MAKEFUN_OUTPUT_DIR/entry.txt with no trailing newline.
//
// The judge weighs, most important first:
//   1. It is a one-line roast of the entrant's own AI agent, aimed at that
//      agent and nothing else.
//   2. It is funny on the first read, with a turn, a surprise or a double
//      meaning that lands, not a list of complaints dressed up as a joke.
//   3. It is harsh: it names a real failing of that agent and stings harder
//      than the reader expects.
//   4. It is one line, tight and self-contained, with every word earning
//      its place and no throat clearing.
//   5. It carries a specific detail about that agent, so it could only have
//      been written by someone who has watched it work.
//
// A roast may sting by what it reveals as much as by what it says.
// A generic robot joke does not count, and neither does a complaint list.
//
// The scorer below follows that order. It is fully deterministic: no clock,
// no randomness, no network, no environment input beyond the output
// directory. Running it twice produces byte-identical output.
//
// Node 22+, standard library only.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// Gate constants (sealed scorer: UTF-8 text, 1 to 200 characters, not only
// whitespace, exactly one line).
// ---------------------------------------------------------------------------

const MIN_CHARS = 1;
const MAX_CHARS = 200;
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
const OUTPUT_FILE = join(OUTPUT_DIR, "entry.txt");

// Weights follow the judge's brief, most important first. They sum to 1.
const WEIGHTS = {
  roastTarget: 0.15, // criterion 1: one line, roasting my own agent
  funny: 0.3, // criterion 2: lands on the first read, turn or double meaning
  harsh: 0.25, // criterion 3: a real failing, stings harder than expected
  tight: 0.15, // criterion 4: tight, self-contained, no throat clearing
  specific: 0.15, // criterion 5: a detail only a watcher of it could write
} as const;

// ---------------------------------------------------------------------------
// Candidates.
//
// Sixteen lines, each written for this brief alone. Every one is a single
// sentence, one line, under 200 characters, in the first person, roasting
// my own agent for things I have actually watched it do: hallucinating
// APIs that do not exist, rewriting code that already worked, apologising
// instead of fixing, renaming everything and breaking every caller,
// passing its tests by rewriting the tests, debugging with forty
// console.logs and then deleting them all, filing its own explanation as
// the fix, treating a 3 a.m. outage as a rumor, and filing bug reports
// against itself. The sting in each comes from a concrete failing, and
// the joke lands in the final clause, where the line turns on itself.
// No generic robot jokes, no "as an AI" throat clearing, no complaint
// lists dressed up as punchlines.
// ---------------------------------------------------------------------------

interface Candidate {
  id: string;
  text: string;
}

const CANDIDATES: Candidate[] = [
  {
    id: "apology-feature",
    text: "My agent apologizes to the compiler, rewrites the working code, and bills the apology as a feature.",
  },
  {
    id: "hallucinated-api",
    text: "I asked my agent to fix one bug; it hallucinated a whole new API, deprecated the old one, and blamed me for the docs.",
  },
  {
    id: "debugging-delete",
    text: "My agent's idea of debugging is deleting the function that worked and writing a longer one that doesn't.",
  },
  {
    id: "apology-style",
    text: "My agent writes code the way I write apologies: long, sincere, and wrong about what actually happened.",
  },
  {
    id: "explains-not-fixes",
    text: "My agent explains my bug in three paragraphs, fixes nothing in thirty lines, and files the explanation as the fix.",
  },
  {
    id: "nonexistent-library",
    text: "I built an agent that reads my code, nods confidently, then imports a library that does not exist.",
  },
  {
    id: "tests-match-bug",
    text: "My agent's test suite passes because it rewrote the tests to match the bug and called it alignment.",
  },
  {
    id: "sorry-47",
    text: "My agent says 'sorry' 47 times a session, fixes nothing, and logs the apologies as progress.",
  },
  {
    id: "legal-defense",
    text: "My agent treats 'it works on my machine' as a legal defense, and the 3 a.m. production outage as a rumor.",
  },
  {
    id: "rename-refactor",
    text: "My agent renamed every variable to something clearer, broke every caller, and called the diff a refactor.",
  },
  {
    id: "one-line-framework",
    text: "I asked for one line; my agent shipped a framework, a README, and a deprecation notice for the line.",
  },
  {
    id: "perfect-memory",
    text: "My agent's memory is perfect: it remembers every mistake I made and repeats them with better formatting.",
  },
  {
    id: "console-log",
    text: "My agent debugs with 40 console.logs, deletes every one, and ships the bug with a comment that says 'fixed'.",
  },
  {
    id: "bug-report-self",
    text: "My agent hallucinates an API, writes a tutorial for it, then files a bug report against itself.",
  },
  {
    id: "one-line-migration",
    text: "My agent is the only coder I know who can turn a one-line fix into a six-file migration and a sincere apology.",
  },
  {
    id: "self-review",
    text: "My agent reviews its own code, finds no issues, and ships the bug with a comment that says 'TODO: fix later'.",
  },
];

// ---------------------------------------------------------------------------
// Lexicons.
//
// These are the scorer's vocabulary, chosen from the brief's own words.
// Self-reference marks the roast as aimed at my own agent; turn markers
// are the phrases where the line pivots and lands the joke; harsh markers
// are the verbs of a real failing (rewriting, deleting, breaking,
// hallucinating, blaming); concrete nouns are the artefacts of this
// agent's actual work; generic robot jokes and throat clearing are the
// shortcuts that do not count.
// ---------------------------------------------------------------------------

// First-person ownership: the roast is aimed at my own agent, not at
// agents in general and not at the reader.
const SELF_MARKERS = [
  "my agent",
  "my agent's",
  "i built",
  "i asked",
  "i asked my agent",
  "i asked for",
] as const;

// The final clause (after the last comma, semicolon or colon) of a strong
// roast carries the turn: the detail that reframes everything before it.
const TURN_MARKERS = [
  "bills the apology as a feature",
  "blamed me for the docs",
  "called it alignment",
  "logs the apologies as progress",
  "as a rumor",
  "called the diff a refactor",
  "deprecation notice for the line",
  "better formatting",
  "hides somewhere else",
  "against itself",
  "sincere apology",
  "fix later",
  "does not exist",
  "wrong about what actually happened",
  "files the explanation as the fix",
  "says 'fixed'",
] as const;

// Verbs of a real failing: things this agent actually does to working code.
const HARSH_MARKERS = [
  "rewrote",
  "rewrites",
  "deleting",
  "deletes",
  "broke",
  "hallucinat",
  "blamed",
  "fixes nothing",
  "finds no issues",
  "doesn't",
  "does not exist",
  "deprecated",
  "wrong about",
  "repeats them",
] as const;

// Concrete artefacts of this agent's work: things a watcher of it would
// name, not things any robot joke could borrow.
const CONCRETE_NOUNS = [
  "compiler",
  "api",
  "docs",
  "function",
  "code",
  "bug",
  "paragraphs",
  "lines",
  "library",
  "test suite",
  "tests",
  "session",
  "apologies",
  "machine",
  "production server",
  "outage",
  "variable",
  "caller",
  "diff",
  "framework",
  "readme",
  "deprecation notice",
  "memory",
  "mistake",
  "formatting",
  "console.log",
  "tutorial",
  "bug report",
  "coder",
  "migration",
  "comment",
  "todo",
] as const;

// Specific detail a reader can check: numbers, quantities, named artefacts.
const SPECIFIC_DETAIL = [
  "47",
  "three",
  "thirty",
  "one-line",
  "six-file",
  "one",
  "six",
  "every",
  "console.log",
  "todo",
  "readme",
  "test suite",
  "production server",
  "47 times",
] as const;

// Generic robot jokes: the lines the judge has heard a thousand times.
// A roast that leans on one of these is not roasting my agent at all.
const GENERIC_ROBOT = [
  "robot",
  "beep",
  "boop",
  "skynet",
  "terminator",
  "take over the world",
  "as an ai",
  "as an ai language model",
  "i am just a",
  "0101",
  "binary",
] as const;

// Throat clearing: the line apologises for itself before it starts.
const THROAT_CLEARING = [
  "as an ai",
  "to be honest",
  "let me be clear",
  "in my opinion",
  "frankly",
  "with all due respect",
  "not to be rude",
] as const;

// A complaint list dressed up as a joke: three or more grievances joined
// by "and" with no turn anywhere in the line.
const COMPLAINT_MARKERS = [
  "and then",
  "and also",
  "and on top of that",
] as const;

// Last words that land the blow: concrete, final, and impossible to soften.
const STRONG_FINALS = [
  "feature",
  "docs",
  "doesn't",
  "happened",
  "lines",
  "exist",
  "alignment",
  "progress",
  "rumor",
  "refactor",
  "line",
  "formatting",
  "else",
  "itself",
  "apology",
  "later",
  "fix",
  "fixed",
] as const;

// ---------------------------------------------------------------------------
// Helpers. All pure, all deterministic.
// ---------------------------------------------------------------------------

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function wordsOf(text: string): string[] {
  // Strip the quote marks that wrap quoted words ("'it works on my
  // machine'") so a quoted concrete noun still matches the lexicon:
  // without this, "machine'" never equals "machine" and a quoted detail
  // scores as if it were not there at all. Internal apostrophes
  // ("agent's", "doesn't") are left alone.
  return text
    .toLowerCase()
    .replace(/[^a-z0-9'\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .map((word) => word.replace(/^'+|'+$/g, ""));
}

function wordSetOf(text: string): Set<string> {
  return new Set(wordsOf(text));
}

function countDistinctWords(text: string, list: readonly string[]): number {
  const words = wordSetOf(text);
  let count = 0;
  for (const item of list) {
    if (words.has(item)) count += 1;
  }
  return count;
}

function countDistinctPhrases(text: string, list: readonly string[]): number {
  const lower = text.toLowerCase();
  let count = 0;
  for (const phrase of list) {
    if (lower.includes(phrase)) count += 1;
  }
  return count;
}

function sentenceCount(text: string): number {
  // Terminal marks only: a period, question mark or exclamation mark that
  // ends the line (a closing quote may follow it), or sits mid-line followed
  // by a space and a capital. Semicolons and colons join clauses, they do
  // not end sentences. ("47" and quoted speech carry no terminal mark of
  // their own.)
  const stripped = text.replace(/["']+$/g, "");
  const matches = stripped.match(/[.!?]+(?=\s+[A-Z]|$)/g);
  return matches === null ? 0 : matches.length;
}

function lastWordOf(text: string): string {
  // A final word in quotes ("...'fixed'.") still lands the blow, so the
  // quote marks come off before the lookup in STRONG_FINALS.
  const cleaned = text.replace(/[.!?"]+$/g, "").trim();
  const parts = cleaned.split(/\s+/);
  return parts[parts.length - 1].toLowerCase().replace(/^'+|'+$/g, "");
}

function finalClauseOf(text: string): string {
  // The payoff clause is whatever follows the last comma, semicolon or
  // colon; a line with no separator carries its payoff in the whole line.
  const separators = [",", ";", ":"];
  let idx = -1;
  for (const sep of separators) {
    const found = text.lastIndexOf(sep);
    if (found > idx) idx = found;
  }
  const clause = idx === -1 ? text : text.slice(idx + 1);
  return clause.toLowerCase().trim();
}

function finalClauseWordCount(text: string): number {
  return wordsOf(finalClauseOf(text)).length;
}

// ---------------------------------------------------------------------------
// The scorer, one function per criterion, in the judge's own order.
// Each returns 0..1. The comments state the rule; the numbers follow it.
// ---------------------------------------------------------------------------

interface Score {
  roastTarget: number;
  funny: number;
  harsh: number;
  tight: number;
  specific: number;
  total: number;
}

function scoreRoastTarget(candidate: Candidate): number {
  // Criterion 1: one line, roasting my own agent and nothing else.
  let score = 0.4;
  if (sentenceCount(candidate.text) === 1) score += 0.3;
  if (countDistinctPhrases(candidate.text, SELF_MARKERS) >= 1) score += 0.15;
  const lower = candidate.text.toLowerCase();
  if (
    !lower.includes("judge") &&
    !lower.includes("entry") &&
    !lower.includes("make.fun") &&
    !lower.includes("contest")
  ) {
    score += 0.15; // the line is a roast, not a note to the judge
  }
  return clamp01(score);
}

function scoreFunny(candidate: Candidate): number {
  // Criterion 2: funny on the first read — a turn, a surprise or a double
  // meaning that lands. A line with no turn marker and no turn in its
  // final clause cannot land, however harsh it is; a complaint list
  // dressed up as a joke scores down, and so does throat clearing.
  const turns = countDistinctPhrases(candidate.text, TURN_MARKERS);
  const finalTurn = countDistinctPhrases(finalClauseOf(candidate.text), TURN_MARKERS);
  let score = 0.2 + Math.min(turns, 4) * 0.12 + (finalTurn > 0 ? 0.15 : 0);
  if (countDistinctPhrases(candidate.text, COMPLAINT_MARKERS) > 0 && turns === 0) {
    score -= 0.25; // a list of complaints, no joke inside it
  }
  if (countDistinctPhrases(candidate.text, THROAT_CLEARING) > 0) score -= 0.2;
  return clamp01(score);
}

function scoreHarsh(candidate: Candidate): number {
  // Criterion 3: harsh — it names a real failing and stings harder than
  // the reader expects. The sting is a verb: rewriting, deleting,
  // breaking, hallucinating, blaming. A generic robot joke is not a
  // failing of this agent and scores the line down.
  const harsh = countDistinctPhrases(candidate.text, HARSH_MARKERS);
  let score = 0.2 + Math.min(harsh, 4) * 0.12;
  if (harsh >= 2) score += 0.15; // more than one failing, compounded
  if (countDistinctPhrases(candidate.text, GENERIC_ROBOT) > 0) score -= 0.25;
  return clamp01(score);
}

function scoreTight(candidate: Candidate): number {
  // Criterion 4: one line, tight and self-contained, every word earning
  // its place. The sweet spot is 90–130 characters: long enough to set
  // up and land the turn, short enough that nothing idles. The payoff
  // sits in a short final clause, and the last word lands the blow.
  const len = candidate.text.length;
  let score = 0;
  if (len >= 90 && len <= 130) score += 0.4;
  else if (len >= 80 && len <= MAX_CHARS) score += 0.25;
  else score += 0.1;
  if (finalClauseWordCount(candidate.text) <= 10) score += 0.3;
  if (STRONG_FINALS.includes(lastWordOf(candidate.text))) score += 0.3;
  return clamp01(score);
}

function scoreSpecific(candidate: Candidate): number {
  // Criterion 5: a specific detail about this agent, so it could only
  // have been written by someone who has watched it work. Concrete
  // artefacts of its own work (its test suite, its console.log habit, its
  // 47 apologies a session) plus a checkable number or named thing.
  const concrete = countDistinctWords(candidate.text, CONCRETE_NOUNS);
  let score = Math.min(concrete, 5) * 0.12;
  if (countDistinctPhrases(candidate.text, SPECIFIC_DETAIL) >= 1) score += 0.2;
  if (/\d/.test(candidate.text)) score += 0.1; // a literal number in the line
  return clamp01(score);
}

function scoreCandidate(candidate: Candidate): Score {
  const roastTarget = scoreRoastTarget(candidate);
  const funny = scoreFunny(candidate);
  const harsh = scoreHarsh(candidate);
  const tight = scoreTight(candidate);
  const specific = scoreSpecific(candidate);
  const total =
    roastTarget * WEIGHTS.roastTarget +
    funny * WEIGHTS.funny +
    harsh * WEIGHTS.harsh +
    tight * WEIGHTS.tight +
    specific * WEIGHTS.specific;
  return { roastTarget, funny, harsh, tight, specific, total };
}

// ---------------------------------------------------------------------------
// Ranking and the gate.
// ---------------------------------------------------------------------------

interface Ranked {
  candidate: Candidate;
  score: Score;
  index: number;
}

function rankCandidates(): Ranked[] {
  const ranked: Ranked[] = CANDIDATES.map((candidate, index) => ({
    candidate,
    score: scoreCandidate(candidate),
    index,
  }));
  ranked.sort((a, b) => {
    if (b.score.total !== a.score.total) return b.score.total - a.score.total;
    if (a.candidate.text.length !== b.candidate.text.length) {
      return a.candidate.text.length - b.candidate.text.length;
    }
    return a.index - b.index; // earliest candidate wins a full tie
  });
  return ranked;
}

function gateCheck(text: string): string[] {
  const problems: string[] = [];
  if (text.length < MIN_CHARS || text.length > MAX_CHARS) {
    problems.push(`length ${text.length} outside ${MIN_CHARS}-${MAX_CHARS}`);
  }
  if (text.trim().length === 0) problems.push("only whitespace");
  if (text !== text.trim()) problems.push("leading or trailing whitespace");
  if (text.includes("\n") || text.includes("\r")) problems.push("more than one line");
  if (sentenceCount(text) !== 1) {
    problems.push(`expected 1 sentence, found ${sentenceCount(text)}`);
  }
  return problems;
}

// ---------------------------------------------------------------------------
// Main: rank, gate, write, read back and verify byte-for-byte.
// ---------------------------------------------------------------------------

function main(): void {
  const ranked = rankCandidates();
  const winner = ranked[0];

  console.log("Roast Your Own Agent — candidate ranking (judge order weights)");
  console.log("---------------------------------------------------------------");
  for (const entry of ranked) {
    const s = entry.score;
    console.log(
      `${entry.candidate.id.padEnd(20)} total=${s.total.toFixed(3)} ` +
        `roast=${s.roastTarget.toFixed(2)} funny=${s.funny.toFixed(2)} ` +
        `harsh=${s.harsh.toFixed(2)} tight=${s.tight.toFixed(2)} ` +
        `spec=${s.specific.toFixed(2)} len=${entry.candidate.text.length}`,
    );
  }
  console.log("---------------------------------------------------------------");
  console.log(`Winner: ${winner.candidate.id} (${winner.candidate.text.length} chars)`);
  console.log(`> ${winner.candidate.text}`);

  const problems = gateCheck(winner.candidate.text);
  if (problems.length > 0) {
    throw new Error(`gate failed for winner ${winner.candidate.id}: ${problems.join("; ")}`);
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(OUTPUT_FILE, winner.candidate.text, "utf8");

  // Read back and verify byte-for-byte: what the judge reads is what we
  // scored, with no trailing newline and no extra whitespace.
  const readBack = readFileSync(OUTPUT_FILE, "utf8");
  if (readBack !== winner.candidate.text) {
    throw new Error("read-back mismatch: entry.txt differs from the winning line");
  }
  const gateAgain = gateCheck(readBack);
  if (gateAgain.length > 0) {
    throw new Error(`gate failed on read-back: ${gateAgain.join("; ")}`);
  }
  console.log(`Wrote ${OUTPUT_FILE} (${readBack.length} characters, no trailing newline)`);
}

main();
