import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  BookOpen, Camera, Volume2, CheckCircle, XCircle, ArrowRight, ArrowLeft, 
  Loader2, CircleUser, PlayCircle, PauseCircle, ToggleLeft, ToggleRight, 
  Sparkles, Home, Mic, Clock, ZoomIn, Info, Download, Users, Leaf, 
  Palette, Briefcase, Route, Recycle, Globe, FlaskConical, CloudUpload, 
  Star, Trophy, RefreshCw, Edit3, ListChecks, Play, Pause, ChevronDown, Save, Key, Award, AlertCircle, Snail
} from 'lucide-react';

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';

// ==========================================
// 1. 全局配置与无缝 API 接口 (Canvas 环境下免填)
// ==========================================
const apiKey = ""; 

const firebaseConfigStr = typeof __firebase_config !== 'undefined' ? __firebase_config : '{}';
let firebaseConfig = {};
try {
  if (firebaseConfigStr && firebaseConfigStr !== 'undefined' && firebaseConfigStr !== '{}') {
    firebaseConfig = typeof firebaseConfigStr === 'string' ? JSON.parse(firebaseConfigStr) : firebaseConfigStr;
  }
} catch (e) {
  console.warn("Firebase-initialisatie overgeslagen.");
}

let app, auth, db;
try {
    if (Object.keys(firebaseConfig).length > 0) {
        app = getApps().length ? getApp() : initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
    }
} catch(e) { 
    console.warn("Firebase niet actief."); 
}

const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

const THEMES = [
  { id: 1, chapter: 'Thema 1', title: 'De maatschappij', icon: Users, color: 'text-purple-600 bg-purple-50', border: 'hover:border-purple-300', subsections: ['Gelukkig zijn', 'Een streetarts', 'Het UWV', 'Buurtbewoners'] },
  { id: 2, chapter: 'Thema 2', title: 'Natuur en klimaat', icon: Leaf, color: 'text-emerald-600 bg-emerald-50', border: 'hover:border-emerald-300', subsections: ['Druk in de natuur', 'Nationale parken', 'Drinkwatertekort', 'Een ecoduct'] },
  { id: 3, chapter: 'Thema 3', title: 'Cultuur', icon: Palette, color: 'text-amber-600 bg-amber-50', border: 'hover:border-amber-300', subsections: ['UNESCO werelderfgoed', 'Gerrit Rietveld', 'Eetgewoontes', 'Cultuurverschillen'] },
  { id: 4, chapter: 'Thema 4', title: 'Economie en werk', icon: Briefcase, color: 'text-indigo-600 bg-indigo-50', border: 'hover:border-indigo-300', subsections: ['Stage lopen', 'Een eigen bedrijf starten', 'Werk vinden', 'Import en export'] },
  { id: 5, chapter: 'Thema 5', title: 'Infrastructuur', icon: Route, color: 'text-rose-600 bg-rose-50', border: 'hover:border-rose-300', subsections: ['Maatschappelijke ondersteuning', 'Is Nederland vol?', 'Auto en openbaar vervoer'] },
  { id: 6, chapter: 'Thema 6', title: 'Duurzaamheid', icon: Recycle, color: 'text-teal-600 bg-teal-50', border: 'hover:border-teal-300', subsections: ['Duurzaamheid in Nederland', 'Repareren of nieuw?', 'Voedselverspilling'] },
  { id: 7, chapter: 'Thema 7', title: 'Internationale contacten', icon: Globe, color: 'text-blue-600 bg-blue-50', border: 'hover:border-blue-300', subsections: ['In het buitenland studeren', 'Digital nomads', 'Zaken doen met andere landen'] },
  { id: 8, chapter: 'Thema 8', title: 'Wetenschap', icon: FlaskConical, color: 'text-pink-600 bg-pink-50', border: 'hover:border-pink-300', subsections: ['Een winterdepressie', 'Uitvindingen', 'Robots in de zorg'] }
];

const GRONINGEN_FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1549007994-cb92ca8a4a77?auto=format&fit=crop&w=1200&q=80", 
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=80", 
  "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1200&q=80", 
  "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80"
];

const generateStudentId = () => 'STU-' + Math.random().toString(36).substring(2, 7).toUpperCase();

const forceString = (val) => (val === null || val === undefined ? '' : typeof val === 'string' ? val : JSON.stringify(val));
const normalizeString = (str) => String(str || '').trim().toLowerCase();
const getRandomSubarray = (arr, size) => [...arr].sort(() => 0.5 - Math.random()).slice(0, Math.min(size, arr.length));

// PCM to WAV 音频转码器
const pcmToWav = (base64Data, sampleRate = 24000) => {
  const binaryString = atob(base64Data);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const buffer = new ArrayBuffer(44 + bytes.length);
  const view = new DataView(buffer);
  const writeString = (view, offset, string) => {
    for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
  };
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + bytes.length, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true); 
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); 
  view.setUint16(32, 2, true); 
  view.setUint16(34, 16, true); 
  writeString(view, 36, 'data');
  view.setUint32(40, bytes.length, true);
  new Uint8Array(buffer, 44).set(bytes);
  return new Blob([buffer], { type: 'audio/wav' });
};

const safeExtractJSON = (str) => {
  let s = forceString(str).trim();
  if (!s) return null;
  try { return JSON.parse(s); } catch (e) {}
  const firstCurly = s.indexOf('{');
  if (firstCurly !== -1) {
    let braceCount = 0, inString = false, escapeNext = false;
    for (let i = firstCurly; i < s.length; i++) {
      const char = s[i];
      if (escapeNext) { escapeNext = false; continue; }
      if (char === '\\') { escapeNext = true; continue; }
      if (char === '"') { inString = !inString; continue; }
      if (!inString) {
        if (char === '{') braceCount++;
        else if (char === '}') {
          braceCount--;
          if (braceCount === 0) {
            try { return JSON.parse(s.substring(firstCurly, i + 1)); } catch (e) {}
          }
        }
      }
    }
  }
  return null;
};

const fetchWithTimeout = async (url, options, timeout = 60000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
};

const fetchWithRetry = async (url, options, retries = 3) => {
  let delay = 1000;
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetchWithTimeout(url, options, 30000);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(res => setTimeout(res, delay));
      delay *= 2; 
    }
  }
};

// [新移民化视觉锚点设定]：保留
const generateVisualAnchor = (gender, age, ethnicity) => {
  return `realistic friendly ${age || '28'}-year-old female L2 learner named Aria, neat short straight dark brown hair, wearing a dark blue utility hooded jacket and a distinctive metallic watch on her wrist`;
};

const getBestDutchVoice = () => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  return voices.find(v => v.lang.toLowerCase().includes('nl') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Premium') || v.name.includes('Elena'))) || voices.find(v => v.lang.toLowerCase().includes('nl'));
};

const playWordAudio = (word) => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(String(word));
    utterance.lang = 'nl-NL';
    const bestVoice = getBestDutchVoice();
    if (bestVoice) utterance.voice = bestVoice;
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  }
};

// ==========================================
// 2. 辅助组件
// ==========================================

const Interactive3DImage = ({ src, fallbackSrc, title }) => {
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [imgSrc, setImgSrc] = useState(src);
  const [localLoading, setLocalLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  
  useEffect(() => { 
    setImgSrc(src); 
    setLocalLoading(true); 
    setHasError(false);
  }, [src]);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setRotation({ 
      x: ((e.clientX - rect.left) / rect.width - 0.5) * 15, 
      y: ((e.clientY - rect.top) / rect.height - 0.5) * -15 
    });
  };

  return (
    <div onMouseMove={handleMouseMove} onMouseLeave={() => setRotation({ x: 0, y: 0 })} style={{ perspective: '1200px' }} className="relative w-full h-full flex items-center justify-center overflow-hidden bg-slate-900 min-h-[350px] sm:min-h-[450px] lg:min-h-[500px] rounded-[2.5rem] cursor-crosshair border border-slate-200/50 shadow-inner">
      {(localLoading || hasError || !imgSrc) && (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-950/40 to-slate-950 flex flex-col items-center justify-center p-8 text-center select-none z-10 animate-fade-in">
          <svg className="w-24 h-24 text-purple-500/15 mb-6 animate-pulse" viewBox="0 0 100 100" fill="currentColor">
            <path d="M45 85h10V45l-5-5-5 5z" />
            <path d="M47 40h6v-8h-6z" />
            <path d="M50 32l-3-4 3-4 3 4z" />
            <path d="M25 85h12V60l-6-6-6 6z" opacity="0.5" />
            <path d="M63 85h12V55l-6-6-6 6z" opacity="0.5" />
          </svg>
          <span className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-1 font-sans">{title || "Groningen Context"}</span>
          <span className="text-[10px] text-slate-500 max-w-xs leading-relaxed font-sans">
            {hasError ? "Beeld offline" : "Visuele context laden..."}
          </span>
          {localLoading && !hasError && src && (
            <Loader2 className="text-purple-500 animate-spin mt-4" size={24} />
          )}
        </div>
      )}

      {(!hasError && (imgSrc || fallbackSrc)) && (
        <div className={`w-full h-full absolute inset-0 transition-all duration-500 ease-out ${localLoading && imgSrc ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`} style={{ transformStyle: 'preserve-3d', transform: `scale(1.08) rotateX(${rotation.y}deg) rotateY(${rotation.x}deg)` }}>
          <img 
            src={imgSrc || fallbackSrc} 
            onLoad={() => setLocalLoading(false)} 
            onError={() => { 
              if(imgSrc !== fallbackSrc && fallbackSrc) {
                setImgSrc(fallbackSrc); 
              } else {
                setHasError(true);
                setLocalLoading(false);
              }
            }} 
            className="w-full h-full object-cover object-top pointer-events-none animate-ken-burns" 
            alt="Visual Context" 
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-black/30 to-transparent pointer-events-none" style={{ transform: 'translateZ(20px)' }}></div>
        </div>
      )}
    </div>
  );
};

const HighlightedText = ({ text, vocab, glossary, onWordTrigger }) => {
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const hoverTimerRef = useRef(null);

  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  const rawVocab = useMemo(() => (Array.isArray(vocab) ? vocab : []).map(v => normalizeString(v).replace(/^(de|het|een)\s+/i, '')), [vocab]);
  if (!text) return null;
  const tokens = String(text).split(/([\s.,!?;"':()]+)/g); 

  const handleMouseEnter = (displayWord, definition) => {
    if (isTouchDevice) return; 
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      if (onWordTrigger) onWordTrigger(displayWord, definition, false); 
    }, 250);
  };

  const handleMouseLeave = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  };

  const handleWordTap = (e, displayWord, definition) => {
    if (!isTouchDevice) return;
    e.preventDefault();
    e.stopPropagation();
    if (onWordTrigger) onWordTrigger(displayWord, definition, true); 
  };

  return (
    <>
      {tokens.map((token, i) => {
        if (!token.trim() || /^[.,!?;"':()]+$/.test(token)) return <span key={i}>{token}</span>;
        const clean = normalizeString(token);
        const vocabIdx = rawVocab.findIndex(rv => clean.startsWith(rv.substring(0, Math.min(rv.length, 5))));
        
        if (vocabIdx !== -1) {
          const displayWord = forceString(vocab[vocabIdx]);
          const searchStem = normalizeString(displayWord).substring(0, Math.max(1, Math.min(4, displayWord.length)));
          const defObj = glossary?.find((g) => normalizeString(g?.word).includes(searchStem));
          const definition = defObj ? forceString(defObj.definition) : "Doelwoord uit dit thema";

          return (
            <span 
              key={i} 
              className="relative inline-block group font-sans" 
              onMouseEnter={() => handleMouseEnter(displayWord, definition)}
              onMouseLeave={handleMouseLeave}
              onTouchStart={(e) => handleWordTap(e, displayWord, definition)}
            >
              <span className="font-black px-1.5 py-0.5 rounded cursor-help border-b-2 border-dotted bg-purple-100/60 text-purple-800 border-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-all">
                {token}
              </span>
              
              {!isTouchDevice && (
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 p-4 bg-slate-900 text-white text-xs rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none font-medium leading-relaxed font-sans">
                  <span className="font-black text-purple-400 block mb-1 uppercase tracking-tighter flex justify-between items-center">
                    <span>{displayWord}</span>
                    <span className="text-[10px] text-slate-500 font-bold">🔊 Auto</span>
                  </span>
                  {definition}
                  <span className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900"></span>
                </span>
              )}
            </span>
          );
        }
        return <span key={i}>{token}</span>;
      })}
    </>
  );
};

const CustomAudioPlayer = ({ src, text, isPlaying, setIsPlaying, audioRef, playbackSpeed, onXpEarned }) => {
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFallback, setIsFallback] = useState(false);
  const [fallbackProgress, setFallbackProgress] = useState(0);
  const hasAwardedAudioXp = useRef(false);

  useEffect(() => {
    setIsFallback(src === "fallback-speech" || !src);
    hasAwardedAudioXp.current = false;
    setProgress(0);
    setFallbackProgress(0);
  }, [src]);

  useEffect(() => {
    if (isFallback) return;
    const audio = audioRef.current;
    if (!audio) return;
    const updateProgress = () => {
      setProgress(audio.currentTime);
      if (audio.duration && audio.currentTime > audio.duration * 0.8 && !hasAwardedAudioXp.current) {
        hasAwardedAudioXp.current = true;
        if (onXpEarned) onXpEarned(10);
      }
    };
    const updateDuration = () => setDuration(audio.duration);
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', updateDuration);
    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', updateDuration);
    }
  }, [src, isFallback, audioRef, onXpEarned]);

  const handleFallbackPlay = () => {
    if (!('speechSynthesis' in window)) return;
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    } else {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(String(text));
      utterance.lang = 'nl-NL';
      const bestVoice = getBestDutchVoice();
      if (bestVoice) utterance.voice = bestVoice;
      utterance.rate = playbackSpeed * 0.85;
      
      utterance.onstart = () => {
        setIsPlaying(true);
        setDuration(100);
      };
      
      utterance.onend = () => {
        setIsPlaying(false);
        setFallbackProgress(100);
        if (!hasAwardedAudioXp.current) {
          hasAwardedAudioXp.current = true;
          if (onXpEarned) onXpEarned(10);
        }
      };

      let interval = setInterval(() => {
        if (!window.speechSynthesis.speaking) {
          clearInterval(interval);
          return;
        }
        setFallbackProgress((prev) => Math.min(95, prev + 2));
      }, 300);

      window.speechSynthesis.speak(utterance);
    }
  };

  const handlePlayPause = () => {
    if (isFallback) {
      handleFallbackPlay();
      return;
    }
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) { 
        audio.pause(); 
        setIsPlaying(false); 
    } else { 
        audio.play().catch(() => handleFallbackPlay()); 
        setIsPlaying(true); 
    }
  };

  const formatTime = (time) => {
    if (!time || isNaN(time)) return "0:00";
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="flex items-center gap-4 w-full px-2 font-sans">
      <button onClick={handlePlayPause} className="w-12 h-12 shrink-0 bg-purple-600 hover:bg-purple-700 text-white rounded-full flex items-center justify-center shadow-md transition-colors active:scale-95">
        {isPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" className="ml-1" />}
      </button>
      <div className="flex-grow flex items-center gap-3">
        <span className="text-xs font-bold text-slate-500 w-8 text-right">
          {isFallback ? `${Math.round(fallbackProgress)}%` : formatTime(progress)}
        </span>
        <input 
          type="range" 
          min="0" 
          max={isFallback ? 100 : (duration || 100)} 
          value={isFallback ? fallbackProgress : progress}
          onChange={(e) => { 
            if (!isFallback && audioRef.current) {
              audioRef.current.currentTime = Number(e.target.value); 
              setProgress(Number(e.target.value)); 
            }
          }}
          disabled={isFallback}
          className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
          style={{ accentColor: '#9333ea' }}
        />
        <span className="text-xs font-bold text-slate-500 w-8 text-left">
          {isFallback ? "TTS" : formatTime(duration)}
        </span>
      </div>
      {!isFallback && (
        <audio 
          ref={audioRef} 
          src={src} 
          onEnded={() => setIsPlaying(false)} 
          onPlay={() => setIsPlaying(true)} 
          onPause={() => setIsPlaying(false)} 
          style={{ display: 'none' }}
        />
      )}
    </div>
  );
};

// ==========================================
// [Imagen 4.0 & TTS 核心无缝生图引擎] 
// ==========================================
const getMedia = async (
  idx,
  text,
  anchor,
  sess,
  setPages,
  sessionIdRef,
  requestedMediaRef,
  specificActionPrompt
) => {
  if (idx < 0 || sessionIdRef.current !== sess) return;

  const fallbackImg = GRONINGEN_FALLBACK_IMAGES[idx % 4];

  // 1. 请求插图
  if (!requestedMediaRef.current[`img-${idx}`]) {
    requestedMediaRef.current[`img-${idx}`] = true;
    
    // [场景关联度修复]：移除硬编码的运河街道背景，完全依赖文本上下文决定背景环境，同时保留防切头约束
    const baseActionDescription = specificActionPrompt || text.substring(0, 180);

    const actionMatchPrompt = `Instagram environmental photography, f/11 deep focus. Location: Groningen, Netherlands. 
    Composition: Wide environmental shot, showing the character from the waist up. Ensure head and hair are fully in frame with generous headroom above her, occupying the center. No clipping or cropping of the head.
    Character Identity: ${anchor}. 
    Scene, Background and Narrative Action: STRICTLY render the specific location, environment, and physical behavior described here: ${baseActionDescription}. 
    Style: cinematic soft lighting, realistic focus. Absolutely NO text.`;

    const imgPayload = { 
      instances: { prompt: actionMatchPrompt }, 
      parameters: { sampleCount: 1 } 
    };

    try {
      const imgRes = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(imgPayload) 
      }, 15000);
      const imgData = await imgRes.json();
      if (sessionIdRef.current === sess && imgData.predictions && imgData.predictions[0]) {
        const b64 = imgData.predictions[0].bytesBase64Encoded;
        setPages(p => { 
          const n = [...p]; 
          if(n[idx]) { n[idx].imageUrl = `data:image/jpeg;base64,${b64}`; n[idx].imgLoading = false; }
          return n; 
        });
      } else throw new Error();
    } catch (e) {
      if (sessionIdRef.current === sess) {
        setPages(p => { const n = [...p]; if(n[idx]) { n[idx].imageUrl = fallbackImg; n[idx].imgLoading = false; } return n; });
      }
    }
  }

  // 2. 请求高质量音频并进行 PCM->WAV 转码
  if (!requestedMediaRef.current[`aud-${idx}`]) {
    requestedMediaRef.current[`aud-${idx}`] = true;
    
    const audPayload = { 
      contents: [{ parts: [{ text: text }] }], 
      generationConfig: { 
        responseModalities: ["AUDIO"], 
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Aoede' } } } 
      }, 
      model: "gemini-2.5-flash-preview-tts" 
    };

    try {
      const audRes = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(audPayload) 
      }, 15000);
      const audData = await audRes.json();
      
      if (sessionIdRef.current === sess && audData.candidates?.[0]?.content?.parts?.[0]?.inlineData) {
        const b64Data = audData.candidates[0].content.parts[0].inlineData.data;
        const wavBlob = pcmToWav(b64Data, 24000);
        setPages(p => { 
          const n = [...p]; 
          if(n[idx]) { n[idx].audioUrl = URL.createObjectURL(wavBlob); n[idx].audioLoading = false; } 
          return n; 
        });
      } else throw new Error();
    } catch (e) {
      if (sessionIdRef.current === sess) {
        setPages(p => { const n = [...p]; if(n[idx]) { n[idx].audioUrl = "fallback-speech"; n[idx].audioLoading = false; } return n; });
      }
    }
  }
};

// ==========================================
// [极速离线压缩字典] 内置了大量高质量新移民动作预设
// ==========================================
const COMPRESSED_DB = {
  "1-Gelukkig zijn": {
    v: ['blijken', 'aarzelen', 'uitgebreid', 'aanvragen', 'uitkering', 'stimuleren', 'arbeidsmarkt', 'bevorderen', 'cultuurverschil', 'toepassen'],
    p: [
      "Een nieuwe start in Groningen is niet altijd makkelijk voor Aria. Uit recent onderzoek is gebleken dat veel nieuwkomers zich eenzaam voelen. Sommige mensen aarzelen om contact op te nemen met hun buren. Gelukkig organiseren actieve buurtverenigingen leuke bijeenkomsten om hen te helpen.",
      "Er is een uitgebreid programma in het centrum van de stad. Bewoners kunnen ook subsidie aanvragen voor een gezamenlijke moestuin. Door samen groenten te verbouwen, leren mensen elkaar op een ongedwongen manier kennen. Dit soort lokale projecten maakt de wijk heel levendig en gezellig.",
      "Sommige nieuwkomers hebben geen baan en ontvangen een uitkering van de overheid. De gemeente probeert hen te stimuleren om vrijwilligerswerk te gaan doen. Dit helpt niet alleen de buurt, maar vergroot ook hun netwerk aanzienlijk. Het opbouwen van een sociaal leven is de eerste stap naar geluk.",
      "Vrijwilligerswerk helpt cursisten om sneller hun weg te vinden op de arbeidsmarkt. Het spreken van de taal is essentieel om integratie te bevorderen. In Groningen zijn er speciale taalcoaches die wekelijks met cursisten oefenen. Samen praten over alledaagse dingen bouwt sterke bruggen tussen mensen.",
      "Soms is er een klein cultuurverschil merkbaar in hoe mensen met elkaar omgaan. Maar door open te staan voor elkaar, leer je deze nieuwe gewoontes toepassen. Uiteindelijk wil iedereen in de maatschappij zich gewaardeerd en gelukkig voelen. Groningen is een stad waar iedereen een fijne plek kan vinden."
    ],
    actions: [
      "walking slowly along a brick Groningen canal street under an overcast sky, pushing her bicycle, looking lonely and thoughtful, showing headroom",
      "standing inside a vibrant local wijkcentrum community garden in Groningen, holding a wooden seed box, looking at a small green tomato seedling in a red brick flowerbed",
      "sitting inside a modern, glass-walled Groningen library municipal office, conversing warmly with a Dutch advisor who is showing her a flyer, her Dutch bicycle parked outside",
      "sitting at an outdoor wooden cafe table in Grote Markt Groningen, laughing and talking with an elderly Dutch language coach who is pointing at a language textbook, clear Martinitoren background",
      "riding her classic Dutch bicycle on a lively Groningen brick shopping street Herestraat, looking back towards the camera with a bright, confident smile of belonging, diverse friendly pedestrians in the distance"
    ],
    g: [
      ["blijken", "duidelijk worden (appear/prove)"], ["aarzelen", "wachten uit twijfel (hesitate)"], ["uitgebreid", "groot met veel details (extensive)"], ["aanvragen", "officieel verzoeken (apply for)"], ["uitkering", "overheidssteun (benefit)"],
      ["stimuleren", "aanmoedigen (stimulate)"], ["arbeidsmarkt", "alle banen (job market)"], ["bevorderen", "helpen verbeteren (promote)"], ["cultuurverschil", "verschil in gewoontes"], ["toepassen", "praktisch gebruiken (apply)"]
    ],
    q: [
      ["Wat blijkt uit het onderzoek van de gemeente?", ["Nieuwkomers zijn direct heel gelukkig.", "Veel nieuwkomers voelen zich eenzaam.", "Er zijn geen verenigingen in de buurt.", "Iedereen spreekt perfect Nederlands."], "Veel nieuwkomers voelen zich eenzaam.", "In alinea 1 staat dat uit onderzoek is gebleken dat nieuwkomers zich eenzaam voelen."],
      ["Waarom aarzelen sommigen volgens de tekst?", ["Om buren te contacteren.", "Om te gaan sporten.", "Om een uitkering te weigeren.", "Om Groningse dropjes te eten."], "Om buren te contacteren.", "Ze twijfelen om contact op te nemen met hun buren."]
    ]
  },
  "1-Een streetarts": {
    v: ['blijken', 'aarzelen', 'uitgebreid', 'aanvragen', 'uitkering', 'stimuleren', 'arbeidsmarkt', 'bevorderen', 'signaleren', 'toepassen'],
    p: [
      "In Groningen werkt een bijzondere arts direct op straat. Het is gebleken dat veel daklozen medische zorg mijden. Zij aarzelen vaak om naar een gewoon ziekenhuis te gaan. Deze streetarts helpt hen op een laagdrempelige manier.",
      "De arts biedt een uitgebreid spreekuur aan in een busje. Daklozen kunnen hier hulp aanvragen voor medische klachten. De arts luistert zonder oordeel naar hun verhalen. Dit wekt veel vertrouwen bij deze kwetsbare groep.",
      "Veel patiënten hebben geen vast adres of maandelijks inkomen via een uitkering. De streetarts probeert hen te stimuleren om contact op te nemen met maatschappelijk werk. Zo krijgen ze steun voor een stabielere toekomst.",
      "Medische zorg helpt hen om hun weg te vinden op de arbeidsmarkt. Gezondheid is essentieel om maatschappelijke integratie te bevorderen. Lokale opvangcentra werken hier nauw samen om hen te steunen.",
      "De arts kan snel een ernstig medisch probleem signaleren bij mensen op straat. Door deze medische kennis direct toe te passen, worden de levens van patiënten gered. Iedereen verdient immers goede en toegankelijke gezondheidszorg."
    ],
    actions: [
      "Aria standing near a prominent street intersection in Groningen, talking compassionately to a homeless man sitting next to a brick wall with her bike beside her",
      "Aria looking into a small white medical van on a street, she is requesting advice from a friendly doctor inside the van, Groningen background",
      "Aria standing outside a local Groningen shelter building, pointing to a community banner, encouraging a student with a warm smile",
      "Aria inside a bright vocational training center, reviewing a resume on a screen with a smiling adult learner, clear focus",
      "Aria in a clean, professional Dutch street clinic room, pointing at a medical chart on a screen with a confident and proud expression"
    ],
    g: [
      ["blijken", "duidelijk worden"], ["aarzelen", "twijfelen"], ["uitgebreid", "groot en gedetailleerd"], ["aanvragen", "officieel vragen"], ["uitkering", "overheidsgeld"],
      ["stimuleren", "aanmoedigen"], ["arbeidsmarkt", "banensector"], ["bevorderen", "helpen groeien"], ["signaleren", "opmerken"], ["toepassen", "gebruiken"]
    ],
    q: [
      ["Wie helpt de streetarts in Groningen?", ["Rijke toeristen.", "Kwetsbare daklozen.", "Huisdieren.", "Studenten."], "Kwetsbare daklozen.", "De streetarts behandelt daklozen die reguliere zorg mijden."],
      ["Waar biedt de arts zijn spreekuur aan?", ["In de Martinitoren.", "In een speciaal busje.", "Bij de gemeente.", "In het Noorderplantsoen."], "In een speciaal busje.", "Dit staat vermeld in de tweede alinea."]
    ]
  },
  "1-Het UWV": {
    v: ['blijken', 'aarzelen', 'aanvragen', 'uitgebreid', 'stimuleren', 'aanzienlijk', 'arbeidsmarkt', 'bevorderen', 'toepassen', 'uitkering'],
    p: [
      "Als je in Groningen je baan verliest, moet je naar het UWV. Het is gebleken dat de eerste weken zonder werk erg stressvol zijn. Veel mensen aarzelen om direct professionele hulp te zoeken. Gelukkig helpt het UWV-team hen snel op weg.",
      "Je kunt online een tijdelijke financiële uitkering aanvragen. Het UWV biedt een uitgebreid portaal waar je alle documenten kunt uploaden. Dit moet je zo snel mogelijk doen. Dit voorkomt acute geldzorgen in de overgangsperiode.",
      "De adviseurs proberen werkzoekenden te stimuleren om nieuwe vaardigheden te leren. Kansen stijgen aanzienlijk na het volgen van een korte cursus. Het UWV betaalt vaak mee aan deze scholing. Dit opent weer nieuwe deuren.",
      "Samen kijken jullie naar vacatures op de Groningse arbeidsmarkt. Het doel is om je kansen op een duurzame baan te bevorderen. De adviseur helpt ook bij het schrijven van je sollicitatiebrief. Samen sta je veel sterker.",
      "Je leert hoe je handige netwerktips direct kunt toepassen. Het ontvangen van een uitkering is zo snel niet meer nodig. Met de juiste begeleiding vind je snel een fijne werkplek."
    ],
    actions: [
      "Aria walking in front of a modern UWV office building with large glass windows in Groningen, looking a bit anxious, hands in jacket pockets",
      "Aria sitting in a bright cafe, using her laptop, filling in an online Dutch registration form, her metallic watch visible",
      "Aria inside a classroom at Alfa College in Groningen, receiving a certificate from a smiling teacher, looking happy and confident",
      "Aria reviewing job vacancies on a tablet with a local business owner inside a Dutch retail shop, looking focused and collaborative",
      "Aria shaking hands with a new employer in a bright office in Groningen, smiling confidently, her classic Dutch bicycle visible outside the window"
    ],
    g: [
      ["blijken", "duidelijk worden"], ["aarzelen", "wachten"], ["aanvragen", "officieel verzoeken"], ["uitgebreid", "groot en compleet"], ["stimuleren", "aanmoedigen"],
      ["aanzienlijk", "erg veel"], ["arbeidsmarkt", "banensector"], ["bevorderen", "vooruithelpen"], ["toepassen", "gebruiken"], ["uitkering", "overheidssteun"]
    ],
    q: [
      ["Wat kun je aanvragen bij het UWV?", ["Een fietspas.", "Een uitkering.", "Een bioscoopkaartje.", "Huisvesting."], "Een uitkering.", "UWV verstrekt tijdelijke werkloosheidsuitkeringen."]
    ]
  },
  "1-Buurtbewoners": {
    v: ['blijken', 'aarzelen', 'uitgebreid', 'aanvragen', 'cultuurverschil', 'toepassen', 'bevorderen', 'stimuleren', 'signaleren', 'arbeidsmarkt'],
    p: [
      "In een gezellige straat in Groningen wonen verschillende buurtbewoners. Uit een buurtbijeenkomst is gebleken dat iedereen behoefte heeft aan meer contact. Sommige buren aarzelen echter om zomaar een praatje te maken. Het begin is soms even wennen.",
      "De buurtvereniging besloot een uitgebreid buurtfeest te organiseren. Iedereen kon via een online formulier ideeën aanvragen voor activiteiten en hapjes. Het werd een groot succes met veel lachende gezichten. Samenwerking bracht iedereen dichtbij.",
      "Soms is er een klein cultuurverschil tussen de bewoners merkbaar. Maar door samen te eten en te praten, leer je elkaars gewoontes beter toepassen. Dit vergroot het respect in de straat enorm. Iedereen hoort er nu bij.",
      "Actieve bewoners proberen de sociale samenhang in de wijk te bevorderen. Ze willen buren stimuleren om vaker samen te komen en elkaar te helpen. Een sterke buurt begint bij kleine, vriendelijke gebaren.",
      "Samen kunnen de bewoners sneller problemen in de straat signaleren. Ook helpen ze jongeren op weg naar de lokale arbeidsmarkt. Zo zorgen de buurtbewoners in Groningen samen voor veiligheid."
    ],
    actions: [
      "Aria standing outside her brick Groningen house, looking shyly towards her next-door neighbor who is watering flowers",
      "Aria hanging colorful banners across a lively Dutch street with other diverse neighbors for a street party, smiling and happy",
      "Aria sitting at a long outdoor dining table on a Groningen street, sharing food and laughing with diverse neighbors, warm and inclusive atmosphere",
      "Aria giving a warm thumbs-up to a neighbor who is carrying groceries, showing high cognitive involvement and friendly interaction",
      "Aria standing on a Groningen residential street at dusk, talking to a neighborhood watch volunteer, pointing down a clean, well-lit street"
    ],
    g: [
      ["blijken", "duidelijk worden"], ["aarzelen", "wachten"], ["uitgebreid", "groot en compleet"], ["aanvragen", "officieel verzoeken"], ["cultuurverschil", "verschil in achtergrond"],
      ["toepassen", "gebruiken"], ["bevorderen", "helpen ontwikkelen"], ["stimuleren", "aanmoedigen"], ["signaleren", "opmerken"], ["arbeidsmarkt", "banensector"]
    ],
    q: [
      ["Wat bleek er uit de bijeenkomst?", ["Iedereen wil verhuizen.", "Er is behoefte aan contact.", "Het regent te veel.", "De buren zijn boos."], "Er is behoefte aan contact.", "Dit staat omschreven in de eerste alinea."]
    ]
  },
  "4-Stage lopen": {
    v: ['aanpak', 'aansluiten op', 'aantrekken', 'netwerk', 'nijpend', 'argument', 'omzetten', 'onderbouwen', 'beperken', 'neiging'],
    p: [
      "Stage lopen in Groningen is de perfecte manier om ervaring op te doen. Het vereist een actieve aanpak van de student om een leuke plek te vinden. Veel bedrijven zoeken gemotiveerde en jonge stagiairs.",
      "De stage moet goed aansluiten op je opleiding aan het Alfa College. Dit helpt om snel nieuwe talenten aan te trekken voor de regio. Het mes snijdt zo echt aan twee kanten.",
      "Tijdens je stage bouw je een waardevol professioneel netwerk op. In sommige sectoren is het tekort aan jonge krachten nijpend. Jouw aanwezigheid op de werkvloer is zeer gewenst.",
      "Een veelgehoord argument voor stage lopen is de directe praktijkervaring. Je leert hoe je theoretische kennis kunt omzetten in concrete daden. Dit geeft je direct meer zelfvertrouwen.",
      "Je moet je plannen altijd goed onderbouwen met feiten en cijfers. Dit helpt om eventuele fouten tijdens het werk te beperken. Zo rond je je stageperiode met succes af."
    ],
    actions: [
      "Aria walking inside a bright, modern Groningen corporate office hallway, carrying a notebook, looking enthusiastic, full headroom visible",
      "Aria in front of Alfa College building in Groningen, greeting a smiling mentor with a handshake, clear sunny day background",
      "Aria networking actively in a university career fair hall in Groningen, chatting with a professional representative near a booth",
      "Aria operating a standard laboratory machine with focus and care inside a local science department in Groningen, looking proud",
      "Aria presenting her research report on a projector screen inside a Groningen classroom, pointing to a colourful pie chart"
    ],
    g: [
      ["aanpak", "manier van handelen (approach)"], ["aansluiten op", "passen bij of verbinden met"], ["aantrekken", "binnenhalen of interesseren (attract)"], ["netwerk", "groep van contacten (network)"], ["nijpend", "kritiek of dringend tekort (acute)"],
      ["argument", "reden voor een standpunt (argument)"], ["omzetten", "veranderen in iets anders (convert)"], ["onderbouwen", "met argumenten bewijzen (substantiate)"], ["beperken", "kleiner maken of limiteren (restrict)"], ["neiging", "intentie of neiging om te doen"]
    ],
    q: [
      ["Wat vereist het vinden van een leuke stageplek?", ["Dat je rustig afwacht.", "Een actieve aanpak van de student.", "Hulp van de streetarts.", "Dat je stopt met studeren."], "Een actieve aanpak of initiatief.", "Alinea 1 legt uit dat studenten zelf actief op zoek moeten gaan en initiatief moeten tonen."]
    ]
  },
  "4-Werk vinden": {
    v: ['aanpak', 'netwerk', 'nijpend', 'argument', 'onderbouwen', 'beperken', 'neiging', 'bedrijfstak', 'aansluiten op', 'aantrekken'],
    p: [
      "Werk vinden in Groningen vraagt om een gestructureerde aanpak. Het is belangrijk om je CV te updaten en je motivatiebrief te polijsten. Bereid je voor op de sollicitatiegesprekken.",
      "Zorg ervoor dat je vaardigheden goed aansluiten op de behoeften van werkgevers. Dit helpt om snel hun aandacht aan te trekken. Het UWV kan je hierbij uitstekend ondersteunen.",
      "Gebruik je professionele netwerk om vacatures te vinden die niet online staan. Soms is de nood in een bepaalde bedrijfstak erg hoog. Dit biedt directe kansen op werk.",
      "In sommige sectoren is het tekort aan gekwalificeerd personeel nijpend. Dit is een sterk argument om je om te scholen naar een kansrijke sector. Scholing loont echt altijd.",
      "Je moet je kwaliteiten tijdens het gesprek goed onderbouwen met voorbeelden. Probeer je zenuwen tijdens de presentatie te beperken. Met een goede voorbereiding lukt het je zeker."
    ],
    actions: [
      "Aria sitting in her apartment, neatly organizing her Dutch CV folders on a desk, her dark hair catching quiet morning light",
      "Aria filling in her profile in front of a computer at the UWV office, looking confident, her bicycle visible through the window",
      "Aria talking to a friendly recruiter at a university employment desk in Groningen, she is holding her notebook and smiling",
      "Aria at an academic language lecture at the University of Groningen, raising her hand to answer a question with full headroom",
      "Aria walking in Herestraat, carrying a neat leather portfolio bag, looking very professional and ready for a job interview"
    ],
    g: [
      ["aanpak", "methode van handelen (strategy)"], ["netwerk", "kring van professionele relaties"], ["nijpend", "zeer groot en knellend tekort"], ["argument", "beweegreden of argument (reason)"], ["onderbouwen", "staven met concrete weergaves"],
      ["beperken", "beheersen of inperken (limit)"], ["neiging", "drang om op te geven"], ["bedrijfstak", "specifieke economische sector"], ["aansluiten op", "passend maken voor behoeften"], ["aantrekken", "de aandacht trekken van werkgevers"]
    ],
    q: [
      ["Wat vraagt het vinden van werk in Groningen?", ["Dat je stopt met schrijven.", "Een gestructureerde aanpak.", "Een direct wijkfeest.", "Hulp van de streetarts."], "Een gestructureerde aanpak.", "Alinea 1 adviseert om gestructureerd te werk te gaan."]
    ]
  }
};

const inflateStories = () => {
  const PRE_GENERATED_STORIES = {};
  Object.entries(COMPRESSED_DB).forEach(([key, value]) => {
    if (!value || typeof value !== 'object' || !value.v || !value.p) return;
    PRE_GENERATED_STORIES[key] = {
      vocab: value.v,
      pages: value.p.map((text, idx) => {
        const target1 = value.v[idx * 2] || value.v[0] || "doelwoord";
        const target2 = value.v[idx * 2 + 1] || value.v[1] || "doelwoord";
        return {
          text, imageUrl: null, imgLoading: true, audioUrl: null, audioLoading: true, targets: [target1, target2],
          actionPrompt: value.actions ? (value.actions[idx] || "") : "" 
        };
      }),
      glossary: value.g ? value.g.map(([word, definition]) => ({ word, definition })) : [],
      quiz: value.q ? value.q.map(([question, options, answer, explanation]) => ({
        question, options, answer, explanation
      })) : []
    };
  });
  return PRE_GENERATED_STORIES;
};

const PRE_GENERATED_STORIES = inflateStories();

// ==========================================
// 3. 主应用程序主体逻辑 (App)
// ==========================================
export default function App() {
  const [appState, setAppState] = useState('landing'); 
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [selectedSubsection, setSelectedSubsection] = useState('');
  const [error, setError] = useState('');
  const [showLevelUp, setShowLevelUp] = useState(false);
  
  const [pages, setPages] = useState([]); 
  const [storyGlossary, setStoryGlossary] = useState([]); 
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [activeVocab, setActiveVocab] = useState([]);
  const [userAnswers, setUserAnswers] = useState({});
  const [quiz, setQuiz] = useState([]);
  const [score, setScore] = useState(0);
  const [globalStats, setGlobalStats] = useState({ xp: 0, level: 1 });
  const [xpToasts, setXpToasts] = useState([]);

  const [userProfile, setUserProfile] = useState({ name: 'Aria', gender: 'vrouw', age: '28', ethnicity: 'Aziatisch', photo: null, studentId: generateStudentId() });
  const [profileSaved, setProfileSaved] = useState(false);
  const [activeCharacter, setActiveCharacter] = useState(null);
  const [storyVisualAnchor, setStoryVisualAnchor] = useState('');
  const [reviewPool, setReviewPool] = useState([]); 

  const [customPrompt, setCustomPrompt] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  const [mobileDrawerWord, setMobileDrawerWord] = useState('');
  const [mobileDrawerDef, setMobileDrawerDef] = useState('');
  const [showMobileDrawer, setShowMobileDrawer] = useState(false);

  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [autoPlay, setAutoPlay] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [fontSize, setFontSize] = useState('text-xl');
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);

  const audioRef = useRef(null);
  const requestedMediaRef = useRef({});
  const sessionIdRef = useRef('');
  const containerRef = useRef(null);

  useEffect(() => {
    try {
      if (typeof __firebase_config !== 'undefined' && __firebase_config) {
        const authInstance = getAuth(initializeApp(JSON.parse(__firebase_config)));
        signInAnonymously(authInstance).catch(e => console.warn("Firebase-auth verbinding gestaakt."));
      }
    } catch(e) {}
  }, []);

  const awardXP = (amt) => {
    setGlobalStats(p => { 
      const nxp = p.xp + amt; 
      const levelUp = Math.floor(nxp/100) + 1 > p.level;
      if (levelUp) { setTimeout(() => setShowLevelUp(true), 100); }
      return { xp: nxp, level: Math.floor(nxp/100)+1 }; 
    });
    setXpToasts(prev => [...prev, `+${amt} XP`]);
    setTimeout(() => setXpToasts(prev => prev.slice(1)), 2500);
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    if (containerRef.current) { containerRef.current.scrollTop = 0; }
  }, [currentPageIndex]);

  const toggleListening = () => {
    try {
      const RecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!RecognitionClass) { setError("Speech recognition wordt niet ondersteund."); return; }
      if (isListening) { recognitionRef.current.stop(); setIsListening(false); return; }
      const rec = new RecognitionClass();
      rec.lang = 'nl-NL'; rec.interimResults = false; rec.maxAlternatives = 1;
      rec.onstart = () => setIsListening(true);
      rec.onend = () => setIsListening(false);
      rec.onresult = (e) => {
        const txt = e?.results?.[0]?.[0]?.transcript;
        if(txt) setCustomPrompt(p => p ? `${p} ${txt}` : txt);
      };
      rec.onerror = () => setIsListening(false);
      recognitionRef.current = rec;
      rec.start();
    } catch(e) { setError(`Fout bij audio-invoer`); setIsListening(false); }
  };

  const handleStart = async (theme, sub) => {
    setSelectedTheme(theme); setSelectedSubsection(sub); setError('');
    const sess = Math.random().toString(36).substring(7); sessionIdRef.current = sess;
    requestedMediaRef.current = {};

    const char = { name: userProfile.name || "Aria", gender: userProfile.gender || "vrouw", age: userProfile.age || "28", ethnicity: userProfile.ethnicity || "Aziatisch" };
    setActiveCharacter(char);
    const anchor = generateVisualAnchor(char.gender, char.age, char.ethnicity);
    setStoryVisualAnchor(anchor);

    const staticKey = `${theme.id}-${sub}`;
    if (PRE_GENERATED_STORIES[staticKey]) {
       const staticStory = PRE_GENERATED_STORIES[staticKey];
       setActiveVocab(staticStory.vocab);
       setStoryGlossary(staticStory.glossary);
       setQuiz(staticStory.quiz);
       
       const staticPages = staticStory.pages.map(p => ({
          text: forceString(p.text), imageUrl: null, audioUrl: null, imgLoading: true, audioLoading: true, targets: p.targets || [], actionPrompt: p.actionPrompt || "" 
       }));
       setPages(staticPages); setAppState('reading'); awardXP(5);

       staticStory.pages.forEach((p, i) => {
         setTimeout(() => {
           if (sessionIdRef.current === sess) getMedia(i, p.text, anchor, sess, setPages, sessionIdRef, requestedMediaRef, p.actionPrompt);
         }, i * 1200);
       });
       return; 
    }

    setAppState('loading_text');
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Time-out.")), 15000));

    try {
      const vocab = getRandomSubarray(theme.vocab, 10); setActiveVocab(vocab);
      
      const payload = { contents: [{ parts: [{ text: `Write a coherent Dutch B1 story about ${sub} in Groningen. Exactly 5 pages, exactly 4 sentences/page. Use exactly these 10 target words: ${vocab.join(', ')}.` }] }], generationConfig: { responseMimeType: "application/json", responseSchema: { type: "OBJECT", properties: { pages: { type: "ARRAY", items: { type: "STRING" } }, glossary: { type: "ARRAY", items: { type: "OBJECT", properties: { word: { type: "STRING" }, definition: { type: "STRING" } }, required: ["word", "definition"] } } }, required: ["pages", "glossary"] } } };
      
      const res = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }, 15000);
      const d = await res.json();
      if (sessionIdRef.current !== sess) return;

      const parsed = safeExtractJSON(d.candidates[0].content.parts[0].text);
      if (!parsed || !Array.isArray(parsed.pages)) throw new Error("JSON error");

      setPages(parsed.pages.map((t, idx) => ({ text: forceString(t), imageUrl: null, audioUrl: null, imgLoading: true, audioLoading: true, targets: vocab.slice(idx * 2, idx * 2 + 2) })));
      setStoryGlossary(parsed.glossary || vocab.map(v => ({ word: v, definition: "Doelwoord." })));
      setAppState('reading'); awardXP(5);

      parsed.pages.forEach((t, i) => setTimeout(() => { if (sessionIdRef.current === sess) getMedia(i, t, anchor, sess, setPages, sessionIdRef, requestedMediaRef); }, i * 1500));

      // [核心测试约束修复] 强制要求生成 2 道阅读题 + 3 道词汇题
      const qPrompt = `Lees deze tekst: "${parsed.pages.join(' ')}". Maak EXACT 5 meerkeuzevragen (B1 niveau) in het Nederlands.\nSTRIKTE REGELS:\n- Vraag 1 en 2 MOETEN begrijpend lezen (reading comprehension) zijn over het verhaal.\n- Vraag 3, 4 en 5 MOETEN woordenschat (vocabulary) testen van EXACT 3 van deze specifieke doelwoorden: ${vocab.join(', ')}.`;
      const qPayload = { contents: [{ parts: [{ text: qPrompt }] }], generationConfig: { responseMimeType: "application/json", responseSchema: { type: "OBJECT", properties: { questions: { type: "ARRAY", items: { type: "OBJECT", properties: { question: { type: "STRING" }, options: { type: "ARRAY", items: { type: "STRING" } }, answer: { type: "STRING" }, explanation: { type: "STRING" } }, required: ["question", "options", "answer", "explanation"] } } }, required: ["questions"] } } };
      fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, { method:'POST', headers: {'Content-Type':'application/json'}, body:JSON.stringify(qPayload) }).then(r => r.json()).then(qd => {
         if (sessionIdRef.current !== sess) return;
         const qData = safeExtractJSON(qd.candidates[0].content.parts[0].text);
         if (qData?.questions) setQuiz(qData.questions);
      });
    } catch(e) { setError("Er is iets misgegaan tijdens het genereren. De AI is tijdelijk onbeschikbaar."); setAppState('landing'); }
  };

  const handleCustomStoryGeneration = async () => {
    setAppState('loading_custom'); setError('');
    const sess = Math.random().toString(36).substring(7); sessionIdRef.current = sess;
    requestedMediaRef.current = {};

    const finalGender = userProfile.gender || activeCharacter?.gender || "vrouw";
    const finalName = userProfile.name || activeCharacter?.name || "Aria";
    const finalAge = userProfile.age || activeCharacter?.age || "28";
    const finalEthnicity = userProfile.ethnicity || activeCharacter?.ethnicity || "Aziatisch";
    const char = { name: finalName, gender: finalGender, age: finalAge, ethnicity: finalEthnicity };
    
    setActiveCharacter(char);
    const anchor = generateVisualAnchor(char.gender, char.age, char.ethnicity);
    setStoryVisualAnchor(anchor);

    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Time-out.")), 15000));

    try {
      const payload = { contents: [{ parts: [{ text: `Schrijf een NT2 B1 verhaal in Groningen. Thema: ${selectedTheme.title}. Extra wens: ${customPrompt}. Gebruik exact 10 woorden: ${activeVocab.join(', ')} verdeeld over 5 pagina's (elke pagina 4 zinnen).` }] }], generationConfig: { responseMimeType: "application/json", responseSchema: { type: "OBJECT", properties: { pages: { type: "ARRAY", items: { type: "STRING" } } }, required: ["pages"] } } };
      const res = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }, 15000);
      const d = await res.json();
      if (sessionIdRef.current !== sess) return;
      
      const parsed = safeExtractJSON(d.candidates[0].content.parts[0].text);
      const initialPages = parsed.pages.map((t, idx) => ({ text: forceString(t), imageUrl: null, audioUrl: null, imgLoading: true, audioLoading: true, targets: activeVocab.slice(idx * 2, idx * 2 + 2) }));
      setPages(initialPages); 
      setAppState('reading_custom');
      
      // [核心测试约束修复] 强制要求生成 2 道阅读题 + 3 道词汇题
      const qPrompt = `Lees deze tekst: "${parsed.pages.join(' ')}". Maak EXACT 5 meerkeuzevragen (B1 niveau) in het Nederlands.\nSTRIKTE REGELS:\n- Vraag 1 en 2 MOETEN begrijpend lezen (reading comprehension) zijn over het verhaal.\n- Vraag 3, 4 en 5 MOETEN woordenschat (vocabulary) testen van EXACT 3 van deze specifieke doelwoorden: ${activeVocab.join(', ')}.`;
      fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, { method:'POST', headers: { 'Content-Type': 'application/json' }, body:JSON.stringify({ contents: [{ parts: [{ text: qPrompt }] }], generationConfig: { responseMimeType: "application/json", responseSchema: { type: "OBJECT", properties: { questions: { type: "ARRAY", items: { type: "OBJECT", properties: { question: { type: "STRING" }, options: { type: "ARRAY", items: { type: "STRING" } }, answer: { type: "STRING" }, explanation: { type: "STRING" } }, required: ["question", "options", "answer", "explanation"] } } }, required: ["questions"] } } }) }).then(r => r.json()).then(qd => {
         if (sessionIdRef.current !== sess) return;
         const qData = safeExtractJSON(qd.candidates[0].content.parts[0].text);
         if (qData?.questions) setQuiz(qData.questions);
      }).catch(e => console.warn("Quiz hergenereren mislukt", e));

      initialPages.forEach((page, i) => {
        setTimeout(() => {
          if (sessionIdRef.current === sess) {
            getMedia(i, page.text, anchor, sess, setPages, sessionIdRef, requestedMediaRef);
          }
        }, i * 1500);
      });
    } catch (e) { 
      if (sessionIdRef.current !== sess) return;
      setError("Er is iets fout gegaan bij het genereren van je eigen creatieve verhaal.");
      setAppState('custom_prompt'); 
    }
  };

  const handlePageChange = (newIndex) => { setCurrentPageIndex(newIndex); awardXP(5); };
  const nextPage = () => { if (currentPageIndex < pages.length - 1) handlePageChange(currentPageIndex + 1); };
  const prevPage = () => { if (currentPageIndex > 0) handlePageChange(currentPageIndex - 1); };
  
  const resetApp = () => {
    window.speechSynthesis.cancel(); setAppState('landing'); setSelectedTheme(null); setSelectedSubsection(''); setPages([]); setQuiz([]); setStoryGlossary([]); setCustomPrompt(''); setCurrentPageIndex(0); setCurrentCardIndex(0); 
  };

  const togglePlaybackSpeed = () => setPlaybackSpeed(s => s === 1.0 ? 0.8 : (s === 0.8 ? 1.5 : 1.0));
  const toggleFontSize = () => setFontSize(f => f === 'text-lg' ? 'text-xl' : (f === 'text-xl' ? 'text-2xl' : 'text-lg'));

  const handleOptionSelect = (qIndex, option) => { 
    if (userAnswers[qIndex]) return; 
    setUserAnswers(prev => ({ ...prev, [qIndex]: String(option) })); 
    const targetQ = quiz[qIndex];
    if (normalizeString(option) !== normalizeString(targetQ?.answer)) {
      const missedVocab = activeVocab.find(v => targetQ?.question?.toLowerCase().includes(v.toLowerCase()) || option.toLowerCase().includes(v.toLowerCase()));
      if (missedVocab && !reviewPool.some(r => r.word === missedVocab)) {
        const def = storyGlossary.find(g => normalizeString(g.word).includes(normalizeString(missedVocab).substring(0,4)))?.definition || "Doelwoord";
        const originalSentence = pages.map(p => p.text).join(' ').split(/[.!?]/).find(s => s.toLowerCase().includes(missedVocab.toLowerCase()))?.trim() || "";
        setReviewPool(prev => [...prev, { word: missedVocab, definition: def, sentence: originalSentence }]);
      }
    } else { awardXP(10); }
  };
  
  const calculateResults = async () => {
    let currentScore = 0; quiz.forEach((q, index) => { if (normalizeString(userAnswers[index]) === normalizeString(q.answer)) currentScore += 1; });
    setScore(currentScore); setAppState('results'); awardXP(currentScore * 10 + (currentScore === 5 ? 50 : 0));
  };

  const handleRetakeReview = () => { setUserAnswers({}); setScore(0); setAppState('flashcards'); setCurrentCardIndex(0); setIsCardFlipped(false); };
  const startFlashcards = () => { window.speechSynthesis.cancel(); setAppState('flashcards'); };
  const nextFlashcard = () => {
    if (currentCardIndex < (storyGlossary || []).length - 1) { setIsCardFlipped(false); setCurrentCardIndex(prev => prev + 1); } 
    else { awardXP(30); setAppState('custom_prompt'); }
  };

  const downloadStorybookHTML = () => {
    const storyTitle = selectedTheme ? `${selectedTheme.chapter} - ${selectedTheme.title}` : 'Mijn Verhaal';
    const pagesHTML = pages.map((p, i) => `<div class="page"><h2>Pagina ${i + 1}</h2><p>${p.text}</p>${p.imageUrl ? `<img src="${p.imageUrl}" />` : ''}</div>`).join('<hr/>');
    const htmlContent = `<!DOCTYPE html><html><head><style>body{font-family:sans-serif;background:#faf7f2;max-width:800px;margin:40px auto;padding:20px;}.page{background:white;padding:30px;border-radius:16px;margin-bottom:20px;text-align:center;}h1{color:#7d3c98;}img{max-width:100%;border-radius:8px;}</style></head><body><h1>${storyTitle}</h1>${pagesHTML}</body></html>`;
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = `Boekje.html`; link.click();
  };

  const downloadNotebookLMData = () => {
    const storyFullText = (pages || []).map((p, i) => `--- Pagina ${i+1} ---\n${p.text}`).join('\n\n');
    const quizResults = (quiz || []).map((q, i) => `Vraag ${i+1}: ${q.question}\nAntwoord Cursist: ${userAnswers[i] || 'Niet beantwoord'} (Correct: ${q.answer})`).join('\n\n');
    const fileContent = `=========================================\nNT2 Research Data\nStudent ID: ${userProfile.studentId}\nScore: ${score} / ${quiz.length}\n=========================================\n\n[VERHAAL]\n${storyFullText}\n\n[QUIZ]\n${quizResults}\n`;
    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = `NT2_Data_${userProfile.studentId}.txt`; link.click();
  };

  const handlePhotoUpload = (e) => { e.target.files?.[0] && processFile(e.target.files[0]); };
  const processFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = String(reader.result).split(',')[1];
      setUserProfile(prev => ({...prev, photo: { data: base64String, mimeType: file.type, previewUrl: reader.result }}));
      setProfileSaved(false);
    };
    reader.readAsDataURL(file);
  };

  const currentLevelProgress = (globalStats.xp % 100);
  const currentPage = pages[currentPageIndex] || {};

  return (
    <div className="min-h-screen text-slate-800 font-sans pb-16 relative overflow-x-hidden bg-[#FAF9F6] bg-[radial-gradient(at_100%_0%,rgba(244,219,255,0.45)_0px,transparent_55%),radial-gradient(at_0%_100%,rgba(225,233,255,0.45)_0px,transparent_55%)]">
      
      {xpToasts.map((toast, idx) => (
        <div key={idx} className="fixed top-20 right-6 z-50 bg-yellow-400 text-slate-900 px-4 py-2.5 rounded-xl font-black shadow-lg animate-bounce flex items-center gap-1.5"><Star size={16} fill="currentColor"/> {toast}</div>
      ))}

      <header className="bg-white/85 backdrop-blur-md border-b border-slate-200/50 p-4 sticky top-0 z-30 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3 cursor-pointer" onClick={resetApp}>
          <div className="bg-[#7D3C98] text-white w-10 h-10 rounded-xl flex items-center justify-center shadow-md"><BookOpen size={20} /></div>
          <h1 className="text-xl font-black text-slate-800">De finale <span className="font-light text-slate-400">Verhalenmaker</span></h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-2xl border shadow-sm"><div className="bg-yellow-100 p-1.5 rounded-xl text-yellow-600"><Star size={18} fill="currentColor" /></div>
             <div className="flex flex-col w-28"><div className="flex justify-between items-baseline mb-1"><span className="text-xs font-black text-slate-700">Lvl {globalStats.level}</span><span className="text-[10px] font-bold text-slate-400">{globalStats.xp} XP</span></div>
             <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-yellow-400 to-amber-500" style={{ width: `${currentLevelProgress}%` }}></div></div></div>
          </div>
          {appState !== 'landing' && <button onClick={resetApp} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200"><Home size={20}/></button>}
        </div>
      </header>

      <main className={`max-w-7xl mx-auto px-4 pt-8 relative z-10 ${appState === 'landing' ? 'min-h-[80vh] flex flex-col justify-center' : 'pt-8'}`}>
        
        {error && (
          <div className="max-w-4xl mx-auto mb-6 p-4 bg-red-50 text-red-700 font-bold rounded-2xl flex items-center gap-3 shadow-sm"><XCircle size={24} /><span>{error}</span></div>
        )}

        {appState === 'landing' && (
          <div className="animate-fade-in space-y-16 w-full text-center py-12">
            <div className="space-y-6">
              <h2 className="text-6xl sm:text-7xl font-black text-slate-900 leading-tight">Dompel jezelf onder in <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7D3C98] to-pink-500">Groningen.</span></h2>
              <p className="text-slate-500 text-xl max-w-2xl mx-auto font-medium">Kies een thema om vandaag aan te werken. Leer 10 B1/B2 doelwoorden per verhaallus.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
              {THEMES.map(theme => {
                return (
                  <button key={theme.id} onClick={() => { setSelectedTheme(theme); setAppState('setup'); }} className="bg-white rounded-[2.5rem] shadow-lg border border-slate-100 p-8 text-left group flex flex-col h-full relative overflow-hidden active:scale-95 transition-all duration-300 hover:border-purple-300 hover:shadow-2xl">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50/50 rounded-bl-full -z-10 transition-transform group-hover:scale-150 duration-700"></div>
                    <div className="flex justify-between items-start mb-6 w-full">
                      <span className="text-[10px] font-black uppercase text-purple-600 bg-purple-50 px-3.5 py-1 rounded-lg border tracking-wider">Thema {theme.id}</span>
                      <div className={`p-3 rounded-2xl ${theme.color}`}>{React.createElement(theme.icon, { size: 24 })}</div>
                    </div>
                    <h3 className="text-xl font-black text-slate-800 mb-6 group-hover:text-[#7D3C98] transition-colors">{theme.title}</h3>
                    <div className="flex flex-col gap-2 w-full mt-auto relative z-20">
                     {theme.subsections?.map(sub => (
                       <div key={sub} onClick={(e) => { e.stopPropagation(); handleStart(theme, sub); }} className="p-3 rounded-xl text-xs font-bold border flex items-center justify-between shadow-sm active:scale-95 bg-slate-50 hover:bg-[#7D3C98] hover:text-white border-slate-100">
                         <span>{sub}</span><ArrowRight size={14} />
                       </div>
                     ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {appState === 'setup' && selectedTheme && (
          <div className="animate-fade-in max-w-4xl mx-auto grid lg:grid-cols-2 gap-8">
            <div className="bg-white/90 backdrop-blur-md p-8 rounded-[3rem] shadow-xl flex flex-col h-full border border-slate-200/50">
              <h3 className="text-2xl font-black mb-8 flex items-center gap-3"><CircleUser size={32} /> Avatar Instellingen</h3>
              <div className="space-y-6 flex-grow flex flex-col">
                <label className="block w-full h-32 bg-slate-50 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer overflow-hidden hover:border-purple-400" style={userProfile.photo ? {backgroundImage:`url(${userProfile.photo.previewUrl})`, backgroundSize:'cover', backgroundPosition:'center'} : {}}>
                  {!userProfile.photo && <><CloudUpload size={24} className="mb-2 text-slate-400" /><span className="text-xs font-bold text-slate-500">Upload Selfie</span></>}
                  <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" value={userProfile.name} onChange={e=>setUserProfile({...userProfile, name:e.target.value})} placeholder="Naam" className="w-full p-4 bg-slate-50 rounded-xl font-bold outline-none" />
                  <select value={userProfile.gender} onChange={e=>setUserProfile({...userProfile, gender:e.target.value})} className="w-full p-4 bg-slate-50 rounded-xl font-bold outline-none">
                    <option value="vrouw">Vrouw</option><option value="man">Man</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <input type="number" value={userProfile.age} onChange={e=>setUserProfile({...userProfile, age:e.target.value})} placeholder="Leeftijd" className="w-full p-4 bg-slate-50 rounded-xl font-bold outline-none" />
                  <select value={userProfile.ethnicity} onChange={e=>setUserProfile({...userProfile, ethnicity:e.target.value})} className="w-full p-4 bg-slate-50 rounded-xl font-bold outline-none">
                    <option value="">Etniciteit...</option><option value="Aziatisch">Aziatisch</option><option value="Europees">Europees</option><option value="Afrikaans">Afrikaans</option><option value="Latijns-Amerikaans">Latijns-Amerikaans</option><option value="Midden-Oosters">Midden-Oosters</option>
                  </select>
                </div>
                <button onClick={()=>setProfileSaved(true)} className="w-full bg-slate-900 text-white py-4 rounded-xl font-black">{profileSaved ? 'Opgeslagen! ✓' : 'Opslaan'}</button>
              </div>
            </div>
            <div className="bg-white/90 backdrop-blur-md p-8 rounded-[3rem] shadow-xl border">
              <h3 className="text-2xl font-black mb-8">Kies een Onderwerp</h3>
              <div className="space-y-3">{selectedTheme.subsections?.map((s) => (<button key={s} onClick={()=>handleStart(selectedTheme, s)} className="w-full p-5 bg-slate-50 rounded-2xl text-left font-bold flex justify-between items-center hover:bg-purple-600 hover:text-white border transition-all">{s} <ArrowRight size={18} /></button>))}</div>
            </div>
          </div>
        )}

        {(appState === 'loading_text' || appState === 'loading_custom') && (
          <div className="py-40 text-center flex flex-col items-center animate-fade-in"><Loader2 size={44} className="animate-spin text-purple-600 mb-6" /><h2 className="text-3xl font-black text-slate-800">AI is aan het schrijven...</h2></div>
        )}

        {(appState === 'reading' || appState === 'reading_custom') && pages.length > 0 && (
          <div className="max-w-4xl mx-auto space-y-6 pb-10">
            <div className="flex flex-wrap justify-between items-center bg-white p-3 rounded-2xl shadow-sm border gap-3">
              <span className="text-xs font-black px-4 py-2 rounded-xl border bg-purple-100 text-purple-900">{selectedTheme?.title}</span>
              <div className="flex items-center gap-2">
                <button onClick={togglePlaybackSpeed} className="p-2.5 sm:px-4 sm:py-2 border bg-purple-50 rounded-xl font-bold text-sm text-purple-700 flex items-center gap-1.5"><Snail size={16} /> {playbackSpeed}x</button>
                <button onClick={downloadStorybookHTML} className="p-2.5 sm:px-4 sm:py-2 border bg-green-50 text-green-700 hover:bg-green-100 font-bold text-sm rounded-xl flex items-center gap-1.5" title="Download Boekje"><Download size={16} /> <span className="hidden sm:inline">Boekje</span></button>
                <button onClick={toggleFontSize} className="p-2.5 sm:px-4 sm:py-2 border bg-slate-50 rounded-xl text-slate-700"><ZoomIn size={14} /></button>
              </div>
            </div>

            <div className="bg-white p-6 sm:p-12 rounded-[3.5rem] shadow-2xl relative overflow-visible">
               {currentPage.targets && currentPage.targets.length > 0 && (
                 <div className="mb-6 flex items-center gap-2 bg-purple-50 text-purple-800 px-4 py-2.5 rounded-2xl w-fit text-xs font-black"><Award size={14}/> <span>Doelwoorden: {currentPage.targets.join(', ')}</span></div>
               )}

               <div ref={containerRef} className={`font-serif text-slate-800 leading-[2.1] mb-12 text-justify overflow-y-auto max-h-[500px] pr-2 ${fontSize}`}>
                  <HighlightedText text={forceString(currentPage?.text || '')} vocab={activeVocab} glossary={storyGlossary || []} onWordTrigger={(w, d, t) => { playWordAudio(w); }} />
               </div>

               <div className="mb-10 w-full max-w-md mx-auto shadow-sm rounded-full overflow-hidden bg-purple-50 p-2 flex items-center justify-center">
                  {currentPage.audioLoading && !currentPage.audioUrl ? (
                    <div className="h-12 flex items-center justify-center gap-3 text-purple-500 w-full"><Loader2 className="animate-spin" size={20} /> <span className="text-sm font-bold">Audio laden...</span></div>
                  ) : (
                    <CustomAudioPlayer src={currentPage.audioUrl || "fallback-speech"} text={currentPage.text} isPlaying={isPlaying} setIsPlaying={setIsPlaying} audioRef={audioRef} playbackSpeed={playbackSpeed} onXpEarned={() => awardXP(10)} />
                  )}
               </div>

               <div className="w-full relative bg-slate-900 overflow-hidden rounded-[2.5rem] shadow-lg min-h-[400px] mb-12 border">
                  <Interactive3DImage src={currentPage.imageUrl || null} fallbackSrc={GRONINGEN_FALLBACK_IMAGES[currentPageIndex%4]} title={selectedTheme?.title} />
               </div>

               <div className="pt-6 border-t flex flex-col sm:flex-row justify-between items-center gap-6">
                  <button onClick={prevPage} disabled={currentPageIndex === 0} className="px-5 py-3 rounded-xl font-bold border bg-white disabled:opacity-30 active:scale-95 w-full sm:w-auto">Vorige</button>
                  <span className="font-bold text-slate-400 text-sm bg-slate-100 px-4 py-2 rounded-full">Spread {currentPageIndex+1} / 5</span>
                  {currentPageIndex < pages.length - 1 ? (
                    <button onClick={nextPage} className="px-8 py-3 rounded-xl font-black bg-[#7D3C98] text-white active:scale-95 w-full sm:w-auto">Volgende</button>
                  ) : appState === 'reading' ? (
                    <button onClick={startFlashcards} className="px-6 py-3 rounded-xl font-black bg-green-500 text-white animate-pulse w-full sm:w-auto">Woordentrainer</button>
                  ) : (
                    <button onClick={() => setAppState('quiz')} className="px-6 py-3 rounded-xl font-black bg-slate-900 text-white w-full sm:w-auto">Quiz</button>
                  )}
               </div>
            </div>
          </div>
        )}

        {appState === 'flashcards' && (
          <div className="max-w-2xl mx-auto space-y-10 py-10">
             <div className="text-center"><h2 className="text-4xl font-black mb-2">Woordentrainer</h2><p className="font-bold text-slate-400">Draai om ({currentCardIndex+1}/{storyGlossary.length})</p></div>
             <div className="perspective-1000 w-full h-80 relative cursor-pointer" onClick={() => { setIsCardFlipped(!isCardFlipped); awardXP(2); }}>
                <div className="w-full h-full absolute transition-transform duration-700 transform-style-preserve-3d shadow-2xl rounded-[3rem]" style={{ transformStyle: 'preserve-3d', transition: 'transform 0.7s', transform: isCardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>
                    <div className="absolute w-full h-full backface-hidden bg-slate-900 text-white rounded-[3rem] flex flex-col items-center justify-center p-8 z-20 overflow-hidden" style={{ backfaceVisibility: 'hidden' }}>
                        <div className="absolute top-6 left-8 text-purple-300 font-bold tracking-widest text-sm uppercase">Woord {currentCardIndex + 1}</div>
                        <button onClick={(e) => { e.stopPropagation(); playWordAudio(storyGlossary[currentCardIndex]?.word); }} className="absolute top-6 right-8 p-3 bg-white/20 rounded-full hover:bg-white/30"><Volume2 size={24} /></button>
                        <h3 className="text-5xl sm:text-7xl font-black mb-4 z-10">{forceString(storyGlossary[currentCardIndex]?.word)}</h3>
                        <p className="text-slate-300 font-medium flex items-center gap-2 mt-4 z-10"><RefreshCw size={16} /> Klik om te draaien</p>
                    </div>
                    <div className="absolute w-full h-full backface-hidden bg-white text-slate-800 rounded-[3rem] shadow-xl flex flex-col items-center justify-center p-8 lg:p-12 z-10 border rotate-y-180" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                        <div className="absolute top-6 left-8 text-slate-400 font-bold tracking-widest text-sm uppercase">Definitie (B1/B2)</div>
                        <h4 className="text-2xl sm:text-4xl font-black text-center text-[#7D3C98]">"{forceString(storyGlossary[currentCardIndex]?.definition)}"</h4>
                    </div>
                </div>
             </div>
             <button onClick={nextFlashcard} className="w-full bg-[#7D3C98] text-white py-5 rounded-3xl font-black text-xl shadow-xl flex items-center justify-center gap-3">{currentCardIndex < (storyGlossary.length - 1) ? 'Volgende' : 'Mijn Verhaal Maken'}</button>
          </div>
        )}

        {/* [核心修复] 将首屏完整的个人资料设置模块移植到 Custom Prompt 界面 */}
        {appState === 'custom_prompt' && (
          <div className="max-w-6xl mx-auto animate-fade-in space-y-8">
            <div className="grid lg:grid-cols-12 gap-8 items-stretch">
               <div className="lg:col-span-5 bg-white rounded-[2.5rem] shadow-xl p-8 border border-slate-200 flex flex-col justify-between">
                  <div className="space-y-6 flex-grow flex flex-col">
                    <h3 className="text-2xl font-black flex items-center gap-3 border-b pb-4"><CircleUser size={28} className="text-purple-600" /> Avatar Instellingen</h3>
                    <label className="block w-full h-32 bg-slate-50 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer overflow-hidden hover:border-purple-400" style={userProfile.photo ? {backgroundImage:`url(${userProfile.photo.previewUrl})`, backgroundSize:'cover', backgroundPosition:'center'} : {}}>
                      {!userProfile.photo && <><CloudUpload size={24} className="mb-2 text-slate-400" /><span className="text-xs font-bold text-slate-500">Upload Selfie</span></>}
                      <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Naam</label><input type="text" value={userProfile.name} onChange={e=>setUserProfile({...userProfile, name:e.target.value})} placeholder="Naam" className="w-full p-4 bg-slate-50 rounded-xl font-bold border outline-none focus:ring-2 focus:ring-purple-300" /></div>
                      <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Geslacht</label><select value={userProfile.gender} onChange={e=>setUserProfile({...userProfile, gender:e.target.value})} className="w-full p-4 bg-slate-50 rounded-xl font-bold border outline-none"><option value="vrouw">Vrouw</option><option value="man">Man</option></select></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Leeftijd</label><input type="number" value={userProfile.age} onChange={e=>setUserProfile({...userProfile, age:e.target.value})} placeholder="Leeftijd" className="w-full p-4 bg-slate-50 rounded-xl font-bold border outline-none" /></div>
                      <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Etniciteit</label><select value={userProfile.ethnicity} onChange={e=>setUserProfile({...userProfile, ethnicity:e.target.value})} className="w-full p-4 bg-slate-50 rounded-xl font-bold border outline-none"><option value="">Kies...</option><option value="Aziatisch">Aziatisch</option><option value="Europees">Europees</option><option value="Afrikaans">Afrikaans</option><option value="Latijns-Amerikaans">Latijns-Amerikaans</option><option value="Midden-Oosters">Midden-Oosters</option></select></div>
                    </div>
                    <button type="button" onClick={() => setProfileSaved(true)} className="w-full py-4 bg-slate-800 text-white rounded-xl font-bold mt-auto shadow-md hover:bg-slate-900 transition-all">{profileSaved ? 'Opgeslagen! ✓' : 'Profiel Opslaan'}</button>
                  </div>
               </div>
               <div className="lg:col-span-7 bg-white rounded-[2.5rem] shadow-xl p-8 border border-slate-200 flex flex-col justify-between">
                  <div className="border-b pb-4 mb-6">
                     <h3 className="text-2xl font-black text-slate-800">Jouw Verhaallijn</h3>
                     <p className="text-slate-500 font-medium mt-1">Typ of spreek in wat Aria nu gaat doen in Groningen.</p>
                  </div>
                  <div className="relative mb-6">
                    <textarea value={customPrompt} onChange={e=>setCustomPrompt(e.target.value)} placeholder="Typ je eigen Groningen-ideeën hier..." className="w-full h-48 p-6 pr-16 bg-slate-50 border border-slate-200 rounded-2xl text-lg font-medium outline-none focus:ring-2 ring-purple-500 resize-none shadow-inner" />
                    <button onClick={toggleListening} className={`absolute bottom-4 right-4 p-4 rounded-xl shadow-md flex items-center justify-center transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-purple-600 text-white hover:bg-purple-700'}`}>
                      <Mic size={20} />
                    </button>
                  </div>
                  <div className="flex gap-4 pt-2">
                     <button onClick={handleCustomStoryGeneration} className="flex-1 bg-[#7D3C98] hover:bg-[#6C3483] text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-all text-lg">Genereer Mijn Verhaal</button>
                     <button onClick={() => setAppState('quiz')} className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-4 px-8 rounded-2xl border active:scale-95 transition-all text-lg">Naar Quiz</button>
                  </div>
               </div>
            </div>
          </div>
        )}

        {appState === 'quiz' && (
          <div className="max-w-4xl mx-auto space-y-8 pb-20 animate-fade-in">
            <div className="bg-white p-10 rounded-[3rem] shadow-xl border">
              <div className="flex items-center gap-4 mb-10 pb-6 border-b"><div className="bg-purple-100 p-4 rounded-2xl text-purple-600"><CheckCircle size={32}/></div><div><h2 className="text-3xl font-black">Kennis Check (5 Vragen)</h2><p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Direct Feedback Mode</p></div></div>
              <div className="space-y-12">
                {quiz.map((q, index) => {
                  const hasAnswered = !!userAnswers[index];
                  const isCorrect = normalizeString(userAnswers[index]) === normalizeString(q?.answer);
                  return (
                    <div key={index} className={`p-8 rounded-[2.5rem] border transition-all duration-300 ${hasAnswered ? (isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200') : 'bg-slate-50'}`}>
                      <p className="text-xl font-bold mb-6"><span className="text-[#7D3C98] mr-2">Vraag {index+1}:</span> {forceString(q?.question)}</p>
                      <div className="grid gap-3">
                        {q?.options?.map((opt) => {
                          const optionStr = forceString(opt);
                          const isSelected = userAnswers[index] === optionStr;
                          const isTheCorrectAnswer = normalizeString(optionStr) === normalizeString(q?.answer);
                          let labelClasses = "p-4 sm:p-5 border-2 rounded-2xl flex items-start gap-4 transition-all duration-200 ";
                          if (!hasAnswered) { labelClasses += "bg-white border-slate-200 cursor-pointer active:scale-[0.99]"; } 
                          else { if (isSelected && isTheCorrectAnswer) labelClasses += "bg-green-100 border-green-500 text-green-950 shadow-md"; else if (isSelected && !isTheCorrectAnswer) labelClasses += "bg-red-100 border-red-500 text-red-950 shadow-md"; else if (!isSelected && isTheCorrectAnswer) labelClasses += "bg-green-50/60 border-green-300 text-green-800"; else labelClasses += "bg-white border-slate-200 text-slate-400 opacity-45"; }
                          return (
                            <label key={optionStr} className={labelClasses}>
                              <input type="radio" name={`q-${index}`} className="hidden" disabled={hasAnswered} onChange={() => handleOptionSelect(index, optionStr)} />
                              <div className={`w-6 h-6 rounded-full border-2 mr-4 mt-0.5 flex items-center justify-center flex-shrink-0 transition-colors ${isSelected && isTheCorrectAnswer ? 'border-green-600 bg-green-500' : isSelected && !isTheCorrectAnswer ? 'border-red-600 bg-red-500' : 'border-slate-300'}`}>
                                 {isSelected && isTheCorrectAnswer && <CheckCircle size={16} className="text-white" />}
                                 {isSelected && !isTheCorrectAnswer && <XCircle size={16} className="text-white" />}
                                 {!isSelected && isTheCorrectAnswer && hasAnswered && <CheckCircle size={16} className="text-green-500 opacity-70" />}
                              </div>
                              <span className="font-semibold text-lg leading-snug pt-0.5">{optionStr}</span>
                            </label>
                          );
                        })}
                      </div>
                      {hasAnswered && (
                        <div className={`mt-6 p-5 rounded-2xl flex items-start gap-4 animate-fade-in border ${isCorrect ? 'bg-green-100/60 text-green-900 border-green-200' : 'bg-red-100/60 text-red-900 border-red-200'}`}>
                           <div className={`p-2 rounded-xl text-white shrink-0 shadow-sm ${isCorrect ? 'bg-green-600' : 'bg-red-500'}`}>{isCorrect ? <CheckCircle size={20} /> : <XCircle size={20} />}</div>
                           <div className="space-y-1"><p className="font-black text-lg">{isCorrect ? 'Helemaal correct! +10 XP' : 'Helaas, dat is onjuist.'}</p><p className="text-base font-medium opacity-90 leading-relaxed">"{forceString(q?.explanation || '')}"</p></div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <button onClick={calculateResults} disabled={Object.keys(userAnswers).length !== (quiz.length || 5)} className="w-full mt-10 bg-slate-900 text-white py-5 rounded-2xl font-black text-lg disabled:opacity-25 active:scale-95 transition-transform">Bekijk Resultaten</button>
            </div>
          </div>
        )}

        {appState === 'results' && (
          <div className="max-w-3xl mx-auto text-center py-20 bg-white rounded-[4rem] shadow-2xl border animate-fade-in">
            <div className="inline-flex items-center justify-center w-32 h-32 bg-yellow-100 text-yellow-600 rounded-full mb-8 animate-bounce"><Trophy size={64}/></div>
            <h2 className="text-5xl font-black mb-4">Gefeliciteerd!</h2>
            <p className="text-2xl font-bold text-slate-400 mb-10">Jouw score: {score} / {quiz.length}</p>

            <div className="flex gap-4 px-10 justify-center">
              <button onClick={downloadNotebookLMData} className="px-8 py-4 bg-slate-100 text-slate-700 font-bold rounded-2xl shadow-sm hover:-translate-y-0.5 active:scale-95 transition-all flex items-center justify-center gap-2"><Download size={20} /> Data Opslaan (.txt)</button>
              <button onClick={resetApp} className="px-8 py-4 bg-[#7D3C98] hover:bg-[#6C3483] text-white font-black rounded-2xl shadow-xl hover:-translate-y-0.5 active:scale-95 transition-all">Startpagina</button>
            </div>
          </div>
        )}
      </main>

      <style dangerouslySetInnerHTML={{__html: `
        .perspective-1000 { perspective: 1000px; }
        .transform-style-preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
        @keyframes fade-in { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
        @keyframes kenBurns { 0% { transform: scale(1.0) translate(0, 0); } 100% { transform: scale(1.15) translate(-1.5%, -1.5%); } }
        .animate-ken-burns { animation: kenBurns 15s ease-in-out infinite alternate; transform-origin: center; }
      `}} />
    </div>
  );
}