import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = process.cwd();
const htmlPath = path.join(root, "NT2-Verhalenmaker-Fixed.html");
const outDir = path.join(root, "assets", "storybook");

const html = fs.readFileSync(htmlPath, "utf8");
const script = html.match(/<script>([\s\S]*)<\/script>/)?.[1];
if (!script) throw new Error("Cannot find inline script in NT2-Verhalenmaker-Fixed.html");

const noop = () => {};
const sandbox = {
  console,
  window: { addEventListener: noop, speechSynthesis: { cancel: noop, getVoices: () => [] } },
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

const stories = sandbox.__stories;
const storyKeys = Object.keys(stories).filter((key) => /^[1-4]-/.test(key));

function slugify(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function download(url, filePath) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 10_000) throw new Error(`Downloaded file is too small: ${url}`);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, bytes);
  return bytes.length;
}

const manifest = {};
let count = 0;

for (const key of storyKeys) {
  const storySlug = slugify(key);
  manifest[key] = [];
  const pages = stories[key].pages || [];
  for (let i = 0; i < pages.length; i += 1) {
    const page = pages[i];
    const fileRel = `assets/storybook/${storySlug}/page-${String(i + 1).padStart(2, "0")}.jpg`;
    const fileAbs = path.join(root, fileRel);
    const source = page.imageUrl;
    if (!source || !/^https?:\/\//.test(source)) {
      throw new Error(`Missing downloadable image URL for ${key} page ${i + 1}`);
    }
    const size = fs.existsSync(fileAbs) ? fs.statSync(fileAbs).size : await download(source, fileAbs);
    manifest[key].push({
      page: i + 1,
      file: fileRel.replaceAll("\\", "/"),
      source,
      targets: page.targets || [],
      scene: page.scene || ""
    });
    count += 1;
    console.log(`${String(count).padStart(2, "0")}/80 ${key} page ${i + 1} ${Math.round(size / 1024)} KB`);
  }
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
console.log(`Wrote ${count} local storybook images and manifest.json`);
