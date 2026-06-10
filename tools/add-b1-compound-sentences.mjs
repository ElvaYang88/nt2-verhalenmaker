import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = process.cwd();
const htmlPath = path.join(root, "NT2-Verhalenmaker-Fixed.html");
let html = fs.readFileSync(htmlPath, "utf8");
const script = html.match(/<script>([\s\S]*)<\/script>/)?.[1];
if (!script) throw new Error("Cannot find inline script");

const noop = () => {};
const sandbox = {
  console,
  window: { addEventListener: noop, speechSynthesis: { cancel: noop, getVoices: () => [] } },
  navigator: { serviceWorker: { register: noop } },
  location: { protocol: "http:" },
  document: { getElementById: () => ({ textContent: "", style: {}, classList: { toggle: noop, add: noop, remove: noop } }) },
  localStorage: null,
  fetch: noop,
  SpeechSynthesisUtterance: function SpeechSynthesisUtterance() {},
  URL: { createObjectURL: () => "" },
  Blob: function Blob() {},
  Audio: function Audio() {},
  setTimeout,
  clearTimeout
};

vm.createContext(sandbox);
const prefix = script.split('const view = document.getElementById("view");')[0];
vm.runInContext(`${prefix}\nthis.__stories = stories;`, sandbox);

function splitSentences(text) {
  return String(text || "").match(/[^.!?]+[.!?]/g)?.map((sentence) => sentence.trim()) || [];
}

function protagonist(storyKey, text) {
  if (storyKey.includes("Amir") || /\bAmir\b/.test(text)) {
    return { name: "Amir", pronoun: "hij" };
  }
  return { name: "Mila", pronoun: "zij" };
}

function stripAddedClause(sentence) {
  return String(sentence || "")
    .replace(/,\s+omdat (hij|zij) meer wil leren\./i, ".")
    .replace(/,\s+zodat (hij|zij) de plek beter leert kennen\./i, ".")
    .replace(/,\s+terwijl (hij|zij) rustig verder kijkt\./i, ".")
    .replace(/,\s+zodat (hij|zij) later verder kan\./i, ".")
    .replace(/,\s+maar (hij|zij) doet het rustig\./i, ".")
    .replace(/,\s+omdat dit belangrijk is\./i, ".")
    .replace(/,\s+omdat dit goed is voor de stad\./i, ".")
    .replace(/,\s+omdat dit goed is voor de buurt\./i, ".")
    .replace(/,\s+omdat dit goed is voor de natuur\./i, ".")
    .replace(/,\s+omdat oude plekken zorg nodig hebben\./i, ".")
    .replace(/,\s+omdat werk belangrijk is\./i, ".")
    .replace(/,\s+omdat water bij de stad hoort\./i, ".")
    .replace(/,\s+terwijl (hij|zij) goed luistert\./i, ".")
    .replace(/,\s+terwijl (hij|zij) goed kijkt\./i, ".")
    .replace(/,\s+omdat (hij|zij) nieuwe woorden oefent\./i, ".")
    .replace(/,\s+zodat (hij|zij) meer begrijpt\./i, ".")
    .replace(/,\s+terwijl (hij|zij) rustig werkt\./i, ".")
    .replace(/,\s+terwijl (hij|zij) rustig meedoet\./i, ".")
    .replace(/,\s+terwijl (hij|zij) de buurt leert kennen\./i, ".")
    .replace(/,\s+terwijl (hij|zij) de regels leert kennen\./i, ".")
    .replace(/,\s+terwijl (Mila|Amir) goed luistert\./i, ".")
    .replace(/,\s+terwijl (Mila|Amir) goed kijkt\./i, ".")
    .replace(/,\s+terwijl (Mila|Amir) rustig meedoet\./i, ".");
}

function isPersonSentence(sentence, person) {
  const value = String(sentence || "");
  return value.includes(person.name);
}

function personClause(sentence, person) {
  const value = String(sentence || "").toLowerCase();
  if (/uitkering|aanvragen|uwv|formulier|regels|moet|eis/.test(value)) {
    return `terwijl ${person.pronoun} de regels leert kennen`;
  }
  if (/loopt|bezoekt|nieuw in|straat|gracht|buurt|stad/.test(value)) {
    return `terwijl ${person.pronoun} de buurt leert kennen`;
  }
  if (/luistert|hoort|vraagt|praat|gesprek|advies|stelt/.test(value)) {
    return `terwijl ${person.pronoun} goed luistert`;
  }
  if (/kijkt|ziet|bekijkt|foto|tekent|leest|merkt|herkent/.test(value)) {
    return `zodat ${person.pronoun} meer begrijpt`;
  }
  if (/helpt|vult|werkt|maakt|schrijft|plant|raapt|gooit|oefent|leert/.test(value)) {
    return `terwijl ${person.pronoun} rustig meedoet`;
  }
  return `zodat ${person.pronoun} meer begrijpt`;
}

function neutralClause(sentence, person) {
  const value = String(sentence || "").toLowerCase();
  if (/zegt|vertelt|legt|vraagt|praat|gesprek|hoort|advies|docent|gids|arts|adviseur|gemeente/.test(value)) {
    return `terwijl ${person.name} goed luistert`;
  }
  if (/ziet|kijkt|bekijkt|gebouw|huis|pand|monument|erfgoed|archief|museum|gevel|gracht|straat|park|natuur|plant|dier|water|regen|brug/.test(value)) {
    return `terwijl ${person.name} goed kijkt`;
  }
  return `terwijl ${person.name} rustig meedoet`;
}

function addClause(sentence, clause) {
  return `${String(sentence || "").replace(/[.!?]$/, "")}, ${clause}.`;
}

function compoundTwoSentences(storyKey, text, pageIndex) {
  const sentences = splitSentences(text);
  const person = protagonist(storyKey, text);
  if (sentences.length < 2) return text;
  const cleanSentences = sentences.map(stripAddedClause);

  const personIndexes = cleanSentences
    .map((sentence, index) => isPersonSentence(sentence, person) ? index : -1)
    .filter((index) => index >= 0);
  const selected = [];
  personIndexes.forEach((index) => {
    if (selected.length < 2) selected.push(index);
  });
  for (let index = 0; selected.length < 2 && index < cleanSentences.length; index += 1) {
    if (!selected.includes(index)) selected.push(index);
  }

  selected.slice(0, 2).forEach((index, order) => {
    const sentence = cleanSentences[index];
    const clause = isPersonSentence(sentence, person)
      ? personClause(sentence, person)
      : neutralClause(sentence, person);
    cleanSentences[index] = addClause(sentence, clause);
  });

  if (cleanSentences.length !== 4) {
    throw new Error(`${storyKey} page ${pageIndex + 1} has ${cleanSentences.length} sentences after compound rewrite`);
  }
  return cleanSentences.join(" ");
}

let replacements = 0;

for (const [storyKey, story] of Object.entries(sandbox.__stories)) {
  if (!/^[1-4]-/.test(storyKey)) continue;
  story.pages.forEach((page, pageIndex) => {
    const oldText = page.text;
    const newText = compoundTwoSentences(storyKey, oldText, pageIndex);
    if (newText === oldText) return;

    const oldNeedle = `text: ${JSON.stringify(oldText)}`;
    const newNeedle = `text: ${JSON.stringify(newText)}`;
    if (!html.includes(oldNeedle)) {
      throw new Error(`Could not find text literal for ${storyKey} page ${pageIndex + 1}`);
    }
    html = html.replace(oldNeedle, newNeedle);
    replacements += 1;
  });
}

fs.writeFileSync(htmlPath, html, "utf8");
fs.writeFileSync(path.join(root, "NT2-Verhalenmaker-Optimized.html"), html, "utf8");
console.log(`Updated ${replacements} story pages with two B1 compound sentences each.`);
