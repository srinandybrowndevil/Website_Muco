// Supabase checks passwords against Have I Been Pwned, but only on paid plans.
// Until that is available this stands in for the part of it that matters most
// here: character rules alone happily accept "Mucolabs@2026", which is the
// first password anybody attacking these four addresses would try.
//
// Not a breach corpus — a short list of the roots that sit at the top of every
// leaked-password study, plus the studio's own names. The password is reduced
// to letters before comparing, so Password123!, p4ssw0rd and P@ssword all
// collapse to the same root. The live breach lookup runs beside this, against
// a k-anonymous range query, in the sign-in applications that offer it.

const COMMON_ROOTS = [
  "password", "passwd", "qwerty", "qwertyuiop", "asdfgh", "zxcvbn",
  "welcome", "letmein", "admin", "administrator", "login", "iloveyou",
  "monkey", "dragon", "sunshine", "princess", "football", "baseball",
  "abcdef", "abcabc", "trustno", "master", "shadow", "superman",
  "muco", "mucolabs", "muclabs", "portal", "client", "intern", "employee", "erode",
];

function passwordRoot(password: string) {
  return password
    .toLowerCase()
    .replace(/[@4]/g, "a").replace(/[3]/g, "e").replace(/[1!|]/g, "i")
    .replace(/[0]/g, "o").replace(/[5$]/g, "s").replace(/[7]/g, "t")
    .replace(/[^a-z]/g, "");
}

/** Rejects a password whose letters reduce to a well-known root. */
export function isCommonPassword(password: string): boolean {
  const root = passwordRoot(password);
  if (root.length < 3) return false;
  return COMMON_ROOTS.some(common => root === common || root.startsWith(common) || common.startsWith(root));
}

/** Rejects repeated characters and straight keyboard or alphabet runs. */
export function isPredictablePassword(password: string): boolean {
  const lower = password.toLowerCase();
  // One character repeated, whether or not a few digits are tacked on the end:
  // "aaaaaaaaaa1!" is not meaningfully stronger than "aaaaaaaaaa".
  if (/^(.)+$/.test(passwordRoot(password))) return true;
  let same = 1;
  let run = 1;
  for (let i = 1; i < lower.length; i++) {
    same = lower[i] === lower[i - 1] ? same + 1 : 1;
    if (same >= 4) return true;
    const step = lower.charCodeAt(i) - lower.charCodeAt(i - 1);
    run = step === 1 || step === -1 ? run + 1 : 1;
    if (run >= 6) return true;
  }
  return false;
}

export type PasswordRequirements = {
  length: boolean;
  letter: boolean;
  number: boolean;
  symbol: boolean;
  uncommon: boolean;
};

export function passwordRequirements(password: string): PasswordRequirements {
  return {
    length: password.length >= 10,
    letter: /[A-Za-z]/.test(password),
    number: /\d/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
    uncommon: password.length === 0
      ? false
      : !isCommonPassword(password) && !isPredictablePassword(password),
  };
}

/** The requirements in the order they are shown, with the sentence for each. */
export const REQUIREMENT_LABELS: [keyof PasswordRequirements, string][] = [
  ["length", "At least 10 characters"],
  ["letter", "One letter"],
  ["number", "One number"],
  ["symbol", "One symbol"],
  ["uncommon", "Not a guessable word or pattern"],
];

export function isStrongPassword(password: string): boolean {
  return Object.values(passwordRequirements(password)).every(Boolean);
}
