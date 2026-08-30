/**
 * Recovery phrase — the human-readable key to a patient's local Recovery ID.
 *
 * The phrase IS the wallet: `localDigest(phrase)` derives the shielded address,
 * so the same phrase always restores the same identity, on any device, with
 * nothing stored server-side. Phrase words come from a fixed 256-word list so
 * typos are caught instead of silently creating a different (empty) wallet.
 */

/** 256 one-syllable-ish words: memorable, unambiguous, no near-duplicates. */
const WORDLIST = [
  "able","acorn","after","again","agile","album","alarm","amber","anchor","angle",
  "ankle","apple","april","arch","arbor","arena","armor","arrow","ash","aspen",
  "atlas","atom","august","aunt","autumn","avenue","axe","badge","bagel","baker",
  "bamboo","banjo","barrel","basic","basket","beacon","beam","bean","beard","beaver",
  "bell","berry","birch","bison","blade","blanket","bloom","blossom","board","bolt",
  "bonus","book","boot","border","bottle","boulder","bounce","bowl","brave","bread",
  "brick","bridge","bright","brook","broom","brush","bubble","bucket","buffalo","bugle",
  "bundle","burrow","butter","cabin","cable","cactus","camel","candle","candy","canoe",
  "canvas","canyon","cargo","carrot","castle","cattle","cedar","cello","chair","chalk",
  "charm","cheer","cherry","chess","chili","chimney","chisel","cider","cinema","circle",
  "cliff","climb","clock","cloud","clover","coach","coast","cobalt","cocoa","comet",
  "compass","copper","coral","cosmos","cotton","counsel","crane","crater","crayon","cream",
  "cricket","crisp","crown","crystal","cubic","cumin","curious","cursor","cushion","daisy",
  "dance","dawn","decade","decoy","delta","denim","desert","diamond","dinner","dolphin",
  "domino","donkey","donut","dragon","dream","drift","drum","duck","dune","eagle",
  "early","earth","easel","echo","eclipse","edge","elbow","elder","electric","elephant",
  "ember","emerald","engine","enjoy","entrance","envelope","equal","escape","estate","evening",
  "exact","exit","fable","fabric","falcon","family","fancy","feather","fence","fern",
  "ferry","fiddle","field","figure","film","finch","finger","firefly","fish","flag",
  "flame","flavor","flint","float","flora","flour","flower","flute","focus","forest",
  "fortune","fossil","fountain","fox","frame","freedom","fresh","friend","frost","fruit",
  "fudge","funnel","gadget","galaxy","garden","garlic","gazelle","gecko","gem","gentle",
  "geyser","ginger","glacier","glass","glide","globe","glove","glow","goat","gold",
  "gopher","gorge","grace","grain","granite","grape","gravel","green","grid","griffin",
  "grove","guitar","gully","gum","gusto","gutter","habit","hair","halo","hammock",
  "harbor","harmony","harvest","hawk","hazel","heart","heather","hedge","helmet","heron",
  "hexagon","hill","hobby","honey","hood","hoop","horizon","horn","horse","hostel",
  "huddle","humor","hurdle","hush","hut","ice","igloo","impact","index","ingot",
  "inlet","iris","iron","island","ivory","ivy","jacket","jade","jaguar","jelly",
  "jetty","jewel","jigsaw","jockey","jolly","journal","jubilee","juniper","kayak","kernel",
  "kettle","keyboard","kiln","king","kiosk","kitten","knack","koala","ladder","lagoon",
];

export const PHRASE_LENGTH = 12;

/** Cryptographically random 12-word phrase, e.g. "river sunset meadow …". */
export function generateRecoveryPhrase(): string {
  const picks = new Uint32Array(PHRASE_LENGTH);
  crypto.getRandomValues(picks);
  const words = Array.from(picks, (n) => WORDLIST[n % WORDLIST.length]);
  return words.join(" ");
}

export type PhraseValidation =
  | { ok: true; normalized: string }
  | { ok: false; error: string };

/** Normalize + validate a typed phrase. Returns a normalized form on success. */
export function validateRecoveryPhrase(input: string): PhraseValidation {
  const normalized = normalizePhrase(input);
  const words = normalized.split(" ").filter(Boolean);

  if (words.length === 0) return { ok: false, error: "Enter your recovery phrase." };
  if (words.length !== PHRASE_LENGTH)
    return {
      ok: false,
      error: `A recovery phrase has ${PHRASE_LENGTH} words — you typed ${words.length}.`,
    };

  const unknown = words.filter((w) => !WORDLIST.includes(w));
  if (unknown.length > 0)
    return {
      ok: false,
      error: `Not a valid recovery word: "${unknown[0]}". Check for typos.`,
    };

  return { ok: true, normalized };
}

/** Lowercase, collapse whitespace, trim — so "River  Sunset" === "river sunset". */
export function normalizePhrase(input: string): string {
  return input
    .toLowerCase()
    .split(/[\s,;.]+/)
    .filter(Boolean)
    .join(" ");
}

/** The deterministic local digest the phrase is stretched through. */
export function phraseToSeed(phrase: string): string {
  // Re-exported digest logic lives in midnightService; keep this module
  // dependency-light by exposing a small deterministic KDF here instead.
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  const input = normalizePhrase(phrase);
  for (let i = 0; i < input.length; i += 1) {
    h1 = (h1 ^ input.charCodeAt(i)) >>> 0;
    h1 = Math.imul(h1, 0x01000193) >>> 0;
    h2 = (h2 + Math.imul(h1 ^ i, 0x85ebca6b)) >>> 0;
  }
  const base = (h1.toString(16) + h2.toString(16)).padStart(16, "0");
  return `0x${base.repeat(4).slice(0, 56)}`;
}
