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

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function inferScene(storyKey, page, index) {
  const text = `${page.scene || ""} ${page.text || ""}`.toLowerCase();
  if (text.includes("uwv") || text.includes("uitkering") || text.includes("sollicitatie")) return "a Dutch public-service office or employment desk in Groningen";
  if (text.includes("moestuin") || text.includes("groenten")) return "a community garden in Groningen with raised beds and neighbors gardening together";
  if (text.includes("bibliotheek") || text.includes("taalcoach") || text.includes("cursus")) return "a bright Groningen library or classroom where people are practicing Dutch";
  if (text.includes("streetarts") || text.includes("arts") || text.includes("zorg")) return "a mobile health outreach setting in a Groningen street or community center";
  if (text.includes("park") || text.includes("natuur") || text.includes("heide")) return "Noorderplantsoen or a green Groningen park path with bicycles nearby";
  if (text.includes("water") || text.includes("regen")) return "a Groningen canal-side street after rain with careful water management details";
  if (text.includes("ecoduct") || text.includes("dieren")) return "a green wildlife crossing and nearby cycle path in the Groningen countryside";
  if (text.includes("erfgoed") || text.includes("gebouw") || text.includes("monument")) return "a Groningen heritage street with brick buildings and the Martinitoren atmosphere";
  if (text.includes("rietveld") || text.includes("architect")) return "a modern design museum or architecture workshop with Dutch design furniture";
  if (text.includes("koken") || text.includes("eten") || text.includes("restaurant")) return "a warm neighborhood kitchen or cafe in Groningen where immigrants cook together";
  if (text.includes("bedrijf") || text.includes("ondernemer")) return "a small start-up workspace or local shop counter in Groningen";
  if (text.includes("import") || text.includes("export") || text.includes("handel")) return "a logistics office near Groningen with maps, laptop, and shipping documents";
  if (text.includes("buurt") || text.includes("buren")) return "a friendly Groningen neighborhood street or community room with neighbors meeting";
  return "a recognizable Groningen street scene with bicycles, red-brick buildings, and immigrant daily life";
}

const prompts = [];

for (const [storyKey, story] of Object.entries(sandbox.__stories)) {
  if (!/^[1-4]-/.test(storyKey)) continue;
  story.pages.forEach((page, index) => {
    const scene = inferScene(storyKey, page, index);
    const targets = (page.targets || []).join(", ");
    prompts.push({
      storyKey,
      storySlug: slugify(storyKey),
      page: index + 1,
      file: `assets/storybook/${slugify(storyKey)}/page-${String(index + 1).padStart(2, "0")}.jpg`,
      targets: page.targets || [],
      text: page.text,
      prompt: [
        "Use case: photorealistic-natural.",
        "Asset type: 16:9 NT2 Dutch learning storybook page image.",
        "Primary request: Create an Instagram-style photorealistic lifestyle photo matching the sample reference style: Groningen street photography, natural daylight, realistic mobile/editorial look, no illustration.",
        "Subject: Mila, a friendly 28-year-old new immigrant NT2 learner in Groningen, recognizable natural face and daily-life presence. Keep identity consistent, but vary clothing, hairstyle, accessories, pose, camera angle, and distance from camera across pages. She must be visibly present in the foreground, fully in frame with generous headroom.",
        `Scene/backdrop: ${scene}.`,
        `Concrete action from this page: ${page.text}`,
        `Learning words to support visually: ${targets}.`,
        "Composition: candid documentary composition, waist-up or full-body view, protagonist doing the page action, Groningen details visible in the background such as bicycles, canals, red-brick buildings, storefronts, community spaces, parks, or Martinitoren when appropriate.",
        "Variety: do not repeat the same outfit, bag, room, angle, or front-facing pose across a whole story; make the pages feel like different moments in a real immigrant's week.",
        "Composition variety: avoid mostly right-side three-quarter portraits. Across a story, use a deliberate mix of frontal view, left-side profile, right-side profile, over-the-shoulder/back view, wide environmental view, low angle, high angle, and close action detail.",
        "Quality: warm natural light, realistic skin, clean hands, no blur on protagonist, no cropped head, polished Instagram photography.",
        "Avoid: no text, no captions, no logos, no watermarks, no posters, no UI, no cartoon, no fantasy, no empty landscape, no generic stock-photo stiffness."
      ].join(" ")
    });
  });
}

fs.mkdirSync(path.join(root, "assets", "storybook"), { recursive: true });
fs.writeFileSync(path.join(root, "assets", "storybook", "prompts.json"), JSON.stringify(prompts, null, 2), "utf8");
console.log(`Wrote ${prompts.length} storybook prompts`);
