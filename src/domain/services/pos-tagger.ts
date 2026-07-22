import { POS_ADJ, POS_ADV, POS_NOUN, POS_VERB, type PosLexicon } from "./pos-lexicon";

export type PosCategory = "noun" | "verb" | "adj" | "adv" | "conj";

export interface PosToken {
  from: number;
  to: number;
  category: PosCategory;
}

// ── classes fechadas ─────────────────────────────────────────────────

const CONJUNCTIONS = new Set([
  "e", "nem", "mas", "porém", "todavia", "contudo", "entretanto",
  "ou", "ora", "logo", "portanto", "pois", "porque", "porquanto",
  "que", "se", "como", "quando", "enquanto", "embora", "conquanto",
  "caso", "quer", "senão", "assim",
]);

const DETERMINERS = new Set([
  "o", "a", "os", "as", "um", "uma", "uns", "umas",
  "ao", "aos", "à", "às", "do", "da", "dos", "das",
  "no", "na", "nos", "nas", "num", "numa", "nuns", "numas",
  "dum", "duma", "pelo", "pela", "pelos", "pelas",
  "este", "esta", "estes", "estas", "esse", "essa", "esses", "essas",
  "aquele", "aquela", "aqueles", "aquelas",
  "deste", "desta", "destes", "destas", "desse", "dessa", "desses", "dessas",
  "daquele", "daquela", "daqueles", "daquelas",
  "neste", "nesta", "nestes", "nestas", "nesse", "nessa", "nesses", "nessas",
  "naquele", "naquela", "naqueles", "naquelas",
  "meu", "minha", "meus", "minhas", "teu", "tua", "teus", "tuas",
  "seu", "sua", "seus", "suas", "nosso", "nossa", "nossos", "nossas",
  "cada", "todo", "toda", "todos", "todas",
  "algum", "alguma", "alguns", "algumas", "nenhum", "nenhuma",
  "qualquer", "quaisquer", "outro", "outra", "outros", "outras",
  "vários", "várias",
]);

const PREPOSITIONS = new Set([
  "de", "em", "por", "para", "pra", "com", "sem", "sob", "sobre",
  "entre", "até", "após", "ante", "contra", "desde", "durante",
  "mediante", "perante", "conforme", "segundo",
]);

const PERSONAL_PRONOUNS = new Set([
  "eu", "tu", "ele", "ela", "nós", "vós", "eles", "elas",
  "você", "vocês", "me", "te", "lhe", "lhes", "vos",
]);

/** advérbios comuns sem -mente (lista fechada; o léxico cobre o resto) */
const COMMON_ADVERBS = new Set([
  "já", "ainda", "sempre", "nunca", "jamais", "muito", "pouco",
  "mais", "menos", "bem", "mal", "hoje", "ontem", "amanhã", "agora",
  "cedo", "tarde", "aqui", "ali", "aí", "lá", "cá", "também",
  "só", "apenas", "quase", "talvez", "bastante", "demais",
  "depois", "antes", "dentro", "fora", "longe", "perto",
  "devagar", "depressa", "então", "não",
  "onde", "aonde", "donde",
]);

/** contexto que ajuda a desambiguar o token seguinte */
type PrevKind = "det" | "noun" | "pronoun-or-nao" | "other";

export interface EnabledCategories {
  noun: boolean;
  verb: boolean;
  adj: boolean;
  adv: boolean;
  conj: boolean;
}

const WORD_RE = /[\p{L}][\p{L}'-]*/gu;
const SENTENCE_END = /[.!?…:\n]/;

/**
 * Classifica os tokens de um trecho de prosa. Léxico injetado como dado
 * (Dependency Inversion) — a função é pura e testável com fake.
 * `baseOffset` desloca as posições para o documento completo.
 */
export function tagTokens(
  text: string,
  baseOffset: number,
  lexicon: PosLexicon,
  enabled: EnabledCategories,
): PosToken[] {
  const tokens: PosToken[] = [];
  let prev: PrevKind = "other";

  const push = (from: number, to: number, category: PosCategory) => {
    if (enabled[category]) {
      tokens.push({ from: baseOffset + from, to: baseOffset + to, category });
    }
  };

  for (const m of text.matchAll(WORD_RE)) {
    const raw = m[0];
    const from = m.index ?? 0;
    const to = from + raw.length;
    const word = raw.toLowerCase().normalize("NFC");

    // nome próprio: capitalizada fora de início de sentença → sem cor
    if (raw[0] !== raw[0]!.toLowerCase() && !isSentenceStart(text, from)) {
      prev = "other";
      continue;
    }

    if (CONJUNCTIONS.has(word)) {
      push(from, to, "conj");
      prev = "other";
      continue;
    }
    if (DETERMINERS.has(word)) {
      prev = "det";
      continue;
    }
    if (PREPOSITIONS.has(word)) {
      prev = "other";
      continue;
    }
    if (PERSONAL_PRONOUNS.has(word)) {
      prev = "pronoun-or-nao";
      continue;
    }
    if (COMMON_ADVERBS.has(word)) {
      push(from, to, "adv");
      prev = word === "não" ? "pronoun-or-nao" : "other";
      continue;
    }
    if (word.length > 6 && word.endsWith("mente")) {
      push(from, to, "adv");
      prev = "other";
      continue;
    }

    let mask = lexicon.maskOf(word);
    // clíticos com hífen: "escreveu-lhe" → tenta o trecho antes do hífen
    if (mask === 0 && word.includes("-")) {
      mask = lexicon.maskOf(word.slice(0, word.indexOf("-")));
    }
    if (mask === 0) {
      prev = "other";
      continue; // fora do léxico — degradação silenciosa
    }

    const category = disambiguate(mask, prev);
    push(from, to, category);
    prev = category === "noun" ? "noun" : "other";
  }

  return tokens;
}

function disambiguate(mask: number, prev: PrevKind): PosCategory {
  const isNoun = (mask & POS_NOUN) !== 0;
  const isVerb = (mask & POS_VERB) !== 0;
  const isAdj = (mask & POS_ADJ) !== 0;
  const isAdv = (mask & POS_ADV) !== 0;

  // classe única
  if (isNoun && !isVerb && !isAdj) return "noun";
  if (isVerb && !isNoun && !isAdj) return "verb";
  if (isAdj && !isNoun && !isVerb) return "adj";
  if (isAdv && !isNoun && !isVerb && !isAdj) return "adv";

  // homógrafos: contexto de 1 token
  if (isNoun && isAdj && !isVerb) {
    if (prev === "det") return "noun";
    if (prev === "noun") return "adj";
    return "noun";
  }
  if (isVerb) {
    if (prev === "det" && isNoun) return "noun";
    if (prev === "noun" && isAdj) return "adj"; // "a casa amarela"
    if (prev === "pronoun-or-nao") return "verb";
    if (isNoun) return "noun"; // default estatístico N > V
    if (isAdj) return "adj"; // ADJ|V sem contexto: particípios lêem melhor como adj
    return "verb";
  }
  return isNoun ? "noun" : isAdj ? "adj" : "adv";
}

/** true se a posição está no início de uma sentença (ou do trecho). */
function isSentenceStart(text: string, pos: number): boolean {
  for (let i = pos - 1; i >= 0; i--) {
    const ch = text[i]!;
    if (ch === " " || ch === "\t") continue;
    if (SENTENCE_END.test(ch)) return true;
    // marcadores markdown no começo da linha contam como início
    if (ch === "#" || ch === ">" || ch === "-" || ch === "*") continue;
    return false;
  }
  return true;
}
