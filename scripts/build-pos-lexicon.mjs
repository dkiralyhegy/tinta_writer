/**
 * Constrói o léxico de classes gramaticais pt-BR do tinta.
 *
 * Fonte: MorphoBr (github.com/LR-POR/MorphoBr, Apache-2.0) — TSV
 * `forma\tlema+TAGS` em pastas por classe. Poda por frequência com a
 * lista pt_br do hermitdave/FrequencyWords (mantém TODAS as flexões dos
 * lemas frequentes; a cauda longa cai fora).
 *
 * Saída: public/lexicon/pt-br.lex.gz
 *   magic "TLEX1" | u32LE count | u32LE formsByteLen |
 *   formas UTF-8 separadas por \n (ordenadas pelo comparador padrão JS,
 *   O MESMO usado na busca binária em runtime) | count bytes de bitmask
 *   (NOUN=1 VERB=2 ADJ=4 ADV=8)
 *
 * Uso: node scripts/build-pos-lexicon.mjs   (roda uma vez; artefato commitado)
 */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";

const ROOT = path.resolve(import.meta.dirname, "..");
const CACHE = path.join(ROOT, ".cache", "pos-lexicon");
const OUT_DIR = path.join(ROOT, "public", "lexicon");
const OUT = path.join(OUT_DIR, "pt-br.lex.gz");

/** knob principal: tamanho × cobertura */
const TOP_LEMMAS = 60_000;

const MORPHOBR_TARBALL = "https://codeload.github.com/LR-POR/MorphoBr/tar.gz/refs/heads/master";
const FREQ_URL =
  "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/pt_br/pt_br_full.txt";

const CAT_DIRS = { nouns: 1, verbs: 2, adjectives: 4, adverbs: 8 };

mkdirSync(CACHE, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });

// ── 1. downloads (cacheados) ──────────────────────────────────────────
const morphoDir = path.join(CACHE, "MorphoBr-master");
if (!existsSync(morphoDir)) {
  console.log("baixando MorphoBr…");
  execSync(`curl -sL "${MORPHOBR_TARBALL}" -o "${path.join(CACHE, "morphobr.tar.gz")}"`);
  execSync(`tar -xzf "${path.join(CACHE, "morphobr.tar.gz")}" -C "${CACHE}"`);
}
const freqFile = path.join(CACHE, "pt_br_full.txt");
if (!existsSync(freqFile)) {
  console.log("baixando lista de frequência pt_br…");
  execSync(`curl -sL "${FREQ_URL}" -o "${freqFile}"`);
}

// ── 2. lemas frequentes ───────────────────────────────────────────────
const freq = new Set();
for (const line of readFileSync(freqFile, "utf8").split("\n")) {
  if (freq.size >= TOP_LEMMAS) break;
  const w = line.split(" ")[0];
  if (w) freq.add(w.toLowerCase().normalize("NFC"));
}
console.log(`lemas frequentes: ${freq.size}`);

// ── 3. parse do MorphoBr com poda ─────────────────────────────────────
const ONLY_LETTERS = /^[\p{L}]+$/u;
const map = new Map(); // forma → bitmask
let rawLines = 0;

for (const [dir, bit] of Object.entries(CAT_DIRS)) {
  const full = path.join(morphoDir, dir);
  if (!existsSync(full)) {
    console.warn(`aviso: pasta ausente ${dir}`);
    continue;
  }
  for (const file of readdirSync(full)) {
    const fp = path.join(full, file);
    if (!statSync(fp).isFile()) continue;
    for (const line of readFileSync(fp, "utf8").split("\n")) {
      rawLines++;
      const tab = line.indexOf("\t");
      if (tab <= 0) continue;
      const form = line.slice(0, tab).toLowerCase().normalize("NFC");
      if (!ONLY_LETTERS.test(form)) continue; // sem hífen, dígito, espaço
      const rest = line.slice(tab + 1);
      const plus = rest.indexOf("+");
      const lemma = (plus > 0 ? rest.slice(0, plus) : rest).toLowerCase().normalize("NFC");
      if (!freq.has(lemma) && !freq.has(form)) continue;
      map.set(form, (map.get(form) ?? 0) | bit);
    }
  }
  console.log(`${dir}: acumulado ${map.size} formas`);
}
console.log(`linhas lidas: ${rawLines}; formas mantidas: ${map.size}`);

// ── 4. serializa (ordenação = comparador padrão JS) ───────────────────
const forms = [...map.keys()].sort();
const masks = Buffer.from(forms.map((f) => map.get(f)));
const formsBuf = Buffer.from(forms.join("\n"), "utf8");

const header = Buffer.alloc(13);
header.write("TLEX1", 0, "ascii");
header.writeUInt32LE(forms.length, 5);
header.writeUInt32LE(formsBuf.length, 9);

const raw = Buffer.concat([header, formsBuf, masks]);
const gz = gzipSync(raw, { level: 9 });
writeFileSync(OUT, gz);

console.log(
  `ok: ${forms.length} formas · bruto ${(raw.length / 1e6).toFixed(1)} MB · gzip ${(gz.length / 1e6).toFixed(2)} MB → ${path.relative(ROOT, OUT)}`,
);
