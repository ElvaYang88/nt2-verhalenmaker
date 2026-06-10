import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = process.cwd();
const html = fs.readFileSync(path.join(root, "NT2-Verhalenmaker-Fixed.html"), "utf8");
const script = html.match(/<script>([\s\S]*)<\/script>/)?.[1];
if (!script) throw new Error("Cannot find inline script");

const noop = () => {};
const sandbox = {
  console,
  window: { addEventListener: noop, speechSynthesis: { cancel: noop, getVoices: () => [] } },
  navigator: { serviceWorker: { register: noop } },
  location: { protocol: "file:" },
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

const allowedProper = new Set([
  "mila", "groningen", "groninger", "nederland", "nederlandse", "nederlanders",
  "rietveld", "uwv", "unesco", "martinitoren"
]);

const allowedLearningContext = new Set([
  "buurvrouw", "buurman", "wijkcentrum", "straatdokter", "hulpverlener",
  "waterbedrijf", "watertekort", "drinkwater", "mosterdsoep", "loonstroken",
  "sollicitatie", "solliciteren", "presentatie", "vrijwilliger", "vrijwilligers",
  "vrijwilligerswerk", "computerkennis", "taalcoach", "natuurgebied", "regenpijp",
  "opvangplek", "watervoorziening", "smaakwoorden", "leerpunten", "uitnodigingen",
  "crowdfunding", "exporteurs", "vertragingen", "nieuwkomers", "duidelijker"
]);

const suspicious = new Set([
  "complex", "essentieel", "cruciaal", "aanzienlijk", "professioneel", "innovatief",
  "maatschappelijk", "integratie", "subsidie", "autoritair", "collectief",
  "implementeren", "concreet", "duurzaamheid", "ecologisch", "faciliteren"
]);

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function words(text) {
  return normalize(text).match(/[a-z]+(?:-[a-z]+)?/g) || [];
}

const rows = [];

for (const [storyKey, story] of Object.entries(sandbox.__stories)) {
  if (!/^[1-4]-/.test(storyKey)) continue;
  story.pages.forEach((page, index) => {
    const targets = new Set((page.targets || []).flatMap((target) => words(target)));
    const tokens = words(page.text).filter((token) =>
      !targets.has(token) &&
      !allowedProper.has(token) &&
      !allowedLearningContext.has(token)
    );
    const flags = [...new Set(tokens.filter((token) =>
      token.length >= 11 || suspicious.has(token)
    ))].sort();
    if (flags.length) {
      rows.push({
        storyKey,
        page: index + 1,
        flags,
        text: page.text
      });
    }
  });
}

if (!rows.length) {
  console.log("No likely non-target B2+ words found by the audit heuristic.");
} else {
  for (const row of rows) {
    console.log(`${row.storyKey} p${row.page}: ${row.flags.join(", ")}`);
    console.log(`  ${row.text}`);
  }
  console.log(`\nFlagged pages: ${rows.length}`);
}
