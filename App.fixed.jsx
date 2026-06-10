import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle,
  ChevronDown,
  CircleUser,
  Download,
  Home,
  Info,
  Key,
  Leaf,
  Mic,
  Palette,
  Play,
  RefreshCw,
  Save,
  Snail,
  Sparkles,
  Star,
  Trophy,
  Users,
  Volume2,
  XCircle,
  ZoomIn,
} from "lucide-react";
import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";

const apiKey = "";

const firebaseConfigStr =
  typeof __firebase_config !== "undefined" ? __firebase_config : "{}";

let firebaseConfig = {};
try {
  if (
    firebaseConfigStr &&
    firebaseConfigStr !== "undefined" &&
    firebaseConfigStr !== "{}"
  ) {
    firebaseConfig =
      typeof firebaseConfigStr === "string"
        ? JSON.parse(firebaseConfigStr)
        : firebaseConfigStr;
  }
} catch {
  console.warn("Firebase-initialisatie overgeslagen.");
}

let auth = null;
try {
  if (Object.keys(firebaseConfig).length > 0) {
    const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(firebaseApp);
  }
} catch {
  console.warn("Firebase niet actief.");
}

const fallbackImages = [
  "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80",
];

const THEMES = [
  {
    id: 1,
    chapter: "Thema 1",
    title: "De maatschappij",
    icon: Users,
    color: "text-purple-700 bg-purple-50",
    subsections: ["Gelukkig zijn", "Een streetarts"],
    vocab: [
      "blijken",
      "aarzelen",
      "uitgebreid",
      "aanvragen",
      "uitkering",
      "stimuleren",
      "arbeidsmarkt",
      "bevorderen",
      "cultuurverschil",
      "toepassen",
    ],
  },
  {
    id: 2,
    chapter: "Thema 2",
    title: "Natuur en klimaat",
    icon: Leaf,
    color: "text-emerald-700 bg-emerald-50",
    subsections: ["Druk in de natuur"],
    vocab: [
      "aanleggen",
      "aanpassing",
      "aantrekkelijk",
      "afvalstof",
      "afvoeren",
      "beheerder",
      "benadrukken",
      "beschermen",
      "besparen",
      "duurzaam",
    ],
  },
  {
    id: 3,
    chapter: "Thema 3",
    title: "Cultuur",
    icon: Palette,
    color: "text-amber-700 bg-amber-50",
    subsections: ["UNESCO werelderfgoed"],
    vocab: [
      "behouden",
      "beschermen",
      "bevorderen",
      "bewaren",
      "eigentijds",
      "evalueren",
      "gebouw",
      "aanpassing",
      "aanraden",
      "afhangen van",
    ],
  },
];

const PRE_GENERATED_STORIES = {
  "1-Gelukkig zijn": {
    vocab: THEMES[0].vocab,
    pages: [
      {
        text: "Een nieuwe start in Groningen is niet altijd makkelijk. Uit onderzoek van de gemeente Groningen is gebleken dat veel nieuwkomers zich in het begin eenzaam voelen. Sommige mensen aarzelen om contact op te nemen met hun buren. Gelukkig zijn er actieve buurtverenigingen die bijeenkomsten organiseren.",
        imageUrl: fallbackImages[0],
        targets: ["blijken", "aarzelen"],
      },
      {
        text: "Er is een uitgebreid programma met wekelijkse activiteiten in het wijkcentrum. Bewoners kunnen ook subsidie aanvragen voor een gezamenlijke moestuin. Door samen groenten te verbouwen, leren mensen elkaar op een rustige manier kennen.",
        imageUrl: fallbackImages[1],
        targets: ["uitgebreid", "aanvragen"],
      },
      {
        text: "Sommige nieuwkomers ontvangen tijdelijk een uitkering. De gemeente probeert hen te stimuleren om vrijwilligerswerk in de buurt te doen. Dit helpt de wijk en vergroot hun netwerk.",
        imageUrl: fallbackImages[2],
        targets: ["uitkering", "stimuleren"],
      },
      {
        text: "Vrijwilligerswerk helpt cursisten sneller hun weg te vinden op de Nederlandse arbeidsmarkt. Het spreken van de taal is essentieel om sociale integratie te bevorderen. Taalcoaches oefenen elke week met cursisten.",
        imageUrl: fallbackImages[2],
        targets: ["arbeidsmarkt", "bevorderen"],
      },
      {
        text: "Soms is er een klein cultuurverschil in hoe mensen met elkaar omgaan. Door open te staan voor elkaar, leer je nieuwe gewoontes snel toepassen. Uiteindelijk wil iedereen zich gewaardeerd voelen.",
        imageUrl: fallbackImages[3],
        targets: ["cultuurverschil", "toepassen"],
      },
    ],
    glossary: [
      { word: "blijken", definition: "duidelijk worden" },
      { word: "aarzelen", definition: "twijfelen of wachten omdat je niet durft" },
      { word: "uitgebreid", definition: "groot en met veel details" },
      { word: "aanvragen", definition: "officieel vragen om iets te krijgen" },
      { word: "uitkering", definition: "geld dat iemand tijdelijk van de overheid krijgt" },
      { word: "stimuleren", definition: "aanmoedigen" },
      { word: "arbeidsmarkt", definition: "alle banen en mensen die werk zoeken" },
      { word: "bevorderen", definition: "helpen om iets beter te maken" },
      { word: "cultuurverschil", definition: "verschil in gewoontes tussen groepen" },
      { word: "toepassen", definition: "in de praktijk gebruiken" },
    ],
    quiz: [
      {
        question: "Wat blijkt uit onderzoek van de gemeente Groningen?",
        options: [
          "Veel nieuwkomers voelen zich in het begin eenzaam.",
          "Iedereen vindt meteen werk.",
          "Er zijn geen buurtverenigingen.",
          "Niemand wil Nederlands leren.",
        ],
        answer: "Veel nieuwkomers voelen zich in het begin eenzaam.",
        explanation:
          "In de eerste pagina staat dat veel nieuwkomers zich in het begin eenzaam voelen.",
        relatedWords: ["blijken", "aarzelen"],
      },
      {
        question: "Waarom is vrijwilligerswerk nuttig?",
        options: [
          "Het helpt mensen hun netwerk te vergroten.",
          "Het vervangt alle taallessen.",
          "Het maakt subsidies onmogelijk.",
          "Het zorgt ervoor dat niemand meer buren nodig heeft.",
        ],
        answer: "Het helpt mensen hun netwerk te vergroten.",
        explanation:
          "De tekst zegt dat vrijwilligerswerk de wijk helpt en het netwerk vergroot.",
        relatedWords: ["stimuleren", "arbeidsmarkt"],
      },
      {
        question: "Wat betekent bevorderen in de tekst?",
        options: ["Iets vooruithelpen.", "Iets verbieden.", "Iets vergeten.", "Iets weigeren."],
        answer: "Iets vooruithelpen.",
        explanation:
          "Sociale integratie bevorderen betekent dat je integratie helpt verbeteren.",
        relatedWords: ["bevorderen"],
      },
    ],
  },
  "2-Druk in de natuur": {
    vocab: THEMES[1].vocab,
    pages: [
      {
        text: "Groningen wil meer groene parken aanleggen om rust te creëren. Toch vraagt drukte in de natuur om een duidelijke aanpassing van ons gedrag. Bezoekers moeten op de paden blijven.",
        imageUrl:
          "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=80",
        targets: ["aanleggen", "aanpassing"],
      },
      {
        text: "Een schone omgeving is aantrekkelijk voor wandelaars en gezinnen. Helaas laten sommige bezoekers een schadelijke afvalstof achter. Dat is slecht voor dieren en planten.",
        imageUrl:
          "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80",
        targets: ["aantrekkelijk", "afvalstof"],
      },
      {
        text: "Na zware regen moet de gemeente water goed afvoeren. De beheerder van het park controleert de paden en waarschuwt bezoekers. Zo blijft het park veilig.",
        imageUrl:
          "https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=1200&q=80",
        targets: ["afvoeren", "beheerder"],
      },
      {
        text: "Onderzoekers benadrukken dat natuur niet vanzelf gezond blijft. We moeten kwetsbare planten actief beschermen. Iedere bezoeker kan daarbij helpen.",
        imageUrl:
          "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=80",
        targets: ["benadrukken", "beschermen"],
      },
      {
        text: "Door water te besparen leven we bewuster. Een duurzaam leven begint met kleine keuzes in huis en in de stad. Zo blijft Groningen groen.",
        imageUrl:
          "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1200&q=80",
        targets: ["besparen", "duurzaam"],
      },
    ],
    glossary: [
      { word: "aanleggen", definition: "maken of bouwen" },
      { word: "aanpassing", definition: "verandering om iets beter te maken" },
      { word: "aantrekkelijk", definition: "mooi of prettig" },
      { word: "afvalstof", definition: "schadelijk restmateriaal" },
      { word: "afvoeren", definition: "weg laten lopen of wegbrengen" },
      { word: "beheerder", definition: "persoon die voor een plek zorgt" },
      { word: "benadrukken", definition: "extra duidelijk zeggen" },
      { word: "beschermen", definition: "veilig houden" },
      { word: "besparen", definition: "minder gebruiken" },
      { word: "duurzaam", definition: "goed voor de toekomst" },
    ],
    quiz: [
      {
        question: "Waarom wil Groningen meer groene parken aanleggen?",
        options: ["Om rust te creëren.", "Om afval te bewaren.", "Om banen te stoppen.", "Om minder bomen te hebben."],
        answer: "Om rust te creëren.",
        explanation: "De eerste pagina zegt dat groene parken rust creëren.",
        relatedWords: ["aanleggen"],
      },
      {
        question: "Wie controleert de paden na zware regen?",
        options: ["De beheerder.", "Een kok.", "Een student zonder taak.", "Een kunstenaar."],
        answer: "De beheerder.",
        explanation: "De beheerder controleert de paden en waarschuwt bezoekers.",
        relatedWords: ["beheerder", "afvoeren"],
      },
      {
        question: "Wat is duurzaam gedrag volgens de tekst?",
        options: ["Water besparen.", "Meer afval achterlaten.", "Planten beschadigen.", "Niet op de paden blijven."],
        answer: "Water besparen.",
        explanation: "De tekst noemt water besparen als bewuste duurzame keuze.",
        relatedWords: ["besparen", "duurzaam"],
      },
    ],
  },
};

function forceString(value) {
  return value === null || value === undefined ? "" : String(value);
}

function normalizeString(value) {
  return forceString(value).trim().toLowerCase();
}

function generateStudentId() {
  return `STU-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

function playDutchText(text, rate = 0.9, onEnd) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(forceString(text));
  utterance.lang = "nl-NL";
  utterance.rate = rate;
  utterance.onend = () => onEnd?.();
  window.speechSynthesis.speak(utterance);
}

function playWordAudio(word) {
  playDutchText(word, 0.85);
}

function HighlightedText({ text, vocab, glossary, onWordTrigger }) {
  const words = useMemo(
    () => (Array.isArray(vocab) ? vocab : []).map((word) => normalizeString(word)),
    [vocab],
  );
  const parts = forceString(text).split(/([\s.,!?;"':()]+)/g);

  return (
    <>
      {parts.map((part, index) => {
        const clean = normalizeString(part);
        const matchIndex = words.findIndex((word) => clean === word || clean.startsWith(word));
        if (matchIndex === -1 || !part.trim()) return <span key={index}>{part}</span>;

        const word = vocab[matchIndex];
        const definition =
          glossary.find((item) => normalizeString(item.word) === normalizeString(word))?.definition ||
          "Doelwoord";

        return (
          <button
            key={index}
            type="button"
            onClick={() => onWordTrigger(word, definition, true)}
            onMouseEnter={() => onWordTrigger(word, definition, false)}
            className="mx-0.5 rounded-md border-b-2 border-dotted border-purple-400 bg-purple-100 px-1.5 py-0.5 font-black text-purple-800 transition hover:bg-purple-700 hover:text-white"
            title={definition}
          >
            {part}
          </button>
        );
      })}
    </>
  );
}

function StoryAudioPlayer({ text, playbackSpeed, isPlaying, setIsPlaying, onXpEarned }) {
  const hasAwardedRef = useRef(false);

  useEffect(() => {
    hasAwardedRef.current = false;
  }, [text]);

  const handlePlay = () => {
    if (isPlaying) {
      window.speechSynthesis?.cancel();
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);
    playDutchText(text, playbackSpeed, () => {
      setIsPlaying(false);
      if (!hasAwardedRef.current) {
        hasAwardedRef.current = true;
        onXpEarned?.(5);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handlePlay}
      className="flex h-12 w-full items-center justify-center gap-3 rounded-full bg-purple-600 px-5 text-sm font-black text-white transition hover:bg-purple-700"
    >
      {isPlaying ? "Voorlezen..." : <><Play size={18} fill="currentColor" /> Browser audio afspelen</>}
    </button>
  );
}

function ImagePanel({ src, title }) {
  const [hasError, setHasError] = useState(false);
  return (
    <div className="relative min-h-[280px] overflow-hidden rounded-3xl bg-slate-900 shadow-lg">
      {!hasError && src ? (
        <img
          src={src}
          alt={title || "Groningen context"}
          onError={() => setHasError(true)}
          className="h-full min-h-[280px] w-full object-cover"
        />
      ) : (
        <div className="flex min-h-[280px] flex-col items-center justify-center p-8 text-center text-slate-200">
          <BookOpen size={42} className="mb-4 text-purple-300" />
          <p className="text-xs font-black uppercase tracking-widest">{title || "Groningen"}</p>
          <p className="mt-2 text-sm text-slate-400">Beeld tijdelijk offline</p>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [appState, setAppState] = useState("landing");
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [selectedSubsection, setSelectedSubsection] = useState("");
  const [pages, setPages] = useState([]);
  const [storyGlossary, setStoryGlossary] = useState([]);
  const [activeVocab, setActiveVocab] = useState([]);
  const [quiz, setQuiz] = useState([]);
  const [userAnswers, setUserAnswers] = useState({});
  const [score, setScore] = useState(0);
  const [error, setError] = useState("");
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [fontSize, setFontSize] = useState("text-xl");
  const [playbackSpeed, setPlaybackSpeed] = useState(0.9);
  const [isPlaying, setIsPlaying] = useState(false);
  const [globalStats, setGlobalStats] = useState({ xp: 0, level: 1 });
  const [xpToasts, setXpToasts] = useState([]);
  const [showMobileDrawer, setShowMobileDrawer] = useState(false);
  const [mobileDrawerWord, setMobileDrawerWord] = useState("");
  const [mobileDrawerDef, setMobileDrawerDef] = useState("");
  const [showKeyDrawer, setShowKeyDrawer] = useState(false);
  const [userApiKey, setUserApiKey] = useState(apiKey);
  const [customPrompt, setCustomPrompt] = useState("");
  const [reviewPool, setReviewPool] = useState([]);
  const [reviewMode, setReviewMode] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [discoveredWords, setDiscoveredWords] = useState([]);
  const [userProfile, setUserProfile] = useState({
    name: "",
    photo: null,
    studentId: generateStudentId(),
  });
  const [isListening, setIsListening] = useState(false);

  const readingTopRef = useRef(null);
  const recognitionRef = useRef(null);
  const currentPage = pages[currentPageIndex] || {};
  const flashcardItems = reviewMode && reviewPool.length ? reviewPool : storyGlossary;
  const currentCard = flashcardItems[currentCardIndex] || {};

  useEffect(() => {
    if (!auth) return;
    signInAnonymously(auth).catch(() => {
      console.warn("Firebase-auth verbinding gestaakt.");
    });
  }, []);

  useEffect(() => {
    window.speechSynthesis?.cancel();
    setIsPlaying(false);
    readingTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [currentPageIndex]);

  function awardXP(amount, reason = "Leren") {
    setGlobalStats((prev) => {
      const nextXp = prev.xp + amount;
      return { xp: nextXp, level: Math.floor(nextXp / 100) + 1 };
    });
    setXpToasts((prev) => [...prev, `+${amount} XP (${reason})`]);
    setTimeout(() => setXpToasts((prev) => prev.slice(1)), 2200);
  }

  function handleStart(theme, subsection) {
    const key = `${theme.id}-${subsection}`;
    const staticStory = PRE_GENERATED_STORIES[key];
    setError("");
    setSelectedTheme(theme);
    setSelectedSubsection(subsection);
    setCurrentPageIndex(0);
    setUserAnswers({});
    setReviewMode(false);

    if (!staticStory && !userApiKey.trim()) {
      setError("Dit onderwerp heeft een Gemini API Key nodig. Kies een offline verhaal of voeg een key toe.");
      return;
    }

    if (!staticStory) {
      setError("Dynamische generatie is hier als aansluitpunt bewaard. Voeg je bestaande Gemini-route later terug.");
      return;
    }

    setActiveVocab(staticStory.vocab);
    setStoryGlossary(staticStory.glossary);
    setQuiz(staticStory.quiz);
    setPages(staticStory.pages);
    setAppState("reading");
    awardXP(5, "Verhaal gestart");
  }

  function handleWordTrigger(word, definition, isTap) {
    if (!discoveredWords.includes(word)) {
      setDiscoveredWords((prev) => [...prev, word]);
      awardXP(2, "Woord ontdekt");
    }
    if (isTap) {
      playWordAudio(word);
      setMobileDrawerWord(word);
      setMobileDrawerDef(definition);
      setShowMobileDrawer(true);
    }
  }

  function handleOptionSelect(questionIndex, option) {
    if (userAnswers[questionIndex]) return;
    setUserAnswers((prev) => ({ ...prev, [questionIndex]: option }));

    const question = quiz[questionIndex];
    if (normalizeString(option) === normalizeString(question.answer)) {
      awardXP(10, "Correct antwoord");
      return;
    }

    const relatedWords = question.relatedWords?.length ? question.relatedWords : currentPage.targets || [];
    const additions = relatedWords
      .map((word) => {
        const glossaryItem = storyGlossary.find(
          (item) => normalizeString(item.word) === normalizeString(word),
        );
        const sentence =
          pages
            .map((page) => page.text)
            .join(" ")
            .split(/[.!?]/)
            .find((sentencePart) => normalizeString(sentencePart).includes(normalizeString(word)))
            ?.trim() || "";
        return { word, definition: glossaryItem?.definition || "Doelwoord", sentence };
      })
      .filter((item) => item.word);

    setReviewPool((prev) => {
      const existing = new Set(prev.map((item) => item.word));
      return [...prev, ...additions.filter((item) => !existing.has(item.word))];
    });
  }

  function calculateResults() {
    const nextScore = quiz.reduce(
      (total, question, index) =>
        normalizeString(userAnswers[index]) === normalizeString(question.answer) ? total + 1 : total,
      0,
    );
    setScore(nextScore);
    setAppState("results");
    awardXP(nextScore * 10 + (nextScore === quiz.length ? 30 : 0), "Quiz voltooid");
  }

  function startFlashcards(onlyReview = false) {
    setReviewMode(onlyReview);
    setCurrentCardIndex(0);
    setIsCardFlipped(false);
    setAppState("flashcards");
  }

  function nextFlashcard() {
    if (currentCardIndex < flashcardItems.length - 1) {
      setIsCardFlipped(false);
      setCurrentCardIndex((prev) => prev + 1);
      return;
    }
    awardXP(reviewMode ? 15 : 30, reviewMode ? "Fouten herhaald" : "Woordentrainer");
    setReviewMode(false);
    setAppState(reviewMode ? "results" : "custom_prompt");
  }

  function reset() {
    window.speechSynthesis?.cancel();
    setAppState("landing");
    setSelectedTheme(null);
    setSelectedSubsection("");
    setPages([]);
    setStoryGlossary([]);
    setQuiz([]);
    setUserAnswers({});
    setCustomPrompt("");
    setError("");
    setReviewMode(false);
  }

  function toggleFontSize() {
    setFontSize((prev) => (prev === "text-lg" ? "text-xl" : prev === "text-xl" ? "text-2xl" : "text-lg"));
  }

  function togglePlaybackSpeed() {
    setPlaybackSpeed((prev) => (prev === 0.9 ? 0.75 : prev === 0.75 ? 1.15 : 0.9));
  }

  function toggleListening() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setError("Speech recognition wordt niet ondersteund in deze browser.");
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const recognition = new Recognition();
    recognition.lang = "nl-NL";
    recognition.interimResults = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event) => {
      const text = event?.results?.[0]?.[0]?.transcript;
      if (text) setCustomPrompt((prev) => (prev ? `${prev} ${text}` : text));
    };
    recognitionRef.current = recognition;
    recognition.start();
  }

  function handlePhotoUpload(event) {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setUserProfile((prev) => ({
        ...prev,
        photo: { previewUrl: reader.result, mimeType: file.type },
      }));
    };
    reader.readAsDataURL(file);
  }

  function downloadNotebookLMData() {
    const storyFullText = pages
      .map((page, index) => `--- Pagina ${index + 1} ---\n${page.text}`)
      .join("\n\n");
    const quizResults = quiz
      .map(
        (question, index) =>
          `Vraag ${index + 1}: ${question.question}\nAntwoord Cursist: ${
            userAnswers[index] || "Niet beantwoord"
          }\nCorrect: ${question.answer}`,
      )
      .join("\n\n");
    const fileContent = `NT2 Research Data\nStudent ID: ${userProfile.studentId}\n\n[VERHAAL]\n${storyFullText}\n\n[QUIZ]\n${quizResults}`;
    const blob = new Blob([fileContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `NT2_Data_${userProfile.studentId}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#FAF9F6] text-slate-800">
      <div className="pointer-events-none fixed right-6 top-20 z-50 flex flex-col gap-2">
        {xpToasts.map((toast, index) => (
          <div key={`${toast}-${index}`} className="rounded-xl border border-yellow-300 bg-yellow-400 px-4 py-2 text-sm font-black text-slate-900 shadow-lg">
            {toast}
          </div>
        ))}
      </div>

      <div className={`fixed inset-y-0 right-0 z-50 w-80 border-l border-white/10 bg-slate-950/95 p-6 shadow-2xl transition-transform duration-300 ${showKeyDrawer ? "translate-x-0" : "translate-x-full"}`}>
        <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
          <h4 className="flex items-center gap-2 font-black text-white"><Key size={18} /> API Instellingen</h4>
          <button type="button" onClick={() => setShowKeyDrawer(false)} className="text-slate-400"><XCircle size={20} /></button>
        </div>
        <p className="mb-6 text-xs leading-relaxed text-slate-300">
          Zonder key werken alleen onderwerpen die lokaal aanwezig zijn. Met key kun je later je bestaande Gemini-route terugplaatsen.
        </p>
        <input type="password" value={userApiKey} onChange={(event) => setUserApiKey(event.target.value)} placeholder="AIzaSy..." className="mb-6 w-full rounded-xl border border-white/20 bg-white/10 p-3 font-mono text-sm text-white outline-none ring-purple-500 focus:ring-2" />
        <button type="button" onClick={() => setShowKeyDrawer(false)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 py-3 text-sm font-black text-white"><Save size={16} /> Toepassen</button>
      </div>

      <div className={`fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-white/10 bg-slate-950/90 p-6 text-white shadow-2xl transition-transform duration-300 ${showMobileDrawer ? "translate-y-0" : "translate-y-full"}`}>
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/20" onClick={() => setShowMobileDrawer(false)} />
        <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
          <h4 className="flex items-center gap-2 text-xl font-black uppercase"><Info size={18} className="text-purple-300" /> {mobileDrawerWord}</h4>
          <div className="flex gap-2">
            <button type="button" onClick={() => playWordAudio(mobileDrawerWord)} className="rounded-xl bg-purple-700 px-3 py-2 text-sm font-black">Uitspraak</button>
            <button type="button" onClick={() => setShowMobileDrawer(false)} className="rounded-xl bg-white/10 p-2"><ChevronDown size={20} /></button>
          </div>
        </div>
        <p className="text-lg text-slate-200">{mobileDrawerDef}</p>
      </div>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/60 bg-white/85 p-4 shadow-sm backdrop-blur">
        <button type="button" onClick={reset} className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-700 text-white"><BookOpen size={20} /></div>
          <h1 className="text-left text-xl font-black">De finale <span className="font-light text-slate-400">Verhalenmaker</span></h1>
        </button>
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2">
            <div className="flex items-baseline gap-2 text-xs font-black"><Star size={15} className="text-yellow-500" fill="currentColor" /> Lvl {globalStats.level}<span className="text-slate-400">{globalStats.xp} XP</span></div>
            <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-yellow-500" style={{ width: `${globalStats.xp % 100}%` }} /></div>
          </div>
          <button type="button" onClick={() => setShowKeyDrawer(true)} className="rounded-xl bg-slate-100 p-2.5"><Key size={18} /></button>
          {appState !== "landing" && <button type="button" onClick={reset} className="rounded-xl bg-slate-100 p-2.5"><Home size={18} /></button>}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        {error && (
          <div className="mx-auto mb-6 flex max-w-4xl items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 font-bold text-red-700">
            <XCircle size={22} /> {error}
          </div>
        )}

        {appState === "landing" && (
          <section className="py-10 text-center">
            <h2 className="text-5xl font-black leading-tight sm:text-7xl">Dompel jezelf onder in<br /><span className="text-purple-700">Groningen.</span></h2>
            <p className="mx-auto mt-5 max-w-2xl text-xl font-medium text-slate-500">Kies een thema. Offline onderwerpen starten direct; andere onderwerpen vragen om een API key.</p>
            <div className="mx-auto mt-12 grid max-w-6xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {THEMES.map((theme) => {
                const Icon = theme.icon;
                const hasAnyOffline = theme.subsections.some((subsection) => PRE_GENERATED_STORIES[`${theme.id}-${subsection}`]);
                return (
                  <div key={theme.id} className="rounded-3xl border border-slate-100 bg-white p-6 text-left shadow-lg">
                    <div className="mb-5 flex items-start justify-between">
                      <div>
                        <span className="rounded-lg bg-purple-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-purple-700">{theme.chapter}</span>
                        <div className="mt-2">
                          {hasAnyOffline ? <span className="rounded border border-green-200 bg-green-50 px-2 py-1 text-[10px] font-black uppercase text-green-700">Offline beschikbaar</span> : <span className="inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-black uppercase text-amber-700"><AlertCircle size={10} /> AI key nodig</span>}
                        </div>
                      </div>
                      <div className={`rounded-2xl p-3 ${theme.color}`}><Icon size={24} /></div>
                    </div>
                    <h3 className="mb-5 text-xl font-black">{theme.title}</h3>
                    <div className="flex flex-col gap-2">
                      {theme.subsections.map((subsection) => {
                        const offlineReady = !!PRE_GENERATED_STORIES[`${theme.id}-${subsection}`];
                        const disabled = !offlineReady && !userApiKey.trim();
                        return (
                          <button key={subsection} type="button" disabled={disabled} onClick={() => handleStart(theme, subsection)} className={`flex items-center justify-between rounded-xl border p-3 text-left text-xs font-bold transition ${disabled ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400" : "border-slate-100 bg-slate-50 hover:bg-purple-700 hover:text-white"}`}>
                            {subsection}<ArrowRight size={14} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {appState === "reading" && (
          <section ref={readingTopRef} className="mx-auto max-w-4xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white p-3 shadow-sm">
              <span className="rounded-xl border border-purple-200 bg-purple-50 px-4 py-2 text-xs font-black text-purple-900">{selectedTheme?.title} / {selectedSubsection}</span>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={togglePlaybackSpeed} className="flex items-center gap-1 rounded-xl border border-purple-200 bg-purple-50 px-4 py-2 text-sm font-bold text-purple-700"><Snail size={16} /> {playbackSpeed}x</button>
                <button type="button" onClick={toggleFontSize} className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold"><ZoomIn size={16} /> {fontSize === "text-lg" ? "A-" : fontSize === "text-xl" ? "A" : "A+"}</button>
              </div>
            </div>

            <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl sm:p-10">
              {currentPage.targets?.length > 0 && <div className="mb-6 inline-flex items-center gap-2 rounded-2xl border border-purple-100 bg-purple-50 px-4 py-2 text-xs font-black text-purple-800"><Award size={14} /> Doelwoorden op deze pagina: {currentPage.targets.join(", ")}</div>}
              <div className={`mb-8 max-h-[420px] overflow-y-auto pr-2 font-serif leading-[2.1] text-slate-800 ${fontSize}`}>
                <HighlightedText text={currentPage.text} vocab={activeVocab} glossary={storyGlossary} onWordTrigger={handleWordTrigger} />
              </div>
              <div className="mx-auto mb-8 max-w-md rounded-full border border-purple-100 bg-purple-50 p-2">
                <StoryAudioPlayer text={currentPage.text} playbackSpeed={playbackSpeed} isPlaying={isPlaying} setIsPlaying={setIsPlaying} onXpEarned={(xp) => awardXP(xp, "Audio geluisterd")} />
              </div>
              <div className="mb-8"><ImagePanel src={currentPage.imageUrl} title={selectedTheme?.title} /></div>
              <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-6 sm:flex-row">
                <button type="button" disabled={currentPageIndex === 0} onClick={() => { setCurrentPageIndex((prev) => prev - 1); awardXP(2, "Teruggelezen"); }} className="w-full rounded-xl border border-slate-200 px-5 py-3 font-bold disabled:opacity-30 sm:w-auto">Vorige</button>
                <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-500">Spread {currentPageIndex + 1} / {pages.length}</span>
                {currentPageIndex < pages.length - 1 ? <button type="button" onClick={() => { setCurrentPageIndex((prev) => prev + 1); awardXP(5, "Pagina gelezen"); }} className="w-full rounded-xl bg-purple-700 px-8 py-3 font-black text-white sm:w-auto">Volgende</button> : <button type="button" onClick={() => startFlashcards(false)} className="w-full rounded-xl bg-green-600 px-6 py-3 font-black text-white sm:w-auto">Woordentrainer</button>}
              </div>
            </article>
          </section>
        )}

        {appState === "flashcards" && (
          <section className="mx-auto max-w-2xl py-10">
            <div className="mb-8 text-center"><h2 className="text-4xl font-black">{reviewMode ? "Fouten Herhalen" : "Woordentrainer"}</h2><p className="mt-2 font-bold text-slate-400">Kaart {currentCardIndex + 1} / {flashcardItems.length}</p></div>
            <button type="button" onClick={() => setIsCardFlipped((prev) => !prev)} className="flex h-80 w-full flex-col items-center justify-center rounded-[2rem] border bg-white p-8 text-center shadow-2xl">
              {!isCardFlipped ? (
                <>
                  <button type="button" onClick={(event) => { event.stopPropagation(); playWordAudio(currentCard.word); }} className="mb-6 rounded-full bg-purple-100 p-3 text-purple-700"><Volume2 size={24} /></button>
                  <h3 className="text-5xl font-black text-purple-800">{currentCard.word}</h3>
                  <p className="mt-5 flex items-center gap-2 font-medium text-slate-400"><RefreshCw size={16} /> Klik om om te draaien</p>
                </>
              ) : (
                <>
                  <h4 className="text-3xl font-black leading-relaxed text-slate-900">{currentCard.definition}</h4>
                  {currentCard.sentence && <p className="mt-6 rounded-2xl bg-purple-50 p-4 font-serif text-slate-600">{currentCard.sentence}</p>}
                </>
              )}
            </button>
            <button type="button" onClick={nextFlashcard} className="mt-8 w-full rounded-2xl bg-purple-700 py-5 text-xl font-black text-white">{currentCardIndex < flashcardItems.length - 1 ? "Volgende" : reviewMode ? "Terug naar Resultaten" : "Mijn Verhaal Maken"}</button>
          </section>
        )}

        {appState === "custom_prompt" && (
          <section className="mx-auto max-w-6xl space-y-8">
            <div className="text-center"><h2 className="text-4xl font-black">Jouw beurt!</h2><p className="mt-2 font-medium text-slate-500">Avatar is alleen een lokale preview. De foto wordt niet gebruikt voor AI-generatie.</p></div>
            <div className="grid gap-8 lg:grid-cols-12">
              <div className="rounded-3xl border bg-white p-8 shadow-xl lg:col-span-5">
                <h3 className="mb-6 flex items-center gap-2 text-xl font-black"><CircleUser size={24} className="text-purple-700" /> Avatar preview</h3>
                <label className="mb-4 flex h-28 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 bg-cover bg-center text-center" style={userProfile.photo ? { backgroundImage: `url(${userProfile.photo.previewUrl})` } : undefined}>
                  {!userProfile.photo && <span className="text-xs font-bold text-slate-500">Upload Selfie (alleen lokale avatar-preview)</span>}
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                </label>
                <input value={userProfile.name} onChange={(event) => setUserProfile({ ...userProfile, name: event.target.value })} placeholder="Naam" className="mb-3 w-full rounded-xl border bg-slate-50 p-3 font-semibold" />
              </div>
              <div className="rounded-3xl border bg-white p-8 shadow-xl lg:col-span-7">
                <h3 className="mb-6 border-b pb-4 text-xl font-black">Jouw verhaallijn</h3>
                <div className="relative">
                  <textarea value={customPrompt} onChange={(event) => setCustomPrompt(event.target.value)} placeholder="Typ je Groningen-ideeën hier..." className="h-40 w-full resize-none rounded-2xl border bg-slate-50 p-5 pr-16 font-medium outline-none focus:ring-2 focus:ring-purple-500" />
                  <button type="button" onClick={toggleListening} className={`absolute bottom-3 right-3 rounded-xl p-3 text-white ${isListening ? "bg-red-500" : "bg-purple-700"}`}><Mic size={18} /></button>
                </div>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <button type="button" onClick={() => setError("Deze stabiele demo bewaart AI-generatie als aansluitpunt. Voeg hier je bestaande Gemini-route terug.")} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-purple-700 px-6 py-4 font-black text-white"><Sparkles size={18} /> Genereer Mijn Verhaal</button>
                  <button type="button" onClick={() => setAppState("quiz")} className="rounded-2xl border bg-slate-100 px-6 py-4 font-bold">Overslaan naar Quiz</button>
                </div>
              </div>
            </div>
          </section>
        )}

        {appState === "quiz" && (
          <section className="mx-auto max-w-4xl pb-20">
            <div className="rounded-[2rem] border bg-white p-8 shadow-xl sm:p-10">
              <div className="mb-10 flex items-center gap-4 border-b pb-6"><div className="rounded-2xl bg-purple-100 p-4 text-purple-700"><CheckCircle size={32} /></div><div><h2 className="text-3xl font-black">Kennis Check</h2><p className="text-sm font-bold uppercase tracking-widest text-slate-400">Direct Feedback Mode</p></div></div>
              <div className="space-y-8">
                {quiz.map((question, index) => {
                  const hasAnswered = !!userAnswers[index];
                  const isCorrect = normalizeString(userAnswers[index]) === normalizeString(question.answer);
                  return (
                    <div key={question.question} className={`rounded-3xl border p-6 ${hasAnswered ? (isCorrect ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50") : "bg-slate-50"}`}>
                      <p className="mb-5 text-xl font-bold"><span className="text-purple-700">Vraag {index + 1}:</span> {question.question}</p>
                      <div className="grid gap-3">
                        {question.options.map((option) => {
                          const selected = userAnswers[index] === option;
                          const correct = normalizeString(option) === normalizeString(question.answer);
                          return <button key={option} type="button" disabled={hasAnswered} onClick={() => handleOptionSelect(index, option)} className={`rounded-2xl border-2 bg-white p-4 text-left font-semibold ${hasAnswered && correct ? "border-green-500 text-green-900" : selected ? "border-red-500 text-red-900" : "border-slate-200"}`}>{option}</button>;
                        })}
                      </div>
                      {hasAnswered && <div className="mt-5 rounded-2xl bg-white/70 p-4 font-medium"><strong>{isCorrect ? "Correct." : "Onjuist."}</strong> {question.explanation}</div>}
                    </div>
                  );
                })}
              </div>
              <button type="button" disabled={Object.keys(userAnswers).length !== quiz.length} onClick={calculateResults} className="mt-10 w-full rounded-2xl bg-slate-900 py-5 text-lg font-black text-white disabled:opacity-30">Bekijk Resultaten</button>
            </div>
          </section>
        )}

        {appState === "results" && (
          <section className="mx-auto max-w-3xl rounded-[2rem] border bg-white px-8 py-16 text-center shadow-2xl">
            <Trophy size={70} className="mx-auto mb-6 text-yellow-500" />
            <h2 className="mb-4 text-5xl font-black">Gefeliciteerd!</h2>
            <p className="mb-8 text-2xl font-bold text-slate-400">Jouw score: {score} / {quiz.length}</p>
            {reviewPool.length > 0 && (
              <div className="mb-8 rounded-3xl border border-purple-200 bg-purple-50 p-6 text-left">
                <h3 className="mb-4 flex items-center gap-2 font-black text-purple-900"><AlertCircle size={20} /> Foutieve woorden</h3>
                <div className="space-y-3">
                  {reviewPool.map((item) => <div key={item.word} className="rounded-2xl bg-white/70 p-4"><button type="button" onClick={() => playWordAudio(item.word)} className="font-black text-purple-800">{item.word}</button><p className="text-sm font-medium text-slate-600">{item.definition}</p>{item.sentence && <p className="mt-2 font-serif text-sm italic text-slate-500">...{item.sentence}...</p>}</div>)}
                </div>
                <button type="button" onClick={() => startFlashcards(true)} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-purple-700 py-3 font-black text-white"><RefreshCw size={16} /> Oefen deze woorden opnieuw</button>
              </div>
            )}
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <button type="button" onClick={downloadNotebookLMData} className="flex items-center justify-center gap-2 rounded-2xl bg-slate-100 px-6 py-4 font-bold"><Download size={18} /> NotebookLM Data</button>
              <button type="button" onClick={reset} className="rounded-2xl bg-purple-700 px-8 py-4 font-black text-white">Opnieuw</button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
