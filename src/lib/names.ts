// A light name filter for open (pick-up) races, where strangers see each other's
// names. Names that trip it race as "Driver" (the seat number still identifies them).
const ANYWHERE = ["fuck", "shit", "cunt", "nigg", "bitch", "whore", "slut", "twat", "wank", "asshole", "kkk", "hitler", "rapist"];
const WORDS = ["dick", "cock", "fag", "rape", "nazi", "porn", "penis", "vagina", "anal", "anus", "cum", "tit", "tits", "ass", "sex", "retard", "spic", "chink", "kike", "dyke", "homo", "boob", "butt"];
const ENDINGS = /^(s|es|er|ers|y|ie|ies|ing|head|face|hole|bag|wad)?$/;
const LEET: Record<string, string> = {"0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b", "@": "a", "$": "s", "!": "i", "|": "l"};

/** True when a driver name looks rude (a few root words, common letter swaps and plurals). */
export function rudeName(name: string) {
  const lower = name.toLowerCase().replace(/[0-9@$!|]/g, c => LEET[c] ?? c);
  const squashed = lower.replace(/[^a-z]/g, "");
  if (ANYWHERE.some(w => squashed.includes(w))) return true;
  return lower.split(/[^a-z]+/).filter(Boolean).some(w => WORDS.some(root => w.startsWith(root) && ENDINGS.test(w.slice(root.length))));
}
/** The name shown to strangers in an open race. */
export const openName = (name: string) => (rudeName(name) ? "Driver" : name);
