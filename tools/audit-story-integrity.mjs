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
vm.runInContext(`${prefix}\nthis.__stories = stories; this.__storySlug = storySlug;`, sandbox);

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function wordSlug(value) {
  return sandbox.__storySlug(value);
}

function fileExists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function pushIssue(issues, storyKey, message) {
  issues.push(`${storyKey}: ${message}`);
}

const issues = [];
let storyCount = 0;
let pageCount = 0;
let quizCount = 0;
const uniqueWords = new Set();

for (const [storyKey, story] of Object.entries(sandbox.__stories)) {
  if (!/^[1-4]-/.test(storyKey)) continue;
  storyCount += 1;
  const vocab = (story.vocab || []).map(normalize);
  const vocabSet = new Set(vocab);
  const glossary = (story.glossary || []).map((item) => normalize(item.word));
  const glossarySet = new Set(glossary);
  vocab.forEach((word) => uniqueWords.add(word));

  if (!story.pages || story.pages.length !== 5) {
    pushIssue(issues, storyKey, `expected 5 pages, found ${story.pages?.length || 0}`);
  }
  if (vocab.length < 10) {
    pushIssue(issues, storyKey, `expected at least 10 vocab words, found ${vocab.length}`);
  }
  if (glossary.length !== vocab.length) {
    pushIssue(issues, storyKey, `glossary count ${glossary.length} does not match vocab count ${vocab.length}`);
  }
  for (const word of vocabSet) {
    if (!glossarySet.has(word)) pushIssue(issues, storyKey, `missing glossary entry for "${word}"`);
    const audioPath = `assets/word-audio/${wordSlug(word)}.mp3`;
    if (!fileExists(audioPath)) pushIssue(issues, storyKey, `missing word audio: ${audioPath}`);
  }

  const pageTargetSet = new Set();
  (story.pages || []).forEach((page, index) => {
    pageCount += 1;
    const pageNo = index + 1;
    const targets = (page.targets || []).map(normalize);
    if (targets.length < 2 || targets.length > 3) {
      pushIssue(issues, storyKey, `page ${pageNo} should have 2 targets, or 3 only for a 51-word chapter-3 story; found ${targets.length}`);
    }
    if (targets.length === 3 && storyKey !== "3-Amir in het atelier") {
      pushIssue(issues, storyKey, `page ${pageNo} has 3 targets outside the planned 51-word exception`);
    }
    for (const target of targets) {
      pageTargetSet.add(target);
      if (!vocabSet.has(target)) pushIssue(issues, storyKey, `page ${pageNo} target "${target}" is not in vocab`);
      if (!normalize(page.text).includes(target)) pushIssue(issues, storyKey, `page ${pageNo} text does not contain target "${target}"`);
    }
    if (!page.audioUrl || !fileExists(page.audioUrl)) {
      pushIssue(issues, storyKey, `missing page audio for page ${pageNo}: ${page.audioUrl || "(empty)"}`);
    }
    if (!page.imageUrl || !fileExists(page.imageUrl)) {
      pushIssue(issues, storyKey, `missing page image for page ${pageNo}: ${page.imageUrl || "(empty)"}`);
    }
  });

  for (const word of vocabSet) {
    if (!pageTargetSet.has(word)) pushIssue(issues, storyKey, `vocab word "${word}" is not assigned to any page target`);
  }
  for (const target of pageTargetSet) {
    if (!vocabSet.has(target)) pushIssue(issues, storyKey, `target "${target}" is not in vocab`);
  }

  if (!story.quiz || story.quiz.length !== 5) {
    pushIssue(issues, storyKey, `expected 5 quiz questions, found ${story.quiz?.length || 0}`);
  }
  (story.quiz || []).forEach((question, index) => {
    quizCount += 1;
    const label = `quiz ${index + 1}`;
    if (!question.question || !question.answer || !question.explanation) {
      pushIssue(issues, storyKey, `${label} is missing question, answer, or explanation`);
    }
    const options = question.options || [];
    if (options.length !== 4) pushIssue(issues, storyKey, `${label} should have 4 options, found ${options.length}`);
    if (!options.map(normalize).includes(normalize(question.answer))) {
      pushIssue(issues, storyKey, `${label} answer is not one of the options`);
    }
    for (const related of question.relatedWords || []) {
      if (!vocabSet.has(normalize(related))) {
        pushIssue(issues, storyKey, `${label} related word "${related}" is not in vocab`);
      }
    }
  });
}

console.log(`Stories checked: ${storyCount}`);
console.log(`Pages checked: ${pageCount}`);
console.log(`Quiz questions checked: ${quizCount}`);
console.log(`Unique vocab words checked: ${uniqueWords.size}`);

if (issues.length) {
  console.log("\nIntegrity issues:");
  for (const issue of issues) console.log(`- ${issue}`);
  process.exitCode = 1;
} else {
  console.log("Story/vocab/audio/image/flashcard/quiz integrity check passed.");
}
