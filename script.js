    function isBenignResizeObserverError(message) {
      return /ResizeObserver loop (completed with undelivered notifications|limit exceeded)/i.test(String(message || ""));
    }

    window.addEventListener("error", (event) => {
      if (isBenignResizeObserverError(event.message)) {
        event.preventDefault();
        return;
      }
      const box = document.getElementById("errorBox");
      const text = document.getElementById("errorText");
      if (box && text) {
        text.textContent = "Er ging iets mis bij het starten: " + (event.message || "onbekende fout");
        box.classList.add("show");
      }
    });

    if ("serviceWorker" in navigator && location.protocol !== "file:") {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("./sw.js?v=first-story-polish-v2").catch(() => {});
      });
    }

    const memoryStore = {};

    function safeGet(key, fallback) {
      try {
        const value = window.localStorage && window.localStorage.getItem(key);
        return value === null || value === undefined ? fallback : value;
      } catch {
        return Object.prototype.hasOwnProperty.call(memoryStore, key) ? memoryStore[key] : fallback;
      }
    }

    function safeSet(key, value) {
      try {
        if (window.localStorage) window.localStorage.setItem(key, value);
      } catch {
        memoryStore[key] = value;
      }
    }

    function safeJson(value, fallback) {
      try {
        return JSON.parse(value);
      } catch {
        return fallback;
      }
    }

    const state = {
      appState: "landing",
      selectedTheme: null,
      selectedSubsection: "",
      pages: [],
      glossary: [],
      vocab: [],
      quiz: [],
      answers: {},
      score: 0,
      pageIndex: 0,
      currentStoryKey: "",
      fontSize: "size-xl",
      playbackSpeed: 0.9,
      isSpeaking: false,
      apiKey: "",
      imageBusy: false,
      imageBusyLabel: "",
      audioBusy: false,
      audioBusyLabel: "",
      currentAudio: null,
      audioProgress: {},
      showPrompt: false,
      stats: safeJson(safeGet("nt2_stats", '{"xp":0,"level":1}'), { xp: 0, level: 1 }),
      completedStories: new Set(safeJson(safeGet("nt2_completed_stories", "[]"), [])),
      lastActivity: safeJson(safeGet("nt2_last_activity", "null"), null),
      sentenceChecks: safeJson(safeGet("nt2_sentence_checks", "{}"), {}),
      wordEase: safeJson(safeGet("nt2_word_ease", "{}"), {}),
      discoveredWords: new Set(safeJson(safeGet("nt2_discovered", "[]"), [])),
      reviewPool: safeJson(safeGet("nt2_review", "[]"), []),
      difficultWords: safeJson(safeGet("nt2_difficult_words", "[]"), []),
      resultReviewWords: [],
      reviewMode: false,
      practiceMode: "",
      practiceTitle: "",
      cardIndex: 0,
      cardFlipped: false,
      customPrompt: "",
      userProfile: { name: "", photo: null, studentId: "STU-" + Math.random().toString(36).slice(2, 7).toUpperCase() },
      recognition: null,
      listening: false
    };

    const themes = [
      {
        id: 1,
        chapter: "Thema 1",
        title: "De maatschappij",
        subtitle: "Geen zorgen voor morgen",
        page: 10,
        icon: "M",
        bookTopics: ["Gelukkig zijn", "Een straatarts", "Het UWV", "Buurtbewoners"],
        subsections: ["Gelukkig zijn", "Een straatarts", "Het UWV", "Buurtbewoners"],
        vocab: ["blijken","aarzelen","uitgebreid","aanvragen","uitkering","stimuleren","arbeidsmarkt","bevorderen","cultuurverschil","toepassen"]
      },
      {
        id: 2,
        chapter: "Thema 2",
        title: "Natuur en klimaat",
        subtitle: "Water naar zee dragen",
        page: 42,
        icon: "N",
        bookTopics: ["Druk in de natuur", "Nationale parken", "Drinkwatertekort", "Een ecoduct", "De Keukenhof"],
        subsections: ["Druk in de natuur", "Nationale parken", "Drinkwatertekort", "Een ecoduct", "De Keukenhof"],
        vocab: ["aanleggen","aanpassing","aantrekkelijk","afvalstof","afvoeren","beheerder","benadrukken","beschermen","besparen","duurzaam"]
      },
      {
        id: 3,
        chapter: "Thema 3",
        title: "Cultuur",
        subtitle: "’s Lands wijs, ’s lands eer",
        page: 76,
        icon: "C",
        bookTopics: ["UNESCO werelderfgoed", "Gerrit Rietveld", "Eetgewoontes", "Cultuurverschillen"],
        subsections: ["UNESCO werelderfgoed", "Gerrit Rietveld", "Eetgewoontes", "Cultuurverschillen"],
        vocab: ["behouden","beschermen","bevorderen","bewaren","eigentijds","evalueren","gebouw","aanpassing","aanraden","afhangen van"]
      },
      {
        id: 4,
        chapter: "Thema 4",
        title: "Economie en werk",
        subtitle: "Leef je om te werken of werk je om te leven?",
        page: 106,
        icon: "W",
        bookTopics: ["Stage lopen", "Een eigen bedrijf starten", "Werk vinden", "Import en export", "De wereldeconomie"],
        subsections: ["Stage lopen", "Een eigen bedrijf starten", "Werk vinden", "Import en export", "De wereldeconomie"],
        vocab: ["aanpak","aansluiten op","aantrekken","netwerk","nijpend","argument","omzetten","onderbouwen","beperken","bedrijfstak"]
      },
      {
        id: 5,
        chapter: "Thema 5",
        title: "Infrastructuur en planologie",
        subtitle: "Alle wegen leiden naar Rome",
        page: 136,
        icon: "I",
        bookTopics: ["Maatschappelijke ondersteuning", "Is Nederland vol?", "Auto en openbaar vervoer", "Bereikbaarheid"],
        subsections: ["Maatschappelijke ondersteuning", "Is Nederland vol?", "Auto en openbaar vervoer", "Bereikbaarheid"],
        vocab: []
      },
      {
        id: 6,
        chapter: "Thema 6",
        title: "Duurzaamheid",
        subtitle: "Groene vingers hebben",
        page: 170,
        icon: "D",
        bookTopics: ["Duurzaamheid in Nederland", "Repareren of nieuw?", "Vliegen", "Voedselverspilling", "Fossiele brandstoffen"],
        subsections: ["Duurzaamheid in Nederland", "Repareren of nieuw?", "Vliegen", "Voedselverspilling", "Fossiele brandstoffen"],
        vocab: []
      },
      {
        id: 7,
        chapter: "Thema 7",
        title: "Internationale contacten",
        subtitle: "De wijde wereld intrekken",
        page: 206,
        icon: "G",
        bookTopics: ["In het buitenland studeren", "Digital nomads", "Zaken doen met andere landen", "Taaltransfer", "Internationale wetenschap"],
        subsections: ["In het buitenland studeren", "Digital nomads", "Zaken doen met andere landen", "Taaltransfer", "Internationale wetenschap"],
        vocab: []
      },
      {
        id: 8,
        chapter: "Thema 8",
        title: "Wetenschap",
        subtitle: "Kennis is macht",
        page: 236,
        icon: "S",
        bookTopics: ["Een winterdepressie", "Uitvindingen", "Medische onderzoeken", "Robots"],
        subsections: ["Een winterdepressie", "Uitvindingen", "Medische onderzoeken", "Robots"],
        vocab: []
      }
    ];

    // Book-topic hierarchy: the start page follows the Onderwerpen page from De finale.
    // A book topic can contain one or more story modules. This keeps the home page tidy,
    // and makes it easy to add extra stories later under the same topic.
    const topicStoryGroups = {
      "1-gelukkig zijn": ["1-Gelukkig zijn", "1-Geluk in cijfers", "1-Moeilijke dagen"],
      "1-een straatarts": ["1-Een streetarts", "1-Hulp op straat"],
      "1-het uwv": ["1-Het UWV", "1-Terug naar werk", "1-Regels en rechten"],
      "1-buurtbewoners": ["1-Buurtbewoners", "1-De buurt praat mee", "1-Samen vooruit"],
      "2-druk in de natuur": ["2-Druk in de natuur", "2-Zorg voor klimaat"],
      "2-nationale parken": ["2-Nationale parken", "2-Wandelen door het park", "2-De beheerder vertelt", "2-Heide en heuvels"],
      "2-drinkwatertekort": ["2-Drinkwatertekort", "2-Water in droge tijden", "2-Sloten en rivieren", "2-Zuinig met water"],
      "2-een ecoduct": ["2-Een ecoduct", "2-Dieren veilig over", "2-Natuur onder druk", "2-Routes zonder overleg"],
      "2-de keukenhof": ["2-De Keukenhof", "2-Kleurrijke landschappen", "2-Eropuit in het voorjaar", "2-Regen en recreatie"],
      "3-unesco werelderfgoed": ["3-UNESCO werelderfgoed", "3-Amir in een oude stad", "3-Amir aan de gracht", "3-Amir helpt bij erfgoed", "3-Amir in het atelier"],
      "3-gerrit rietveld": ["3-Gerrit Rietveld", "3-Amir tekent zijn buurt", "3-Amir ziet oude daken"],
      "3-eetgewoontes": ["3-Eetgewoontes", "3-Mila eet bij buren"],
      "3-cultuurverschillen": ["3-Cultuurverschillen", "3-Mila leert uitdrukkingen"],
      "4-stage lopen": ["4-Stage lopen", "4-Mila op stage in de zorg"],
      "4-een eigen bedrijf starten": ["4-Een eigen bedrijf starten", "4-Mila zoekt startkapitaal"],
      "4-werk vinden": ["4-Werk vinden", "4-Mila oefent sollicitaties"],
      "4-import en export": ["4-Import en export", "4-Mila volgt een zending"],
      "4-de wereldeconomie": ["4-De wereldeconomie", "4-Mila leest economisch nieuws"]
    };

    const images = {
      study: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1400&q=85",
      garden: "https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=1400&q=85",
      team: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1400&q=85",
      friends: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1400&q=85",
      nature: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1400&q=85",
      clean: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1400&q=85",
      archive: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1400&q=85",
      work: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1400&q=85",
      canal: "https://images.unsplash.com/photo-1512470876302-972faa2aa9a4?auto=format&fit=crop&w=1400&q=85",
      cafe: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1400&q=85",
      library: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1400&q=85",
      office: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1400&q=85",
      water: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=85",
      bridge: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1400&q=85"
    };

    const stories = {
      "1-Gelukkig zijn": {
        vocab: themes[0].vocab,
        pages: [
          { text: "Mila is net in Groningen komen wonen. Ze wil haar buurt graag leren kennen, maar wanneer ze bij de voordeur van haar buurvrouw staat, moet ze even aarzelen. Uit gesprekken met buren kan blijken dat veel nieuwkomers zich in het begin alleen voelen, vooral als zij nog weinig mensen kennen. Toch opent de buurvrouw glimlachend de deur en nodigt haar uit voor koffie.", imageUrl: images.study, targets: ["blijken","aarzelen"] },
          { text: "Het wijkcentrum heeft een uitgebreid programma met taallessen, koffieochtenden en een kleine moestuingroep. Mila kiest eerst de tuin, omdat ze daar makkelijk met buren kan praten terwijl haar handen bezig zijn. Ze wil hulp aanvragen voor een bak met kruiden, en een vrijwilligster leest het formulier rustig met haar mee. Later planten ze samen munt en peterselie.", imageUrl: images.garden, targets: ["uitgebreid","aanvragen"] },
          { text: "Mila krijgt tijdelijk een uitkering, waardoor ze goed moet leren welke afspraken met de gemeente belangrijk zijn. Haar begeleider wil haar stimuleren om vrijwillig werk te doen, niet als extra druk, maar als kans om mensen te ontmoeten. Op woensdag helpt ze daarom in het buurthuis, waar ze koffie schenkt en korte gesprekken oefent. Na een paar weken kent ze meerdere gezichten.", imageUrl: images.team, targets: ["uitkering","stimuleren"] },
          { text: "Door vrijwillig werk begrijpt Mila de arbeidsmarkt beter, omdat ze ziet hoe afspraken, taken en contact met collega's in Nederland gaan. Haar taalcoach wil haar Nederlands bevorderen door echte gesprekken te oefenen in plaats van losse woorden. Soms zoekt Mila even naar een zin. Toch praat ze door, want in de keuken en aan tafel voelt oefenen minder spannend.", imageUrl: images.work, targets: ["arbeidsmarkt","bevorderen"] },
          { text: "Op straat merkt Mila een cultuurverschil: sommige buren groeten kort, terwijl zij zelf gewend is langer te blijven praten. Een buurvrouw legt uit dat beide manieren vriendelijk kunnen zijn, zolang je goed naar de situatie kijkt. Mila wil de nieuwe gewoonte toepassen, zonder haar eigen warmte te verliezen. Daardoor voelt de buurt steeds meer als een plek waar zij mag blijven.", imageUrl: images.friends, targets: ["cultuurverschil","toepassen"] }
        ],
        glossary: [
          ["blijken","duidelijk worden"],["aarzelen","twijfelen of wachten omdat je niet durft"],["uitgebreid","groot en met veel details"],["aanvragen","officieel vragen om iets te krijgen"],["uitkering","geld dat iemand tijdelijk van de overheid krijgt"],["stimuleren","aanmoedigen"],["arbeidsmarkt","alle banen en mensen die werk zoeken"],["bevorderen","helpen om iets beter te maken"],["cultuurverschil","verschil in gewoontes tussen groepen"],["toepassen","in de praktijk gebruiken"]
        ].map(([word, definition]) => ({word, definition})),
        quiz: [
          { question: "Wat kan blijken uit gesprekken met buren?", options: ["Veel nieuwkomers voelen zich alleen.","Iedereen vindt meteen werk.","Er zijn geen buurtactiviteiten.","Niemand wil koffie drinken."], answer: "Veel nieuwkomers voelen zich alleen.", explanation: "Op pagina 1 staat: uit gesprekken met buren kan blijken dat veel nieuwkomers zich alleen voelen.", relatedWords: ["blijken","aarzelen"] },
          { question: "Waarom helpt vrijwillig werk Mila?", options: ["Ze leert afspraken, taken en contact met collega's beter begrijpen.","Het vervangt alle taallessen.","Ze hoeft dan geen Nederlands meer te oefenen.","Ze blijft daardoor altijd thuis."], answer: "Ze leert afspraken, taken en contact met collega's beter begrijpen.", explanation: "Op pagina 4 helpt vrijwillig werk Mila om de arbeidsmarkt beter te begrijpen.", relatedWords: ["stimuleren","arbeidsmarkt"] },
          { question: "Wat betekent bevorderen in deze tekst?", options: ["Iets vooruithelpen.","Iets verbieden.","Iets vergeten.","Iets weigeren."], answer: "Iets vooruithelpen.", explanation: "De taalcoach wil Mila's Nederlands bevorderen door echte gesprekken te oefenen.", relatedWords: ["bevorderen"] },
          { question: "Wat leert Mila over cultuurverschil in haar straat?", options: ["Dat beide manieren vriendelijk kunnen zijn als je goed naar de situatie kijkt.","Dat korte groeten altijd onbeleefd zijn.","Dat buren nooit met elkaar praten.","Dat zij haar eigen gewoonte niet mag houden."], answer: "Dat beide manieren vriendelijk kunnen zijn als je goed naar de situatie kijkt.", explanation: "Op pagina 5 legt de buurvrouw uit dat beide manieren vriendelijk kunnen zijn.", relatedWords: ["cultuurverschil","toepassen"] }
        ]
      },
      "1-Een streetarts": {
        vocab: ["blijken","aarzelen","uitgebreid","aanvragen","uitkering","stimuleren","arbeidsmarkt","bevorderen","signaleren","toepassen"],
        pages: [
          { text: "In Groningen loopt Mila mee met een straatdokter, omdat zij wil zien hoe zorg buiten de gewone spreekkamer werkt. Uit zijn verhalen kan blijken dat sommige mensen ziek blijven rondlopen, terwijl ze eigenlijk hulp nodig hebben. Ze aarzelen om naar het ziekenhuis te gaan, maar de arts praat rustig en geeft hun tijd. De buurt voelt daardoor dichterbij.", imageUrl: images.team, targets: ["blijken","aarzelen"] },
          { text: "De arts houdt een uitgebreid spreekuur in een bus, waar mensen zonder afspraak kunnen binnenlopen. Wie extra hulp nodig heeft, kan daar samen met een medewerker zorg aanvragen, zodat de eerste stap minder moeilijk voelt. Mila schenkt thee in en merkt dat een vriendelijk gezicht soms al veel spanning wegneemt. De buurt voelt daardoor dichterbij.", imageUrl: images.work, targets: ["uitgebreid","aanvragen"] },
          { text: "Sommige mensen hebben geen adres en geen uitkering, waardoor zij sneller uit beeld raken. De straatdokter wil hen stimuleren om toch hulp te zoeken, ook als ze eerdere afspraken hebben gemist. Mila loopt mee naar een opvangplek en ziet dat vertrouwen vaak begint met een rustig gesprek. Ze durft de volgende vraag te stellen.", imageUrl: images.friends, targets: ["uitkering","stimuleren"] },
          { text: "Gezond zijn helpt later op de arbeidsmarkt, want zonder slaap, eten en zorg wordt werk zoeken bijna onmogelijk. Een veilige opvangplek kan herstel bevorderen, omdat mensen daar eerst tot rust komen. Mila begrijpt daardoor dat medische hulp en toekomstplannen vaak dichter bij elkaar liggen dan zij dacht. Ze durft de volgende vraag te stellen.", imageUrl: images.study, targets: ["arbeidsmarkt","bevorderen"] },
          { text: "De arts kan pijn en koorts snel signaleren, terwijl hij ondertussen goed luistert naar wat iemand zelf vertelt. Daarna kiest hij welke hulp hij moet toepassen: soms is dat een verband, soms een afspraak bij de huisarts. Mila leert dat snelle zorg belangrijk is, maar dat respect minstens zo veel betekent. Zo wordt contact maken iets gewoner.", imageUrl: images.team, targets: ["signaleren","toepassen"] }
        ],
        glossary: [
          ["blijken","duidelijk worden"],["aarzelen","twijfelen"],["uitgebreid","groot en compleet"],["aanvragen","officieel vragen"],["uitkering","geldelijke steun"],["stimuleren","aanmoedigen"],["arbeidsmarkt","banen en werkzoekenden"],["bevorderen","vooruithelpen"],["signaleren","opmerken en melden"],["toepassen","gebruiken in de praktijk"]
        ].map(([word, definition]) => ({word, definition})),
        quiz: [
          { question: "Waarom loopt Mila mee met een straatdokter?", options: ["Omdat zij wil zien hoe zorg buiten de gewone spreekkamer werkt.","Omdat zij fietsen wil verkopen.","Omdat zij een park wil ontwerpen.","Omdat zij een restaurant wil openen."], answer: "Omdat zij wil zien hoe zorg buiten de gewone spreekkamer werkt.", explanation: "Op pagina 1 staat dat Mila wil zien hoe zorg buiten de gewone spreekkamer werkt.", relatedWords: ["blijken","aarzelen"] },
          { question: "Waarom aarzelen sommige mensen om naar het ziekenhuis te gaan?", options: ["Ze hebben hulp nodig, maar durven de stap niet goed te zetten.","Ze zijn al helemaal gezond.","Ze willen alleen sportlessen volgen.","Ze hebben geen interesse in thee."], answer: "Ze hebben hulp nodig, maar durven de stap niet goed te zetten.", explanation: "Op pagina 1 staat dat sommige mensen aarzelen om naar het ziekenhuis te gaan.", relatedWords: ["aarzelen"] }
        ]
      },
      "2-Druk in de natuur": {
        vocab: themes[1].vocab,
        pages: [
          { text: "Groningen wil meer groene paden aanleggen, omdat veel mensen buiten willen bewegen zonder de natuur te verstoren. De beheerder laat Mila zien dat een kleine aanpassing, zoals een houten rand langs het pad, al kan helpen. Zo weten bezoekers waar ze mogen lopen, terwijl dieren meer rust krijgen. De wandeling voelt nu rustiger en concreter.", imageUrl: images.nature, targets: ["aanleggen","aanpassing"] },
          { text: "Een schoon park is aantrekkelijk voor gezinnen, maar afval maakt de plek snel minder prettig. Wanneer Mila een afvalstof in het gras ziet liggen, raapt ze het blikje op en zoekt een bak. De gids legt uit dat zo'n kleine keuze belangrijk is, omdat vogels en kinderen dezelfde ruimte gebruiken. Zo blijft de natuur geen los onderwerp.", imageUrl: images.clean, targets: ["aantrekkelijk","afvalstof"] },
          { text: "Na een nacht met regen moet het park water afvoeren, anders worden de paden te nat en glad. De beheerder kijkt bij de brug waar plassen blijven staan, waarna Mila helpt om een waarschuwingslint neer te zetten. Daardoor begrijpt ze dat onderhoud niet alleen over planten gaat, maar ook over veiligheid. De regel krijgt daardoor een duidelijk voorbeeld.", imageUrl: images.garden, targets: ["afvoeren","beheerder"] },
          { text: "De mensen van het park benadrukken dat jonge planten tijd nodig hebben om sterk te worden. Daarom moeten bezoekers ze beschermen door op afstand te blijven, ook wanneer een foto dichtbij mooier lijkt. Mila vindt dat logisch, want zonder jonge planten ziet het park er later veel kaler uit. Het landschap maakt de woorden zichtbaar.", imageUrl: images.nature, targets: ["benadrukken","beschermen"] },
          { text: "Thuis wil Mila water besparen, omdat de wandeling haar heeft laten zien hoe belangrijk schoon water is. Duurzaam leven hoeft volgens haar niet groot te beginnen: ze draait de kraan sneller dicht en neemt vaker de fiets. Kleine gewoontes voelen makkelijker wanneer ze bij haar eigen dag passen. Buiten ziet ze meteen waarom dat nodig is.", imageUrl: images.clean, targets: ["besparen","duurzaam"] }
        ],
        glossary: [
          ["aanleggen","maken of bouwen"],["aanpassing","verandering om iets beter te maken"],["aantrekkelijk","mooi of prettig"],["afvalstof","schadelijk restmateriaal"],["afvoeren","weg laten lopen of wegbrengen"],["beheerder","persoon die voor een plek zorgt"],["benadrukken","extra duidelijk zeggen"],["beschermen","veilig houden"],["besparen","minder gebruiken"],["duurzaam","goed voor de toekomst"]
        ].map(([word, definition]) => ({word, definition})),
        quiz: [
          { question: "Waarom wil Groningen meer groene paden aanleggen?", options: ["Omdat veel mensen buiten willen bewegen zonder de natuur te verstoren.","Omdat afval dan beter kan blijven liggen.","Omdat er minder dieren moeten komen.","Omdat niemand meer wil wandelen."], answer: "Omdat veel mensen buiten willen bewegen zonder de natuur te verstoren.", explanation: "Op pagina 1 staat dat mensen buiten willen bewegen zonder de natuur te verstoren.", relatedWords: ["aanleggen","aanpassing"] },
          { question: "Wat doet de beheerder na een nacht met regen?", options: ["Hij kijkt bij de brug waar plassen blijven staan.","Hij kookt voor de bezoekers.","Hij sluit alle parken voorgoed.","Hij zet jonge planten in een kantoor."], answer: "Hij kijkt bij de brug waar plassen blijven staan.", explanation: "Op pagina 3 kijkt de beheerder bij de brug, omdat het park water moet afvoeren.", relatedWords: ["beheerder","afvoeren"] },
          { question: "Wat is duurzaam gedrag volgens de tekst?", options: ["Water besparen.","Meer afval achterlaten.","Planten beschadigen.","Niet op de paden blijven."], answer: "Water besparen.", explanation: "De tekst noemt water besparen als bewuste duurzame keuze.", relatedWords: ["besparen","duurzaam"] }
        ]
      },
      "3-UNESCO werelderfgoed": {
        vocab: themes[2].vocab,
        pages: [
          { text: "Wanneer Mila door Groningen wandelt, ziet zij hoe oude monumenten tussen winkels, fietsen en nieuwe huizen blijven staan. De gids legt uit dat de stad zulke plekken wil behouden, maar dat je ze ook moet beschermen tegen regen, druk verkeer en te veel toeristen. Mila kijkt langer naar de muur van een oud gebouw, omdat zij nu begrijpt dat stenen ook een verhaal kunnen dragen. Het gesprek krijgt daardoor meer betekenis.", imageUrl: images.archive, targets: ["behouden","beschermen"] },
          { text: "In het Groninger Archief bekijkt Mila foto's van straten die bijna niet meer bestaan. De medewerker vertelt dat lessen, rondleidingen en kleine projecten kennis over de stad kunnen bevorderen, terwijl medewerkers de oude documenten veilig bewaren voor later. Daardoor voelt geschiedenis voor Mila niet ver weg, maar juist dichtbij en praktisch. De oude plek voelt ineens minder ver weg.", imageUrl: images.study, targets: ["bevorderen","bewaren"] },
          { text: "Samen met haar taalgroep maakt Mila een eigentijds filmpje over een oud huis aan de gracht. Voordat zij mogen filmen, komt een expert langs om de staat van het gebouw te evalueren, zodat iedereen weet welke delen kwetsbaar zijn. Mila luistert goed, want door deze uitleg ziet zij meer dan alleen een mooie gevel. De woorden horen nu bij een echte situatie.", imageUrl: images.team, targets: ["eigentijds","evalueren"] },
          { text: "Bij een oud gebouw merkt Mila dat erfgoed soms moet veranderen om open te blijven voor iedereen. De nieuwe aanpassing bij de ingang is klein, maar dankzij de helling kan ook iemand met een rolstoel naar binnen. Eerst vindt Mila het moderne stuk een beetje vreemd. Daarna ziet zij dat zorg voor mensen en zorg voor geschiedenis goed samen kunnen gaan.", imageUrl: images.archive, targets: ["gebouw","aanpassing"] },
          { text: "Aan het einde van de dag wil de gids een wandeling door de binnenstad aanraden, omdat je buiten pas goed ziet hoe oud en nieuw elkaar raken. Of erfgoed blijft leven, kan afhangen van de aandacht die bewoners eraan geven. Mila loopt langs de gracht, maakt foto's van oude huizen en besluit later nog eens terug te komen met een vriendin. De oude plek voelt ineens minder ver weg.", imageUrl: images.friends, targets: ["aanraden","afhangen van"] }
        ],
        glossary: [
          ["behouden","in stand houden"],["beschermen","veilig houden tegen schade"],["bevorderen","vooruithelpen"],["bewaren","veilig opslaan"],["eigentijds","modern"],["evalueren","beoordelen"],["gebouw","huis, kerk of ander bouwwerk"],["aanpassing","kleine verandering"],["aanraden","adviseren"],["afhangen van","bepaald worden door"]
        ].map(([word, definition]) => ({word, definition})),
        quiz: [
          { question: "Wat moeten we met historische monumenten doen?", options: ["Behouden en beschermen.","Direct slopen.","Vergeten.","Alleen verkopen."], answer: "Behouden en beschermen.", explanation: "De eerste pagina noemt behouden en beschermen.", relatedWords: ["behouden","beschermen"] },
          { question: "Waar worden oude documenten bewaard?", options: ["In het Groninger Archief.","In de moestuin.","In een busje.","In het park."], answer: "In het Groninger Archief.", explanation: "De tweede pagina noemt het Groninger Archief.", relatedWords: ["bewaren"] },
          { question: "Waarvan kan het afhangen of erfgoed blijft leven?", options: ["Van de aandacht die bewoners eraan geven.","Van het aantal auto's in de straat.","Van een regenbui in het park.","Van een afspraak bij de huisarts."], answer: "Van de aandacht die bewoners eraan geven.", explanation: "Op pagina 5 staat dat erfgoed kan afhangen van de aandacht van bewoners.", relatedWords: ["afhangen van","aanraden"] }
        ]
      },
      "4-Stage lopen": {
        vocab: themes[3].vocab,
        pages: [
          { text: "Mila zoekt een stage en kiest eerst een rustige aanpak, omdat ze niet zomaar overal wil solliciteren. De plek moet aansluiten op haar opleiding en op haar taalniveau, anders leert ze te weinig of wordt het juist te zwaar. Samen met haar docent maakt ze een lijst van bedrijven waar ze echt iets kan oefenen. De oefening helpt haar bij een echt gesprek.", imageUrl: images.team, targets: ["aanpak","aansluiten op"] },
          { text: "Tijdens een informatiemiddag merkt Mila dat bedrijven jong talent willen aantrekken, maar ook graag zien dat stagiairs nieuwsgierig zijn. Ze praat met twee medewerkers en bouwt voorzichtig een netwerk op. Na afloop bewaart ze hun namen, zodat ze later een nette mail kan sturen. Het plan wordt daardoor concreter.", imageUrl: images.work, targets: ["aantrekken","netwerk"] },
          { text: "In de zorg is extra hulp soms nijpend, vooral op drukke momenten in de ochtend. Dat is voor Mila een goed argument om juist daar stage te lopen, ook al vindt ze het spannend. Ze begint met kleine taken en ziet al snel dat haar aanwezigheid echt verschil kan maken. De volgende stap voelt daardoor kleiner.", imageUrl: images.study, targets: ["nijpend","argument"] },
          { text: "Op haar stage leert Mila theorie omzetten in praktisch werk. Wanneer haar mentor vraagt waarom ze een bepaalde keuze maakt, moet ze haar antwoord rustig onderbouwen met voorbeelden uit de les. Dat kost tijd, maar daardoor begrijpt ze beter wat professioneel werken betekent. Ze bewaart het voorbeeld voor later.", imageUrl: images.work, targets: ["omzetten","onderbouwen"] },
          { text: "Na een paar weken weet Mila beter hoe ze fouten kan beperken zonder bang te worden voor elke nieuwe taak. Ze ontdekt ook welke bedrijfstak bij haar past: de zorg spreekt haar aan, maar techniek vindt ze verrassend interessant. Daarom besluit ze beide richtingen verder te onderzoeken. Mila weet nu beter wat ze kan doen.", imageUrl: images.team, targets: ["beperken","bedrijfstak"] }
        ],
        glossary: [
          ["aanpak","manier van werken"],["aansluiten op","goed passen bij"],["aantrekken","interesseren of binnenhalen"],["netwerk","groep contacten"],["nijpend","dringend of ernstig"],["argument","reden"],["omzetten","veranderen in iets praktisch"],["onderbouwen","met feiten uitleggen"],["beperken","kleiner maken"],["bedrijfstak","sector"]
        ].map(([word, definition]) => ({word, definition})),
        quiz: [
          { question: "Waarom kiest Mila eerst een rustige aanpak?", options: ["Omdat de stageplek moet aansluiten op haar opleiding en taalniveau.","Omdat zij nergens wil solliciteren.","Omdat zij alleen een wandeling wil maken.","Omdat haar docent geen lijst wil maken."], answer: "Omdat de stageplek moet aansluiten op haar opleiding en taalniveau.", explanation: "Op pagina 1 staat dat de plek moet aansluiten op haar opleiding en taalniveau.", relatedWords: ["aanpak","aansluiten op"] },
          { question: "Wat bouwt Mila voorzichtig op tijdens de informatiemiddag?", options: ["Een netwerk.","Een oud gebouw.","Een natuurbrug.","Een archief."], answer: "Een netwerk.", explanation: "Op pagina 2 praat Mila met twee medewerkers en bouwt zij voorzichtig een netwerk op.", relatedWords: ["netwerk","aantrekken"] }
        ]
      }
    };

    function inferScene(key, index, targets) {
      const scenes = {
        "1-Gelukkig zijn": ["Eerste dag in Groningen", "Samen in de moestuin", "Vrijwilligers in het buurthuis", "Taalcoach in de bibliotheek", "Vrienden rond de tafel"],
        "1-Een streetarts": ["Dokter op straat", "Spreekuur in een medische bus", "Contact met maatschappelijk werk", "Opvangcentrum en toekomstplan", "Snelle zorg op straat"],
        "2-Druk in de natuur": ["Nieuwe groene paden", "Afval opruimen in het park", "Water na zware regen", "Kwetsbare planten beschermen", "Duurzaam leven thuis"]
      };
      return scenes[key]?.[index] || `Mila oefent: ${(targets || []).join(" en ")}`;
    }

    function fallbackPhoto(subsection, scene, targets) {
      const text = String(`${subsection} ${scene} ${(targets || []).join(" ")}`).trim().toLowerCase();
      if (text.includes("streetarts") || text.includes("dokter") || text.includes("medische") || text.includes("zorg")) return images.team;
      if (text.includes("uwv") || text.includes("uitkering") || text.includes("vacature") || text.includes("document") || text.includes("arbeidsmarkt")) return images.office;
      if (text.includes("buurt") || text.includes("buren") || text.includes("feest") || text.includes("cultuurverschil") || text.includes("vrienden")) return images.cafe;
      if (text.includes("moestuin") || text.includes("tuin")) return images.garden;
      if (text.includes("drinkwater") || text.includes("water") || text.includes("afvoeren") || text.includes("besparen")) return images.water;
      if (text.includes("ecoduct") || text.includes("natuurbrug") || text.includes("oversteken")) return images.bridge;
      if (text.includes("natuur") || text.includes("park") || text.includes("planten") || text.includes("heide") || text.includes("duurzaam")) return images.nature;
      if (text.includes("archief") || text.includes("erfgoed") || text.includes("gebouw") || text.includes("unesco")) return images.archive;
      if (text.includes("taal") || text.includes("bibliotheek") || text.includes("leren")) return images.library;
      return images.canal;
    }

    function storyImagePrompt(chapter, subsection, scene, targets, text) {
      return [
        "Create one Gemini Storybook page image as an Instagram-style photorealistic lifestyle photo, warm natural daylight, candid documentary composition, high-end mobile photography, 16:9.",
        "The image must feel like a real moment from a new immigrant's daily life in Groningen, the Netherlands, not a generic stock photo.",
        "Use recognizable Groningen context when plausible: brick streets, canals, bicycles, student city atmosphere, community center, library, public-service office, park paths, Dutch row houses.",
        "Main character continuity is mandatory: Mila must be visibly present in the foreground of every image. Keep the same friendly 28-year-old new immigrant NT2 learner identity and natural face, but vary her outfit, hairstyle, accessories, pose, camera angle, and distance from camera so the story feels like real life across different days.",
        `Story scene: ${subsection} - ${scene}.`,
        `Narrative moment to depict: ${String(text || "").slice(0, 420)}`,
        `Learning words to visually support: ${(targets || []).join(", ")}.`,
        "The visual action must match the narrative moment exactly. If the text says she applies for benefits, show her at a Dutch public-service desk or laptop with documents. If the text says she volunteers, show her actively helping people. If the text says park, show her in a recognizable Groningen park environment.",
        "Show concrete action and environment, not abstract feelings: learning Dutch, meeting neighbors, asking for help, volunteering, visiting local services, caring for nature, cooking with neighbors, or adapting to life in Groningen.",
        "Vary composition deliberately across pages: do not use mostly right-side three-quarter portraits. Use frontal view, left-side profile, right-side profile, over-the-shoulder/back view, wide environmental view, low angle, high angle, and close action details where appropriate.",
        "Do not create landscape-only images. Do not create empty rooms. Mila must be visible and actively doing the story action.",
        "An image without Mila visible in the foreground is invalid.",
        "No text, no captions, no logos, no watermark, no distorted hands, no fantasy style, no cartoon, no infographic, no UI, no poster design, no staged corporate stock-photo look."
      ].join(" ");
    }

    function storySlug(value) {
      return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    }

    function localStorybookImage(key, index) {
      return `assets/storybook-photo-v1/${storySlug(key)}/page-${String(index + 1).padStart(2, "0")}.jpg`;
    }

    function localStoryAudio(key, index) {
      return `assets/audio/${storySlug(key)}/page-${String(index + 1).padStart(2, "0")}.mp3`;
    }

    function localWordAudio(word) {
      return `assets/word-audio/${storySlug(word)}.mp3`;
    }

    function svgImage(chapter, subsection, scene, targets, accent) {
      return "";
    }

    function applyConsistentImages(key, accent) {
      const story = stories[key];
      if (!story) return;
      story.pages.forEach((page, index) => {
        const theme = themes.find((item) => String(item.id) === key.split("-")[0]);
        const chapter = theme ? `${theme.chapter} - ${theme.title}` : "NT2 Groningen";
        const subsection = key.slice(key.indexOf("-") + 1);
        const scene = page.scene || inferScene(key, index, page.targets);
        if (story.assetPending) {
          page.previewImageUrl = "";
          page.imageUrl = fallbackPhoto(subsection, scene, page.targets);
          page.imagePack = false;
          page.imagePrompt = storyImagePrompt(chapter, subsection, scene, page.targets, page.text);
          page.imageGenerated = false;
          page.audioUrl = "";
          page.audioGenerated = false;
          page.audioPack = false;
          return;
        }
        page.previewImageUrl = fallbackPhoto(subsection, scene, page.targets);
        page.imageUrl = localStorybookImage(key, index);
        page.imagePack = true;
        page.imagePrompt = storyImagePrompt(chapter, subsection, scene, page.targets, page.text);
        page.imageGenerated = false;
        page.audioUrl = localStoryAudio(key, index);
        page.audioGenerated = true;
        page.audioPack = true;
      });
    }

    function makeStory(chapter, subsection, vocab, pages, glossaryPairs, quiz, accent) {
      return {
        vocab,
        pages: pages.map((page, index) => ({
          text: page.text,
          targets: page.targets,
          imageUrl: svgImage(chapter, subsection, page.scene || `Scene ${index + 1}`, page.targets, accent),
          imagePrompt: storyImagePrompt(chapter, subsection, page.scene || `Scene ${index + 1}`, page.targets, page.text),
          imageGenerated: false,
          audioUrl: "",
          audioGenerated: false
        })),
        glossary: glossaryPairs.map(([word, definition]) => ({ word, definition })),
        quiz
      };
    }

    stories["1-Het UWV"] = makeStory(
      "Thema 1 - De maatschappij",
      "Het UWV",
      ["blijken","aarzelen","aanvragen","uitgebreid","stimuleren","aanzienlijk","arbeidsmarkt","bevorderen","toepassen","uitkering"],
      [
        { scene: "Afspraak bij het UWV", targets: ["blijken","aarzelen"], text: "Mila verliest haar baan in Groningen en maakt daarom een afspraak bij het UWV. Tijdens het gesprek kan blijken dat ze snel hulp nodig heeft, hoewel veel mensen eerst aarzelen om alles te vertellen. De medewerker stelt rustige vragen, waardoor Mila stap voor stap begrijpt welke informatie belangrijk is. Het gesprek voelt nu minder spannend." },
        { scene: "Online documenten uploaden", targets: ["aanvragen","uitgebreid"], text: "Mila kan online een uitkering aanvragen, maar het formulier is uitgebreid en vraagt om veel gegevens. Ze verzamelt oude papieren van haar werk en haar paspoort, voordat ze de aanvraag verstuurt. Omdat de medewerker naast haar zit, durft ze vragen te stellen wanneer een woord onduidelijk is. Het gesprek voelt nu minder spannend." },
        { scene: "Cursus en begeleiding", targets: ["stimuleren","aanzienlijk"], text: "De adviseur wil Mila stimuleren om een computercursus te volgen, omdat digitale vaardigheden bij veel banen nodig zijn. Kennis van de computer helpt aanzienlijk bij werk zoeken, vooral wanneer vacatures alleen online staan. Mila oefent elke dinsdag en merkt na een paar lessen dat haar vertrouwen terugkomt. De uitleg blijft daardoor goed hangen." },
        { scene: "Vacatures zoeken", targets: ["arbeidsmarkt","bevorderen"], text: "Samen bekijken ze de arbeidsmarkt in Groningen, zodat Mila ziet waar mensen worden gezocht. De adviseur wil haar kans op werk bevorderen door haar brief korter en duidelijker te maken. Daarna oefent Mila een gesprek, terwijl de adviseur opschrijft welke antwoorden al goed klinken. Zo wordt contact maken iets gewoner." },
        { scene: "Nieuwe start", targets: ["toepassen","uitkering"], text: "Mila leert de tips toepassen tijdens het zoeken naar werk, bijvoorbeeld door elke dag één bedrijf te mailen. Als zij werk vindt, stopt haar uitkering, maar tot die tijd helpt de steun haar om rustig verder te zoeken. Daardoor voelt de nieuwe start spannend, maar niet meer onmogelijk. Ze durft de volgende vraag te stellen." }
      ],
      [["blijken","duidelijk worden"],["aarzelen","twijfelen"],["aanvragen","officieel vragen"],["uitgebreid","groot en compleet"],["stimuleren","aanmoedigen"],["aanzienlijk","heel veel"],["arbeidsmarkt","banen en werkzoekenden"],["bevorderen","vooruithelpen"],["toepassen","in praktijk gebruiken"],["uitkering","tijdelijke geldelijke steun"]],
      [
        { question: "Waarom gaat Mila naar het UWV?", options: ["Omdat zij haar baan verliest.","Omdat zij een park wil bezoeken.","Omdat zij een museum opent.","Omdat zij water wil besparen."], answer: "Omdat zij haar baan verliest.", explanation: "De eerste pagina zegt dat Mila na baanverlies naar het UWV gaat.", relatedWords: ["blijken","aarzelen"] },
        { question: "Wat kan Mila online aanvragen?", options: ["Een tijdelijke uitkering.","Een natuurbrug.","Een historisch gebouw.","Een moestuinfeest."], answer: "Een tijdelijke uitkering.", explanation: "De tweede pagina noemt het online aanvragen van een uitkering.", relatedWords: ["aanvragen","uitkering"] },
        { question: "Wat helpt Mila op de arbeidsmarkt?", options: ["Een korte cursus volgen.","Alle afspraken missen.","Geen documenten uploaden.","Niet solliciteren."], answer: "Een korte cursus volgen.", explanation: "De adviseur stimuleert haar om nieuwe vaardigheden te leren.", relatedWords: ["stimuleren","arbeidsmarkt"] }
      ],
      "#9b6aa8"
    );

    stories["1-Buurtbewoners"] = makeStory(
      "Thema 1 - De maatschappij",
      "Buurtbewoners",
      ["blijken","aarzelen","uitgebreid","aanvragen","cultuurverschil","toepassen","bevorderen","stimuleren","signaleren","arbeidsmarkt"],
      [
        { scene: "Eerste buurtbijeenkomst", targets: ["blijken","aarzelen"], text: "In Mila's straat wonen mensen met verschillende achtergronden, en juist daarom wil zij de buurt beter leren kennen. Tijdens een buurtavond kan blijken dat veel buren graag meer contact willen, hoewel sommige bewoners nog aarzelen om iets te zeggen. Mila begint met een korte groet, waarna het gesprek vanzelf iets makkelijker wordt. De uitleg blijft daardoor goed hangen." },
        { scene: "Buurtfeest plannen", targets: ["uitgebreid","aanvragen"], text: "De buurt maakt een uitgebreid plan voor een klein feest op het plein. Mila wil tafels aanvragen bij de wijk, maar voordat ze het formulier invult, leest ze samen met een buurman de regels. Terwijl anderen eten en muziek regelen, hangt zij kaartjes op bij de ingang van de flat. Zo wordt contact maken iets gewoner." },
        { scene: "Samen koken", targets: ["cultuurverschil","toepassen"], text: "Bij het koken merkt Mila een cultuurverschil, omdat sommige buren vroeg eten terwijl anderen pas later aan tafel gaan. Niemand maakt daar een probleem van; ze praten er rustig over en lachen om de verschillende gewoontes. Mila leert vragen stellen zonder te oordelen, zodat zij nieuwe afspraken meteen kan toepassen. Zo wordt contact maken iets gewoner." },
        { scene: "Buren helpen elkaar", targets: ["bevorderen","stimuleren"], text: "Actieve buren willen contact bevorderen, omdat een straat prettiger voelt wanneer mensen elkaar herkennen. Ze stimuleren bewoners om kleine dingen voor elkaar te doen, zoals boodschappen meenemen of een lamp vervangen. Mila brengt soep naar een zieke buurvrouw. Daardoor praten ze de week daarna gemakkelijker met elkaar." },
        { scene: "Veilige straat", targets: ["signaleren","arbeidsmarkt"], text: "Wanneer buren elkaar kennen, kunnen ze problemen sneller signaleren, bijvoorbeeld een kapotte lamp of iemand die lang niet buiten komt. Tijdens een gesprek hoort Mila ook dat een buurman mensen kent op de arbeidsmarkt. Hij brengt haar in contact met een kennis, waardoor de straat niet alleen veiliger maar ook nuttiger voelt. Ze durft de volgende vraag te stellen." }
      ],
      [["blijken","duidelijk worden"],["aarzelen","twijfelen"],["uitgebreid","met veel onderdelen"],["aanvragen","officieel vragen"],["cultuurverschil","verschil in gewoontes"],["toepassen","praktisch gebruiken"],["bevorderen","vooruithelpen"],["stimuleren","aanmoedigen"],["signaleren","opmerken"],["arbeidsmarkt","banen en werkzoekenden"]],
      [
        { question: "Wat willen veel buren volgens de bijeenkomst?", options: ["Meer contact.","Minder veiligheid.","Geen feest.","Geen hulp."], answer: "Meer contact.", explanation: "Uit de bijeenkomst blijkt dat veel buren meer contact willen.", relatedWords: ["blijken","aarzelen"] },
        { question: "Wat helpt bij cultuurverschillen?", options: ["Luisteren en gewoontes toepassen.","Iedereen vermijden.","Nooit samen eten.","Alleen klagen."], answer: "Luisteren en gewoontes toepassen.", explanation: "Mila leert door vragen en luisteren nieuwe gewoontes toe te passen.", relatedWords: ["cultuurverschil","toepassen"] },
        { question: "Wat kunnen buren samen sneller doen?", options: ["Problemen signaleren.","Alle banen stoppen.","Een uitkering weigeren.","Een park sluiten."], answer: "Problemen signaleren.", explanation: "De laatste pagina zegt dat buurtbewoners problemen sneller signaleren.", relatedWords: ["signaleren"] }
      ],
      "#9b6aa8"
    );

    stories["2-Nationale parken"] = makeStory(
      "Thema 2 - Natuur en klimaat",
      "Nationale parken",
      ["beheerder","benadrukken","beschermen","besparen","duurzaam","klimaatverandering","kwetsbaar","aanleggen","aanpassing","aantrekkelijk"],
      [
        { scene: "Met de parkbeheerder", targets: ["beheerder","benadrukken"], text: "Mila bezoekt een natuurgebied buiten Groningen, waar de beheerder met de groep over een smal pad loopt. Hij wil benadrukken dat stilte belangrijk is, omdat vogels in het broedseizoen snel schrikken. Terwijl fietsers in de verte voorbijgaan, merkt Mila hoe rustig het gebied wordt zodra iedereen zachter praat. Buiten ziet ze meteen waarom dat nodig is." },
        { scene: "Dieren beschermen", targets: ["beschermen","besparen"], text: "Wandelaars blijven op de route om dieren te beschermen, maar de gids laat ook zien hoe mensen thuis water kunnen besparen. Mila vult haar fles opnieuw in plaats van een nieuwe te kopen, omdat kleine gewoontes samen verschil maken. Zo hoort natuur niet alleen bij het park, maar ook bij haar eigen keuken. De wandeling voelt nu rustiger en concreter." },
        { scene: "Duurzame keuzes", targets: ["duurzaam","klimaatverandering"], text: "Een duurzaam plan helpt het park om beter om te gaan met droge zomers. Door klimaatverandering blijft regen soms lang uit, waardoor gras geel wordt en jonge bomen extra zorg nodig hebben. Mila schrijft op dat een mooi landschap niet vanzelf blijft bestaan. Zo blijft de natuur geen los onderwerp." },
        { scene: "Kwetsbare heide", targets: ["kwetsbaar","aanleggen"], text: "Jonge heide is kwetsbaar, vooral wanneer bezoekers buiten het pad lopen om een foto te maken. Daarom willen vrijwilligers duidelijke paden aanleggen met houten paaltjes en lage bordjes. Mila helpt dragen, terwijl de beheerder uitlegt dat bescherming vaak begint met iets heel praktisch. De regel krijgt daardoor een duidelijk voorbeeld." },
        { scene: "Nieuwe route", targets: ["aanpassing","aantrekkelijk"], text: "Een kleine aanpassing van de route helpt vogels, omdat bezoekers nu om een rustig stuk heen lopen. Het park blijft aantrekkelijk voor gezinnen en wandelaars, ook al is de weg iets langer. Mila begrijpt de regel beter wanneer ze ziet hoeveel ruimte de dieren daardoor terugkrijgen. Het landschap maakt de woorden zichtbaar." }
      ],
      [["beheerder","persoon die voor een gebied zorgt"],["benadrukken","extra duidelijk zeggen"],["beschermen","veilig houden"],["besparen","minder gebruiken"],["duurzaam","goed voor de toekomst"],["klimaatverandering","verandering van het klimaat"],["kwetsbaar","gevoelig voor schade"],["aanleggen","maken of bouwen"],["aanpassing","verandering"],["aantrekkelijk","mooi of uitnodigend"]],
      [
        { question: "Wie vertelt Mila over het natuurgebied?", options: ["De beheerder.","Een kok.","Een arts.","Een buurjongen."], answer: "De beheerder.", explanation: "De beheerder vertelt over veranderingen in het gebied.", relatedWords: ["beheerder"] },
        { question: "Waarom blijven wandelaars op de route?", options: ["Om dieren te beschermen.","Om werk te vinden.","Om documenten te bewaren.","Om een feest te organiseren."], answer: "Om dieren te beschermen.", explanation: "De tekst zegt dat wandelaars op de route blijven om dieren te beschermen.", relatedWords: ["beschermen"] },
        { question: "Wat maakt de jonge heide kwetsbaar?", options: ["Ze kan snel beschadigd worden.","Ze is van steen.","Ze groeit in een kantoor.","Ze heeft geen zon nodig."], answer: "Ze kan snel beschadigd worden.", explanation: "Kwetsbaar betekent gevoelig voor schade.", relatedWords: ["kwetsbaar"] }
      ],
      "#86b89f"
    );

    stories["2-Drinkwatertekort"] = makeStory(
      "Thema 2 - Natuur en klimaat",
      "Drinkwatertekort",
      ["afvalstof","afvoeren","beheerder","benadrukken","beschermen","besparen","duurzaam","klimaatverandering","kwetsbaar","aanpassing"],
      [
        { scene: "Waterles in Groningen", targets: ["afvalstof","afvoeren"], text: "Mila volgt een les over drinkwater, omdat zij wil begrijpen waarom kraanwater in Nederland zo goed gecontroleerd wordt. De docent laat zien dat een afvalstof niet in de rivier mag komen en dat we vuil water veilig moeten afvoeren. Met twee flessen maakt hij het verschil zichtbaar, waardoor de uitleg meteen duidelijker wordt. De wandeling voelt nu rustiger en concreter." },
        { scene: "Waterbedrijf bezoeken", targets: ["beheerder","benadrukken"], text: "Bij het waterbedrijf geeft de beheerder uitleg over filters, pompen en leidingen. Hij wil benadrukken dat schoon water kostbaar is, ook al komt het thuis gewoon uit de kraan. Mila kijkt door een raam naar de grote installatie en stelt een korte vraag, omdat ze de route van het water beter wil volgen. Zo blijft de natuur geen los onderwerp." },
        { scene: "Bronnen beschermen", targets: ["beschermen","besparen"], text: "De groep leert dat we bronnen moeten beschermen tegen vuil, zodat drinkwater veilig blijft voor iedereen. Thuis kan Mila water besparen door korter te douchen en de kraan dicht te draaien tijdens het tandenpoetsen. Ze vindt het prettig dat de tips klein zijn, want daardoor kan ze vandaag al beginnen. De regel krijgt daardoor een duidelijk voorbeeld." },
        { scene: "Duurzaam huishouden", targets: ["duurzaam","klimaatverandering"], text: "Een duurzaam huishouden gebruikt water bewust, vooral nu droge weken door klimaatverandering vaker voorkomen. Mila zet een bak onder de regenpijp, zodat ze later de planten water kan geven zonder de kraan te openen. Terwijl ze de bak neerzet, denkt ze aan de les en begrijpt ze waarom zo'n simpele gewoonte zin heeft. Mila kijkt anders naar het pad voor haar." },
        { scene: "Gedrag aanpassen", targets: ["kwetsbaar","aanpassing"], text: "Bij lange droogte is het water in de stad kwetsbaar, omdat veel mensen tegelijk meer gebruiken. Daarom is een aanpassing van gedrag nodig, niet alleen bij de gemeente maar ook thuis. Mila deelt tips met buren, waarna iedereen een klein idee kiest dat bij zijn eigen huishouden past. Buiten ziet ze meteen waarom dat nodig is." }
      ],
      [["afvalstof","schadelijk restmateriaal"],["afvoeren","veilig wegbrengen"],["beheerder","verantwoordelijke persoon"],["benadrukken","extra duidelijk zeggen"],["beschermen","veilig houden"],["besparen","minder gebruiken"],["duurzaam","goed voor de toekomst"],["klimaatverandering","verandering van het klimaat"],["kwetsbaar","gevoelig voor schade"],["aanpassing","verandering in gedrag of situatie"]],
      [
        { question: "Wat mag niet in de rivier komen?", options: ["Een schadelijke afvalstof.","Een taalcursus.","Een sollicitatiebrief.","Een stadswandeling."], answer: "Een schadelijke afvalstof.", explanation: "De eerste pagina noemt schadelijke afvalstoffen.", relatedWords: ["afvalstof"] },
        { question: "Hoe kan Mila thuis water besparen?", options: ["Korter douchen.","Langer douchen.","De kraan open laten.","Meer vervuilen."], answer: "Korter douchen.", explanation: "Korter douchen is een manier om water te besparen.", relatedWords: ["besparen"] },
        { question: "Waarom is aanpassing nodig?", options: ["Omdat de watervoorziening kwetsbaar is.","Omdat archieven groeien.","Omdat stages stoppen.","Omdat buren niet koken."], answer: "Omdat de watervoorziening kwetsbaar is.", explanation: "De laatste pagina zegt dat droogte de voorziening kwetsbaar maakt.", relatedWords: ["kwetsbaar","aanpassing"] }
      ],
      "#0f766e"
    );

    stories["2-Een ecoduct"] = makeStory(
      "Thema 2 - Natuur en klimaat",
      "Een ecoduct",
      ["aanleggen","aanpassing","aantrekkelijk","afvalstof","afvoeren","beheerder","benadrukken","beschermen","kwetsbaar","duurzaam"],
      [
        { scene: "Natuurbrug ontwerpen", targets: ["aanleggen","aanpassing"], text: "Mila bekijkt een plan voor een ecoduct, omdat dieren veilig over de drukke weg moeten kunnen. De provincie wil de brug aanleggen, maar de weg vraagt eerst om een duidelijke aanpassing. Wanneer Mila de tekening ziet, begrijpt ze hoe gras, struiken en hekken samen een veilige route vormen. De regel krijgt daardoor een duidelijk voorbeeld." },
        { scene: "Groene oversteek", targets: ["aantrekkelijk","afvalstof"], text: "Een groene brug is aantrekkelijk voor kleine dieren, omdat hij meer op natuur lijkt dan op beton. Minder auto's in het gebied zorgen ook voor minder afvalstof in de lucht en in de grond. Mila ziet struiken, gras en lage bomen, waardoor de oversteek bijna op een gewoon pad lijkt. Zo blijft de natuur geen los onderwerp." },
        { scene: "Water op de helling", targets: ["afvoeren","beheerder"], text: "Op de helling moet het ecoduct regenwater goed afvoeren, anders blijft de grond te nat voor dierenpoten en plantenwortels. De beheerder wijst naar een kleine goot naast het pad, terwijl Mila ook een camera ziet die dieren telt. Zo leert ze dat een ecoduct niet alleen gebouwd, maar ook goed gevolgd moet worden. Mila kijkt anders naar het pad voor haar." },
        { scene: "Biologen leggen uit", targets: ["benadrukken","beschermen"], text: "Biologen benadrukken dat natuurgebieden verbonden moeten zijn, omdat dieren anders te weinig ruimte vinden. Ecoducten helpen dieren beschermen zonder dat mensen elke dag iets merken van die hulp. Mila ziet sporen in het zand en maakt een foto, zodat ze later kan uitleggen waarom de brug nodig is. Buiten ziet ze meteen waarom dat nodig is." },
        { scene: "Veilig netwerk", targets: ["kwetsbaar","duurzaam"], text: "Kleine dieren zijn kwetsbaar bij drukke wegen, vooral wanneer ze voedsel of een veilige plek zoeken. Een duurzaam netwerk van bruggen helpt hen om langer in het gebied te blijven. Terwijl auto's onder de brug rijden, ziet Mila boven haar juist een rustige groene strook. Het landschap maakt de woorden zichtbaar." }
      ],
      [["aanleggen","bouwen of maken"],["aanpassing","verandering"],["aantrekkelijk","uitnodigend"],["afvalstof","schadelijke stof"],["afvoeren","weg laten lopen"],["beheerder","persoon die toezicht houdt"],["benadrukken","extra duidelijk zeggen"],["beschermen","veilig houden"],["kwetsbaar","gevoelig voor gevaar"],["duurzaam","goed voor de lange termijn"]],
      [
        { question: "Waarom wordt een ecoduct aangelegd?", options: ["Om dieren veilig te laten oversteken.","Om documenten te bewaren.","Om water te verspillen.","Om werkloosheid te vergroten."], answer: "Om dieren veilig te laten oversteken.", explanation: "De eerste pagina legt het doel van het ecoduct uit.", relatedWords: ["aanleggen"] },
        { question: "Wie controleert de natuurbrug?", options: ["De beheerder.","Een kok.","Een stagebegeleider.","Een gids in het archief."], answer: "De beheerder.", explanation: "De beheerder controleert planten en camera's.", relatedWords: ["beheerder"] },
        { question: "Waarom zijn natuurbruggen duurzaam?", options: ["Ze helpen dieren op lange termijn.","Ze sluiten parken.","Ze vergroten afvalstoffen.","Ze vervangen drinkwater."], answer: "Ze helpen dieren op lange termijn.", explanation: "Een duurzaam netwerk maakt Groningen veiliger voor dieren.", relatedWords: ["duurzaam","kwetsbaar"] }
      ],
      "#86b89f"
    );

    stories["3-Gerrit Rietveld"] = makeStory(
      "Thema 3 - Cultuur",
      "Gerrit Rietveld",
      ["behouden","bewaren","eigentijds","evalueren","gebouw","aanraden","afhangen van","bereiken","beschaving","beschermen"],
      [
        { scene: "Mila bezoekt een designles", targets: ["behouden","bewaren"], text: "In de designles ziet Mila een stoel van Gerrit Rietveld die er eenvoudig uitziet, maar toch veel aandacht vraagt. De docent vertelt dat musea zulke ontwerpen willen behouden en de oude tekeningen zorgvuldig moeten bewaren, omdat studenten anders niet meer kunnen zien hoe het idee is ontstaan. Mila maakt aantekeningen en merkt dat een simpele vorm soms juist veel uitleg nodig heeft. De woorden horen nu bij een echte situatie." },
        { scene: "Moderne vormen begrijpen", targets: ["eigentijds","evalueren"], text: "Rietvelds stijl was in zijn eigen tijd verrassend eigentijds, vooral door de rechte lijnen en de sterke kleuren rood, blauw en geel. Terwijl Mila naar de stoel kijkt, leert zij niet alleen zeggen of zij hem mooi vindt, maar ook hoe zij vorm, kleur en functie kan evalueren. Eerst lacht ze om de harde stoel. Daarna begrijpt ze waarom het ontwerp zo beroemd werd." },
        { scene: "Architectuur bekijken", targets: ["gebouw","aanraden"], text: "Op het scherm toont de docent het Rietveld Schröderhuis, een beroemd gebouw waar kamers open en flexibel zijn gemaakt. Hij wil de klas een bezoek aanraden, omdat je in foto's niet goed voelt hoe mensen daar vroeger konden wonen. Mila schrijft de naam op en stelt daarna een vraag over de schuifwanden, want dat detail maakt haar nieuwsgierig. Mila kijkt nu anders naar de stad." },
        { scene: "Design voor iedereen", targets: ["afhangen van","bereiken"], text: "Of een ontwerp je direct aanspreekt, kan afhangen van je ervaring, je smaak en de verhalen die je erbij hoort. Rietveld wilde met zijn meubels niet alleen rijke verzamelaars bereiken, maar ook gewone mensen laten nadenken over wonen. Daarom vergelijkt Mila zijn stoel met meubels in haar eigen kamer, waarna ze ineens ziet dat simpel niet hetzelfde is als saai. Het gesprek krijgt daardoor meer betekenis." },
        { scene: "Cultureel erfgoed delen", targets: ["beschaving","beschermen"], text: "Aan het eind van de les bespreekt de groep waarom Rietveld bij de Nederlandse beschaving hoort. Zijn werk laat zien hoe mensen in een bepaalde tijd dachten over licht, ruimte en dagelijks leven. Daarom moeten musea het beschermen zonder het achter glas te verstoppen. Mila maakt een korte presentatie waarin zij uitlegt wat zij eerst vreemd vond en wat zij nu waardeert." }
      ],
      [["behouden","in stand houden"],["bewaren","veilig opslaan"],["eigentijds","modern"],["evalueren","beoordelen"],["gebouw","bouwwerk"],["aanraden","adviseren"],["afhangen van","bepaald worden door"],["bereiken","contact maken met"],["beschaving","cultuur en ontwikkeling"],["beschermen","veilig houden"]],
      [
        { question: "Wat willen musea met Rietvelds ontwerpen doen?", options: ["Behouden en bewaren.","Weggooien.","Verbergen.","Verbieden."], answer: "Behouden en bewaren.", explanation: "De eerste pagina noemt behouden en bewaren.", relatedWords: ["behouden","bewaren"] },
        { question: "Waarom is het Rietveld Schröderhuis belangrijk?", options: ["Het is een beroemd gebouw.","Het is een park.","Het is een kantoor van het UWV.","Het is een ecoduct."], answer: "Het is een beroemd gebouw.", explanation: "De tekst noemt het huis een beroemd gebouw.", relatedWords: ["gebouw"] },
        { question: "Wat wilde Rietveld bereiken?", options: ["Een breed publiek bereiken.","Alleen rijke mensen helpen.","Minder cultuur bewaren.","Geen design maken."], answer: "Een breed publiek bereiken.", explanation: "Rietveld wilde design toegankelijk maken.", relatedWords: ["bereiken"] }
      ],
      "#d8a36d"
    );

    stories["3-Eetgewoontes"] = makeStory(
      "Thema 3 - Cultuur",
      "Eetgewoontes",
      ["behouden","eigentijds","gebouw","aanraden","afhangen van","bereiken","cultuurverschil","toepassen","bewaren","evalueren"],
      [
        { scene: "Avondeten om zes uur", targets: ["behouden","eigentijds"], text: "Wanneer Mila bij haar buurvrouw gaat eten, merkt zij dat veel Nederlanders al rond zes uur aan tafel zitten. Sommige gezinnen willen die gewoonte behouden, terwijl jonge mensen het avondeten soms op een eigentijds moment plannen omdat werk, sport en studie door elkaar lopen. Mila vindt het vroeg, maar ze geniet van de rust aan tafel. De woorden horen nu bij een echte situatie." },
        { scene: "Wijkrestaurant in Groningen", targets: ["gebouw","aanraden"], text: "Op zaterdag bezoekt Mila een wijkrestaurant dat in een oud gebouw zit, met hoge ramen en houten tafels. Een buurvrouw wil haar Groningse mosterdsoep aanraden, omdat die goed past bij koud weer en lange gesprekken. Mila bestelt een kleine kom en vraagt ondertussen waarom dit gerecht voor veel mensen zo vertrouwd voelt. De woorden horen nu bij een echte situatie." },
        { scene: "Lokale ingrediënten", targets: ["afhangen van","bereiken"], text: "In de keuken hoort Mila dat de smaak van de soep kan afhangen van verse prei, goede mosterd en genoeg tijd. Omdat iedereen samen snijdt, roert en proeft, kun je mensen bereiken die normaal weinig praten tijdens een taalles. Mila merkt dat eten een rustige manier is om vragen te stellen. De woorden horen nu bij een echte situatie." },
        { scene: "Samen koken", targets: ["cultuurverschil","toepassen"], text: "Tijdens het koken ontstaat er even een cultuurverschil, omdat de ene cursist heel pittig eet en de andere juist zachte smaken gewend is. De vrijwilliger laat iedereen oefenen met toepassen van nieuwe woorden: scherp, mild, zuur en romig. Daardoor wordt de keuken vanzelf een kleine taalklas, maar wel een waar iedereen mag lachen. De woorden horen nu bij een echte situatie." },
        { scene: "Recepten delen", targets: ["bewaren","evalueren"], text: "Na het eten wil Mila het recept bewaren, zodat zij het thuis nog eens kan maken voor een vriendin. Samen met de groep gaat zij ook evalueren welke woorden nuttig waren en welke zinnen nog moeilijk blijven. Ze schrijft niet alleen ingrediënten op, maar ook kleine opmerkingen over smaak, gewoonte en gezelligheid. De woorden horen nu bij een echte situatie." }
      ],
      [["behouden","in stand houden"],["eigentijds","modern"],["gebouw","pand"],["aanraden","adviseren"],["afhangen van","bepaald worden door"],["bereiken","contact maken met"],["cultuurverschil","verschil in gewoontes"],["toepassen","praktisch gebruiken"],["bewaren","opslaan"],["evalueren","beoordelen"]],
      [
        { question: "Welke Nederlandse gewoonte merkt Mila?", options: ["Vroeg avondeten.","Nooit ontbijten.","Altijd buiten slapen.","Geen soep eten."], answer: "Vroeg avondeten.", explanation: "De eerste pagina noemt vroeg avondeten.", relatedWords: ["behouden"] },
        { question: "Wat raadt de buurvrouw aan?", options: ["Groningse mosterdsoep proberen.","Een ecoduct bouwen.","Een uitkering aanvragen.","Een park sluiten."], answer: "Groningse mosterdsoep proberen.", explanation: "De tweede pagina noemt mosterdsoep.", relatedWords: ["aanraden"] },
        { question: "Wat helpt Mila bij taal en cultuur?", options: ["Samen koken en woorden toepassen.","Niet praten.","Alle recepten vergeten.","Alleen eten."], answer: "Samen koken en woorden toepassen.", explanation: "Tijdens het koken past Mila nieuwe woorden toe.", relatedWords: ["toepassen","cultuurverschil"] }
      ],
      "#d8a36d"
    );

    stories["3-Mila eet bij buren"] = makeStory(
      "Thema 3 - Cultuur",
      "Mila eet bij buren",
      ["behouden","eigentijds","aanraden","afhangen van","cultuurverschil","toepassen","bewaren","evalueren","waarde","wederzijds"],
      [
        { scene: "Uitnodiging voor het eten", targets: ["behouden","eigentijds"], text: "Mila wordt door haar buren uitgenodigd om te komen eten, en ze merkt meteen dat sommige gewoontes blijven terugkomen. De familie wil oude recepten behouden, maar zet er ook een eigentijds gerecht naast met groente uit de buurt. Mila vindt die combinatie prettig, omdat traditie en vernieuwing zo gewoon samen op tafel staan. Het voorbeeld blijft daardoor bij haar." },
        { scene: "Soep proeven", targets: ["aanraden","afhangen van"], text: "De buurvrouw wil haar mosterdsoep aanraden, maar zegt er eerlijk bij dat de smaak kan afhangen van de soort mosterd en de tijd die de soep krijgt. Mila proeft eerst voorzichtig en neemt daarna nog een lepel. Terwijl ze vraagt naar het recept, hoort ze hoe eten vaak verbonden is met familieverhalen. Zo wordt cultuur iets uit het dagelijks leven." },
        { scene: "Verschillende smaken", targets: ["cultuurverschil","toepassen"], text: "Bij het hoofdgerecht ontstaat een klein cultuurverschil, omdat Mila gewend is om meer kruiden te gebruiken dan haar buren. In plaats van daar moeilijk over te doen, laat de buurman haar nieuwe woorden toepassen: mild, pittig, zout en romig. Daardoor wordt het gesprek niet ongemakkelijk, maar juist leerzaam. De oude plek voelt ineens minder ver weg." },
        { scene: "Recept in het schrift", targets: ["bewaren","evalueren"], text: "Na het eten wil Mila het recept bewaren in haar taalschrift, zodat ze het later zelf kan proberen. Ze schrijft niet alleen de ingredienten op, maar ook zinnen die handig waren tijdens het gesprek. De volgende les wil ze evalueren welke woorden ze echt heeft gebruikt en welke nog oefening vragen. De woorden horen nu bij een echte situatie." },
        { scene: "Respect aan tafel", targets: ["waarde","wederzijds"], text: "Aan tafel ontdekt Mila de waarde van rustig vragen stellen, vooral wanneer mensen andere gewoontes hebben. Er ontstaat wederzijds respect, omdat iedereen iets vertelt over eten thuis, feestdagen en familie. Als Mila naar huis gaat, heeft ze niet alleen nieuwe woorden geleerd, maar ook een nieuwe manier om contact te maken. Het gesprek krijgt daardoor meer betekenis." }
      ],
      [["behouden","in stand houden"],["eigentijds","modern"],["aanraden","adviseren"],["afhangen van","bepaald worden door"],["cultuurverschil","verschil in gewoontes"],["toepassen","gebruiken in de praktijk"],["bewaren","opslaan"],["evalueren","beoordelen"],["waarde","belang"],["wederzijds","van twee kanten"]],
      [
        { question: "Wat combineren de buren op tafel?", options: ["Traditie en vernieuwing.","Alleen fastfood.","Alleen brood.","Geen eten."], answer: "Traditie en vernieuwing.", explanation: "Ze behouden oude recepten en maken ook iets eigentijds.", relatedWords: ["behouden","eigentijds"] },
        { question: "Waarvan kan de smaak afhangen?", options: ["Van de mosterd en de kooktijd.","Van de trein.","Van de winkelstraat.","Van het weer alleen."], answer: "Van de mosterd en de kooktijd.", explanation: "De buurvrouw zegt dat de soort mosterd en tijd belangrijk zijn.", relatedWords: ["afhangen van"] },
        { question: "Wat doet Mila met nieuwe woorden?", options: ["Ze past ze toe tijdens het eten.","Ze vergeet ze meteen.","Ze schrijft ze op de muur.","Ze gebruikt ze niet."], answer: "Ze past ze toe tijdens het eten.", explanation: "Ze oefent woorden voor smaak.", relatedWords: ["toepassen","cultuurverschil"] },
        { question: "Waar bewaart Mila het recept?", options: ["In haar taalschrift.","In een museum.","Op een dak.","In een bus."], answer: "In haar taalschrift.", explanation: "Ze schrijft het recept en zinnen op.", relatedWords: ["bewaren"] },
        { question: "Wat ontstaat er aan tafel?", options: ["Wederzijds respect.","Een ruzie.","Stilte.","Een toets."], answer: "Wederzijds respect.", explanation: "Iedereen vertelt iets en luistert naar elkaar.", relatedWords: ["wederzijds","waarde"] }
      ],
      "#d8a36d"
    );

    stories["3-Cultuurverschillen"] = makeStory(
      "Thema 3 - Cultuur",
      "Cultuurverschillen",
      ["behouden","eigentijds","aanraden","afhangen van","bereiken","cultuurverschil","toepassen","bewaren","evalueren","beschaving"],
      [
        { scene: "Nieuwe gewoontes leren", targets: ["behouden","eigentijds"], text: "Mila wil haar eigen tradities behouden, maar ze merkt dat samenleven in Nederland ook vraagt om nieuwe gewoontes. In de klas oefent zij eigentijds taalgebruik, bijvoorbeeld hoe je vriendelijk direct kunt zijn zonder hard over te komen. Soms zegt ze meteen wat ze bedoelt; op andere momenten luistert ze eerst, omdat de situatie daarom vraagt. Mila kijkt nu anders naar de stad." },
        { scene: "Advies van de docent", targets: ["aanraden","afhangen van"], text: "De docent wil aanraden om bij twijfel gewoon een korte vraag te stellen. Goed contact kan afhangen van openheid, maar ook van toon, timing en een beetje humor. Mila oefent daarom zinnen zoals: bedoelt u dat zo, of begrijp ik het verkeerd? Daardoor durft zij later sneller om uitleg te vragen." },
        { scene: "Taal als brug", targets: ["bereiken","cultuurverschil"], text: "Met eenvoudige, rustige taal kan Mila meer mensen bereiken, ook wanneer een gesprek in het begin wat stroef loopt. Een cultuurverschil voelt minder groot wanneer beide mensen de tijd nemen om voorbeelden te geven. Zo praat zij met haar buurman over afspraken, visite en op tijd komen, waarna ze allebei merken dat veel misverstanden kleiner worden door door te vragen. Het gesprek krijgt daardoor meer betekenis." },
        { scene: "Communicatietips oefenen", targets: ["toepassen","bewaren"], text: "In een rollenspel leert Mila verschillende tips toepassen: eerst luisteren, dan samenvatten en pas daarna reageren. Ze wil handige zinnen bewaren in haar boekje, omdat ze die later bij de huisarts, op school of in de winkel kan gebruiken. Wanneer ze met een buurvrouw oefent, klinken de zinnen al minder gemaakt. Het voorbeeld blijft daardoor bij haar." },
        { scene: "Samen leven", targets: ["evalueren","beschaving"], text: "Aan het eind van de week wil Mila haar leerpunten evalueren, zodat ze beter begrijpt wat goed ging en wat nog oefening vraagt. De docent zegt dat beschaving niet alleen gaat over musea of oude boeken, maar ook over hoe mensen dagelijks met elkaar omgaan. Mila denkt daaraan wanneer zij haar buren groet en even blijft praten bij de voordeur. Zo wordt cultuur iets uit het dagelijks leven." }
      ],
      [["behouden","in stand houden"],["eigentijds","modern"],["aanraden","adviseren"],["afhangen van","bepaald worden door"],["bereiken","contact maken"],["cultuurverschil","verschil in gewoontes"],["toepassen","gebruiken"],["bewaren","opslaan"],["evalueren","beoordelen"],["beschaving","cultuur en samenleving"]],
      [
        { question: "Wat wil Mila behouden?", options: ["Haar eigen tradities.","Alle misverstanden.","Geen contact.","Alleen stilte."], answer: "Haar eigen tradities.", explanation: "De eerste pagina noemt eigen tradities behouden.", relatedWords: ["behouden"] },
        { question: "Wat helpt bij cultuurverschillen?", options: ["Open vragen stellen.","Nooit luisteren.","Geen taal leren.","Alles vermijden."], answer: "Open vragen stellen.", explanation: "De docent raadt aan om vragen te stellen.", relatedWords: ["aanraden","cultuurverschil"] },
        { question: "Waar bewaart Mila nieuwe zinnen?", options: ["In haar notitieboek.","In een ecoduct.","In een waterleiding.","In een restaurantmenu."], answer: "In haar notitieboek.", explanation: "Ze bewaart nieuwe zinnen in haar notitieboek.", relatedWords: ["bewaren"] }
      ],
      "#d8a36d"
    );

    stories["3-Mila leert uitdrukkingen"] = makeStory(
      "Thema 3 - Cultuur",
      "Mila leert uitdrukkingen",
      ["bedoeld zijn voor","begane grond","beloftes niet nakomen","De liefde bloeit op","een blik van herkenning","een publiek geheim","er je hand niet voor omdraaien","eten wat de pot schaft","hulp nodig hebben bij","op zoek zijn naar"],
      [
        { scene: "Open dag in het cultuurhuis", targets: ["bedoeld zijn voor","begane grond"], text: "Mila gaat naar een open dag in het cultuurhuis, omdat zij meer wil begrijpen van Nederlandse gewoontes. Op het bord staat de uitdrukking bedoeld zijn voor, en de docent legt uit dat de rondleiding speciaal voor nieuwe bewoners is. Op de begane grond staat koffie klaar, en terwijl mensen binnenkomen, hoort Mila meteen verschillende accenten. De oude plek voelt ineens minder ver weg." },
        { scene: "Afspraak met de buren", targets: ["beloftes niet nakomen","De liefde bloeit op"], text: "Tijdens een gesprek over vrijwilligerswerk schrijft een buurman beloftes niet nakomen op het bord, omdat vertrouwen in een kleine groep snel kan verdwijnen. Daarna vertelt hij lachend over twee buren die elkaar bij het koken hebben leren kennen. De liefde bloeit op, zegt hij, en iedereen aan tafel begrijpt meteen wat hij bedoelt. Het gesprek krijgt daardoor meer betekenis." },
        { scene: "Herkenning in de klas", targets: ["een blik van herkenning","een publiek geheim"], text: "In de taalles hoort Mila dezelfde uitdrukking nog eens, en ze wisselt een blik van herkenning met haar vriendin. Dat sommige cursisten thuis al veel Nederlands oefenen, is eigenlijk een publiek geheim: niemand zegt het hardop, maar iedereen merkt het aan hun snelle antwoorden. Mila vindt dat grappig, want zo leert ze ook de kleine humor van de groep kennen. De woorden horen nu bij een echte situatie." },
        { scene: "Samen eten", targets: ["er je hand niet voor omdraaien","eten wat de pot schaft"], text: "Op vrijdag koken de cursisten samen, en Mila helpt zonder lang na te denken met snijden, afwassen en tafels klaarzetten. De vrijwilliger zegt dat er je hand niet voor omdraaien betekent dat je iets makkelijk doet. Daarna gaan ze eten wat de pot schaft: eenvoudige soep, brood en salade, maar door de gesprekken voelt het toch bijzonder. De oude plek voelt ineens minder ver weg." },
        { scene: "Nieuwe woorden zoeken", targets: ["hulp nodig hebben bij","op zoek zijn naar"], text: "Na het eten merkt Mila dat hulp nodig hebben bij sommige uitdrukkingen heel normaal is, omdat de betekenis niet altijd uit de losse woorden komt. Daarom schrijft de docent op zoek zijn naar op het bord en zoekt de groep samen voorbeelden uit echte gesprekken. Mila noteert de zinnen en leest ze later thuis hardop. Het gesprek krijgt daardoor meer betekenis." }
      ],
      [["bedoeld zijn voor","gemaakt of gepland voor"],["begane grond","verdieping op straatniveau"],["beloftes niet nakomen","niet doen wat je hebt beloofd"],["De liefde bloeit op","er ontstaat liefde"],["een blik van herkenning","een kijk waaruit blijkt dat je iets herkent"],["een publiek geheim","iets wat iedereen eigenlijk weet"],["er je hand niet voor omdraaien","iets makkelijk vinden om te doen"],["eten wat de pot schaft","eten wat er op tafel komt"],["hulp nodig hebben bij","niet zonder hulp kunnen"],["op zoek zijn naar","zoeken naar"]],
      [
        { question: "Voor wie is de rondleiding bedoeld?", options: ["Voor nieuwe bewoners.","Voor alleen kinderen.","Voor toeristen zonder gids.","Voor niemand."], answer: "Voor nieuwe bewoners.", explanation: "De rondleiding is bedoeld voor nieuwe bewoners.", relatedWords: ["bedoeld zijn voor"] },
        { question: "Waar staat de koffie klaar?", options: ["Op de begane grond.","Op het dak.","In de kelder.","In de trein."], answer: "Op de begane grond.", explanation: "De tekst noemt koffie op de begane grond.", relatedWords: ["begane grond"] },
        { question: "Wat is een publiek geheim in de klas?", options: ["Dat sommige cursisten thuis veel oefenen.","Dat niemand leert.","Dat de les niet doorgaat.","Dat er geen docent is."], answer: "Dat sommige cursisten thuis veel oefenen.", explanation: "Iedereen merkt het, ook al zegt niemand het hardop.", relatedWords: ["een publiek geheim"] },
        { question: "Wat eten de cursisten?", options: ["Wat de pot schaft.","Alleen taart.","Niets.","Alleen kaas."], answer: "Wat de pot schaft.", explanation: "Ze eten eenvoudige soep, brood en salade.", relatedWords: ["eten wat de pot schaft"] },
        { question: "Waarom zoekt Mila voorbeelden?", options: ["Omdat uitdrukkingen soms moeilijk zijn.","Omdat ze geen boek heeft.","Omdat ze wil stoppen.","Omdat ze alleen wil koken."], answer: "Omdat uitdrukkingen soms moeilijk zijn.", explanation: "De betekenis komt niet altijd uit de losse woorden.", relatedWords: ["hulp nodig hebben bij","op zoek zijn naar"] }
      ],
      "#d8a36d"
    );

    stories["3-Amir ziet oude daken"] = makeStory(
      "Thema 3 - Cultuur",
      "Amir ziet oude daken",
      ["een golvend dak","een plat dak","ertegenaan gaan","ervoor gaan","geneigd zijn om","haarscheurtjes beginnen te vertonen","Het is van groot belang","het niet over zijn kant laten gaan","voorop lopen in","waarde"],
      [
        { scene: "Daken vergelijken", targets: ["een golvend dak","een plat dak"], text: "Amir loopt met zijn ontwerpklas door een straat waar oude en nieuwe huizen naast elkaar staan. Bij het eerste huis ziet hij een golvend dak dat zacht lijkt te bewegen, terwijl het gebouw ernaast juist een plat dak heeft. De docent vraagt welke vorm beter bij de straat past, en Amir merkt dat hij niet meteen een antwoord heeft. De oude stad geeft hem nieuwe ideeën." },
        { scene: "Aan het werk", targets: ["ertegenaan gaan","ervoor gaan"], text: "Terug in het atelier zegt de docent dat ertegenaan gaan betekent dat je echt aan het werk moet, vooral omdat de maquette vrijdag klaar moet zijn. Amir twijfelt even, maar zijn klasgenoot zegt dat ze ervoor gaan en de taken eerlijk verdelen. Daardoor wordt de sfeer actief zonder druk te worden, en iedereen begint aan een eigen onderdeel. Amir ziet nu beter wat bij de straat past." },
        { scene: "Te snel willen", targets: ["geneigd zijn om","haarscheurtjes beginnen te vertonen"], text: "Amir schrijft geneigd zijn om in zijn schrift, want hij heeft vaak de neiging om snel te tekenen wanneer hij een idee in zijn hoofd heeft. De docent noemt haarscheurtjes beginnen te vertonen en wijst op een oud model dat kwetsbaar wordt als iemand te hard drukt. Amir legt zijn potlood neer, ademt even uit en kijkt opnieuw naar de lijnen. Amir bewaart het voorbeeld voor zijn presentatie." },
        { scene: "Waarom zorg nodig is", targets: ["Het is van groot belang","het niet over zijn kant laten gaan"], text: "Op een kaartje bij de tafel staat: Het is van groot belang om oude materialen voorzichtig te behandelen. Wanneer Amir ziet dat een klasgenoot bijna een kwetsbaar stukje hout opzij schuift, wil hij het niet over zijn kant laten gaan. Hij zegt rustig dat ze beter eerst kunnen vragen wat mag, omdat oude materialen snel beschadigen. De oude stad geeft hem nieuwe ideeën." },
        { scene: "Nieuwe ideeën", targets: ["voorop lopen in","waarde"], text: "Aan het einde bespreekt de groep hoe Nederlandse ontwerpers soms voorop lopen in slimme oplossingen voor kleine woningen. Amir begrijpt nu beter dat de waarde van cultuur niet alleen in musea zit, maar ook in stoelen, daken en kamers waar mensen elke dag gebruik van maken. Zijn eigen ontwerp blijft eenvoudig, maar het heeft wel een duidelijk idee. Amir ziet nu beter wat bij de straat past." }
      ],
      [["een golvend dak","een dak met een golvende vorm"],["een plat dak","een dak zonder schuine of ronde vorm"],["ertegenaan gaan","hard aan het werk gaan"],["ervoor gaan","je best doen om iets te bereiken"],["geneigd zijn om","snel de neiging hebben om"],["haarscheurtjes beginnen te vertonen","kleine scheurtjes krijgen"],["Het is van groot belang","het is heel belangrijk"],["het niet over zijn kant laten gaan","iets niet accepteren"],["voorop lopen in","verder of sneller zijn dan anderen in iets"],["waarde","belang"]],
      [
        { question: "Welke twee daken vergelijkt Amir?", options: ["Een golvend dak en een plat dak.","Een groen dak en een rood dak.","Een glazen dak en geen dak.","Een kapot dak en een nieuw dak."], answer: "Een golvend dak en een plat dak.", explanation: "De eerste pagina noemt beide dakvormen.", relatedWords: ["een golvend dak","een plat dak"] },
        { question: "Waarom moet de groep ertegenaan gaan?", options: ["Omdat de maquette vrijdag klaar moet zijn.","Omdat ze naar huis willen.","Omdat er geen opdracht is.","Omdat het regent."], answer: "Omdat de maquette vrijdag klaar moet zijn.", explanation: "Er is een duidelijke deadline.", relatedWords: ["ertegenaan gaan","ervoor gaan"] },
        { question: "Waarom werkt Amir rustiger?", options: ["Omdat het model haarscheurtjes begint te vertonen.","Omdat hij klaar is.","Omdat hij geen potlood heeft.","Omdat hij muziek hoort."], answer: "Omdat het model haarscheurtjes begint te vertonen.", explanation: "Het oude model is kwetsbaar.", relatedWords: ["haarscheurtjes beginnen te vertonen"] },
        { question: "Wat laat Amir niet over zijn kant gaan?", options: ["Onvoorzichtig omgaan met kwetsbaar hout.","Een verkeerde kleur verf.","Een lege tafel.","Een korte pauze."], answer: "Onvoorzichtig omgaan met kwetsbaar hout.", explanation: "Hij zegt rustig dat ze beter eerst kunnen vragen.", relatedWords: ["het niet over zijn kant laten gaan"] },
        { question: "Waarin kunnen ontwerpers voorop lopen?", options: ["In slimme oplossingen voor kleine woningen.","In hard fietsen.","In lang slapen.","In niets doen."], answer: "In slimme oplossingen voor kleine woningen.", explanation: "De laatste pagina noemt slimme oplossingen.", relatedWords: ["voorop lopen in"] }
      ],
      "#d8a36d"
    );

    stories["3-Amir in een oude stad"] = makeStory(
      "Thema 3 - Cultuur",
      "Amir in een oude stad",
      ["aarde","adviseren over","afstemmen op","afwijzing","beton","breed","eis","futuristisch","gedetailleerd","gevel"],
      [
        { scene: "Eerste wandeling", targets: ["aarde","adviseren over"], text: "Amir wandelt door een oude straat in Groningen, omdat hij de stad beter wil leren kennen en niet alleen de winkels wil zien. Bij een bouwplek ligt donkere aarde tussen de stenen, waarna de gids stopt om hem te adviseren over de geschiedenis van de huizen. Terwijl de groep verderloopt, schrijft Amir twee nieuwe woorden op en probeert hij de straat met andere ogen te bekijken. Zijn schets krijgt daardoor meer richting." },
        { scene: "Plan voor de wijk", targets: ["afstemmen op","afwijzing"], text: "In het buurthuis hoort Amir dat de gemeente een nieuw plan wil afstemmen op de wensen van de buurt. Sommige bewoners reageren enthousiast, terwijl anderen bang zijn voor afwijzing van hun ideeën, omdat ze al vaker hebben meegedacht zonder resultaat. Amir luistert naar beide kanten en noteert wat belangrijk is, zodat hij later zelf ook rustig iets kan zeggen. De oude stad geeft hem nieuwe ideeën." },
        { scene: "Oud en nieuw materiaal", targets: ["beton","breed"], text: "Op het plein ziet Amir veel beton, maar tussen de harde vlakken staan jonge bomen en lage bankjes. De nieuwe stoep is breed genoeg voor fietsers, ouders met kinderwagens en mensen die langzaam lopen, waardoor het plein vriendelijker aanvoelt dan hij eerst dacht. Hoewel het ontwerp modern is, past het door de kleuren toch bij de oude huizen eromheen. Zijn schets krijgt daardoor meer richting." },
        { scene: "Nieuw museumidee", targets: ["eis","futuristisch"], text: "Bij het museum vertelt de gids dat er een duidelijke eis is voor de nieuwe ingang: iedereen moet makkelijk naar binnen kunnen. Het glazen deel ziet er futuristisch uit en Amir vindt het eerst te opvallend naast de oude muur, maar na de uitleg verandert zijn mening. Misschien, denkt hij, kan iets nieuws juist helpen om iets ouds open en bruikbaar te houden. Het detail komt later terug in zijn ontwerp." },
        { scene: "Muur bekijken", targets: ["gedetailleerd","gevel"], text: "Aan het einde van de wandeling bekijkt Amir een gedetailleerd patroon op de gevel van een oud pand. Tussen de lijnen ziet hij bloemen, bladeren en kleine dieren die hij eerst bijna had gemist, omdat hij te snel voorbijliep. Nu neemt hij de tijd. Daardoor lijkt de stad ineens minder vreemd en veel rijker." }
      ],
      [["aarde","grond"],["adviseren over","raad geven over"],["afstemmen op","passend maken bij"],["afwijzing","nee als antwoord"],["beton","hard bouwmateriaal"],["breed","niet smal"],["eis","wat moet"],["futuristisch","heel modern"],["gedetailleerd","met veel kleine delen"],["gevel","voorkant van een gebouw"]],
      [
        { question: "Wie geeft Amir uitleg over oude huizen?", options: ["Een gids.","Een kok.","Een arts.","Een chauffeur."], answer: "Een gids.", explanation: "De gids adviseert Amir over oude huizen.", relatedWords: ["adviseren over"] },
        { question: "Waarop moet het plan worden afgestemd?", options: ["Op de buurt.","Op een recept.","Op een fietsbel.","Op een toets."], answer: "Op de buurt.", explanation: "Het plan moet passen bij de buurt.", relatedWords: ["afstemmen op"] },
        { question: "Wat bekijkt Amir op de gevel?", options: ["Een gedetailleerd patroon.","Een boodschappenlijst.","Een routekaart.","Een menukaart."], answer: "Een gedetailleerd patroon.", explanation: "Hij ziet een patroon met veel kleine delen.", relatedWords: ["gedetailleerd","gevel"] }
      ],
      "#d8a36d"
    );

    stories["3-Amir aan de gracht"] = makeStory(
      "Thema 3 - Cultuur",
      "Amir aan de gracht",
      ["gracht","hout","imposant","ingericht","karakteristiek","koepel","langwerpig","lidstaat","monumentaal","nastreven"],
      [
        { scene: "Langs het water", targets: ["gracht","hout"], text: "Amir loopt langs de gracht, waar het water zacht tegen de kade beweegt en fietsen langzaam over de brug gaan. Een oude brug van hout kraakt wanneer iemand remt, en dat geluid vindt hij mooi omdat het bij de straat lijkt te horen. Hij blijft even staan, luistert naar de stad en oefent daarna hardop de namen van de bruggen. De oude stad geeft hem nieuwe ideeën." },
        { scene: "Grote kerk", targets: ["imposant","ingericht"], text: "Even later bezoekt Amir een imposant gebouw dat hoog boven de straat uitkomt. Binnen is de ruimte eenvoudig ingericht, met stoelen, lampen en een stille hoek voor bezoekers, waardoor de grote zaal toch rustig voelt. Hoewel Amir weinig weet van kerken, merkt hij aan de stemmen van de mensen dat deze plek belangrijk is. Zijn schets krijgt daardoor meer richting." },
        { scene: "Herkenbare straat", targets: ["karakteristiek","koepel"], text: "De volgende straat heeft een karakteristiek gezicht: smalle huizen, hoge ramen en fietsen die dicht tegen de muur staan. In de verte ziet Amir een koepel boven de daken, en door die ronde vorm herkent hij plotseling de route terug. Dat geeft rust, want de stad voelt niet meer als een kaart vol losse lijnen. Zijn ontwerp blijft eenvoudig, maar duidelijk." },
        { scene: "Smalle zaal", targets: ["langwerpig","lidstaat"], text: "In het museum komt de groep in een langwerpig lokaal waar kleine vlaggen aan de muur hangen. De gids vertelt dat elke vlag bij een lidstaat van Europa hoort, maar Amir kent nog niet alle landen en vraagt daarom om een voorbeeld. Wanneer hij Nederland en Duitsland aanwijst, wordt de uitleg concreter en blijft het woord beter hangen. Amir ziet nu beter wat bij de straat past." },
        { scene: "Zorg voor oude plekken", targets: ["monumentaal","nastreven"], text: "Aan de gracht staat een monumentaal pand dat veel onderhoud nodig heeft, omdat wind, regen en druk verkeer langzaam sporen achterlaten. De stad wil goed onderhoud nastreven, zodat bewoners en bezoekers het gebouw later ook nog kunnen zien. Amir deelt folders uit en praat met een oudere buurman, waardoor hij niet alleen woorden leert maar ook verhalen hoort. Amir bewaart het voorbeeld voor zijn presentatie." }
      ],
      [["gracht","water in de stad"],["hout","materiaal van bomen"],["imposant","groot en sterk om te zien"],["ingericht","klaargemaakt van binnen"],["karakteristiek","typisch en herkenbaar"],["koepel","rond dak"],["langwerpig","lang en smal"],["lidstaat","land dat bij een groep hoort"],["monumentaal","belangrijk en oud"],["nastreven","proberen te bereiken"]],
      [
        { question: "Waar loopt Amir langs?", options: ["Langs de gracht.","Langs een snelweg.","Door een fabriek.","Door een bos."], answer: "Langs de gracht.", explanation: "De eerste pagina speelt bij de gracht.", relatedWords: ["gracht"] },
        { question: "Wat ziet Amir in de verte?", options: ["Een koepel.","Een ziekenhuisbed.","Een kassa.","Een sportveld."], answer: "Een koepel.", explanation: "Hij ziet een rond dak in de verte.", relatedWords: ["koepel"] },
        { question: "Wat wil de stad nastreven?", options: ["Goed onderhoud.","Minder zorg.","Een lege wijk.","Meer schade."], answer: "Goed onderhoud.", explanation: "De stad wil oude panden goed onderhouden.", relatedWords: ["nastreven"] }
      ],
      "#d8a36d"
    );

    stories["3-Amir helpt bij erfgoed"] = makeStory(
      "Thema 3 - Cultuur",
      "Amir helpt bij erfgoed",
      ["nederzetting","nomineren","ongeëvenaard","onvervangbaar","opstellen","opvallend","ornament","pand","per se","plafond"],
      [
        { scene: "Verhaal van een plek", targets: ["nederzetting","nomineren"], text: "Tijdens een erfgoeddag hoort Amir dat hier vroeger een kleine nederzetting lag, dicht bij het water waar handel en vervoer makkelijker waren. De stichting wil de plek nomineren voor extra bescherming, hoewel je nu op het eerste gezicht weinig ziet. Amir leest het informatiebord langzaam en begrijpt daarna beter waarom zelfs een bijna lege plek een verhaal kan hebben. Amir bewaart het voorbeeld voor zijn presentatie." },
        { scene: "Unieke waarde", targets: ["ongeëvenaard","onvervangbaar"], text: "Vanaf de hoge kade ziet Amir de oude stad en de nieuwe wijk naast elkaar liggen. De gids noemt het uitzicht ongeëvenaard, omdat je nergens precies hetzelfde beeld krijgt, en zij legt uit dat sommige muren onvervangbaar zijn als ze eenmaal verdwijnen. Amir wordt stiller, want erfgoed blijkt niet alleen over stenen te gaan maar ook over herinneringen. Zijn schets krijgt daardoor meer richting." },
        { scene: "Informatie klaarzetten", targets: ["opstellen","opvallend"], text: "Voor de bezoekers helpt Amir tafels opstellen bij de ingang van het terrein. Een geel bord is opvallend genoeg om mensen meteen de goede kant op te sturen, ook als ze de route niet kennen. Hoewel Amir nog niet iedereen verstaat, kan hij met praktische taken goed meedoen en voelt hij zich daardoor meer onderdeel van de groep. Het detail komt later terug in zijn ontwerp." },
        { scene: "Details in het pand", targets: ["ornament","pand"], text: "Later loopt Amir door een oud pand waar het licht zacht door hoge ramen naar binnen valt. Boven een deur ziet hij een klein ornament met bladeren en ronde vormen, dat eerst alleen versiering lijkt. De gids vertelt echter dat zulke details vaak iets zeggen over de tijd waarin het huis is gebouwd. Daarom maakt Amir een foto voor zijn woordenschrift." },
        { scene: "Niet altijd nodig", targets: ["per se","plafond"], text: "Aan het eind van de dag kijkt Amir omhoog naar het beschilderde plafond. Hij begrijpt niet per se elk woord van de uitleg, maar doordat hij de voorbeelden ziet en rustig vragen stelt, volgt hij wel de grote lijn. Dat is genoeg voor vandaag, zegt de gids, want nieuwsgierigheid is ook een vorm van meedoen. Amir bewaart het voorbeeld voor zijn presentatie." }
      ],
      [["nederzetting","oude woonplek"],["nomineren","voordragen"],["ongeëvenaard","zonder gelijke"],["onvervangbaar","niet te vervangen"],["opstellen","klaarzetten"],["opvallend","valt snel op"],["ornament","versiering"],["pand","gebouw"],["per se","absoluut"],["plafond","bovenkant van een kamer"]],
      [
        { question: "Waarover hoort Amir?", options: ["Een oude nederzetting.","Een nieuwe auto.","Een sportwedstrijd.","Een ziekenhuis."], answer: "Een oude nederzetting.", explanation: "De gids vertelt over een oude woonplek.", relatedWords: ["nederzetting"] },
        { question: "Waarom zijn sommige delen belangrijk?", options: ["Ze zijn onvervangbaar.","Ze zijn heel goedkoop.","Ze zijn nieuw.","Ze zijn leeg."], answer: "Ze zijn onvervangbaar.", explanation: "Je kunt ze niet zomaar vervangen.", relatedWords: ["onvervangbaar"] },
        { question: "Wat ziet Amir boven een deur?", options: ["Een ornament.","Een fiets.","Een pan.","Een jas."], answer: "Een ornament.", explanation: "Het ornament is een kleine versiering.", relatedWords: ["ornament"] }
      ],
      "#d8a36d"
    );

    stories["3-Amir tekent zijn buurt"] = makeStory(
      "Thema 3 - Cultuur",
      "Amir tekent zijn buurt",
      ["puntdak","rechthoekig","schildering","sfeervol","smal","speels","statig","steen","strak","suggestie"],
      [
        { scene: "Dakvormen zoeken", targets: ["puntdak","rechthoekig"], text: "In de tekenles kiest Amir een huis met een puntdak, omdat die vorm meteen boven de andere daken uitkomt. Het grote raam eronder is rechthoekig en lijkt makkelijk na te tekenen, maar de docent laat zien dat de lijnen precies op elkaar moeten aansluiten. Daardoor wordt de oefening moeilijker dan Amir dacht, en tegelijk ook interessanter. Amir bewaart het voorbeeld voor zijn presentatie." },
        { scene: "Kunst aan de muur", targets: ["schildering","sfeervol"], text: "Na de les drinken de cursisten koffie in een klein cafe waar een schildering van Groningen op de muur staat. Door het warme licht en de zachte stemmen is de ruimte sfeervol, waardoor iedereen vanzelf langzamer praat. Amir tekent een klein stukje van de muur na, niet om het perfect te maken maar om beter te leren kijken. Zijn schets krijgt daardoor meer richting." },
        { scene: "Straat met kleine huizen", targets: ["smal","speels"], text: "Buiten kiest Amir een smal huis naast een drukke winkel als voorbeeld voor zijn schets. De ramen staan niet helemaal gelijk en de kleuren zijn speels, maar juist daardoor lijkt de straat levendiger dan op een rechte bouwtekening. Hoewel hij eerst alles netjes wilde maken, laat hij nu een beetje beweging toe. Het detail komt later terug in zijn ontwerp." },
        { scene: "Oud gebouw", targets: ["statig","steen"], text: "Voor een statig gebouw stopt de groep opnieuw, omdat de gevel veel laat zien over de geschiedenis van de straat. De muur is gemaakt van donkere steen, die koud lijkt maar in het zonlicht toch verschillende kleuren krijgt. Amir raakt niets aan, want oude materialen kunnen kwetsbaar zijn, en tekent daarna langzaam de zware deur en de hoge ramen. De oude stad geeft hem nieuwe ideeën." },
        { scene: "Rustige vorm", targets: ["strak","suggestie"], text: "Wanneer Amir zijn schets laat zien, geeft de docent een rustige suggestie: maak sommige lijnen strak en laat andere juist los. Dat advies helpt, omdat de tekening dan duidelijker wordt zonder saai te worden. Amir gumt een klein stukje uit, kijkt opnieuw naar het gebouw en begrijpt dat ontwerpen ook kiezen betekent. Zijn ontwerp blijft eenvoudig, maar duidelijk." }
      ],
      [["puntdak","dak met een punt"],["rechthoekig","met rechte hoeken"],["schildering","kunst met verf"],["sfeervol","met fijne sfeer"],["smal","niet breed"],["speels","vrolijk en vrij"],["statig","deftig en groot"],["steen","hard bouwmateriaal"],["strak","net en recht"],["suggestie","idee of tip"]],
      [
        { question: "Wat tekent Amir op het huis?", options: ["Een puntdak.","Een boot.","Een bord soep.","Een regenjas."], answer: "Een puntdak.", explanation: "Hij tekent een huis met een puntdak.", relatedWords: ["puntdak"] },
        { question: "Waarom is het cafe sfeervol?", options: ["Door warm licht.","Door harde muziek.","Door lege muren.","Door kou."], answer: "Door warm licht.", explanation: "Warm licht geeft sfeer.", relatedWords: ["sfeervol"] },
        { question: "Wat geeft de docent?", options: ["Een suggestie.","Een afwijzing.","Een paspoort.","Een fiets."], answer: "Een suggestie.", explanation: "De docent geeft Amir een tip.", relatedWords: ["suggestie"] }
      ],
      "#d8a36d"
    );

    stories["3-Amir in het atelier"] = makeStory(
      "Thema 3 - Cultuur",
      "Amir in het atelier",
      ["tekening","verdwenen","versierd","vierkant","voldoen aan","voorlopig","waarde","waarderen","wederzijds","werelderfgoed","zich inzetten voor"],
      [
        { scene: "Oude tekening", targets: ["tekening","verdwenen"], text: "In het atelier legt de docent een oude tekening op tafel waarop een huis staat dat allang verdwenen is. De straat bestaat nog wel, en juist dat verschil vindt Amir bijzonder, omdat papier soms langer blijft dan steen. Na de les zoekt hij de plek buiten op, waarbij alleen de naam op een klein bordje hem verder helpt. Het detail komt later terug in zijn ontwerp." },
        { scene: "Versierde deur", targets: ["versierd","vierkant"], text: "Bij een werktafel ligt een foto van een deur die versierd is met kleine houten blokken. Elk blok is vierkant, maar samen vormen ze een levendig patroon waarin Amir steeds nieuwe vormen ontdekt. Terwijl een klasgenoot de kleuren noemt, tekent hij een eigen versie en merkt hij dat woorden beter blijven hangen wanneer zijn handen meedoen. Zijn ontwerp blijft eenvoudig, maar duidelijk." },
        { scene: "Regels volgen", targets: ["voldoen aan","voorlopig"], text: "De docent legt uit dat een oud gebouw moet voldoen aan regels voordat bezoekers naar binnen mogen. Voorlopig blijft een deel daarom dicht, ook al willen veel mensen het juist van dichtbij bekijken. Amir vindt dat jammer, maar hij begrijpt de reden: veiligheid hoort ook bij bewaren. Amir ziet nu beter wat bij de straat past." },
        { scene: "Waarde zien", targets: ["waarde","waarderen"], text: "Daarna praat de groep over de waarde van oude gebouwen en over de vraag waarom sommige plekken mensen raken. Amir zegt dat hij zo'n huis pas echt leert waarderen wanneer iemand het verhaal erachter vertelt. De docent knikt, want niet alles wat oud is, is automatisch mooi, maar met aandacht zie je vaak meer dan eerst. De oude stad geeft hem nieuwe ideeën." },
        { scene: "Samen respect tonen", targets: ["wederzijds","werelderfgoed","zich inzetten voor"], text: "Aan het einde ontstaat er wederzijds respect in de groep, omdat iedereen een eigen herinnering aan een plek deelt. Ze praten over werelderfgoed, maar ook over gewone straten die voor bewoners belangrijk zijn. Amir besluit zich inzetten voor een schoon plein in zijn buurt, want zorg voor erfgoed hoeft niet groot te beginnen. Amir bewaart het voorbeeld voor zijn presentatie." }
      ],
      [["tekening","afbeelding met lijnen"],["verdwenen","weg"],["versierd","mooi gemaakt"],["vierkant","met vier gelijke kanten"],["voldoen aan","passen bij regels"],["voorlopig","voor nu"],["waarde","belang"],["waarderen","goed vinden en respecteren"],["wederzijds","van twee kanten"],["werelderfgoed","erfgoed dat voor de wereld belangrijk is"],["zich inzetten voor","actief helpen met"]],
      [
        { question: "Wat is verdwenen?", options: ["Het huis op de tekening.","De docent.","De groep.","De straatnaam."], answer: "Het huis op de tekening.", explanation: "Het huis bestaat niet meer.", relatedWords: ["verdwenen"] },
        { question: "Wat moet het gebouw doen?", options: ["Voldoen aan regels.","Weggaan.","Koken.","Fietsen."], answer: "Voldoen aan regels.", explanation: "Het gebouw moet bij de regels passen.", relatedWords: ["voldoen aan"] },
        { question: "Waarover praat de groep?", options: ["Werelderfgoed.","Een sollicitatie.","Een waterrekening.","Een sportles."], answer: "Werelderfgoed.", explanation: "De groep praat over erfgoed dat voor de wereld belangrijk is.", relatedWords: ["werelderfgoed","zich inzetten voor"] }
      ],
      "#d8a36d"
    );

    stories["4-Een eigen bedrijf starten"] = makeStory(
      "Thema 4 - Economie en werk",
      "Een eigen bedrijf starten",
      ["aanpak","aantrekken","netwerk","nijpend","argument","omzetten","onderbouwen","beperken","neiging","bedrijfstak"],
      [
        { scene: "Ondernemersidee in Groningen", targets: ["aanpak","aantrekken"], text: "Mila wil een klein bedrijf beginnen met soepen en broodjes uit verschillende culturen, omdat ze merkt dat eten mensen snel met elkaar laat praten. Ze kiest een duidelijke aanpak: eerst koken voor buurtbijeenkomsten, daarna pas voor grotere groepen. Met foto's, proefhapjes en korte verhalen over de gerechten wil ze klanten aantrekken zonder meteen veel geld uit te geven. De oefening helpt haar bij een echt gesprek." },
        { scene: "Netwerk opbouwen", targets: ["netwerk","nijpend"], text: "In het buurthuis bouwt Mila langzaam een netwerk op van buren, vrijwilligers en mensen met een eigen bedrijf. Startgeld is nog nijpend, dus ze vraagt vooral om advies en gebruikt spullen die ze al heeft. Een oudere ondernemer vertelt haar dat vertrouwen soms belangrijker is dan een dure website. De volgende stap voelt daardoor kleiner." },
        { scene: "Crowdfunding bespreken", targets: ["argument","omzetten"], text: "Tijdens een gesprek over crowdfunding zoekt Mila naar een sterk argument: haar bedrijf kan mensen uit de buurt samenbrengen. Ze wil haar idee omzetten in een kleine dienst die betaalbaar blijft, maar wel professioneel voelt. Daarom laat ze buren proeven en vraagt ze eerlijk wat beter kan. Het plan wordt daardoor concreter." },
        { scene: "Plan onderbouwen", targets: ["onderbouwen","beperken"], text: "Met hulp van een vrijwilliger leert Mila haar prijzen onderbouwen met eenvoudige cijfers. Ze rekent uit wat ingredienten, tijd en vervoer kosten, zodat ze verlies kan beperken. Het is geen spannend werk, maar het geeft haar wel rust omdat ze nu ziet wat haalbaar is. De oefening helpt haar bij een echt gesprek." },
        { scene: "Professioneel groeien", targets: ["neiging","bedrijfstak"], text: "Mila heeft de neiging om te snel ja te zeggen tegen elke opdracht, vooral wanneer mensen enthousiast reageren. Toch leert ze dat deze bedrijfstak druk kan zijn en dat kwaliteit belangrijker is dan snelheid. Ze neemt daarom eerst kleine opdrachten aan en kijkt daarna pas verder. De volgende stap voelt daardoor kleiner." }
      ],
      [["aanpak","manier van werken"],["aantrekken","interesseren"],["netwerk","contacten"],["nijpend","dringend tekort"],["argument","reden"],["omzetten","veranderen in iets praktisch"],["onderbouwen","met feiten uitleggen"],["beperken","kleiner maken"],["neiging","drang"],["bedrijfstak","sector"]],
      [
        { question: "Wat wil Mila starten?", options: ["Een klein cateringbedrijf.","Een natuurbrug.","Een archief.","Een waterbedrijf."], answer: "Een klein cateringbedrijf.", explanation: "De eerste pagina noemt haar cateringidee.", relatedWords: ["aanpak","aantrekken"] },
        { question: "Wat blijft in het begin nijpend?", options: ["Startkapitaal.","Het aantal parken.","Het aantal recepten.","De fietspaden."], answer: "Startkapitaal.", explanation: "Startkapitaal is in het begin nijpend.", relatedWords: ["nijpend"] },
        { question: "Waarom onderbouwt Mila haar prijzen?", options: ["Om risico's te beperken.","Om buren te vermijden.","Om water te besparen.","Om cultuur te vergeten."], answer: "Om risico's te beperken.", explanation: "Cijfers helpen om risico's te beperken.", relatedWords: ["onderbouwen","beperken"] }
      ],
      "#9b98d4"
    );

    stories["4-Werk vinden"] = makeStory(
      "Thema 4 - Economie en werk",
      "Werk vinden",
      ["aanpak","netwerk","nijpend","argument","onderbouwen","beperken","neiging","bedrijfstak","aansluiten op","aantrekken"],
      [
        { scene: "Sollicitatie voorbereiden", targets: ["aanpak","netwerk"], text: "Mila zoekt werk met een duidelijke aanpak, want losse vacatures bekijken maakt haar onrustig. Ze begint bij haar netwerk en vraagt aan bekenden of zij bedrijven kennen waar Nederlands leren op de werkvloer mogelijk is. Een taalcoach kijkt mee naar haar cv en helpt haar kiezen welke ervaring ze bovenaan zet. Mila weet nu beter wat ze kan doen." },
        { scene: "Passende vaardigheden", targets: ["aansluiten op","aantrekken"], text: "Bij elke vacature vraagt Mila zich af of haar vaardigheden aansluiten op wat de werkgever zoekt. Haar brief moet aandacht aantrekken, maar niet overdreven klinken. Daarom schrijft ze korte, persoonlijke zinnen waarin ze uitlegt wat ze kan en waarom ze juist bij dit bedrijf wil werken. Zo krijgt werk zoeken meer structuur." },
        { scene: "Kansrijke sector", targets: ["nijpend","bedrijfstak"], text: "Tijdens een informatieavond hoort Mila dat personeel in de zorg nog steeds nijpend is. Deze bedrijfstak heeft mensen nodig die betrouwbaar zijn en goed kunnen luisteren, ook als hun Nederlands nog groeit. Mila bekijkt een korte opleiding en vraagt welke taalvaardigheid ze nodig heeft om te starten. Ze bewaart het voorbeeld voor later." },
        { scene: "Omscholing uitleggen", targets: ["argument","onderbouwen"], text: "Een sterk argument voor omscholing is dat Mila meer kans krijgt op werk dat bij haar past. In een gesprek leert ze haar keuze onderbouwen met voorbeelden uit haar leven: ze heeft voor familie gezorgd, kan goed plannen en blijft rustig bij drukte. Daardoor klinkt haar verhaal sterker. De volgende stap voelt daardoor kleiner." },
        { scene: "Zenuwen verminderen", targets: ["beperken","neiging"], text: "Voor een sollicitatiegesprek wil Mila haar zenuwen beperken, omdat ze anders te snel gaat praten. Ze heeft de neiging om elk antwoord meteen perfect te willen maken, maar de taalcoach zegt dat rustig nadenken ook professioneel is. Na drie oefengesprekken voelt ze meer controle. De oefening helpt haar bij een echt gesprek." }
      ],
      [["aanpak","manier van werken"],["netwerk","contacten"],["nijpend","dringend tekort"],["argument","reden"],["onderbouwen","uitleggen met bewijs"],["beperken","minder maken"],["neiging","drang"],["bedrijfstak","sector"],["aansluiten op","passen bij"],["aantrekken","interesse wekken"]],
      [
        { question: "Wat gebruikt Mila om vacatures te vinden?", options: ["Haar netwerk.","Een ecoduct.","Een recept.","Een waterleiding."], answer: "Haar netwerk.", explanation: "Ze gebruikt haar netwerk bij het zoeken.", relatedWords: ["netwerk"] },
        { question: "Waar moeten haar vaardigheden op aansluiten?", options: ["De wensen van werkgevers.","De openingstijden van een park.","De smaak van soep.","Het weer."], answer: "De wensen van werkgevers.", explanation: "Vaardigheden moeten aansluiten op werkgevers.", relatedWords: ["aansluiten op"] },
        { question: "Wat wil Mila beperken?", options: ["Haar zenuwen.","Haar kansen.","Haar netwerk.","Haar motivatie."], answer: "Haar zenuwen.", explanation: "Ze oefent om haar zenuwen te beperken.", relatedWords: ["beperken"] }
      ],
      "#9b98d4"
    );

    stories["4-Import en export"] = makeStory(
      "Thema 4 - Economie en werk",
      "Import en export",
      ["aanpak","aantrekken","netwerk","argument","omzetten","onderbouwen","beperken","neiging","bedrijfstak","nijpend"],
      [
        { scene: "Handel in de regio", targets: ["aanpak","aantrekken"], text: "Mila bezoekt een Gronings bedrijf dat lokale producten naar Duitsland verkoopt. De manager legt uit dat internationale handel een goede aanpak vraagt, omdat klanten duidelijke afspraken en betrouwbare levering verwachten. Met kwaliteit, snelle reacties en eerlijke informatie wil het bedrijf nieuwe klanten aantrekken. Ze bewaart het voorbeeld voor later." },
        { scene: "Internationaal netwerk", targets: ["netwerk","argument"], text: "Voor import en export is een netwerk van leveranciers, vervoerders en klanten belangrijk. Een sterk argument voor export is dat de markt groter wordt, maar de manager zegt ook dat contact onderhouden veel tijd kost. Mila kijkt naar een kaart en ziet hoe een klein product door meerdere landen kan reizen. Zo krijgt werk zoeken meer structuur." },
        { scene: "Lokale producten verkopen", targets: ["omzetten","onderbouwen"], text: "Het bedrijf wil lokale producten omzetten in winst zonder de band met de regio te verliezen. Elke keuze moet het team onderbouwen met cijfers, bijvoorbeeld over vervoer, voorraad en prijs. Mila vindt de grafiek eerst lastig, maar na de uitleg ziet ze waarom cijfers verhalen kunnen ondersteunen. Het plan wordt daardoor concreter." },
        { scene: "Risico's plannen", targets: ["beperken","neiging"], text: "Bedrijven hebben soms de neiging om te snel te groeien wanneer buitenlandse klanten interesse tonen. Goede planning helpt risico's beperken, vooral als transport duurder wordt of producten later aankomen. Mila leert dat nee zeggen soms verstandiger is dan een opdracht aannemen die je niet goed kunt uitvoeren. De oefening helpt haar bij een echt gesprek." },
        { scene: "Transportcapaciteit", targets: ["bedrijfstak","nijpend"], text: "In deze bedrijfstak kan transportcapaciteit nijpend zijn, vooral rond feestdagen of bij slecht weer. Daarom werken bedrijven samen en plannen ze routes ruim op tijd. Terwijl Mila dozen ziet klaarstaan, begrijpt ze dat handel niet alleen over verkopen gaat, maar ook over wachten, controleren en opnieuw afstemmen. De volgende stap voelt daardoor kleiner." }
      ],
      [["aanpak","manier van werken"],["aantrekken","interesseren"],["netwerk","contacten"],["argument","reden"],["omzetten","veranderen in winst"],["onderbouwen","uitleggen met gegevens"],["beperken","minder maken"],["neiging","drang"],["bedrijfstak","sector"],["nijpend","dringend tekort"]],
      [
        { question: "Wat vraagt internationale handel?", options: ["Een professionele aanpak.","Geen planning.","Minder contact.","Geen gegevens."], answer: "Een professionele aanpak.", explanation: "De eerste pagina noemt een professionele aanpak.", relatedWords: ["aanpak"] },
        { question: "Waarom is export aantrekkelijk?", options: ["De markt wordt groter.","Alle routes verdwijnen.","Er is geen netwerk nodig.","Producten blijven thuis."], answer: "De markt wordt groter.", explanation: "Een argument voor export is een grotere markt.", relatedWords: ["argument"] },
        { question: "Wat kan nijpend zijn?", options: ["Transportcapaciteit.","Een recept.","Een taalboek.","Een buurtfeest."], answer: "Transportcapaciteit.", explanation: "De laatste pagina noemt nijpende transportcapaciteit.", relatedWords: ["bedrijfstak","nijpend"] }
      ],
      "#9b98d4"
    );

    stories["4-De wereldeconomie"] = makeStory(
      "Thema 4 - Economie en werk",
      "De wereldeconomie",
      ["aanpak","aansluiten op","aantrekken","netwerk","nijpend","argument","omzetten","onderbouwen","beperken","bedrijfstak"],
      [
        { scene: "Prijs in de supermarkt", targets: ["aanpak","aansluiten op"], text: "Mila merkt in de supermarkt dat koffie en rijst duurder zijn geworden. In de les economie bespreekt de docent welke aanpak landen kiezen wanneer prijzen stijgen en lonen niet snel genoeg meegaan. De uitleg moet aansluiten op het dagelijks leven van de cursisten, anders blijven grote woorden zoals wereldeconomie te ver weg. Het plan wordt daardoor concreter." },
        { scene: "Wereldwijde contacten", targets: ["aantrekken","netwerk"], text: "Een bedrijf uit Groningen wil buitenlandse partners aantrekken, maar dat lukt alleen met een betrouwbaar netwerk. Mila ziet op een kaart dat leveranciers, havens en winkels met elkaar verbonden zijn. Als op een plek iets misgaat, kan een product aan de andere kant van de wereld later of duurder worden. De oefening helpt haar bij een echt gesprek." },
        { scene: "Tekorten begrijpen", targets: ["nijpend","argument"], text: "Tijdens de les gaat het over grondstoffen die soms nijpend worden, bijvoorbeeld door oorlog, droogte of hoge vraag. Een belangrijk argument voor samenwerking is dat landen elkaar nodig hebben om tekorten op te vangen. Mila begrijpt daardoor beter waarom nieuws uit een ander land ook invloed kan hebben op haar boodschappen. Mila weet nu beter wat ze kan doen." },
        { scene: "Ideeen omzetten in beleid", targets: ["omzetten","onderbouwen"], text: "De docent vraagt de groep hoe je een goed idee kunt omzetten in beleid dat mensen echt helpt. Elk voorstel moeten ze onderbouwen met eenvoudige feiten, zoals prijzen, banen en vervoer. Mila kiest voor steun aan kleine bedrijven, omdat zij vaak snel merken wanneer de economie verandert. Ze bewaart het voorbeeld voor later." },
        { scene: "Risico's voor bedrijven", targets: ["beperken","bedrijfstak"], text: "Aan het einde bespreekt de klas hoe bedrijven risico's kunnen beperken in een onrustige wereldmarkt. In elke bedrijfstak zijn de gevolgen anders: een bakker merkt vooral de prijs van energie, terwijl een transportbedrijf kijkt naar brandstof en routes. Mila ziet dat economie niet abstract is, maar dichtbij komt in gewone keuzes. Zo krijgt werk zoeken meer structuur." }
      ],
      [["aanpak","manier van werken"],["aansluiten op","passen bij"],["aantrekken","interesseren of binnenhalen"],["netwerk","contacten"],["nijpend","dringend tekort"],["argument","reden"],["omzetten","veranderen in iets praktisch"],["onderbouwen","uitleggen met feiten"],["beperken","minder maken"],["bedrijfstak","sector"]],
      [
        { question: "Waarom moet de uitleg aansluiten op het dagelijks leven?", options: ["Dan begrijpt de groep economische woorden beter.","Dan worden producten gratis.","Dan hoeft niemand te leren.","Dan verdwijnen prijzen."], answer: "Dan begrijpt de groep economische woorden beter.", explanation: "De docent wil wereldeconomie dichtbij maken.", relatedWords: ["aansluiten op"] },
        { question: "Wat heeft een bedrijf nodig voor buitenlandse partners?", options: ["Een betrouwbaar netwerk.","Alleen een fiets.","Een leeg magazijn.","Geen contact."], answer: "Een betrouwbaar netwerk.", explanation: "Contacten met partners zijn belangrijk.", relatedWords: ["netwerk","aantrekken"] },
        { question: "Waarom werken landen samen bij tekorten?", options: ["Om tekorten op te vangen.","Om alles duurder te maken.","Om minder te weten.","Om winkels te sluiten."], answer: "Om tekorten op te vangen.", explanation: "Samenwerking helpt wanneer grondstoffen nijpend zijn.", relatedWords: ["nijpend","argument"] },
        { question: "Waarmee moeten voorstellen worden onderbouwd?", options: ["Met feiten over prijzen, banen en vervoer.","Met alleen gevoel.","Met oude foto's.","Met stilte."], answer: "Met feiten over prijzen, banen en vervoer.", explanation: "Feiten maken een voorstel sterker.", relatedWords: ["onderbouwen"] },
        { question: "Wat verschilt per bedrijfstak?", options: ["Welke risico's het belangrijkst zijn.","Of mensen mogen werken.","Of taal nodig is.","Of er koffie bestaat."], answer: "Welke risico's het belangrijkst zijn.", explanation: "Een bakker en transportbedrijf merken andere gevolgen.", relatedWords: ["bedrijfstak","beperken"] }
      ],
      "#9b98d4"
    );

    stories["4-Mila op stage in de zorg"] = makeStory(
      "Thema 4 - Economie en werk",
      "Mila op stage in de zorg",
      ["aanpak","aansluiten op","aantrekken","netwerk","nijpend","argument","omzetten","onderbouwen","beperken","bedrijfstak"],
      [
        { scene: "Eerste dag op de afdeling", targets: ["aanpak","aansluiten op"], text: "Op haar eerste stagedag kiest Mila voor een rustige aanpak: eerst kijken, dan vragen en pas daarna zelf iets doen. De begeleider zoekt taken die aansluiten op haar opleiding en haar taalniveau. Daardoor voelt Mila zich serieus genomen, ook al moet ze nog veel woorden leren. De volgende stap voelt daardoor kleiner." },
        { scene: "Contact met collega's", targets: ["aantrekken","netwerk"], text: "De zorgorganisatie wil nieuwe stagiairs aantrekken, omdat er veel werk is en goede mensen hard nodig zijn. Mila leert intussen haar collega's kennen en bouwt een klein netwerk op. In de pauze vraagt ze hoe zij vroeger in deze sector zijn begonnen. Het plan wordt daardoor concreter." },
        { scene: "Drukke ochtend", targets: ["nijpend","argument"], text: "Op een drukke ochtend merkt Mila dat tijd soms nijpend is, omdat meerdere bewoners tegelijk hulp nodig hebben. Toch zegt haar begeleider dat dit juist een argument is om goed samen te werken en niet alles alleen te willen doen. Mila brengt materialen klaar en ziet hoe kleine taken de druk kunnen verminderen. De oefening helpt haar bij een echt gesprek." },
        { scene: "Van les naar praktijk", targets: ["omzetten","onderbouwen"], text: "Mila probeert omzetten van schoolkennis naar praktisch werk elke dag een beetje beter te doen. Wanneer ze een keuze maakt, vraagt haar begeleider of ze die kan onderbouwen met een korte uitleg. Eerst vindt Mila dat spannend, maar later helpt het haar om bewuster te werken. De volgende stap voelt daardoor kleiner." },
        { scene: "Grenzen leren kennen", targets: ["beperken","bedrijfstak"], text: "Aan het einde van de week leert Mila hoe ze fouten kan beperken door rustig te controleren en hulp te vragen. Ze begrijpt ook beter hoe deze bedrijfstak werkt: zorg is warm en menselijk, maar tegelijk strak georganiseerd. Die combinatie past beter bij haar dan ze had verwacht. Het plan wordt daardoor concreter." }
      ],
      [["aanpak","manier van werken"],["aansluiten op","passen bij"],["aantrekken","interesseren of binnenhalen"],["netwerk","contacten"],["nijpend","dringend tekort"],["argument","reden"],["omzetten","veranderen in iets praktisch"],["onderbouwen","uitleggen met feiten"],["beperken","minder maken"],["bedrijfstak","sector"]],
      [
        { question: "Welke aanpak kiest Mila op haar eerste dag?", options: ["Eerst kijken, dan vragen en daarna doen.","Meteen alles alleen doen.","Niets vragen.","Naar huis gaan."], answer: "Eerst kijken, dan vragen en daarna doen.", explanation: "Ze begint rustig en zorgvuldig.", relatedWords: ["aanpak"] },
        { question: "Waarom wil de zorgorganisatie stagiairs aantrekken?", options: ["Omdat er veel werk is.","Omdat er geen taken zijn.","Omdat niemand leert.","Omdat de pauze lang is."], answer: "Omdat er veel werk is.", explanation: "Goede mensen zijn hard nodig.", relatedWords: ["aantrekken"] },
        { question: "Wat doet Mila om fouten te beperken?", options: ["Rustig controleren en hulp vragen.","Sneller praten.","Geen vragen stellen.","Alles vergeten."], answer: "Rustig controleren en hulp vragen.", explanation: "Dat helpt haar veilig werken.", relatedWords: ["beperken"] }
      ],
      "#9b98d4"
    );

    stories["4-Mila zoekt startkapitaal"] = makeStory(
      "Thema 4 - Economie en werk",
      "Mila zoekt startkapitaal",
      ["aanpak","aantrekken","netwerk","nijpend","argument","omzetten","onderbouwen","beperken","neiging","bedrijfstak"],
      [
        { scene: "Plan voor de markt", targets: ["aanpak","aantrekken"], text: "Mila wil op de zaterdagmarkt soep verkopen en kiest daarvoor een eenvoudige aanpak. Ze maakt eerst drie smaken, zodat klanten kunnen proeven zonder meteen iets te kopen. Met een nette tafel en duidelijke prijzen wil ze aandacht aantrekken, maar haar verhaal moet wel eerlijk blijven. Het plan wordt daardoor concreter." },
        { scene: "Hulp uit de buurt", targets: ["netwerk","nijpend"], text: "Omdat geld voor de start nog nijpend is, vraagt Mila haar netwerk om kleine vormen van hulp. Een buurman leent een pan, een vriendin maakt foto's en iemand uit het buurthuis kent een goedkope leverancier. Zo groeit haar plan zonder dat ze meteen grote schulden maakt. De oefening helpt haar bij een echt gesprek." },
        { scene: "Waarom investeren?", targets: ["argument","omzetten"], text: "Voor een lokale sponsor moet Mila een helder argument geven: haar bedrijf brengt mensen samen en gebruikt producten uit de buurt. Daarna legt ze uit hoe ze dat idee wil omzetten in echte bestellingen. De sponsor stelt kritische vragen, maar Mila blijft rustig antwoorden. De volgende stap voelt daardoor kleiner." },
        { scene: "Cijfers op papier", targets: ["onderbouwen","beperken"], text: "Mila leert dat enthousiasme niet genoeg is; ze moet haar plan onderbouwen met cijfers. Ze rekent uit hoeveel kommen soep ze per week kan verkopen en hoe ze risico's kan beperken als het regent. Door die berekening wordt haar droom minder vaag. Het plan wordt daardoor concreter." },
        { scene: "Niet te snel groeien", targets: ["neiging","bedrijfstak"], text: "Na positieve reacties krijgt Mila de neiging om meteen groter te denken. Toch waarschuwt een ondernemer dat deze bedrijfstak veel energie vraagt, vooral als je alles vers wilt maken. Mila besluit eerst drie maanden klein te blijven en daarna opnieuw te evalueren. De oefening helpt haar bij een echt gesprek." }
      ],
      [["aanpak","manier van werken"],["aantrekken","interesseren"],["netwerk","contacten"],["nijpend","dringend tekort"],["argument","reden"],["omzetten","veranderen in iets praktisch"],["onderbouwen","met feiten uitleggen"],["beperken","kleiner maken"],["neiging","drang"],["bedrijfstak","sector"]],
      [
        { question: "Waarom kiest Mila voor drie smaken?", options: ["Dan kunnen klanten rustig proeven.","Dan hoeft ze niets te verkopen.","Dan is er geen plan nodig.","Dan wordt de markt kleiner."], answer: "Dan kunnen klanten rustig proeven.", explanation: "Ze begint overzichtelijk.", relatedWords: ["aanpak"] },
        { question: "Wat is nog nijpend?", options: ["Geld voor de start.","Het aantal lepels.","De muziek.","De regenjas."], answer: "Geld voor de start.", explanation: "Ze zoekt kleine vormen van hulp.", relatedWords: ["nijpend"] },
        { question: "Waarom blijft Mila eerst klein?", options: ["Omdat de bedrijfstak veel energie vraagt.","Omdat niemand soep wil.","Omdat ze geen netwerk heeft.","Omdat cijfers verboden zijn."], answer: "Omdat de bedrijfstak veel energie vraagt.", explanation: "Ze wil niet te snel groeien.", relatedWords: ["bedrijfstak","neiging"] }
      ],
      "#9b98d4"
    );

    stories["4-Mila oefent sollicitaties"] = makeStory(
      "Thema 4 - Economie en werk",
      "Mila oefent sollicitaties",
      ["aanpak","netwerk","aansluiten op","aantrekken","nijpend","bedrijfstak","argument","onderbouwen","beperken","neiging"],
      [
        { scene: "Vacatures kiezen", targets: ["aanpak","netwerk"], text: "Mila merkt dat werk zoeken makkelijker wordt met een vaste aanpak. Elke ochtend bekijkt ze twee vacatures en vraagt ze daarna aan haar netwerk of iemand het bedrijf kent. Daardoor voelt solliciteren minder eenzaam en krijgt ze soms informatie die niet in de vacature staat. De volgende stap voelt daardoor kleiner." },
        { scene: "Brief verbeteren", targets: ["aansluiten op","aantrekken"], text: "Haar brief moet aansluiten op de vacature, maar ook laten zien wie Mila is. De taalcoach helpt haar een eerste zin te schrijven die aandacht kan aantrekken zonder te veel te beloven. Daarna leest Mila de brief hardop, zodat ze hoort of de toon natuurlijk klinkt. Het plan wordt daardoor concreter." },
        { scene: "Sector met kansen", targets: ["nijpend","bedrijfstak"], text: "In een gesprek met de gemeente hoort Mila dat personeel in sommige beroepen nijpend is. Toch kiest ze niet zomaar elke bedrijfstak, want ze wil werk dat bij haar energie en talent past. Ze vergelijkt zorg, horeca en logistiek en schrijft per sector twee voordelen op. De oefening helpt haar bij een echt gesprek." },
        { scene: "Keuze uitleggen", targets: ["argument","onderbouwen"], text: "Tijdens een oefengesprek vraagt de coach waarom Mila juist deze baan wil. Mila noemt een argument en probeert dat te onderbouwen met een voorbeeld uit haar vrijwilligerswerk. De eerste keer zoekt ze naar woorden, maar de tweede keer klinkt haar antwoord al veel sterker. De volgende stap voelt daardoor kleiner." },
        { scene: "Rustig blijven", targets: ["beperken","neiging"], text: "Mila wil haar spanning beperken, omdat ze tijdens gesprekken de neiging heeft om te snel te praten. Ze oefent korte pauzes en schrijft drie kernwoorden op een kaartje. Daardoor kan ze beter luisteren naar de vraag voordat ze antwoord geeft. Het plan wordt daardoor concreter." }
      ],
      [["aanpak","manier van werken"],["netwerk","contacten"],["aansluiten op","passen bij"],["aantrekken","interesse wekken"],["nijpend","dringend tekort"],["bedrijfstak","sector"],["argument","reden"],["onderbouwen","uitleggen met bewijs"],["beperken","minder maken"],["neiging","drang"]],
      [
        { question: "Wat doet Mila elke ochtend?", options: ["Ze bekijkt twee vacatures.","Ze sluit alle websites.","Ze koopt soep.","Ze gaat naar het museum."], answer: "Ze bekijkt twee vacatures.", explanation: "Dat hoort bij haar vaste aanpak.", relatedWords: ["aanpak"] },
        { question: "Waarom vergelijkt Mila sectoren?", options: ["Ze wil werk dat bij haar past.","Ze wil niet werken.","Ze zoekt alleen hoge gebouwen.","Ze wil geen netwerk."], answer: "Ze wil werk dat bij haar past.", explanation: "Niet elke bedrijfstak past bij haar.", relatedWords: ["bedrijfstak"] },
        { question: "Wat helpt haar spanning beperken?", options: ["Korte pauzes en kernwoorden.","Harder praten.","Geen voorbereiding.","Alle vragen overslaan."], answer: "Korte pauzes en kernwoorden.", explanation: "Zo kan ze rustiger antwoorden.", relatedWords: ["beperken","neiging"] }
      ],
      "#9b98d4"
    );

    stories["4-Mila volgt een zending"] = makeStory(
      "Thema 4 - Economie en werk",
      "Mila volgt een zending",
      ["aanpak","aantrekken","netwerk","argument","omzetten","onderbouwen","beperken","neiging","bedrijfstak","nijpend"],
      [
        { scene: "Van Groningen naar Hamburg", targets: ["aanpak","aantrekken"], text: "Mila volgt een zending Groningse producten die naar Hamburg gaat. De exportmedewerker legt uit dat een duidelijke aanpak nodig is om klanten te houden en nieuwe klanten aantrekken mogelijk te maken. Elk pakket krijgt een code, zodat iedereen kan zien waar het onderweg is. Zo krijgt werk zoeken meer structuur." },
        { scene: "Mensen achter de route", targets: ["netwerk","argument"], text: "Achter een simpele doos zit een groot netwerk van chauffeurs, planners en magazijnen. Een argument voor goede samenwerking is duidelijk: als een schakel te laat is, merkt de klant dat meteen. Mila ziet hoe vaak mensen elkaar bellen om kleine problemen op tijd op te lossen. Mila weet nu beter wat ze kan doen." },
        { scene: "Bestelling wordt winst", targets: ["omzetten","onderbouwen"], text: "Het bedrijf wil een bestelling omzetten in winst, maar dat lukt alleen als de kosten kloppen. De planner moet de route onderbouwen met gegevens over afstand, brandstof en tijd. Mila kijkt mee en ziet dat handel veel preciezer is dan alleen iets verkopen. Het plan wordt daardoor concreter." },
        { scene: "Risico onderweg", targets: ["beperken","neiging"], text: "Wanneer een vrachtwagen vertraging heeft, wil Mila meteen een nieuwe route voorstellen. De planner zegt dat bedrijven soms de neiging hebben om te snel te reageren, terwijl rustige informatie beter helpt. Eerst controleren ze de feiten, zodat ze extra kosten kunnen beperken. De oefening helpt haar bij een echt gesprek." },
        { scene: "Drukke sector", targets: ["bedrijfstak","nijpend"], text: "Aan het eind van de dag begrijpt Mila waarom deze bedrijfstak zo druk is. Tijd, ruimte en chauffeurs kunnen nijpend worden, vooral wanneer veel bedrijven tegelijk willen leveren. Toch vindt ze het mooi om te zien hoe planning, taal en vertrouwen samenkomen. Zo krijgt werk zoeken meer structuur." }
      ],
      [["aanpak","manier van werken"],["aantrekken","interesseren"],["netwerk","contacten"],["argument","reden"],["omzetten","veranderen in winst"],["onderbouwen","uitleggen met gegevens"],["beperken","minder maken"],["neiging","drang"],["bedrijfstak","sector"],["nijpend","dringend tekort"]],
      [
        { question: "Waarom krijgt elk pakket een code?", options: ["Dan kun je zien waar het is.","Dan wordt het eten warm.","Dan hoeft niemand te plannen.","Dan verdwijnt de route."], answer: "Dan kun je zien waar het is.", explanation: "De code helpt de zending volgen.", relatedWords: ["aanpak"] },
        { question: "Waaruit bestaat het netwerk?", options: ["Chauffeurs, planners en magazijnen.","Alleen klanten.","Alleen studenten.","Alleen buren."], answer: "Chauffeurs, planners en magazijnen.", explanation: "Veel mensen werken samen.", relatedWords: ["netwerk"] },
        { question: "Wat kan nijpend worden?", options: ["Tijd, ruimte en chauffeurs.","Soep en brood.","Stoelen en tafels.","Alle woorden."], answer: "Tijd, ruimte en chauffeurs.", explanation: "De sector kan erg druk worden.", relatedWords: ["nijpend","bedrijfstak"] }
      ],
      "#9b98d4"
    );

    stories["4-Mila leest economisch nieuws"] = makeStory(
      "Thema 4 - Economie en werk",
      "Mila leest economisch nieuws",
      ["aanpak","aansluiten op","aantrekken","netwerk","nijpend","argument","omzetten","onderbouwen","beperken","bedrijfstak"],
      [
        { scene: "Nieuws in eenvoudige taal", targets: ["aanpak","aansluiten op"], text: "Mila leest economisch nieuws in eenvoudige taal, omdat gewone kranten soms te veel moeilijke woorden gebruiken. Haar aanpak is simpel: eerst de titel, dan de grafiek en daarna pas het hele artikel. De docent kiest teksten die aansluiten op situaties die cursisten herkennen, zoals huur, boodschappen en werk. Zo krijgt werk zoeken meer structuur." },
        { scene: "Bedrijven en landen", targets: ["aantrekken","netwerk"], text: "In het artikel staat dat landen bedrijven willen aantrekken met goede havens, snelle treinen en duidelijke regels. Mila ziet dat economie lijkt op een groot netwerk waarin keuzes van bedrijven, klanten en overheden elkaar raken. Dat maakt het onderwerp groot, maar niet onmogelijk. Zo krijgt werk zoeken meer structuur." },
        { scene: "Tekort aan materialen", targets: ["nijpend","argument"], text: "Daarna leest de groep over materialen die nijpend zijn geworden doordat de vraag snel steeg. De docent vraagt welk argument voor zuinig gebruik het sterkst is. Mila zegt dat verspilling duur is, maar ook oneerlijk wanneer andere bedrijven dezelfde materialen nodig hebben. De oefening helpt haar bij een echt gesprek." },
        { scene: "Cijfers begrijpen", targets: ["omzetten","onderbouwen"], text: "De klas leert hoe je cijfers kunt omzetten in een korte uitleg. Een mening over prijzen moet je onderbouwen, anders blijft het alleen een gevoel. Mila schrijft daarom twee zinnen: wat is er duurder geworden, en voor wie is dat een probleem? Ze bewaart het voorbeeld voor later." },
        { scene: "Gevolgen dichtbij", targets: ["beperken","bedrijfstak"], text: "Tot slot bespreekt de groep hoe gezinnen en bedrijven schade kunnen beperken wanneer prijzen stijgen. De gevolgen verschillen per bedrijfstak: een restaurant merkt voedselprijzen, terwijl een winkel meer last kan hebben van huur en vervoer. Mila begrijpt nu beter waarom economisch nieuws ook over haar eigen leven gaat. Het plan wordt daardoor concreter." }
      ],
      [["aanpak","manier van werken"],["aansluiten op","passen bij"],["aantrekken","interesseren of binnenhalen"],["netwerk","contacten"],["nijpend","dringend tekort"],["argument","reden"],["omzetten","veranderen in iets praktisch"],["onderbouwen","uitleggen met feiten"],["beperken","minder maken"],["bedrijfstak","sector"]],
      [
        { question: "Wat is Mila's aanpak bij nieuws lezen?", options: ["Titel, grafiek en daarna het artikel.","Alleen moeilijke woorden lezen.","Meteen stoppen.","Geen titel lezen."], answer: "Titel, grafiek en daarna het artikel.", explanation: "Ze leest stap voor stap.", relatedWords: ["aanpak"] },
        { question: "Waarom kiezen landen goede havens en regels?", options: ["Om bedrijven aan te trekken.","Om handel te stoppen.","Om geen netwerk te hebben.","Om prijzen te vergeten."], answer: "Om bedrijven aan te trekken.", explanation: "Goede voorwaarden trekken bedrijven aan.", relatedWords: ["aantrekken"] },
        { question: "Waarom moet Mila een mening onderbouwen?", options: ["Anders blijft het alleen een gevoel.","Omdat cijfers verboden zijn.","Omdat niemand luistert.","Omdat het nieuws kort is."], answer: "Anders blijft het alleen een gevoel.", explanation: "Feiten maken haar uitleg sterker.", relatedWords: ["onderbouwen"] }
      ],
      "#9b98d4"
    );

    const coverageDefinitions = {
      "levensgeluk": "geluk in je leven als geheel",
      "levensverwachting": "het aantal jaren dat mensen gemiddeld leven",
      "levensvreugde": "plezier en blijdschap in het leven",
      "ranglijst": "lijst waarin dingen of mensen op volgorde staan",
      "rapportcijfer": "cijfer waarmee je iets beoordeelt",
      "respondent": "iemand die antwoord geeft in een onderzoek",
      "welbevinden": "hoe goed iemand zich voelt",
      "wereldranglijst": "ranglijst met landen of mensen uit de hele wereld",
      "voorspoed": "een periode waarin het goed gaat",
      "veerkrachtig": "sterk genoeg om na problemen weer verder te gaan",
      "uitkering": "tijdelijke geldelijke steun",
      "arbeidsmarkt": "banen en mensen die werk zoeken",
      "aanvragen": "officieel vragen om iets te krijgen",
      "aarzelen": "twijfelen of wachten",
      "cultuurverschil": "verschil in gewoontes tussen groepen",
      "aanzienlijk": "heel veel of behoorlijk groot",
      "bevorderen": "helpen om iets beter te maken",
      "een lekke band hebben": "een band hebben waar lucht uit is",
      "het hoofd boven water kunnen houden": "net genoeg hebben om door te kunnen gaan",
      "het is verre van perfect": "het is helemaal niet perfect",
      "het kan je zomaar overkomen": "het kan onverwacht met jou gebeuren",
      "het komt niet uit": "het past nu niet of het is geen goed moment",
      "het maakt niet uit": "het is niet belangrijk of geen probleem",
      "hij redt het niet alleen": "hij kan het zonder hulp niet aan",
      "iets aan jezelf te wijten hebben": "iets is door je eigen gedrag gekomen",
      "in de file staan": "in een rij stilstaande auto's staan",
      "in de steek laten": "iemand niet helpen wanneer dat nodig is",
      "arbeidsongeschiktheid": "niet kunnen werken door ziekte of beperking",
      "coronapandemie": "wereldwijde uitbraak van corona",
      "crisissituatie": "moeilijke en dringende situatie",
      "gegevens": "informatie of data",
      "gigantisch": "heel groot",
      "middelen": "geld, spullen of hulp die je kunt gebruiken",
      "verzuim": "afwezigheid door ziekte of andere reden",
      "vervangend": "in de plaats van iets of iemand anders",
      "voorziening": "hulp, dienst of plek die beschikbaar is",
      "voorzien van": "geven wat nodig is",
      "passend werk": "werk dat bij iemands mogelijkheden past",
      "re-integratie": "terugkeer naar werk na ziekte of werkloosheid",
      "werkloosheid": "situatie waarin mensen geen werk hebben",
      "werkonderbreking": "periode waarin iemand tijdelijk niet werkt",
      "werkzoekende": "iemand die werk zoekt",
      "vooruit kunnen": "verder kunnen gaan",
      "legaliseren": "officieel wettelijk maken",
      "naleven": "regels volgen",
      "onomstreden": "waar bijna niemand bezwaar tegen heeft",
      "spelregel": "regel die zegt hoe iets moet gaan",
      "toezien op": "controleren of iets goed gebeurt",
      "verantwoordelijkheid": "taak of plicht waarvoor je moet zorgen",
      "verantwoordelijk zijn voor": "moeten zorgen voor iets of iemand",
      "vergunning": "officiele toestemming",
      "samenleving": "alle mensen die samen in een land of buurt leven",
      "onderhandelen met over": "praten om samen tot een afspraak te komen",
      "onder meer": "onder andere",
      "staking": "actie waarbij mensen tijdelijk niet werken uit protest",
      "de vakbond behartigt de belangen van de werknemers": "de vakbond komt op voor werknemers",
      "contact opnemen met": "iemand bellen, schrijven of aanspreken",
      "de menselijke maat": "aandacht voor wat mensen echt nodig hebben",
      "in kaart brengen": "duidelijk maken of overzichtelijk opschrijven",
      "uit onderzoek blijkt dat": "onderzoek laat zien dat",
      "deelnemen aan": "meedoen met",
      "dienen te": "moeten",
      "dienstverlener": "persoon of organisatie die hulp of service geeft",
      "dienstverlening": "het geven van hulp of service",
      "doorverwijzen": "iemand naar een andere persoon of plek sturen voor hulp",
      "erbij horen": "deel zijn van een groep",
      "ondersteunen": "helpen",
      "ondersteuning": "hulp",
      "terecht kunnen bij": "naar iemand of een plek kunnen gaan voor hulp",
      "waarmee kan ik u van dienst zijn": "hoe kan ik u helpen",
      "in het verleden leven": "te veel met vroeger bezig zijn",
      "om het weekend": "eens per twee weekenden",
      "voor de regen schuilen": "ergens wachten om droog te blijven",
      "actieradius": "afstand die je kunt afleggen zonder opnieuw op te laden of te tanken",
      "afgrond": "diepe rand of steile diepte",
      "afwisselen": "om de beurt veranderen",
      "allerlei": "verschillende soorten",
      "beek": "kleine natuurlijke stroom water",
      "beekje": "kleine beek",
      "begroeid met": "bedekt met planten",
      "bergachtig": "met veel bergen of heuvels",
      "berm": "strook gras of grond langs de weg",
      "bestand tegen": "sterk genoeg voor",
      "betrokken": "actief meedoend of emotioneel geraakt",
      "boomstronk": "stuk boom dat overblijft na het kappen",
      "bosrijk": "met veel bos",
      "bovendien": "ook nog",
      "daadkrachtig": "snel en duidelijk handelend",
      "deprimerend": "somber makend",
      "dichtbevolkt": "met veel mensen op een klein gebied",
      "dunbevolkt": "met weinig mensen in een gebied",
      "doorgaans": "meestal",
      "dwars door": "recht door iets heen",
      "heftig": "sterk of intens",
      "heide": "open natuurgebied met lage paarse planten",
      "heuvel": "lage berg",
      "heuvelachtig": "met veel heuvels",
      "hoogtevrees": "angst voor hoogte",
      "indrukwekkend": "wat veel indruk maakt",
      "investering": "geld, tijd of moeite die je ergens in stopt",
      "inzien": "begrijpen",
      "kaal": "zonder bedekking, bomen of planten",
      "klapstoel": "stoel die je kunt inklappen",
      "ecoduct": "natuurbrug waar dieren veilig kunnen oversteken",
      "ernst": "hoe serieus iets is",
      "extreem": "heel sterk of buitengewoon",
      "fauna": "alle dieren in een gebied",
      "flora": "alle planten in een gebied",
      "gebied": "stuk land of ruimte",
      "gebrek aan": "te weinig van iets",
      "gemiddelde": "het normale midden van cijfers",
      "gevarieerd": "met veel verschillen",
      "glooiend": "zacht op en neer gaand",
      "mild": "zacht, niet streng of niet heftig",
      "monotoon": "steeds hetzelfde en daardoor saai",
      "naaldboom": "boom met naalden in plaats van bladeren",
      "omgeving": "gebied om een plek heen",
      "onbewoond": "waar niemand woont",
      "onder druk staan": "moeilijkheden of spanning ervaren",
      "onstuimig": "wild en onrustig",
      "opraken": "langzaam helemaal weggaan",
      "opslaan": "bewaren voor later",
      "opvang": "plek of hulp voor wie bescherming nodig heeft",
      "een lust voor het oog zijn": "heel mooi zijn om naar te kijken",
      "eropuit trekken": "naar buiten gaan om iets te doen",
      "het antwoord blijft uit": "er komt geen antwoord",
      "het bruist van de activiteiten": "er gebeurt veel",
      "met tientallen tegelijk": "met veel tegelijk",
      "nauw samenwerken": "goed en intensief samenwerken",
      "van invloed zijn op": "effect hebben op",
      "zonder overleg": "zonder eerst samen te praten",
      "aanleggen": "maken of bouwen",
      "beschermen": "veilig houden",
      "overbrugging": "tijdelijke oplossing tussen twee situaties",
      "overheid": "gemeente, provincie of landelijke regering",
      "overzicht": "duidelijk beeld van de belangrijkste informatie",
      "piek": "hoogste punt of drukste moment",
      "pittoresk": "mooi en schilderachtig",
      "plas": "klein water op de grond of klein meer",
      "plat": "vlak, zonder hoogteverschil",
      "prachtig": "heel mooi",
      "recreatie": "ontspanning in vrije tijd",
      "recreëren": "iets doen om te ontspannen",
      "sloot": "smalle watergang",
      "stromen": "bewegen zoals water",
      "tegenkomen": "ontmoeten of zien",
      "toestemming": "goedkeuring om iets te doen",
      "top": "hoogste punt of heel goed",
      "uitblijven": "niet gebeuren of niet komen",
      "uitkomst": "resultaat of oplossing",
      "uitstellen": "later doen",
      "vanzelfsprekend": "logisch en normaal",
      "vasthouden aan": "niet loslaten of blijven volgen",
      "vruchtbaar": "goed om planten te laten groeien",
      "wateronttrekking": "het weghalen van water uit bodem of natuur",
      "wateroverlast": "problemen door te veel water",
      "waterrijk": "met veel water",
      "waterverbruik": "hoeveel water je gebruikt",
      "wei": "grasland voor dieren",
      "wild": "dieren die vrij in de natuur leven",
      "woestijnachtig": "droog en lijkend op een woestijn",
      "zanderig": "met veel zand",
      "kleurrijk": "met veel kleuren",
      "klinken": "geluid maken of zo overkomen",
      "kloof": "diepe opening tussen rotsen of groepen",
      "landklimaat": "klimaat met warme zomers en koude winters",
      "landschap": "hoe een gebied eruitziet",
      "langdurig": "voor een lange tijd",
      "lieflijk": "mooi, zacht en vriendelijk",
      "loofboom": "boom met bladeren",
      "meer": "grote plas water",
      "meertje": "klein meer",
      "vaststellen": "officieel bepalen of constateren",
      "verschuiven": "naar een andere plek of tijd gaan",
      "versnipperd": "in kleine losse delen verdeeld",
      "versperd": "geblokkeerd",
      "vervuild raken": "vies of schadelijk worden",
      "vlak": "plat en zonder veel hoogteverschil",
      "volstaan": "genoeg zijn",
      "voorraad": "hoeveelheid die je bewaart voor later",
      "regenbui": "korte periode met regen",
      "regenwoud": "warm bos met heel veel regen",
      "rijk aan": "met veel van iets",
      "rivier": "grote natuurlijke stroom water",
      "riviertje": "kleine rivier",
      "ruig": "wild en niet netjes",
      "ruiter": "iemand die op een paard rijdt",
      "saai": "niet interessant",
      "schilderachtig": "mooi als een schilderij",
      "schitterend": "heel mooi",
      "zeeklimaat": "klimaat dat door de zee wordt beinvloed",
      "zelfs": "ook, terwijl je dat misschien niet verwacht",
      "zorgvuldig": "met veel aandacht en precies",
      "zuinig": "niet te veel gebruikend",
      "zuiveren": "schoonmaken",
      "aan de extra vraag voldoen": "genoeg leveren wanneer er meer nodig is",
      "al dan niet": "wel of niet",
      "beschutting zoeken": "een plek zoeken waar je beschermd bent",
      "bomen kappen": "bomen omhakken",
      "de rode loper voor iemand uitrollen": "iemand heel hartelijk welkom heten"
    };

    function getCoverageDefinition(word) {
      const key = String(word || "").trim().toLowerCase();
      return coverageDefinitions[key] || "woord om te oefenen";
    }

    function addCoverageStory(key, chapter, title, vocab, color, imageKey) {
      const isNature = /^Thema 2/.test(chapter);
      const scenes = isNature
        ? ["Bij het startpunt", "Langs het pad", "Bij het water", "In gesprek met de beheerder", "Terug in de les"]
        : ["In het buurthuis", "Aan tafel met de groep", "Bij een praktisch probleem", "Tijdens een afspraak", "Terug in de les"];
      const variant = [...key].reduce((sum, char) => sum + char.charCodeAt(0), 0);
      const natureClosers = [
        ["Het landschap maakt de woorden zichtbaar.", "De woorden krijgen daar meteen kleur.", "Mila ziet dat taal soms buiten begint."],
        ["De route voelt daardoor meer als een echte les.", "De wandeling krijgt daardoor meer betekenis.", "Mila hoort nu hoe het woord in een zin klinkt."],
        ["Daardoor durft ze ook de volgende zin te proberen.", "De groep lacht zacht, en Mila praat verder.", "Zo wordt de oefening minder spannend."],
        ["Buiten ziet ze meteen waarom dat nodig is.", "De regel krijgt ineens een praktische kant.", "Mila begrijpt de keuze nu beter."],
        ["De oefening blijft daardoor duidelijk en bruikbaar.", "Thuis kan Mila de zinnen opnieuw gebruiken.", "De woorden blijven daardoor beter hangen."]
      ];
      const generalClosers = [
        ["Na de uitleg maakt ze zelf een korte zin.", "Mila probeert meteen een eigen voorbeeld.", "De zin klinkt nog eenvoudig, maar wel duidelijk."],
        ["De andere cursisten knikken, want zij zoeken ook naar woorden die precies genoeg zijn.", "Daardoor voelt het gesprek veilig genoeg om verder te oefenen.", "Mila merkt dat langzaam praten soms juist beter werkt."],
        ["Daardoor begrijpt Mila de betekenis beter en kan ze het woord meteen opnieuw proberen.", "Met dat kleine voorbeeld blijft de betekenis beter hangen.", "Mila herhaalt de zin en hoort waar het woord past."],
        ["Zo oefent Mila niet alleen woorden, maar ook natuurlijk Nederlands.", "De klas hoort dat een lange zin ook rustig kan blijven.", "Mila merkt dat duidelijk spreken belangrijker is dan snel spreken."],
        ["Daardoor blijft de oefening begrijpelijk en voelt de les nuttig.", "Mila neemt de zinnen mee naar huis om later te oefenen.", "De les eindigt rustig, maar Mila blijft over de woorden nadenken."]
      ];
      const closer = (groups, index) => groups[index][(variant + index) % groups[index].length];
      const pageTemplates = isNature ? [
        (a, b) => `Mila gaat met haar taalgroep naar buiten, omdat het onderwerp "${title.toLowerCase()}" beter te begrijpen is wanneer je het ziet. Bij het startpunt noemt de gids ${a} en ${b}; hij wijst naar de kaart, maar laat de groep ook om zich heen kijken. Daardoor blijven de woorden niet los in haar hoofd hangen, maar krijgen ze meteen een plek in het landschap. ${closer(natureClosers, 0)}`,
        (a, b) => `Langs het pad merkt Mila hoe snel de omgeving kan veranderen. Ze ziet ${a} en hoort daarna hoe de gids ${b} uitlegt met een voorbeeld uit de buurt. Eerst schrijft ze alleen de woorden op, maar wanneer een klasgenoot een vraag stelt, begrijpt ze ook de situatie erachter. ${closer(natureClosers, 1)}`,
        (a, b) => `Bij het water blijft de groep even staan, omdat daar veel details te zien zijn. Mila gebruikt ${a} in een korte zin, waarna de docent haar helpt om ook ${b} natuurlijk te zeggen. De zin is niet perfect, maar iedereen begrijpt haar bedoeling. ${closer(natureClosers, 2)}`,
        (a, b) => `De beheerder vertelt dat keuzes in de natuur vaak met elkaar samenhangen. Soms lijkt ${a} een klein detail, terwijl ${b} juist laat zien waarom een regel nodig is. Mila luistert, stelt een korte vraag en vergelijkt het voorbeeld met haar eigen straat, waardoor het onderwerp minder ver weg voelt. ${closer(natureClosers, 3)}`,
        (a, b) => `Terug in de les kiest Mila twee zinnen die ze wil bewaren: een met ${a} en een met ${b}. Ze leest ze hardop, terwijl de docent vooral op duidelijkheid let. Hoewel de woorden lastig zijn, gebruikt Mila ze in een rustige zin die ook bij haar eigen dag past. ${closer(natureClosers, 4)}`
      ] : [
        (a, b) => `Mila zit in het buurthuis wanneer het gesprek over "${title.toLowerCase()}" begint. De vrijwilliger noemt ${a} en ${b}, maar hij geeft er meteen een herkenbaar voorbeeld bij. Daardoor hoeft Mila niet alleen naar de losse woorden te kijken; ze hoort ook wanneer mensen ze echt gebruiken. ${closer(generalClosers, 0)}`,
        (a, b) => `Aan tafel praat de groep verder over een situatie uit Groningen. Mila hoort ${a} in een vraag van een buurvrouw en ziet daarna hoe ${b} in het antwoord past. Omdat het gesprek rustig blijft, durft ze om herhaling te vragen. ${closer(generalClosers, 1)}`,
        (a, b) => `Bij een praktisch probleem merkt Mila dat taal pas echt gaat leven wanneer iemand hulp nodig heeft. Ze gebruikt ${a}, maar twijfelt even over ${b}. De docent geeft geen lange uitleg; hij maakt een klein voorbeeld met namen uit de groep. ${closer(generalClosers, 2)}`,
        (a, b) => `Tijdens een afspraak moet Mila goed luisteren, want niet elk woord staat letterlijk in het formulier. Ze onderstreept ${a} en schrijft ${b} in haar schrift, waarna ze samen met een klasgenoot een zin maakt. Die zin is wat langer, maar hij blijft duidelijk. ${closer(generalClosers, 3)}`,
        (a, b) => `Terug in de les kijkt Mila naar wat ze vandaag heeft geleerd. Ze kiest een voorbeeld met ${a}, omdat dat bij haar eigen leven past, en daarna maakt ze ook een zin met ${b}. Hoewel de woorden soms moeilijk zijn, praat de groep rustig door met voorbeelden uit de buurt. ${closer(generalClosers, 4)}`
      ];
      const pages = [];
      for (let index = 0; index < 5; index += 1) {
        const targets = vocab.slice(index * 2, index * 2 + 2);
        pages.push({
          scene: scenes[index],
          targets,
          text: pageTemplates[index](targets[0], targets[1], scenes[index])
        });
      }
      const glossaryPairs = vocab.map((word) => [word, getCoverageDefinition(word)]);
      const [w1, w2, w3, w4, w5, w6, w7, w8, w9, w10] = vocab;
      const quiz = isNature ? [
        {
          question: `Waarom gaat Mila met haar taalgroep naar buiten bij "${title}"?`,
          options: [
            "Omdat ze de woorden beter begrijpt wanneer ze de omgeving ziet.",
            "Omdat ze de les wil overslaan.",
            "Omdat de gids geen uitleg wil geven.",
            "Omdat het verhaal alleen over schoolregels gaat."
          ],
          answer: "Omdat ze de woorden beter begrijpt wanneer ze de omgeving ziet.",
          explanation: `Aan het begin ziet Mila de omgeving zelf, waardoor woorden zoals ${w1} en ${w2} een duidelijke plek krijgen.`,
          relatedWords: [w1, w2]
        },
        {
          question: "Wat doet Mila wanneer een klasgenoot een vraag stelt langs het pad?",
          options: [
            "Ze luistert verder en begrijpt de situatie achter de woorden beter.",
            "Ze loopt meteen alleen terug naar huis.",
            "Ze zegt dat de wandeling geen taalles is.",
            "Ze vraagt de groep om te stoppen met oefenen."
          ],
          answer: "Ze luistert verder en begrijpt de situatie achter de woorden beter.",
          explanation: `De wandeling wordt een taalles, omdat Mila hoort hoe ${w3} en ${w4} in een echte situatie worden gebruikt.`,
          relatedWords: [w3, w4]
        },
        {
          question: `Wat betekent "${w5}" ongeveer in dit verhaal?`,
          options: [
            getCoverageDefinition(w5),
            getCoverageDefinition(w6),
            "een afspraak die niets met de tekst te maken heeft",
            "een persoon die de les helemaal niet volgt"
          ],
          answer: getCoverageDefinition(w5),
          explanation: `In het verhaal gebruikt Mila "${w5}" bij een concreet detail in de natuur.`,
          relatedWords: [w5, w6]
        },
        {
          question: "Waarom vergelijkt Mila de uitleg van de beheerder met haar eigen straat?",
          options: [
            "Zo voelt het onderwerp minder ver weg en begrijpt ze de regel beter.",
            "Zo kan ze bewijzen dat de beheerder ongelijk heeft.",
            "Zo hoeft ze de nieuwe woorden niet te leren.",
            "Zo verandert ze het natuurgebied in een winkelstraat."
          ],
          answer: "Zo voelt het onderwerp minder ver weg en begrijpt ze de regel beter.",
          explanation: `Door de vergelijking worden ${w7} en ${w8} niet alleen moeilijke woorden, maar woorden met betekenis.`,
          relatedWords: [w7, w8]
        },
        {
          question: "Wat neemt Mila mee terug naar de les?",
          options: [
            "Ze bewaart voorbeeldzinnen en oefent de moeilijke woorden rustig verder.",
            "Ze vergeet de wandeling meteen.",
            "Ze leert alleen de namen van de andere cursisten.",
            "Ze besluit dat natuurwoorden niet nuttig zijn."
          ],
          answer: "Ze bewaart voorbeeldzinnen en oefent de moeilijke woorden rustig verder.",
          explanation: `Aan het einde maakt Mila zinnen met ${w9} en ${w10}, zodat de woorden bruikbaar blijven.`,
          relatedWords: [w9, w10]
        }
      ] : [
        {
          question: `Waar begint het gesprek over "${title}"?`,
          options: [
            "In het buurthuis, waar Mila uitleg met herkenbare voorbeelden krijgt.",
            "Op een vliegveld, waar niemand Nederlands oefent.",
            "In een museumzaal zonder andere cursisten.",
            "In een winkel waar Mila niets vraagt."
          ],
          answer: "In het buurthuis, waar Mila uitleg met herkenbare voorbeelden krijgt.",
          explanation: `Mila hoort ${w1} en ${w2} niet als losse woorden, maar in een gewone situatie.`,
          relatedWords: [w1, w2]
        },
        {
          question: "Waarom durft Mila aan tafel om herhaling te vragen?",
          options: [
            "Omdat het gesprek rustig blijft en de andere cursisten ook oefenen.",
            "Omdat iedereen haast heeft.",
            "Omdat zij de woorden al perfect kent.",
            "Omdat de buurvrouw geen antwoord geeft."
          ],
          answer: "Omdat het gesprek rustig blijft en de andere cursisten ook oefenen.",
          explanation: `De rustige sfeer helpt Mila om woorden zoals ${w3} en ${w4} precieser te gebruiken.`,
          relatedWords: [w3, w4]
        },
        {
          question: `Wat betekent "${w5}" ongeveer in dit verhaal?`,
          options: [
            getCoverageDefinition(w5),
            getCoverageDefinition(w6),
            "een plaats waar niemand praat",
            "een geluid zonder betekenis"
          ],
          answer: getCoverageDefinition(w5),
          explanation: `De betekenis van "${w5}" wordt duidelijk door het praktische voorbeeld in de groep.`,
          relatedWords: [w5, w6]
        },
        {
          question: "Waarom onderstreept Mila woorden tijdens de afspraak?",
          options: [
            "Omdat niet elk woord letterlijk in het formulier staat en ze duidelijke zinnen wil maken.",
            "Omdat ze het formulier wil weggooien.",
            "Omdat ze geen hulp van een klasgenoot wil.",
            "Omdat de afspraak niets met taal te maken heeft."
          ],
          answer: "Omdat niet elk woord letterlijk in het formulier staat en ze duidelijke zinnen wil maken.",
          explanation: `Met ${w7} en ${w8} oefent Mila niet alleen losse woorden, maar ook natuurlijk Nederlands.`,
          relatedWords: [w7, w8]
        },
        {
          question: "Wat is de belangrijkste les aan het einde van het verhaal?",
          options: [
            "Moeilijke woorden worden makkelijker wanneer Mila ze aan haar eigen leven koppelt.",
            "Mila hoeft de woorden na de les niet meer te gebruiken.",
            "Voorbeelden uit de buurt maken de les onduidelijker.",
            "Alle cursisten moeten precies dezelfde zin maken."
          ],
          answer: "Moeilijke woorden worden makkelijker wanneer Mila ze aan haar eigen leven koppelt.",
          explanation: `Door zinnen met ${w9} en ${w10} te maken, blijven de woorden begrijpelijk en nuttig.`,
          relatedWords: [w9, w10]
        }
      ];
      stories[key] = makeStory(chapter, title, vocab, pages, glossaryPairs, quiz, color);
      stories[key].pages.forEach((page) => {
        page.imageUrl = `assets/storybook-photo-v1/${storySlug(key)}/page-${String((stories[key].pages.indexOf(page) % 5) + 1).padStart(2, "0")}.jpg`;
      });
    }

    [
      ["1-Geluk in cijfers", "Thema 1 - De maatschappij", "Geluk in cijfers", ["levensgeluk","levensverwachting","levensvreugde","ranglijst","rapportcijfer","respondent","welbevinden","wereldranglijst","voorspoed","veerkrachtig"], "#7c3aed", "1-gelukkig-zijn"],
      ["1-Moeilijke dagen", "Thema 1 - De maatschappij", "Moeilijke dagen", ["een lekke band hebben","het hoofd boven water kunnen houden","Het is verre van perfect","Het kan je zomaar overkomen","Het komt niet uit","Het maakt niet uit","Hij redt het niet alleen","iets aan jezelf te wijten hebben","in de file staan","in de steek laten"], "#7c3aed", "1-gelukkig-zijn"],
      ["1-Hulp op straat", "Thema 1 - De maatschappij", "Hulp op straat", ["arbeidsongeschiktheid","coronapandemie","crisissituatie","gegevens","gigantisch","middelen","verzuim","vervangend","voorziening","voorzien van"], "#7c3aed", "1-een-streetarts"],
      ["1-Terug naar werk", "Thema 1 - De maatschappij", "Terug naar werk", ["passend werk","re-integratie","werkloosheid","werkonderbreking","werkzoekende","vooruit kunnen","uitkering","arbeidsmarkt","aanvragen","aarzelen"], "#7c3aed", "1-het-uwv"],
      ["1-Regels en rechten", "Thema 1 - De maatschappij", "Regels en rechten", ["legaliseren","naleven","onomstreden","spelregel","toezien op","verantwoordelijkheid","verantwoordelijk zijn voor","vergunning","samenleving","cultuurverschil"], "#7c3aed", "1-het-uwv"],
      ["1-De buurt praat mee", "Thema 1 - De maatschappij", "De buurt praat mee", ["onderhandelen met over","onder meer","staking","De vakbond behartigt de belangen van de werknemers","contact opnemen met","de menselijke maat","in kaart brengen","Uit onderzoek blijkt dat","aanzienlijk","bevorderen"], "#7c3aed", "1-buurtbewoners"],
      ["1-Samen vooruit", "Thema 1 - De maatschappij", "Samen vooruit", ["deelnemen aan","dienen te","dienstverlener","dienstverlening","doorverwijzen","erbij horen","ondersteunen","ondersteuning","terecht kunnen bij","Waarmee kan ik u van dienst zijn"], "#7c3aed", "1-buurtbewoners"],
      ["1-Weekend in de wijk", "Thema 1 - De maatschappij", "Weekend in de wijk", ["in het verleden leven","om het weekend","voor de regen schuilen","contact opnemen met","vooruit kunnen","werkzoekende","gegevens","middelen","levensvreugde","erbij horen"], "#7c3aed", "1-buurtbewoners"],

      ["2-Wandelen door het park", "Thema 2 - Natuur en klimaat", "Wandelen door het park", ["actieradius","afgrond","afwisselen","allerlei","beek","beekje","begroeid met","bergachtig","berm","bestand tegen"], "#86b89f", "2-nationale-parken"],
      ["2-De beheerder vertelt", "Thema 2 - Natuur en klimaat", "De beheerder vertelt", ["betrokken","boomstronk","bosrijk","bovendien","daadkrachtig","deprimerend","dichtbevolkt","dunbevolkt","doorgaans","dwars door"], "#86b89f", "2-nationale-parken"],
      ["2-Heide en heuvels", "Thema 2 - Natuur en klimaat", "Heide en heuvels", ["heftig","heide","heuvel","heuvelachtig","hoogtevrees","indrukwekkend","investering","inzien","kaal","klapstoel"], "#86b89f", "2-nationale-parken"],
      ["2-Dieren veilig over", "Thema 2 - Natuur en klimaat", "Dieren veilig over", ["ecoduct","ernst","extreem","fauna","flora","gebied","gebrek aan","gemiddelde","gevarieerd","glooiend"], "#86b89f", "2-een-ecoduct"],
      ["2-Natuur onder druk", "Thema 2 - Natuur en klimaat", "Natuur onder druk", ["mild","monotoon","naaldboom","omgeving","onbewoond","onder druk staan","onstuimig","opraken","opslaan","opvang"], "#86b89f", "2-een-ecoduct"],
      ["2-Routes zonder overleg", "Thema 2 - Natuur en klimaat", "Routes zonder overleg", ["een lust voor het oog zijn","eropuit trekken","Het antwoord blijft uit","Het bruist van de activiteiten","met tientallen tegelijk","nauw samenwerken","van invloed zijn op","zonder overleg","aanleggen","beschermen"], "#86b89f", "2-een-ecoduct"],
      ["2-Water in droge tijden", "Thema 2 - Natuur en klimaat", "Water in droge tijden", ["overbrugging","overheid","overzicht","piek","pittoresk","plas","plat","prachtig","recreatie","recreëren"], "#86b89f", "2-drinkwatertekort"],
      ["2-Sloten en rivieren", "Thema 2 - Natuur en klimaat", "Sloten en rivieren", ["sloot","stromen","tegenkomen","toestemming","top","uitblijven","uitkomst","uitstellen","vanzelfsprekend","vasthouden aan"], "#86b89f", "2-drinkwatertekort"],
      ["2-Zuinig met water", "Thema 2 - Natuur en klimaat", "Zuinig met water", ["voorzien van","vruchtbaar","wateronttrekking","wateroverlast","waterrijk","waterverbruik","wei","wild","woestijnachtig","zanderig"], "#86b89f", "2-drinkwatertekort"],
      ["2-Kleurrijke landschappen", "Thema 2 - Natuur en klimaat", "Kleurrijke landschappen", ["kleurrijk","klinken","kloof","landklimaat","landschap","langdurig","lieflijk","loofboom","meer","meertje"], "#86b89f", "2-de-keukenhof"],
      ["2-Eropuit in het voorjaar", "Thema 2 - Natuur en klimaat", "Eropuit in het voorjaar", ["vaststellen","veerkrachtig","vergunning","verschuiven","versnipperd","versperd","vervuild raken","vlak","volstaan","voorraad"], "#86b89f", "2-de-keukenhof"],
      ["2-Regen en recreatie", "Thema 2 - Natuur en klimaat", "Regen en recreatie", ["regenbui","regenwoud","rijk aan","rivier","riviertje","ruig","ruiter","saai","schilderachtig","schitterend"], "#86b89f", "2-de-keukenhof"],
      ["2-Zorg voor klimaat", "Thema 2 - Natuur en klimaat", "Zorg voor klimaat", ["zeeklimaat","zelfs","zorgvuldig","zuinig","zuiveren","aan de extra vraag voldoen","al dan niet","beschutting zoeken","bomen kappen","de rode loper voor iemand uitrollen"], "#86b89f", "2-druk-in-de-natuur"]
    ].forEach(([key, chapter, title, vocab, color, imageKey]) => addCoverageStory(key, chapter, title, vocab, color, imageKey));

    // BEGIN THEMA 5-6 IMPORTED STORIES
    // Thema 5-6 imported text drafts. Generated from content-drafts/thema-*-text-draft-v2.md.
    const theme56Imported = {
      "stories": {
            "5-Bij het wijkloket": {
                  "chapter": "Thema 5 - Infrastructuur en planologie",
                  "title": "Bij het wijkloket",
                  "vocab": [
                        "aanvaring",
                        "acceptabel",
                        "achterstand",
                        "afdoende",
                        "afgelegen",
                        "beleid",
                        "beleidsontwikkeling",
                        "beschikken over",
                        "beschouwen",
                        "bespreekbaar"
                  ],
                  "pages": [
                        {
                              "scene": "Pagina 1",
                              "targets": [
                                    "aanvaring",
                                    "acceptabel"
                              ],
                              "text": "Mila gaat naar het wijkloket, omdat er gisteren een kleine aanvaring was over fietsen in de gang. De toon van het gesprek blijft acceptabel. Iedereen krijgt koffie. Terwijl de medewerker luistert, legt Mila uit dat veel nieuwkomers de huisregels nog leren."
                        },
                        {
                              "scene": "Pagina 2",
                              "targets": [
                                    "achterstand",
                                    "afdoende"
                              ],
                              "text": "Omdat Mila de brieven van de woningbouw soms laat begrijpt, heeft zij een kleine achterstand. Een korte uitleg aan tafel is afdoende. De medewerker print het formulier. Wanneer Mila de stappen hardop herhaalt, merkt zij dat de spanning zakt."
                        },
                        {
                              "scene": "Pagina 3",
                              "targets": [
                                    "afgelegen",
                                    "beleid"
                              ],
                              "text": "Het spreekuur is handig voor bewoners die in een afgelegen deel van de wijk wonen. Het nieuwe beleid moet duidelijker worden. Mila schrijft drie woorden op. Als de medewerker voorbeelden uit de straat gebruikt, begrijpt de groep sneller wat er verandert."
                        },
                        {
                              "scene": "Pagina 4",
                              "targets": [
                                    "beleidsontwikkeling",
                                    "beschikken over"
                              ],
                              "text": "Bij de beleidsontwikkeling vraagt de gemeente bewoners wat zij dagelijks nodig hebben. Mila wil beschikken over goede informatie. De buurman knikt rustig. Omdat de regels invloed hebben op huurders, mogen bewoners zelf voorbeelden noemen."
                        },
                        {
                              "scene": "Pagina 5",
                              "targets": [
                                    "beschouwen",
                                    "bespreekbaar"
                              ],
                              "text": "Mila leert dat de gemeente klachten niet meteen als ruzie hoeft te beschouwen. Het probleem wordt bespreekbaar. De groep sluit de avond af. Wanneer zij naar huis fietst, voelt Mila dat de wijk minder vreemd is geworden."
                        }
                  ],
                  "glossary": [
                        [
                              "aanvaring",
                              "botsing of stevig conflict"
                        ],
                        [
                              "acceptabel",
                              "goed genoeg"
                        ],
                        [
                              "achterstand",
                              "situatie waarin iemand achterloopt"
                        ],
                        [
                              "afdoende",
                              "genoeg om een probleem op te lossen"
                        ],
                        [
                              "afgelegen",
                              "ver weg van andere plekken"
                        ],
                        [
                              "beleid",
                              "plan met regels en keuzes"
                        ],
                        [
                              "beleidsontwikkeling",
                              "het maken of aanpassen van beleid"
                        ],
                        [
                              "beschikken over",
                              "kunnen gebruiken of hebben"
                        ],
                        [
                              "beschouwen",
                              "zien als"
                        ],
                        [
                              "bespreekbaar",
                              "iets waarover je kunt praten."
                        ]
                  ],
                  "quiz": [
                        {
                              "question": "Wat doet Mila aan het begin van het verhaal?",
                              "options": [
                                    "Omdat er een gesprek is na een aanvaring over fietsen in de gang.",
                                    "Omdat zij een nieuwe fiets wil kopen.",
                                    "Omdat zij een feest organiseert.",
                                    "Omdat de woningbouw gesloten is."
                              ],
                              "answer": "Omdat er een gesprek is na een aanvaring over fietsen in de gang.",
                              "explanation": "Het verhaal begint met een kleine aanvaring over fietsen in de gang.",
                              "relatedWords": [
                                    "aanvaring",
                                    "acceptabel"
                              ]
                        },
                        {
                              "question": "Wat helpt Mila bij haar achterstand met brieven?",
                              "options": [
                                    "Een korte uitleg aan tafel.",
                                    "Een dure cursus in Amsterdam.",
                                    "Een nieuwe telefoon.",
                                    "Een gesprek zonder formulier."
                              ],
                              "answer": "Een korte uitleg aan tafel.",
                              "explanation": "De medewerker legt de stappen rustig uit en print het formulier.",
                              "relatedWords": [
                                    "achterstand",
                                    "afdoende"
                              ]
                        },
                        {
                              "question": "Voor wie is het spreekuur extra handig?",
                              "options": [
                                    "Voor bewoners die afgelegen wonen.",
                                    "Voor mensen die nooit vragen hebben.",
                                    "Voor toeristen in de stad.",
                                    "Voor kinderen zonder ouders."
                              ],
                              "answer": "Voor bewoners die afgelegen wonen.",
                              "explanation": "Het spreekuur helpt bewoners uit een afgelegen deel van de wijk.",
                              "relatedWords": [
                                    "afgelegen",
                                    "beleid"
                              ]
                        },
                        {
                              "question": "Wat wil de gemeente met voorbeelden van bewoners beter begrijpen?",
                              "options": [
                                    "Omdat regels invloed hebben op hun dagelijks leven.",
                                    "Omdat bewoners de regels moeten maken zonder hulp.",
                                    "Omdat de medewerker geen tijd heeft.",
                                    "Omdat de brieven al duidelijk genoeg zijn."
                              ],
                              "answer": "Omdat regels invloed hebben op hun dagelijks leven.",
                              "explanation": "Beleidsontwikkeling wordt concreter als bewoners hun ervaringen delen.",
                              "relatedWords": [
                                    "beleidsontwikkeling",
                                    "beschikken over"
                              ]
                        },
                        {
                              "question": "Wat verandert voor Mila aan het einde?",
                              "options": [
                                    "De wijk voelt minder vreemd.",
                                    "Zij verhuist meteen naar een andere stad.",
                                    "Zij stopt met Nederlands leren.",
                                    "Zij wil geen buren meer spreken."
                              ],
                              "answer": "De wijk voelt minder vreemd.",
                              "explanation": "Doordat het probleem bespreekbaar wordt, voelt Mila zich meer thuis.",
                              "relatedWords": [
                                    "beschouwen",
                                    "bespreekbaar"
                              ]
                        }
                  ],
                  "color": "#9b6aa8",
                  "subsection": "Maatschappelijke ondersteuning"
            },
            "5-Een wijk die groeit": {
                  "chapter": "Thema 5 - Infrastructuur en planologie",
                  "title": "Een wijk die groeit",
                  "vocab": [
                        "bevolking",
                        "bevolkingsgroei",
                        "botbreuk",
                        "directie",
                        "drempel",
                        "evenals",
                        "fenomeen",
                        "hemelsbreed",
                        "infrastructuur",
                        "inzet"
                  ],
                  "pages": [
                        {
                              "scene": "Pagina 1",
                              "targets": [
                                    "bevolking",
                                    "bevolkingsgroei"
                              ],
                              "text": "Omdat de bevolking in de wijk groeit, organiseert het buurthuis een avond over ruimte. De bevolkingsgroei is zichtbaar op straat. Er komen nieuwe fietsenrekken bij. Terwijl Mila naar de kaart kijkt, vertelt een planner waar nieuwe woningen kunnen komen."
                        },
                        {
                              "scene": "Pagina 2",
                              "targets": [
                                    "botbreuk",
                                    "directie"
                              ],
                              "text": "Een oudere buurvrouw heeft een botbreuk, omdat zij over een losse stoeptegel viel. De directie van de woningbouw komt luisteren. Mila schuift haar stoel dichterbij. Wanneer de buurvrouw haar foto laat zien, wordt het probleem voor iedereen duidelijk."
                        },
                        {
                              "scene": "Pagina 3",
                              "targets": [
                                    "drempel",
                                    "evenals"
                              ],
                              "text": "Voor veel bewoners is de drempel laag, omdat de avond in gewone taal wordt gehouden. Mila stelt een vraag, evenals haar buurman. De zaal blijft rustig. Als iemand te snel praat, vraagt de begeleider vriendelijk om een voorbeeld."
                        },
                        {
                              "scene": "Pagina 4",
                              "targets": [
                                    "fenomeen",
                                    "hemelsbreed"
                              ],
                              "text": "De planner noemt drukte rond scholen een bekend fenomeen, terwijl hij rode punten op de kaart zet. De nieuwe school ligt hemelsbreed dichtbij. De route is toch lang. Omdat er water en spoor tussen liggen, moeten kinderen vaak omrijden."
                        },
                        {
                              "scene": "Pagina 5",
                              "targets": [
                                    "infrastructuur",
                                    "inzet"
                              ],
                              "text": "De infrastructuur moet beter worden, omdat fietsen en bussen nu vaak vastlopen. De inzet van bewoners maakt indruk. Mila noteert de afspraken. Wanneer zij later naar huis loopt, ziet zij dezelfde straten met andere ogen."
                        }
                  ],
                  "glossary": [
                        [
                              "bevolking",
                              "alle mensen die ergens wonen"
                        ],
                        [
                              "bevolkingsgroei",
                              "groei van het aantal inwoners"
                        ],
                        [
                              "botbreuk",
                              "gebroken bot"
                        ],
                        [
                              "directie",
                              "leiding van een organisatie"
                        ],
                        [
                              "drempel",
                              "stap of hindernis om iets te doen"
                        ],
                        [
                              "evenals",
                              "net als"
                        ],
                        [
                              "fenomeen",
                              "opvallend verschijnsel"
                        ],
                        [
                              "hemelsbreed",
                              "in rechte lijn gemeten"
                        ],
                        [
                              "infrastructuur",
                              "wegen, bruggen en verbindingen"
                        ],
                        [
                              "inzet",
                              "moeite die iemand doet."
                        ]
                  ],
                  "quiz": [
                        {
                              "question": "Welke verandering zorgt voor een avond over ruimte?",
                              "options": [
                                    "Omdat de bevolking in de wijk groeit.",
                                    "Omdat er een muziekfeest komt.",
                                    "Omdat Mila alleen wil oefenen.",
                                    "Omdat de winkels eerder sluiten."
                              ],
                              "answer": "Omdat de bevolking in de wijk groeit.",
                              "explanation": "De avond gaat over ruimte door bevolkingsgroei.",
                              "relatedWords": [
                                    "bevolking",
                                    "bevolkingsgroei"
                              ]
                        },
                        {
                              "question": "Wat maakt het probleem met de stoep dringend?",
                              "options": [
                                    "Een buurvrouw viel door een losse stoeptegel.",
                                    "Een buurman verloor zijn fiets.",
                                    "De school heeft nieuwe boeken nodig.",
                                    "Het buurthuis wil verhuizen."
                              ],
                              "answer": "Een buurvrouw viel door een losse stoeptegel.",
                              "explanation": "De botbreuk maakt het probleem met de stoep concreet.",
                              "relatedWords": [
                                    "botbreuk",
                                    "directie"
                              ]
                        },
                        {
                              "question": "Wat maakt de drempel tijdens de avond laag?",
                              "options": [
                                    "De bijeenkomst wordt in gewone taal gehouden.",
                                    "De begeleider spreekt alleen Engels.",
                                    "Iedereen krijgt een toets.",
                                    "De zaal is leeg."
                              ],
                              "answer": "De bijeenkomst wordt in gewone taal gehouden.",
                              "explanation": "De drempel is laag door duidelijke taal.",
                              "relatedWords": [
                                    "drempel",
                                    "evenals"
                              ]
                        },
                        {
                              "question": "Wat maakt de route naar de school toch lang?",
                              "options": [
                                    "Er liggen water en spoor tussen.",
                                    "De school is in een andere provincie.",
                                    "Er rijden geen fietsen in Groningen.",
                                    "De kaart klopt niet."
                              ],
                              "answer": "Er liggen water en spoor tussen.",
                              "explanation": "Hemelsbreed is de school dichtbij, maar de echte route is langer.",
                              "relatedWords": [
                                    "fenomeen",
                                    "hemelsbreed"
                              ]
                        },
                        {
                              "question": "Waardoor ziet Mila de straten later anders?",
                              "options": [
                                    "Zij begrijpt beter hoe infrastructuur en inzet samenhangen.",
                                    "Zij heeft nieuwe schoenen gekocht.",
                                    "Zij is de route vergeten.",
                                    "Zij wil niet meer naar bijeenkomsten."
                              ],
                              "answer": "Zij begrijpt beter hoe infrastructuur en inzet samenhangen.",
                              "explanation": "Door het gesprek begrijpt Mila de wijk beter.",
                              "relatedWords": [
                                    "infrastructuur",
                                    "inzet"
                              ]
                        }
                  ],
                  "color": "#9b6aa8",
                  "subsection": "Is Nederland vol?"
            },
            "5-Veilig door de buurt": {
                  "chapter": "Thema 5 - Infrastructuur en planologie",
                  "title": "Veilig door de buurt",
                  "vocab": [
                        "klantvriendelijk",
                        "kwalijk",
                        "kwetsbaar",
                        "leefbaarheid",
                        "namens",
                        "nauw",
                        "nauwelijks",
                        "nieuwsbrief",
                        "omfietsen",
                        "onderling"
                  ],
                  "pages": [
                        {
                              "scene": "Pagina 1",
                              "targets": [
                                    "klantvriendelijk",
                                    "kwalijk"
                              ],
                              "text": "Mila belt de gemeente, omdat zij wil weten wanneer de kapotte lamp wordt gemaakt. De medewerker klinkt klantvriendelijk. Het lange wachten vindt zij kwalijk. Terwijl zij haar melding noteert, vraagt hij of meer bewoners dezelfde plek onveilig vinden."
                        },
                        {
                              "scene": "Pagina 2",
                              "targets": [
                                    "kwetsbaar",
                                    "leefbaarheid"
                              ],
                              "text": "Omdat de stoep donker is, voelt wie kwetsbaar is zich niet veilig. De leefbaarheid van de straat gaat omlaag. Mila ziet lege fietsenrekken. Wanneer de straat beter verlicht is, durven mensen weer later naar huis te lopen."
                        },
                        {
                              "scene": "Pagina 3",
                              "targets": [
                                    "namens",
                                    "nauw"
                              ],
                              "text": "Mila spreekt namens drie buren, omdat zij hun opmerkingen heeft verzameld. Zij leest de namen nauw voor. De ambtenaar luistert aandachtig. Als iemand een datum niet weet, controleert Mila rustig de appgroep."
                        },
                        {
                              "scene": "Pagina 4",
                              "targets": [
                                    "nauwelijks",
                                    "nieuwsbrief"
                              ],
                              "text": "De melding viel nauwelijks op, omdat hij alleen op een kleine website stond. Mila vraagt om een nieuwsbrief. De buurman maakt thee. Wanneer de informatie per mail komt, kunnen meer bewoners op tijd reageren."
                        },
                        {
                              "scene": "Pagina 5",
                              "targets": [
                                    "omfietsen",
                                    "onderling"
                              ],
                              "text": "Tot de lamp gemaakt is, moeten kinderen omfietsen langs de brede weg. De buren spreken onderling een veilige route af. Mila tekent de route. Omdat iedereen een stukje helpt, voelt de straat meteen minder anoniem."
                        }
                  ],
                  "glossary": [
                        [
                              "klantvriendelijk",
                              "vriendelijk voor mensen die hulp vragen"
                        ],
                        [
                              "kwalijk",
                              "niet goed of moeilijk te accepteren"
                        ],
                        [
                              "kwetsbaar",
                              "snel in gevaar of snel geraakt"
                        ],
                        [
                              "leefbaarheid",
                              "hoe prettig en veilig een buurt is"
                        ],
                        [
                              "namens",
                              "in naam van"
                        ],
                        [
                              "nauw",
                              "precies en zorgvuldig"
                        ],
                        [
                              "nauwelijks",
                              "bijna niet"
                        ],
                        [
                              "nieuwsbrief",
                              "bericht met nieuws"
                        ],
                        [
                              "omfietsen",
                              "een langere fietsroute nemen"
                        ],
                        [
                              "onderling",
                              "tussen elkaar."
                        ]
                  ],
                  "quiz": [
                        {
                              "question": "Waarover belt Mila de gemeente?",
                              "options": [
                                    "Zij wil weten wanneer de kapotte lamp wordt gemaakt.",
                                    "Zij wil een paspoort aanvragen.",
                                    "Zij zoekt een nieuwe school.",
                                    "Zij wil een fiets verkopen."
                              ],
                              "answer": "Zij wil weten wanneer de kapotte lamp wordt gemaakt.",
                              "explanation": "De melding gaat over straatverlichting.",
                              "relatedWords": [
                                    "klantvriendelijk",
                                    "kwalijk"
                              ]
                        },
                        {
                              "question": "Wie voelen zich vooral onveilig op de donkere stoep?",
                              "options": [
                                    "Kwetsbare bewoners.",
                                    "Alleen sporters.",
                                    "Toeristen in het centrum.",
                                    "De medewerkers van de gemeente."
                              ],
                              "answer": "Kwetsbare bewoners.",
                              "explanation": "De tekst noemt kwetsbare bewoners bij de donkere stoep.",
                              "relatedWords": [
                                    "kwetsbaar",
                                    "leefbaarheid"
                              ]
                        },
                        {
                              "question": "Hoe spreekt Mila namens de buren?",
                              "options": [
                                    "Zij verzamelt hun opmerkingen en leest de namen nauw voor.",
                                    "Zij verzint zelf nieuwe klachten.",
                                    "Zij laat de buren buiten wachten.",
                                    "Zij stuurt alleen een foto."
                              ],
                              "answer": "Zij verzamelt hun opmerkingen en leest de namen nauw voor.",
                              "explanation": "Mila gebruikt informatie uit de appgroep en spreekt zorgvuldig.",
                              "relatedWords": [
                                    "namens",
                                    "nauw"
                              ]
                        },
                        {
                              "question": "Wat is het probleem met de melding op de website?",
                              "options": [
                                    "De melding op de website valt nauwelijks op.",
                                    "Zij wil reclame ontvangen.",
                                    "Zij wil minder informatie.",
                                    "De buurman heeft geen internet."
                              ],
                              "answer": "De melding op de website valt nauwelijks op.",
                              "explanation": "Een nieuwsbrief bereikt meer bewoners.",
                              "relatedWords": [
                                    "nauwelijks",
                                    "nieuwsbrief"
                              ]
                        },
                        {
                              "question": "Wat spreken de buren onderling af?",
                              "options": [
                                    "Een veilige fietsroute.",
                                    "Een nieuwe huurprijs.",
                                    "Een schoolfeest.",
                                    "Een reis naar Amsterdam."
                              ],
                              "answer": "Een veilige fietsroute.",
                              "explanation": "Tot de lamp gemaakt is, kiezen zij samen een veiligere route.",
                              "relatedWords": [
                                    "omfietsen",
                                    "onderling"
                              ]
                        }
                  ],
                  "color": "#9b6aa8",
                  "subsection": "Maatschappelijke ondersteuning"
            },
            "5-Naar school en terug": {
                  "chapter": "Thema 5 - Infrastructuur en planologie",
                  "title": "Naar school en terug",
                  "vocab": [
                        "ondersteuning",
                        "ongeval",
                        "opheffen",
                        "ouderavond",
                        "ouderraad",
                        "ov-abonnement",
                        "overigens",
                        "pendelbus",
                        "pendelen",
                        "petitie"
                  ],
                  "pages": [
                        {
                              "scene": "Pagina 1",
                              "targets": [
                                    "ondersteuning",
                                    "ongeval"
                              ],
                              "text": "Omdat er bij de school een ongeval is gebeurd, vraagt de directeur extra ondersteuning. Mila helpt bij de vertaling. De ouders zijn geschrokken. Terwijl de kinderen buiten spelen, bespreekt de groep een veiligere route."
                        },
                        {
                              "scene": "Pagina 2",
                              "targets": [
                                    "opheffen",
                                    "ouderavond"
                              ],
                              "text": "De gemeente wil de halte opheffen, omdat er volgens de telling weinig mensen instappen. De school plant een ouderavond. Mila neemt haar agenda mee. Wanneer ouders hun verhalen delen, blijkt dat de telling niet alles laat zien."
                        },
                        {
                              "scene": "Pagina 3",
                              "targets": [
                                    "ouderraad",
                                    "ov-abonnement"
                              ],
                              "text": "De ouderraad schrijft een brief, omdat veel kinderen afhankelijk zijn van de bus. Mila toont haar ov-abonnement. De voorzitter maakt kopieën. Als andere ouders hetzelfde doen, krijgt de brief meer gewicht."
                        },
                        {
                              "scene": "Pagina 4",
                              "targets": [
                                    "overigens",
                                    "pendelbus"
                              ],
                              "text": "Overigens komt de pendelbus vaak te vroeg, waardoor kinderen hem net missen. De chauffeur kent de route goed. Mila wacht bij de halte. Omdat de tijden niet passen bij school, vragen ouders om een kleine aanpassing."
                        },
                        {
                              "scene": "Pagina 5",
                              "targets": [
                                    "pendelen",
                                    "petitie"
                              ],
                              "text": "Veel ouders pendelen dagelijks tussen werk, school en thuis. De petitie ligt op tafel. Mila tekent als laatste. Wanneer de directeur de handtekeningen aanbiedt, blijft de halte voorlopig open."
                        }
                  ],
                  "glossary": [
                        [
                              "ondersteuning",
                              "hulp"
                        ],
                        [
                              "ongeval",
                              "ongeluk"
                        ],
                        [
                              "opheffen",
                              "stoppen of sluiten"
                        ],
                        [
                              "ouderavond",
                              "avond waarop ouders informatie krijgen"
                        ],
                        [
                              "ouderraad",
                              "groep ouders die meedenkt met school"
                        ],
                        [
                              "ov-abonnement",
                              "abonnement voor bus, tram of trein"
                        ],
                        [
                              "overigens",
                              "trouwens"
                        ],
                        [
                              "pendelbus",
                              "bus die steeds heen en terug rijdt"
                        ],
                        [
                              "pendelen",
                              "regelmatig heen en weer reizen"
                        ],
                        [
                              "petitie",
                              "lijst met handtekeningen voor een verzoek."
                        ]
                  ],
                  "quiz": [
                        {
                              "question": "Wat is er bij de school gebeurd?",
                              "options": [
                                    "Er is een ongeval bij de school gebeurd.",
                                    "De kinderen willen langer vakantie.",
                                    "De bus is nieuw.",
                                    "Mila zoekt een baan."
                              ],
                              "answer": "Er is een ongeval bij de school gebeurd.",
                              "explanation": "Het ongeval maakt de schoolroute urgent.",
                              "relatedWords": [
                                    "ondersteuning",
                                    "ongeval"
                              ]
                        },
                        {
                              "question": "Wat laten de verhalen van ouders zien?",
                              "options": [
                                    "De verhalen van ouders laten meer zien.",
                                    "De telling gaat over fietsen.",
                                    "De ouderavond wordt afgelast.",
                                    "Niemand gebruikt de halte."
                              ],
                              "answer": "De verhalen van ouders laten meer zien.",
                              "explanation": "Op de ouderavond blijkt dat cijfers niet het hele verhaal vertellen.",
                              "relatedWords": [
                                    "opheffen",
                                    "ouderavond"
                              ]
                        },
                        {
                              "question": "Wat gebruikt Mila als voorbeeld bij de brief?",
                              "options": [
                                    "Haar ov-abonnement.",
                                    "Haar boodschappenlijst.",
                                    "Een oude foto van school.",
                                    "Een kaart van Nederland."
                              ],
                              "answer": "Haar ov-abonnement.",
                              "explanation": "Het ov-abonnement laat zien dat de bus echt nodig is.",
                              "relatedWords": [
                                    "ouderraad",
                                    "ov-abonnement"
                              ]
                        },
                        {
                              "question": "Wat is het probleem met de pendelbus?",
                              "options": [
                                    "Hij komt vaak te vroeg.",
                                    "Hij rijdt alleen naar Duitsland.",
                                    "Hij heeft geen chauffeur.",
                                    "Hij stopt bij elke winkel."
                              ],
                              "answer": "Hij komt vaak te vroeg.",
                              "explanation": "Daardoor missen kinderen de bus net.",
                              "relatedWords": [
                                    "overigens",
                                    "pendelbus"
                              ]
                        },
                        {
                              "question": "Wat gebeurt er na de petitie?",
                              "options": [
                                    "De halte blijft voorlopig open.",
                                    "De school sluit meteen.",
                                    "De ouders stoppen met praten.",
                                    "Mila verhuist naar het station."
                              ],
                              "answer": "De halte blijft voorlopig open.",
                              "explanation": "De handtekeningen helpen om de halte open te houden.",
                              "relatedWords": [
                                    "pendelen",
                                    "petitie"
                              ]
                        }
                  ],
                  "color": "#9b6aa8",
                  "subsection": "Auto en openbaar vervoer"
            },
            "5-Over water en door groen": {
                  "chapter": "Thema 5 - Infrastructuur en planologie",
                  "title": "Over water en door groen",
                  "vocab": [
                        "planologie",
                        "plantsoen",
                        "pontje",
                        "respectievelijk",
                        "schipper",
                        "schrappen",
                        "spandoek",
                        "straatverlichting",
                        "uitgangspunt",
                        "veerpont"
                  ],
                  "pages": [
                        {
                              "scene": "Pagina 1",
                              "targets": [
                                    "planologie",
                                    "plantsoen"
                              ],
                              "text": "Omdat de gemeente nieuwe huizen plant, volgt Mila een les over planologie. Het plantsoen blijft op de kaart staan. De klas zit bij het raam. Terwijl de docent de wijk aanwijst, ziet Mila hoe groen en woningen samen ruimte vragen."
                        },
                        {
                              "scene": "Pagina 2",
                              "targets": [
                                    "pontje",
                                    "respectievelijk"
                              ],
                              "text": "Omdat het pontje in de ochtend en middag respectievelijk om acht uur en vier uur vaart, schrijft Mila de tijden op. Zij controleert haar telefoon. De overkant lijkt dichtbij. Omdat de brug ver weg ligt, is het bootje belangrijk voor fietsers."
                        },
                        {
                              "scene": "Pagina 3",
                              "targets": [
                                    "schipper",
                                    "schrappen"
                              ],
                              "text": "De schipper vertelt dat de gemeente een late vaart wil schrappen. Mila kijkt verbaasd. Twee scholieren wachten naast haar. Wanneer zij vertellen hoe laat hun les eindigt, begrijpt Mila waarom de vaart nodig blijft."
                        },
                        {
                              "scene": "Pagina 4",
                              "targets": [
                                    "spandoek",
                                    "straatverlichting"
                              ],
                              "text": "Bewoners hangen een spandoek bij de kade, omdat zij de route veilig willen houden. De straatverlichting brandt zwak. Mila maakt een foto. Als het donker wordt, ziet iedereen meteen waar het probleem zit."
                        },
                        {
                              "scene": "Pagina 5",
                              "targets": [
                                    "uitgangspunt",
                                    "veerpont"
                              ],
                              "text": "Omdat de veerpont bereikbaar moet blijven, is dat het uitgangspunt van de vergadering. De zaal wordt stil. Mila steekt haar hand op. Omdat zij dagelijks fietst, kan zij uitleggen wat de verbinding voor nieuwkomers betekent."
                        }
                  ],
                  "glossary": [
                        [
                              "planologie",
                              "nadenken over hoe ruimte wordt gebruikt"
                        ],
                        [
                              "plantsoen",
                              "klein parkje met groen"
                        ],
                        [
                              "pontje",
                              "klein bootje dat mensen overzet"
                        ],
                        [
                              "respectievelijk",
                              "in dezelfde volgorde"
                        ],
                        [
                              "schipper",
                              "bestuurder van een boot"
                        ],
                        [
                              "schrappen",
                              "weghalen of niet meer doen"
                        ],
                        [
                              "spandoek",
                              "groot doek met tekst"
                        ],
                        [
                              "straatverlichting",
                              "lampen langs de straat"
                        ],
                        [
                              "uitgangspunt",
                              "basisidee"
                        ],
                        [
                              "veerpont",
                              "boot die mensen of fietsen naar de overkant brengt."
                        ]
                  ],
                  "quiz": [
                        {
                              "question": "Welke ontwikkeling maakt planologie belangrijk in deze les?",
                              "options": [
                                    "De gemeente plant nieuwe huizen.",
                                    "Zij wil leren varen.",
                                    "De klas gaat schilderen.",
                                    "Het plantsoen wordt een winkel."
                              ],
                              "answer": "De gemeente plant nieuwe huizen.",
                              "explanation": "De les gaat over de verdeling van ruimte in de wijk.",
                              "relatedWords": [
                                    "planologie",
                                    "plantsoen"
                              ]
                        },
                        {
                              "question": "Wat bespaart het pontje voor fietsers?",
                              "options": [
                                    "De brug ligt ver weg.",
                                    "Het water is altijd droog.",
                                    "Fietsers mogen niet varen.",
                                    "De bus stopt op de boot."
                              ],
                              "answer": "De brug ligt ver weg.",
                              "explanation": "Het pontje bespaart fietsers een lange route.",
                              "relatedWords": [
                                    "pontje",
                                    "respectievelijk"
                              ]
                        },
                        {
                              "question": "Wie hebben de late vaart nodig?",
                              "options": [
                                    "Scholieren hebben de vaart na hun les nodig.",
                                    "De schipper wil eerder slapen.",
                                    "De boot is te groot.",
                                    "De klas wil zwemmen."
                              ],
                              "answer": "Scholieren hebben de vaart na hun les nodig.",
                              "explanation": "De scholieren laten zien waarom de late vaart nodig is.",
                              "relatedWords": [
                                    "schipper",
                                    "schrappen"
                              ]
                        },
                        {
                              "question": "Wat maakt het probleem bij de kade zichtbaar?",
                              "options": [
                                    "De zwakke straatverlichting.",
                                    "Een nieuwe winkel.",
                                    "Een kapotte fietsbel.",
                                    "Een bord met openingstijden."
                              ],
                              "answer": "De zwakke straatverlichting.",
                              "explanation": "In het donker valt de slechte verlichting meteen op.",
                              "relatedWords": [
                                    "spandoek",
                                    "straatverlichting"
                              ]
                        },
                        {
                              "question": "Wat is het uitgangspunt van de vergadering?",
                              "options": [
                                    "De veerpont moet bereikbaar blijven.",
                                    "Alle fietsen moeten weg.",
                                    "De kade wordt gesloten.",
                                    "Mila moet de boot besturen."
                              ],
                              "answer": "De veerpont moet bereikbaar blijven.",
                              "explanation": "De verbinding is belangrijk voor bewoners en nieuwkomers.",
                              "relatedWords": [
                                    "uitgangspunt",
                                    "veerpont"
                              ]
                        }
                  ],
                  "color": "#9b6aa8",
                  "subsection": "Bereikbaarheid"
            },
            "5-De wijk aan elkaar": {
                  "chapter": "Thema 5 - Infrastructuur en planologie",
                  "title": "De wijk aan elkaar",
                  "vocab": [
                        "verschraling",
                        "versnipperd",
                        "verzwakken",
                        "voorkeur",
                        "vraagstuk",
                        "wal",
                        "wegbezuinigen",
                        "welzijn",
                        "wenselijk",
                        "wijk"
                  ],
                  "pages": [
                        {
                              "scene": "Pagina 1",
                              "targets": [
                                    "verschraling",
                                    "versnipperd"
                              ],
                              "text": "Omdat kleine voorzieningen verdwijnen, praat de buurt over verschraling. De hulp is versnipperd. Mila zoekt het juiste loket. Wanneer zij drie adressen op een brief ziet, begrijpt zij waarom bewoners moe worden."
                        },
                        {
                              "scene": "Pagina 2",
                              "targets": [
                                    "verzwakken",
                                    "voorkeur"
                              ],
                              "text": "Omdat het spreekuur sluit, kan de band in de straat verzwakken. Mila heeft een duidelijke voorkeur. Zij wil hulp dichtbij. Omdat zij nog veel taal leert, voelt een bekend gezicht veiliger."
                        },
                        {
                              "scene": "Pagina 3",
                              "targets": [
                                    "vraagstuk",
                                    "wal"
                              ],
                              "text": "Het vraagstuk wordt groter, omdat de wijk aan twee kanten van het water ligt. Aan de andere wal wonen veel ouderen. De brug is smal. Wanneer het hard waait, durven sommige bewoners niet naar het centrum te fietsen."
                        },
                        {
                              "scene": "Pagina 4",
                              "targets": [
                                    "wegbezuinigen",
                                    "welzijn"
                              ],
                              "text": "De gemeente wil het kleine loket wegbezuinigen, terwijl bewoners juist meer vragen hebben. Hun welzijn staat onder druk. Mila hoort stille stemmen. Omdat niemand buiten beeld mag raken, vraagt zij om een extra gesprek."
                        },
                        {
                              "scene": "Pagina 5",
                              "targets": [
                                    "wenselijk",
                                    "wijk"
                              ],
                              "text": "Een vaste plek in de wijk is wenselijk, omdat bewoners elkaar daar makkelijk vinden. De voorzitter schrijft het op. Mila glimlacht opgelucht. Wanneer de vergadering eindigt, blijft een groepje nog even napraten bij de deur."
                        }
                  ],
                  "glossary": [
                        [
                              "verschraling",
                              "minder aanbod of minder kwaliteit"
                        ],
                        [
                              "versnipperd",
                              "in losse stukjes verdeeld"
                        ],
                        [
                              "verzwakken",
                              "minder sterk maken"
                        ],
                        [
                              "voorkeur",
                              "wat iemand liever wil"
                        ],
                        [
                              "vraagstuk",
                              "probleem waarover je moet nadenken"
                        ],
                        [
                              "wal",
                              "kant van het water"
                        ],
                        [
                              "wegbezuinigen",
                              "stoppen door minder geld"
                        ],
                        [
                              "welzijn",
                              "hoe goed mensen zich voelen"
                        ],
                        [
                              "wenselijk",
                              "goed of gewenst"
                        ],
                        [
                              "wijk",
                              "deel van een stad."
                        ]
                  ],
                  "quiz": [
                        {
                              "question": "Wat verdwijnt er volgens bewoners uit de buurt?",
                              "options": [
                                    "Kleine voorzieningen verdwijnen.",
                                    "De winkels krijgen meer keuze.",
                                    "Het buurthuis organiseert een feest.",
                                    "De straat krijgt nieuwe bomen."
                              ],
                              "answer": "Kleine voorzieningen verdwijnen.",
                              "explanation": "Minder voorzieningen maken de hulp armer en lastiger.",
                              "relatedWords": [
                                    "verschraling",
                                    "versnipperd"
                              ]
                        },
                        {
                              "question": "Wat voelt voor Mila veiliger?",
                              "options": [
                                    "Een bekend gezicht voelt veiliger terwijl zij taal leert.",
                                    "Zij wil nooit meer fietsen.",
                                    "Zij kent alle regels al.",
                                    "Het centrum is te mooi."
                              ],
                              "answer": "Een bekend gezicht voelt veiliger terwijl zij taal leert.",
                              "explanation": "Nabije hulp verlaagt de spanning.",
                              "relatedWords": [
                                    "verzwakken",
                                    "voorkeur"
                              ]
                        },
                        {
                              "question": "Wat maakt het vraagstuk groter?",
                              "options": [
                                    "De wijk ligt aan twee kanten van het water.",
                                    "De brug is nieuw en breed.",
                                    "Iedereen woont naast het loket.",
                                    "Er zijn te veel winkels."
                              ],
                              "answer": "De wijk ligt aan twee kanten van het water.",
                              "explanation": "De andere wal is minder makkelijk bereikbaar.",
                              "relatedWords": [
                                    "vraagstuk",
                                    "wal"
                              ]
                        },
                        {
                              "question": "Wie mag volgens Mila niet buiten beeld raken?",
                              "options": [
                                    "Niemand mag buiten beeld raken.",
                                    "Zij wil de vergadering verlengen voor de koffie.",
                                    "De voorzitter is zijn pen kwijt.",
                                    "Zij wil het loket sluiten."
                              ],
                              "answer": "Niemand mag buiten beeld raken.",
                              "explanation": "Het welzijn van bewoners staat onder druk.",
                              "relatedWords": [
                                    "wegbezuinigen",
                                    "welzijn"
                              ]
                        },
                        {
                              "question": "Wat is volgens het verhaal wenselijk?",
                              "options": [
                                    "Een vaste plek in de wijk.",
                                    "Alleen online hulp.",
                                    "Minder contact tussen buren.",
                                    "Een loket buiten de stad."
                              ],
                              "answer": "Een vaste plek in de wijk.",
                              "explanation": "Een vaste plek helpt bewoners elkaar te vinden.",
                              "relatedWords": [
                                    "wenselijk",
                                    "wijk"
                              ]
                        }
                  ],
                  "color": "#9b6aa8",
                  "subsection": "Is Nederland vol?"
            },
            "5-Bus op afroep": {
                  "chapter": "Thema 5 - Infrastructuur en planologie",
                  "title": "Bus op afroep",
                  "vocab": [
                        "aangewezen zijn op",
                        "alleen op afroep beschikbaar",
                        "Dat scheelt veel reistijd",
                        "De drempel is laag",
                        "de trossen losgooien",
                        "een beroep doen op",
                        "een beroep doen op iemand",
                        "een groot gebied bestrijken",
                        "een klacht indienen",
                        "een scenario schetsen"
                  ],
                  "pages": [
                        {
                              "scene": "Pagina 1",
                              "targets": [
                                    "aangewezen zijn op",
                                    "alleen op afroep beschikbaar"
                              ],
                              "text": "Als mensen aangewezen zijn op de buurtbus, wordt elke wijziging meteen belangrijk. De bus is nu alleen op afroep beschikbaar. Amir belt de planner. Omdat zijn uitspraak nog onzeker is, schrijft hij eerst de tijden op papier."
                        },
                        {
                              "scene": "Pagina 2",
                              "targets": [
                                    "Dat scheelt veel reistijd",
                                    "De drempel is laag"
                              ],
                              "text": "Dat scheelt veel reistijd. De drempel is laag. Omdat de uitleg in gewone taal staat, durven ook stille bewoners iets te vragen. Amir blijft na afloop even praten, terwijl de planner de nieuwe tijden opschrijft."
                        },
                        {
                              "scene": "Pagina 3",
                              "targets": [
                                    "de trossen losgooien",
                                    "een beroep doen op"
                              ],
                              "text": "De groep wil de trossen losgooien, omdat wachten niets meer oplost. Amir wil een beroep doen op de gemeente. De buurvrouw pakt haar laptop. Wanneer iedereen een taak krijgt, wordt het plan opeens haalbaar."
                        },
                        {
                              "scene": "Pagina 4",
                              "targets": [
                                    "een beroep doen op iemand",
                                    "een groot gebied bestrijken"
                              ],
                              "text": "Amir durft een beroep te doen op iemand uit de ouderraad, omdat die de wijk goed kent. De bus moet een groot gebied bestrijken. De route is lang. Als de dienst slecht gepland is, missen bewoners afspraken bij school en dokter."
                        },
                        {
                              "scene": "Pagina 5",
                              "targets": [
                                    "een klacht indienen",
                                    "een scenario schetsen"
                              ],
                              "text": "Amir helpt een klacht indienen, terwijl de buurman de voorbeelden verzamelt. De planner gaat een scenario schetsen. Iedereen kijkt naar de kaart. Omdat de groep rustig blijft, komt er ruimte voor een proef met extra ritten."
                        }
                  ],
                  "glossary": [
                        [
                              "aangewezen zijn op",
                              "iets nodig hebben omdat er weinig alternatieven zijn"
                        ],
                        [
                              "alleen op afroep beschikbaar",
                              "alleen beschikbaar als je vooraf belt of boekt"
                        ],
                        [
                              "Dat scheelt veel reistijd",
                              "daardoor ben je veel minder lang onderweg"
                        ],
                        [
                              "De drempel is laag",
                              "het is makkelijk om mee te doen"
                        ],
                        [
                              "de trossen losgooien",
                              "echt beginnen of vertrekken"
                        ],
                        [
                              "een beroep doen op",
                              "hulp vragen aan"
                        ],
                        [
                              "een beroep doen op iemand",
                              "hulp vragen aan een persoon"
                        ],
                        [
                              "een groot gebied bestrijken",
                              "voor een groot gebied gelden"
                        ],
                        [
                              "een klacht indienen",
                              "officieel zeggen dat iets niet goed is"
                        ],
                        [
                              "een scenario schetsen",
                              "beschrijven hoe iets kan verlopen."
                        ]
                  ],
                  "quiz": [
                        {
                              "question": "Wie zijn afhankelijk van de buurtbus?",
                              "options": [
                                    "Veel mensen zijn op die bus aangewezen.",
                                    "De bus rijdt alleen voor toeristen.",
                                    "Amir wil chauffeur worden.",
                                    "De wijk heeft te veel treinen."
                              ],
                              "answer": "Veel mensen zijn op die bus aangewezen.",
                              "explanation": "Voor bewoners zonder alternatief heeft de bus veel invloed.",
                              "relatedWords": [
                                    "aangewezen zijn op",
                                    "alleen op afroep beschikbaar"
                              ]
                        },
                        {
                              "question": "Wat helpt stille bewoners om vragen te stellen?",
                              "options": [
                                    "De uitleg staat in gewone taal.",
                                    "De planner praat expres snel.",
                                    "Niemand hoeft te luisteren.",
                                    "De bus rijdt niet meer."
                              ],
                              "answer": "De uitleg staat in gewone taal.",
                              "explanation": "Gewone taal maakt de drempel laag.",
                              "relatedWords": [
                                    "Dat scheelt veel reistijd",
                                    "De drempel is laag"
                              ]
                        },
                        {
                              "question": "Wat lost wachten volgens de groep niet meer op?",
                              "options": [
                                    "Wachten lost niets meer op.",
                                    "De koffie is op.",
                                    "De laptop is nieuw.",
                                    "De gemeente heeft al alles geregeld."
                              ],
                              "answer": "Wachten lost niets meer op.",
                              "explanation": "Daarom willen bewoners de trossen losgooien.",
                              "relatedWords": [
                                    "de trossen losgooien",
                                    "een beroep doen op"
                              ]
                        },
                        {
                              "question": "Welke kennis heeft iemand uit de ouderraad?",
                              "options": [
                                    "Die persoon kent de wijk goed.",
                                    "Die persoon verkoopt kaartjes.",
                                    "Die persoon woont in het buitenland.",
                                    "Die persoon rijdt de bus."
                              ],
                              "answer": "Die persoon kent de wijk goed.",
                              "explanation": "Lokale kennis helpt bij een route die een groot gebied bestrijkt.",
                              "relatedWords": [
                                    "een beroep doen op iemand",
                                    "een groot gebied bestrijken"
                              ]
                        },
                        {
                              "question": "Wat gebeurt er nadat de klacht wordt ingediend?",
                              "options": [
                                    "Er komt ruimte voor een proef met extra ritten.",
                                    "De bus verdwijnt dezelfde dag.",
                                    "Mila stopt met Nederlands.",
                                    "De kaart wordt weggegooid."
                              ],
                              "answer": "Er komt ruimte voor een proef met extra ritten.",
                              "explanation": "Het rustige gesprek maakt een proef mogelijk.",
                              "relatedWords": [
                                    "een klacht indienen",
                                    "een scenario schetsen"
                              ]
                        }
                  ],
                  "color": "#9b6aa8",
                  "subsection": "Auto en openbaar vervoer"
            },
            "5-Samen aan tafel": {
                  "chapter": "Thema 5 - Infrastructuur en planologie",
                  "title": "Samen aan tafel",
                  "vocab": [
                        "er zelf niet meer uitkomen",
                        "heen en weer",
                        "Het gaat ons allemaal aan",
                        "Het piept en het kraakt",
                        "het voor het zeggen hebben",
                        "iemands woorden verdraaien",
                        "in het geding zijn",
                        "in het leven roepen",
                        "je problemen de baas kunnen",
                        "met een rotvaart voorbij razen"
                  ],
                  "pages": [
                        {
                              "scene": "Pagina 1",
                              "targets": [
                                    "er zelf niet meer uitkomen",
                                    "heen en weer"
                              ],
                              "text": "Omdat bewoners er zelf niet meer uitkomen, organiseert het buurthuis een gesprek. De bus rijdt heen en weer. Mila zit naast de kaart. Terwijl mensen hun routes tekenen, ziet zij hoeveel tijd reizen kost."
                        },
                        {
                              "scene": "Pagina 2",
                              "targets": [
                                    "Het gaat ons allemaal aan",
                                    "Het piept en het kraakt"
                              ],
                              "text": "Het gaat ons allemaal aan. Het piept en het kraakt. Omdat de voorzitter deze woorden rustig zegt, wordt de zaal meteen stil. Mila begrijpt dat bereikbaarheid niet alleen een technisch onderwerp is."
                        },
                        {
                              "scene": "Pagina 3",
                              "targets": [
                                    "het voor het zeggen hebben",
                                    "iemands woorden verdraaien"
                              ],
                              "text": "Bewoners vragen wie het voor het zeggen hebben, omdat besluiten vaak ver weg lijken. Niemand wil iemands woorden verdraaien. De notulist schrijft precies mee. Als iemand boos klinkt, vat de voorzitter de zin eerst rustig samen."
                        },
                        {
                              "scene": "Pagina 4",
                              "targets": [
                                    "in het geding zijn",
                                    "in het leven roepen"
                              ],
                              "text": "De veiligheid van kinderen kan in het geding zijn, wanneer de bus te laat komt. De school wil een werkgroep in het leven roepen. Mila meldt zich aan. Omdat zij zelf ook vaak reist, kan zij voorbeelden uit haar week delen."
                        },
                        {
                              "scene": "Pagina 5",
                              "targets": [
                                    "je problemen de baas kunnen",
                                    "met een rotvaart voorbij razen"
                              ],
                              "text": "Mila merkt dat zij haar problemen beter de baas kan, doordat zij vaker spreekt. Een scooter komt met een rotvaart voorbij razen. De groep schrikt even. Wanneer de straat weer stil is, schrijft iedereen de gevaarlijke plek op."
                        }
                  ],
                  "glossary": [
                        [
                              "er zelf niet meer uitkomen",
                              "het alleen niet meer kunnen oplossen"
                        ],
                        [
                              "heen en weer",
                              "naar de ene kant en terug"
                        ],
                        [
                              "Het gaat ons allemaal aan",
                              "het is belangrijk voor iedereen"
                        ],
                        [
                              "Het piept en het kraakt",
                              "het systeem werkt bijna niet meer goed"
                        ],
                        [
                              "het voor het zeggen hebben",
                              "mogen bepalen wat er gebeurt"
                        ],
                        [
                              "iemands woorden verdraaien",
                              "iets anders maken van wat iemand zei"
                        ],
                        [
                              "in het geding zijn",
                              "op het spel staan"
                        ],
                        [
                              "in het leven roepen",
                              "starten of oprichten"
                        ],
                        [
                              "je problemen de baas kunnen",
                              "je problemen aankunnen"
                        ],
                        [
                              "met een rotvaart voorbij razen",
                              "heel snel voorbijgaan."
                        ]
                  ],
                  "quiz": [
                        {
                              "question": "Wat lukt bewoners niet meer alleen?",
                              "options": [
                                    "Bewoners komen er zelf niet meer uit.",
                                    "De bus is versierd.",
                                    "Mila wil een kaart verkopen.",
                                    "De voorzitter is jarig."
                              ],
                              "answer": "Bewoners komen er zelf niet meer uit.",
                              "explanation": "Het gesprek helpt bewoners die samen vastlopen.",
                              "relatedWords": [
                                    "er zelf niet meer uitkomen",
                                    "heen en weer"
                              ]
                        },
                        {
                              "question": "Wat bedoelt de voorzitter met \"Het gaat ons allemaal aan\"?",
                              "options": [
                                    "Bereikbaarheid raakt iedereen in de buurt.",
                                    "Alleen chauffeurs mogen praten.",
                                    "De kaart is te groot.",
                                    "Niemand hoeft mee te doen."
                              ],
                              "answer": "Bereikbaarheid raakt iedereen in de buurt.",
                              "explanation": "Het onderwerp is belangrijk voor alle bewoners.",
                              "relatedWords": [
                                    "Het gaat ons allemaal aan",
                                    "Het piept en het kraakt"
                              ]
                        },
                        {
                              "question": "Wat voorkomt de notulist door precies mee te schrijven?",
                              "options": [
                                    "Zo worden woorden niet verdraaid.",
                                    "Zo kan de vergadering sneller stoppen.",
                                    "Zo hoeft niemand te luisteren.",
                                    "Zo kan Mila tekenen."
                              ],
                              "answer": "Zo worden woorden niet verdraaid.",
                              "explanation": "Precies noteren voorkomt misverstanden.",
                              "relatedWords": [
                                    "het voor het zeggen hebben",
                                    "iemands woorden verdraaien"
                              ]
                        },
                        {
                              "question": "Wat kan volgens de school in het geding zijn?",
                              "options": [
                                    "De veiligheid van kinderen kan in het geding zijn.",
                                    "De school wil minder ouders zien.",
                                    "De bus rijdt te vaak.",
                                    "De kinderen willen geen pauze."
                              ],
                              "answer": "De veiligheid van kinderen kan in het geding zijn.",
                              "explanation": "Te late bussen kunnen onveilig worden.",
                              "relatedWords": [
                                    "in het geding zijn",
                                    "in het leven roepen"
                              ]
                        },
                        {
                              "question": "Wat laat de scooter zien?",
                              "options": [
                                    "Er is een gevaarlijke plek in de straat.",
                                    "De straat is helemaal rustig.",
                                    "Mila moet leren rijden.",
                                    "De bus is sneller dan de scooter."
                              ],
                              "answer": "Er is een gevaarlijke plek in de straat.",
                              "explanation": "De scooter raast met een rotvaart voorbij en schrikt de groep.",
                              "relatedWords": [
                                    "je problemen de baas kunnen",
                                    "met een rotvaart voorbij razen"
                              ]
                        }
                  ],
                  "color": "#9b6aa8",
                  "subsection": "Bereikbaarheid"
            },
            "5-Op eigen kracht verder": {
                  "chapter": "Thema 5 - Infrastructuur en planologie",
                  "title": "Op eigen kracht verder",
                  "vocab": [
                        "op eigen kracht",
                        "slechter af zijn dan",
                        "ten koste gaan van",
                        "te wijten zijn aan",
                        "leefbaarheid",
                        "ondersteuning",
                        "wijk",
                        "beleid",
                        "voorkeur",
                        "vraagstuk"
                  ],
                  "pages": [
                        {
                              "scene": "Pagina 1",
                              "targets": [
                                    "op eigen kracht",
                                    "slechter af zijn dan"
                              ],
                              "text": "Mila wil op eigen kracht naar haar stage fietsen, omdat zij zelfstandiger wil worden. Zonder veilige route is zij slechter af dan haar klasgenoten. De regen valt zacht. Wanneer zij bij de rotonde wacht, voelt zij hoe lastig vrijheid soms kan zijn."
                        },
                        {
                              "scene": "Pagina 2",
                              "targets": [
                                    "ten koste gaan van",
                                    "te wijten zijn aan"
                              ],
                              "text": "Als een weg sneller wordt, mag dat niet ten koste gaan van fietsers. Het probleem is te wijten aan slechte planning. De begeleider knikt. Omdat de zin grammaticaal lastig is, oefenen zij hem samen in gewone spreektaal."
                        },
                        {
                              "scene": "Pagina 3",
                              "targets": [
                                    "leefbaarheid",
                                    "ondersteuning"
                              ],
                              "text": "De leefbaarheid groeit, wanneer bewoners veilig naar school en werk kunnen gaan. Mila vraagt ondersteuning bij het formulier. De vrijwilliger helpt meteen. Omdat zij de woorden nu kent, kan Mila beter uitleggen wat zij bedoelt."
                        },
                        {
                              "scene": "Pagina 4",
                              "targets": [
                                    "wijk",
                                    "beleid"
                              ],
                              "text": "De wijk verandert snel, terwijl het beleid soms langzaam volgt. Mila leest de brief twee keer. De buurman wijst naar de kaart. Als zij samen de route bekijken, ziet Mila waar de nieuwe oversteek nodig is."
                        },
                        {
                              "scene": "Pagina 5",
                              "targets": [
                                    "voorkeur",
                                    "vraagstuk"
                              ],
                              "text": "Omdat Mila dagelijks fietst, is haar voorkeur een veilige route langs het water. Het vraagstuk blijft ingewikkeld. Toch voelt de avond nuttig. Omdat bewoners rustig blijven praten, krijgt de gemeente een duidelijker beeld."
                        }
                  ],
                  "glossary": [
                        [
                              "op eigen kracht",
                              "zonder veel hulp van anderen"
                        ],
                        [
                              "slechter af zijn dan",
                              "in een minder goede situatie zitten dan"
                        ],
                        [
                              "ten koste gaan van",
                              "schadelijk zijn voor"
                        ],
                        [
                              "te wijten zijn aan",
                              "veroorzaakt door"
                        ],
                        [
                              "leefbaarheid",
                              "hoe prettig en veilig een buurt is"
                        ],
                        [
                              "ondersteuning",
                              "hulp"
                        ],
                        [
                              "wijk",
                              "deel van een stad"
                        ],
                        [
                              "beleid",
                              "plan met regels en keuzes"
                        ],
                        [
                              "voorkeur",
                              "wat iemand liever wil"
                        ],
                        [
                              "vraagstuk",
                              "probleem waarover je moet nadenken."
                        ]
                  ],
                  "quiz": [
                        {
                              "question": "Wat wil Mila leren door zelf naar haar stage te fietsen?",
                              "options": [
                                    "Zij wil zelfstandiger worden.",
                                    "Zij wil de bus missen.",
                                    "Zij wil niet meer studeren.",
                                    "Zij zoekt een nieuwe fietsbel."
                              ],
                              "answer": "Zij wil zelfstandiger worden.",
                              "explanation": "Zelfstandig reizen hoort bij haar dagelijks leven.",
                              "relatedWords": [
                                    "op eigen kracht",
                                    "slechter af zijn dan"
                              ]
                        },
                        {
                              "question": "Wat vindt Mila over een snelle weg?",
                              "options": [
                                    "Die mag niet ten koste gaan van fietsers.",
                                    "Die moet altijd voorrang krijgen.",
                                    "Die is alleen voor kinderen.",
                                    "Die hoeft geen regels te hebben."
                              ],
                              "answer": "Die mag niet ten koste gaan van fietsers.",
                              "explanation": "Veiligheid van fietsers blijft belangrijk.",
                              "relatedWords": [
                                    "ten koste gaan van",
                                    "te wijten zijn aan"
                              ]
                        },
                        {
                              "question": "Wat helpt Mila bij het formulier?",
                              "options": [
                                    "Ondersteuning van een vrijwilliger.",
                                    "Een nieuwe jas.",
                                    "Een foto van het water.",
                                    "Een treinreis."
                              ],
                              "answer": "Ondersteuning van een vrijwilliger.",
                              "explanation": "De vrijwilliger helpt haar meteen.",
                              "relatedWords": [
                                    "leefbaarheid",
                                    "ondersteuning"
                              ]
                        },
                        {
                              "question": "Wat zoeken Mila en de buurman op de kaart?",
                              "options": [
                                    "Zij willen zien waar een nieuwe oversteek nodig is.",
                                    "Zij zoeken een vakantiehuis.",
                                    "Zij willen de wijk verlaten.",
                                    "Zij tekenen een plantsoen."
                              ],
                              "answer": "Zij willen zien waar een nieuwe oversteek nodig is.",
                              "explanation": "De kaart maakt het probleem concreet.",
                              "relatedWords": [
                                    "wijk",
                                    "beleid"
                              ]
                        },
                        {
                              "question": "Waardoor krijgt de gemeente een duidelijker beeld?",
                              "options": [
                                    "Bewoners blijven rustig praten.",
                                    "Niemand noemt voorbeelden.",
                                    "De vergadering stopt meteen.",
                                    "De route langs het water verdwijnt."
                              ],
                              "answer": "Bewoners blijven rustig praten.",
                              "explanation": "Rustig overleg helpt bij een ingewikkeld vraagstuk.",
                              "relatedWords": [
                                    "voorkeur",
                                    "vraagstuk"
                              ]
                        }
                  ],
                  "color": "#9b6aa8",
                  "subsection": "Bereikbaarheid"
            },
            "6-Groen beginnen": {
                  "chapter": "Thema 6 - Duurzaamheid",
                  "title": "Groen beginnen",
                  "vocab": [
                        "aanmoedigen",
                        "aanpakken",
                        "aansporen",
                        "aanzienlijk",
                        "afval",
                        "afvalbeheer",
                        "afvalrecycling",
                        "afwenden",
                        "amper",
                        "batterij"
                  ],
                  "pages": [
                        {
                              "scene": "Pagina 1",
                              "targets": [
                                    "aanmoedigen",
                                    "aanpakken"
                              ],
                              "text": "Omdat Mila in haar taalles over duurzaamheid praat, wil de docent haar aanmoedigen om klein te beginnen. Mila gaat het afval thuis aanpakken. Zij zet drie bakken neer. Wanneer haar huisgenoot twijfelt, legt zij rustig uit waarom scheiden helpt."
                        },
                        {
                              "scene": "Pagina 2",
                              "targets": [
                                    "aansporen",
                                    "aanzienlijk"
                              ],
                              "text": "De buurvrouw wil iedereen aansporen, omdat zij minder plastic in huis wil zien. Het verschil is aanzienlijk. Mila telt de zakken. Als de groep een week oefent, blijft er veel minder restafval over."
                        },
                        {
                              "scene": "Pagina 3",
                              "targets": [
                                    "afval",
                                    "afvalbeheer"
                              ],
                              "text": "Omdat afval in Groningen op vaste dagen wordt opgehaald, hangt Mila een kalender in de keuken. Afvalbeheer lijkt eerst ingewikkeld. De kleuren helpen. Wanneer zij de regels twee keer leest, wordt het systeem logisch."
                        },
                        {
                              "scene": "Pagina 4",
                              "targets": [
                                    "afvalrecycling",
                                    "afwenden"
                              ],
                              "text": "De gemeente legt uit dat afvalrecycling beter werkt, wanneer bewoners hun bak goed vullen. Zo kun je problemen afwenden. Mila spoelt een potje om. Omdat er geen eten meer in zit, mag het glas in de juiste container."
                        },
                        {
                              "scene": "Pagina 5",
                              "targets": [
                                    "amper",
                                    "batterij"
                              ],
                              "text": "Mila heeft amper tijd, omdat zij na school meteen naar haar werk moet. Haar fiets heeft een lege batterij. Zij laadt hem bij het buurthuis op. Terwijl zij wacht, praat zij met een vrijwilliger over energie besparen."
                        }
                  ],
                  "glossary": [
                        [
                              "aanmoedigen",
                              "iemand positief stimuleren"
                        ],
                        [
                              "aanpakken",
                              "beginnen met oplossen"
                        ],
                        [
                              "aansporen",
                              "sterk stimuleren om iets te doen"
                        ],
                        [
                              "aanzienlijk",
                              "groot of duidelijk"
                        ],
                        [
                              "afval",
                              "spullen die je weggooit"
                        ],
                        [
                              "afvalbeheer",
                              "organiseren wat er met afval gebeurt"
                        ],
                        [
                              "afvalrecycling",
                              "opnieuw gebruiken van afvalmateriaal"
                        ],
                        [
                              "afwenden",
                              "voorkomen dat iets gebeurt"
                        ],
                        [
                              "amper",
                              "bijna niet"
                        ],
                        [
                              "batterij",
                              "bron van stroom."
                        ]
                  ],
                  "quiz": [
                        {
                              "question": "Waar begint Mila mee na de taalles?",
                              "options": [
                                    "Met afval scheiden in huis.",
                                    "Met autorijden oefenen.",
                                    "Met een reis naar Amsterdam.",
                                    "Met nieuwe meubels kopen."
                              ],
                              "answer": "Met afval scheiden in huis.",
                              "explanation": "Zij zet thuis drie bakken neer.",
                              "relatedWords": [
                                    "aanmoedigen",
                                    "aanpakken"
                              ]
                        },
                        {
                              "question": "Wat wil de buurvrouw bereiken?",
                              "options": [
                                    "Minder plastic in huis.",
                                    "Meer zakken restafval.",
                                    "Minder contact met buren.",
                                    "Een nieuwe winkel."
                              ],
                              "answer": "Minder plastic in huis.",
                              "explanation": "De buurvrouw spoort bewoners aan om minder plastic mee te nemen.",
                              "relatedWords": [
                                    "aansporen",
                                    "aanzienlijk"
                              ]
                        },
                        {
                              "question": "Wat hangt Mila in de keuken op?",
                              "options": [
                                    "Afval wordt op vaste dagen opgehaald.",
                                    "Zij vergeet haar verjaardag.",
                                    "De kalender is gratis.",
                                    "Zij wil de muur vullen."
                              ],
                              "answer": "Afval wordt op vaste dagen opgehaald.",
                              "explanation": "De kalender helpt bij afvalbeheer.",
                              "relatedWords": [
                                    "afval",
                                    "afvalbeheer"
                              ]
                        },
                        {
                              "question": "Wat doet Mila voordat het potje in de glascontainer gaat?",
                              "options": [
                                    "Dan mag het glas in de juiste container.",
                                    "Dan kan zij het verkopen.",
                                    "Dan hoeft zij niet te koken.",
                                    "Dan wordt het plastic."
                              ],
                              "answer": "Dan mag het glas in de juiste container.",
                              "explanation": "Schoon glas past beter bij afvalrecycling.",
                              "relatedWords": [
                                    "afvalrecycling",
                                    "afwenden"
                              ]
                        },
                        {
                              "question": "Waar praat Mila over terwijl haar fiets oplaadt?",
                              "options": [
                                    "Energie besparen.",
                                    "Vakantie plannen.",
                                    "Een nieuwe jas kopen.",
                                    "De trein missen."
                              ],
                              "answer": "Energie besparen.",
                              "explanation": "De lege batterij leidt tot een gesprek over energie.",
                              "relatedWords": [
                                    "amper",
                                    "batterij"
                              ]
                        }
                  ],
                  "color": "#b66d9b",
                  "subsection": "Duurzaamheid in Nederland"
            },
            "6-De buurttuin": {
                  "chapter": "Thema 6 - Duurzaamheid",
                  "title": "De buurttuin",
                  "vocab": [
                        "benzine",
                        "bepalen",
                        "betrekken bij",
                        "betrokkenheid",
                        "bevorderen",
                        "bewustwording",
                        "biodiversiteit",
                        "biomassa",
                        "broeikasgas",
                        "bron"
                  ],
                  "pages": [
                        {
                              "scene": "Pagina 1",
                              "targets": [
                                    "benzine",
                                    "bepalen"
                              ],
                              "text": "Omdat de buurttuin dichtbij is, laat Mila de auto op benzine staan. De groep moet de planning bepalen. Mila kiest de zaterdag. Wanneer iedereen zijn vrije ochtend noemt, ontstaat er snel een werkrooster."
                        },
                        {
                              "scene": "Pagina 2",
                              "targets": [
                                    "betrekken bij",
                                    "betrokkenheid"
                              ],
                              "text": "De begeleider wil nieuwkomers betrekken bij de tuin, omdat samen werken taal makkelijker maakt. De betrokkenheid groeit snel. Mila plant munt. Als een buurkind vraagt wat zij doet, legt zij het in eenvoudige woorden uit."
                        },
                        {
                              "scene": "Pagina 3",
                              "targets": [
                                    "bevorderen",
                                    "bewustwording"
                              ],
                              "text": "De tuin moet contact bevorderen, terwijl bewoners ook over klimaat leren. Bewustwording begint met kleine keuzes. Mila ruikt aan basilicum. Omdat zij ziet hoeveel werk eten kost, gooit zij later minder weg."
                        },
                        {
                              "scene": "Pagina 4",
                              "targets": [
                                    "biodiversiteit",
                                    "biomassa"
                              ],
                              "text": "Omdat de tuin bloemen en kruiden heeft, neemt de biodiversiteit in de straat toe. Biomassa gaat in een aparte bak. De compost ruikt sterk. Wanneer de vrijwilliger het proces uitlegt, begrijpt Mila waarom groen afval nuttig is."
                        },
                        {
                              "scene": "Pagina 5",
                              "targets": [
                                    "broeikasgas",
                                    "bron"
                              ],
                              "text": "Een docent vertelt dat broeikasgas ontstaat, wanneer energie uit vervuilende bronnen komt. De zon is een schone bron. Mila kijkt naar het dak. Omdat daar ruimte is, wil de groep later zonnepanelen bespreken."
                        }
                  ],
                  "glossary": [
                        [
                              "benzine",
                              "brandstof voor auto's"
                        ],
                        [
                              "bepalen",
                              "beslissen of vaststellen"
                        ],
                        [
                              "betrekken bij",
                              "laten meedoen"
                        ],
                        [
                              "betrokkenheid",
                              "actieve aandacht en hulp"
                        ],
                        [
                              "bevorderen",
                              "sterker of beter maken"
                        ],
                        [
                              "bewustwording",
                              "beter gaan begrijpen dat iets belangrijk is"
                        ],
                        [
                              "biodiversiteit",
                              "veel verschillende planten en dieren"
                        ],
                        [
                              "biomassa",
                              "natuurlijk materiaal dat energie kan geven"
                        ],
                        [
                              "broeikasgas",
                              "gas dat de aarde warmer maakt"
                        ],
                        [
                              "bron",
                              "plek waar iets vandaan komt."
                        ]
                  ],
                  "quiz": [
                        {
                              "question": "Welke keuze maakt Mila omdat de buurttuin dichtbij is?",
                              "options": [
                                    "De buurttuin is dichtbij.",
                                    "De auto is nieuw.",
                                    "Zij wil benzine kopen.",
                                    "De tuin is gesloten."
                              ],
                              "answer": "De buurttuin is dichtbij.",
                              "explanation": "Dichtbij reizen kan zonder auto.",
                              "relatedWords": [
                                    "benzine",
                                    "bepalen"
                              ]
                        },
                        {
                              "question": "Wat maakt samen werken in de tuin makkelijker?",
                              "options": [
                                    "Samen werken maakt taal makkelijker.",
                                    "Nieuwkomers mogen niet kijken.",
                                    "De tuin heeft geen planten.",
                                    "Iedereen moet alleen werken."
                              ],
                              "answer": "Samen werken maakt taal makkelijker.",
                              "explanation": "De tuin is ook een taalplek.",
                              "relatedWords": [
                                    "betrekken bij",
                                    "betrokkenheid"
                              ]
                        },
                        {
                              "question": "Waardoor gooit Mila later minder eten weg?",
                              "options": [
                                    "Zij ziet hoeveel werk eten kost.",
                                    "Zij koopt meer plastic.",
                                    "Zij vergeet de tuin.",
                                    "Zij eet nooit kruiden."
                              ],
                              "answer": "Zij ziet hoeveel werk eten kost.",
                              "explanation": "Bewustwording begint met concrete ervaring.",
                              "relatedWords": [
                                    "bevorderen",
                                    "bewustwording"
                              ]
                        },
                        {
                              "question": "Wat gebeurt er met groen afval in de tuin?",
                              "options": [
                                    "Groen afval kan nuttig worden als compost.",
                                    "De bak is mooier van kleur.",
                                    "Het moet naar de glasbak.",
                                    "Niemand mag het aanraken."
                              ],
                              "answer": "Groen afval kan nuttig worden als compost.",
                              "explanation": "De vrijwilliger legt uit wat er met groen afval gebeurt.",
                              "relatedWords": [
                                    "biodiversiteit",
                                    "biomassa"
                              ]
                        },
                        {
                              "question": "Wat wil de groep later bespreken?",
                              "options": [
                                    "Zonnepanelen op het dak.",
                                    "Een extra parkeerplaats.",
                                    "Een nieuwe snelweg.",
                                    "Een winkel voor benzine."
                              ],
                              "answer": "Zonnepanelen op het dak.",
                              "explanation": "De zon wordt genoemd als schone bron.",
                              "relatedWords": [
                                    "broeikasgas",
                                    "bron"
                              ]
                        }
                  ],
                  "color": "#b66d9b",
                  "subsection": "Duurzaamheid in Nederland"
            },
            "6-Langs de dijk": {
                  "chapter": "Thema 6 - Duurzaamheid",
                  "title": "Langs de dijk",
                  "vocab": [
                        "buitenkans",
                        "CO2-uitstoot",
                        "consumeren",
                        "consumptie",
                        "cruciaal",
                        "dam",
                        "dienst",
                        "diepgeworteld",
                        "dijk",
                        "divers"
                  ],
                  "pages": [
                        {
                              "scene": "Pagina 1",
                              "targets": [
                                    "buitenkans",
                                    "CO2-uitstoot"
                              ],
                              "text": "Omdat haar klas naar de Eems gaat, ziet Mila een buitenkans om woorden buiten te oefenen. CO2-uitstoot staat op het werkblad. De wind is koud. Terwijl de bus langs weilanden rijdt, vertelt de docent waarom reizen invloed heeft op klimaat."
                        },
                        {
                              "scene": "Pagina 2",
                              "targets": [
                                    "consumeren",
                                    "consumptie"
                              ],
                              "text": "Mila merkt dat zij anders gaat consumeren, wanneer zij vaker lokale producten ziet. Consumptie is niet alleen kopen. Zij pakt een appel. Omdat de boer uitlegt hoeveel vervoer kost, kiest zij minder vaak eten van ver."
                        },
                        {
                              "scene": "Pagina 3",
                              "targets": [
                                    "cruciaal",
                                    "dam"
                              ],
                              "text": "Goed waterbeheer is cruciaal, omdat Groningen laag bij het water ligt. De groep staat bij een dam. Mila maakt een foto. Wanneer de gids het waterpeil aanwijst, begrijpt zij waarom onderhoud nodig is."
                        },
                        {
                              "scene": "Pagina 4",
                              "targets": [
                                    "dienst",
                                    "diepgeworteld"
                              ],
                              "text": "De waterschapsmedewerker noemt schoon water een dienst, terwijl hij de meetkast opent. Zuinig omgaan met water is diepgeworteld in Nederland. De klas luistert stil. Omdat Mila uit een droger land komt, herkent zij de zorg om water meteen."
                        },
                        {
                              "scene": "Pagina 5",
                              "targets": [
                                    "dijk",
                                    "divers"
                              ],
                              "text": "De dijk beschermt dorpen, wanneer de zee hard tegen de kust drukt. Het landschap is divers. Mila ziet vogels en schapen. Omdat natuur en veiligheid hier samenkomen, vindt zij het woord duurzaamheid minder abstract."
                        }
                  ],
                  "glossary": [
                        [
                              "buitenkans",
                              "heel goede kans"
                        ],
                        [
                              "CO2-uitstoot",
                              "uitstoot van koolstofdioxide"
                        ],
                        [
                              "consumeren",
                              "kopen en gebruiken"
                        ],
                        [
                              "consumptie",
                              "het gebruiken van producten"
                        ],
                        [
                              "cruciaal",
                              "heel belangrijk"
                        ],
                        [
                              "dam",
                              "muur of afsluiting tegen water"
                        ],
                        [
                              "dienst",
                              "service of werk voor anderen"
                        ],
                        [
                              "diepgeworteld",
                              "al lang en sterk aanwezig"
                        ],
                        [
                              "dijk",
                              "hoge rand tegen water"
                        ],
                        [
                              "divers",
                              "verschillend."
                        ]
                  ],
                  "quiz": [
                        {
                              "question": "Wat kan Mila tijdens de excursie buiten oefenen?",
                              "options": [
                                    "Zij kan woorden buiten oefenen.",
                                    "Zij kan gratis winkelen.",
                                    "Zij kan de les overslaan.",
                                    "Zij kan een auto kopen."
                              ],
                              "answer": "Zij kan woorden buiten oefenen.",
                              "explanation": "De excursie maakt woorden zichtbaar.",
                              "relatedWords": [
                                    "buitenkans",
                                    "CO2-uitstoot"
                              ]
                        },
                        {
                              "question": "Wat vertelt de boer over eten van ver?",
                              "options": [
                                    "De boer legt uit hoeveel vervoer kost.",
                                    "Appels zijn verboden.",
                                    "De klas eet niets.",
                                    "Zij houdt niet van lokaal eten."
                              ],
                              "answer": "De boer legt uit hoeveel vervoer kost.",
                              "explanation": "Vervoer heeft invloed op consumptie.",
                              "relatedWords": [
                                    "consumeren",
                                    "consumptie"
                              ]
                        },
                        {
                              "question": "Welke ligging maakt waterbeheer cruciaal?",
                              "options": [
                                    "Groningen ligt laag bij het water.",
                                    "De dam is een museum.",
                                    "Er is nooit regen.",
                                    "Iedereen woont op een berg."
                              ],
                              "answer": "Groningen ligt laag bij het water.",
                              "explanation": "Lage gebieden hebben bescherming nodig.",
                              "relatedWords": [
                                    "cruciaal",
                                    "dam"
                              ]
                        },
                        {
                              "question": "Welke ervaring helpt Mila de zorg om water te herkennen?",
                              "options": [
                                    "Zij komt uit een droger land.",
                                    "Zij werkt bij het waterschap.",
                                    "Zij heeft geen water thuis.",
                                    "Zij wil niet luisteren."
                              ],
                              "answer": "Zij komt uit een droger land.",
                              "explanation": "Haar eigen ervaring helpt haar de uitleg begrijpen.",
                              "relatedWords": [
                                    "dienst",
                                    "diepgeworteld"
                              ]
                        },
                        {
                              "question": "Wat maakt duurzaamheid voor Mila minder abstract?",
                              "options": [
                                    "Zij ziet hoe natuur en veiligheid samenkomen.",
                                    "Zij ziet alleen winkels.",
                                    "De dijk verdwijnt.",
                                    "De excursie is binnen."
                              ],
                              "answer": "Zij ziet hoe natuur en veiligheid samenkomen.",
                              "explanation": "De dijk en het landschap maken het concreet.",
                              "relatedWords": [
                                    "dijk",
                                    "divers"
                              ]
                        }
                  ],
                  "color": "#b66d9b",
                  "subsection": "Water en energie"
            },
            "6-De afvaldag": {
                  "chapter": "Thema 6 - Duurzaamheid",
                  "title": "De afvaldag",
                  "vocab": [
                        "duurzaam",
                        "duurzaamheid",
                        "echter",
                        "energieproductie",
                        "energieverbruik",
                        "faciliteit",
                        "gft-afval",
                        "goor",
                        "hergebruik",
                        "hernieuwbaar"
                  ],
                  "pages": [
                        {
                              "scene": "Pagina 1",
                              "targets": [
                                    "duurzaam",
                                    "duurzaamheid"
                              ],
                              "text": "Mila koopt een duurzame broodtrommel, omdat zij minder wegwerpzakjes wil gebruiken. Duurzaamheid begint in haar tas. De trommel past precies. Wanneer zij op school eet, vraagt een klasgenoot waar zij hem heeft gekocht."
                        },
                        {
                              "scene": "Pagina 2",
                              "targets": [
                                    "echter",
                                    "energieproductie"
                              ],
                              "text": "Zonnepanelen lijken makkelijk; energieproductie vraagt echter ook om goede afspraken. De buurman wijst naar het dak. Mila kijkt omhoog. Omdat het huurhuis gedeeld wordt, moeten alle bewoners eerst toestemming geven."
                        },
                        {
                              "scene": "Pagina 3",
                              "targets": [
                                    "energieverbruik",
                                    "faciliteit"
                              ],
                              "text": "Omdat het energieverbruik hoog is, krijgt het buurthuis een nieuwe meter. De laadplek wordt een handige faciliteit. Mila laadt haar telefoon op. Wanneer zij de meter ziet bewegen, begrijpt zij beter wat stroom kost."
                        },
                        {
                              "scene": "Pagina 4",
                              "targets": [
                                    "gft-afval",
                                    "goor"
                              ],
                              "text": "Het gft-afval ruikt goor, wanneer de bak te lang in de zon staat. Mila zet hem buiten. De buurvrouw lacht. Omdat zij samen de regels lezen, weten ze voortaan wanneer de bak aan straat moet."
                        },
                        {
                              "scene": "Pagina 5",
                              "targets": [
                                    "hergebruik",
                                    "hernieuwbaar"
                              ],
                              "text": "Hergebruik voelt logisch, omdat de kringloopwinkel goede spullen verkoopt. Hernieuwbaar staat later op het bord. Mila koopt een lamp. Wanneer zij thuiskomt, zet zij hem naast haar bureau voor de taalles."
                        }
                  ],
                  "glossary": [
                        [
                              "duurzaam",
                              "goed voor later en minder schadelijk"
                        ],
                        [
                              "duurzaamheid",
                              "zorgen voor mens, natuur en toekomst"
                        ],
                        [
                              "echter",
                              "maar"
                        ],
                        [
                              "energieproductie",
                              "het maken van energie"
                        ],
                        [
                              "energieverbruik",
                              "het gebruiken van energie"
                        ],
                        [
                              "faciliteit",
                              "voorziening die iets mogelijk maakt"
                        ],
                        [
                              "gft-afval",
                              "groente-, fruit- en tuinafval"
                        ],
                        [
                              "goor",
                              "vies"
                        ],
                        [
                              "hergebruik",
                              "opnieuw gebruiken"
                        ],
                        [
                              "hernieuwbaar",
                              "opnieuw aan te vullen."
                        ]
                  ],
                  "quiz": [
                        {
                              "question": "Welke duurzame keuze maakt Mila voor haar lunch?",
                              "options": [
                                    "Zij wil minder wegwerpzakjes gebruiken.",
                                    "Zij wil meer plastic kopen.",
                                    "Zij heeft geen tas.",
                                    "Zij gaat naar een restaurant."
                              ],
                              "answer": "Zij wil minder wegwerpzakjes gebruiken.",
                              "explanation": "De broodtrommel is een kleine duurzame keuze.",
                              "relatedWords": [
                                    "duurzaam",
                                    "duurzaamheid"
                              ]
                        },
                        {
                              "question": "Wat moet eerst gebeuren voordat er zonnepanelen kunnen komen?",
                              "options": [
                                    "Alle bewoners moeten eerst toestemming geven.",
                                    "Het dak is van glas.",
                                    "De buurman wil geen zon.",
                                    "Mila heeft geen ladder."
                              ],
                              "answer": "Alle bewoners moeten eerst toestemming geven.",
                              "explanation": "Een gedeeld huurhuis vraagt afspraken.",
                              "relatedWords": [
                                    "echter",
                                    "energieproductie"
                              ]
                        },
                        {
                              "question": "Wat begrijpt Mila door de nieuwe meter?",
                              "options": [
                                    "Wat stroom kost.",
                                    "Hoe zij brood bakt.",
                                    "Waar de bus stopt.",
                                    "Waarom de lamp kapot is."
                              ],
                              "answer": "Wat stroom kost.",
                              "explanation": "De meter maakt energieverbruik zichtbaar.",
                              "relatedWords": [
                                    "energieverbruik",
                                    "faciliteit"
                              ]
                        },
                        {
                              "question": "Wat merken Mila en de buurvrouw aan de gft-bak?",
                              "options": [
                                    "De bak ruikt vies in de zon.",
                                    "De bak is te klein voor papier.",
                                    "De buurvrouw wil hem schilderen.",
                                    "De gemeente haalt hem nooit op."
                              ],
                              "answer": "De bak ruikt vies in de zon.",
                              "explanation": "Gft-afval kan goor ruiken als het te lang blijft staan.",
                              "relatedWords": [
                                    "gft-afval",
                                    "goor"
                              ]
                        },
                        {
                              "question": "Waar koopt Mila een lamp?",
                              "options": [
                                    "In de kringloopwinkel.",
                                    "Bij de benzinepomp.",
                                    "Op school.",
                                    "In de bus."
                              ],
                              "answer": "In de kringloopwinkel.",
                              "explanation": "De lamp is een voorbeeld van hergebruik.",
                              "relatedWords": [
                                    "hergebruik",
                                    "hernieuwbaar"
                              ]
                        }
                  ],
                  "color": "#b66d9b",
                  "subsection": "Duurzaamheid in Nederland"
            },
            "6-Kleding een tweede leven": {
                  "chapter": "Thema 6 - Duurzaamheid",
                  "title": "Kleding een tweede leven",
                  "vocab": [
                        "herstel",
                        "innovatief",
                        "instabiel",
                        "integreren",
                        "inzetten op",
                        "kappen met",
                        "kleding",
                        "kledingstuk",
                        "kunstmest",
                        "laadpaal"
                  ],
                  "pages": [
                        {
                              "scene": "Pagina 1",
                              "targets": [
                                    "herstel",
                                    "innovatief"
                              ],
                              "text": "Omdat Mila's jas kapot is, gaat zij naar een middag over herstel. De reparatietafel is innovatief ingericht. Er liggen lampjes en naalden. Wanneer de vrijwilliger een klein apparaat gebruikt, wordt de scheur netjes dichtgemaakt."
                        },
                        {
                              "scene": "Pagina 2",
                              "targets": [
                                    "instabiel",
                                    "integreren"
                              ],
                              "text": "De oude rits is instabiel, omdat hij steeds blijft haken. Mila wil de jas weer integreren in haar winterkleren. De stof is nog mooi. Als de rits vervangen is, kan zij de jas opnieuw dragen."
                        },
                        {
                              "scene": "Pagina 3",
                              "targets": [
                                    "inzetten op",
                                    "kappen met"
                              ],
                              "text": "Het buurthuis wil inzetten op repareren, omdat veel spullen te snel worden weggegooid. Mila wil kappen met onnodig kopen. Zij bekijkt haar kast. Wanneer zij minder koopt, houdt zij ook geld over voor haar taalcursus."
                        },
                        {
                              "scene": "Pagina 4",
                              "targets": [
                                    "kleding",
                                    "kledingstuk"
                              ],
                              "text": "Omdat de kledingruil druk bezocht is, hangt Mila haar jas aan een rek. Een warm kledingstuk vindt snel een nieuwe eigenaar. Mila past een trui. Wanneer de kleur haar goed staat, glimlacht de buurvrouw breed."
                        },
                        {
                              "scene": "Pagina 5",
                              "targets": [
                                    "kunstmest",
                                    "laadpaal"
                              ],
                              "text": "Buiten vertelt een tuinman dat minder kunstmest beter is voor de bodem. Naast het buurthuis staat een laadpaal. Mila ziet een elektrische bakfiets. Omdat duurzaamheid overal terugkomt, begrijpt zij dat het thema groter is dan kleding."
                        }
                  ],
                  "glossary": [
                        [
                              "herstel",
                              "reparatie of beter worden"
                        ],
                        [
                              "innovatief",
                              "nieuw en slim"
                        ],
                        [
                              "instabiel",
                              "niet stevig of onzeker"
                        ],
                        [
                              "integreren",
                              "opnemen in een geheel"
                        ],
                        [
                              "inzetten op",
                              "kiezen voor en actief gebruiken"
                        ],
                        [
                              "kappen met",
                              "stoppen met"
                        ],
                        [
                              "kleding",
                              "wat je draagt"
                        ],
                        [
                              "kledingstuk",
                              "een jas, broek of trui"
                        ],
                        [
                              "kunstmest",
                              "mest die in een fabriek is gemaakt"
                        ],
                        [
                              "laadpaal",
                              "paal waar je elektrisch kunt laden."
                        ]
                  ],
                  "quiz": [
                        {
                              "question": "Met welk probleem komt Mila naar de middag over herstel?",
                              "options": [
                                    "Haar jas is kapot.",
                                    "Zij wil een nieuwe auto kopen.",
                                    "Zij zoekt een tuinman.",
                                    "Zij moet naar de dokter."
                              ],
                              "answer": "Haar jas is kapot.",
                              "explanation": "De kapotte jas brengt haar bij de reparatietafel.",
                              "relatedWords": [
                                    "herstel",
                                    "innovatief"
                              ]
                        },
                        {
                              "question": "Wat gebeurt er met de rits?",
                              "options": [
                                    "Hij wordt vervangen.",
                                    "Hij wordt geverfd.",
                                    "Hij gaat naar de glasbak.",
                                    "Hij blijft kapot."
                              ],
                              "answer": "Hij wordt vervangen.",
                              "explanation": "Door de nieuwe rits kan Mila de jas weer dragen.",
                              "relatedWords": [
                                    "instabiel",
                                    "integreren"
                              ]
                        },
                        {
                              "question": "Wat levert minder kopen Mila op?",
                              "options": [
                                    "Dan houdt zij geld over voor haar taalcursus.",
                                    "Dan heeft zij geen jas meer nodig.",
                                    "Dan hoeft zij nooit te wassen.",
                                    "Dan wordt de winkel groter."
                              ],
                              "answer": "Dan houdt zij geld over voor haar taalcursus.",
                              "explanation": "Minder kopen helpt haar portemonnee en het milieu.",
                              "relatedWords": [
                                    "inzetten op",
                                    "kappen met"
                              ]
                        },
                        {
                              "question": "Wat gebeurt er met een warm kledingstuk bij de ruil?",
                              "options": [
                                    "Het vindt snel een nieuwe eigenaar.",
                                    "Het wordt weggegooid.",
                                    "Het wordt nat gemaakt.",
                                    "Het blijft in een doos."
                              ],
                              "answer": "Het vindt snel een nieuwe eigenaar.",
                              "explanation": "De kledingruil geeft spullen een tweede leven.",
                              "relatedWords": [
                                    "kleding",
                                    "kledingstuk"
                              ]
                        },
                        {
                              "question": "Welke voorbeelden laten zien dat duurzaamheid groter is dan kleding?",
                              "options": [
                                    "Zij hoort ook over kunstmest en ziet een laadpaal.",
                                    "Zij ziet alleen oude jassen.",
                                    "De tuinman praat over voetbal.",
                                    "De bakfiets is kapot."
                              ],
                              "answer": "Zij hoort ook over kunstmest en ziet een laadpaal.",
                              "explanation": "Verschillende voorbeelden komen op dezelfde plek samen.",
                              "relatedWords": [
                                    "kunstmest",
                                    "laadpaal"
                              ]
                        }
                  ],
                  "color": "#b66d9b",
                  "subsection": "Repareren of nieuw?"
            },
            "6-Schoolproject klimaat": {
                  "chapter": "Thema 6 - Duurzaamheid",
                  "title": "Schoolproject klimaat",
                  "vocab": [
                        "landbouw",
                        "lauw",
                        "mijlpaal",
                        "milieubeleid",
                        "milieu-impact",
                        "mobiliteit",
                        "natuurbehoud",
                        "omarmen",
                        "onderwijsinstelling",
                        "onmiddellijk"
                  ],
                  "pages": [
                        {
                              "scene": "Pagina 1",
                              "targets": [
                                    "landbouw",
                                    "lauw"
                              ],
                              "text": "Omdat de klas een boerderij bezoekt, hoort Mila hoe landbouw verandert door klimaat. De koffie is lauw. Toch blijft iedereen buiten staan. Wanneer de boer over droge zomers vertelt, begrijpt Mila waarom water belangrijk is."
                        },
                        {
                              "scene": "Pagina 2",
                              "targets": [
                                    "mijlpaal",
                                    "milieubeleid"
                              ],
                              "text": "Voor de school is het project een mijlpaal, omdat duurzaamheid nu in meerdere lessen terugkomt. Het milieubeleid hangt in de hal. Mila leest langzaam. Als zij een moeilijk woord ziet, vraagt zij meteen om een voorbeeld."
                        },
                        {
                              "scene": "Pagina 3",
                              "targets": [
                                    "milieu-impact",
                                    "mobiliteit"
                              ],
                              "text": "De docent laat zien dat mobiliteit milieu-impact heeft, wanneer veel studenten met de auto komen. Mila kiest vaker de fiets. De klas bespreekt routes. Omdat regen in Groningen normaal is, zoeken ze ook goede regenkleding."
                        },
                        {
                              "scene": "Pagina 4",
                              "targets": [
                                    "natuurbehoud",
                                    "omarmen"
                              ],
                              "text": "Natuurbehoud klinkt groot, maar Mila kan het idee omarmen wanneer zij de vogels bij het water ziet. De groep loopt langzaam. Een vrijwilliger telt nesten. Omdat iedereen stil is, blijven de dieren rustig op hun plek."
                        },
                        {
                              "scene": "Pagina 5",
                              "targets": [
                                    "onderwijsinstelling",
                                    "onmiddellijk"
                              ],
                              "text": "De onderwijsinstelling wil onmiddellijk beginnen met kleinere stappen, omdat wachten weinig oplevert. Mila schrijft zich in. De workshop start volgende week. Wanneer zij naar buiten loopt, voelt het project minder ver van haar eigen leven."
                        }
                  ],
                  "glossary": [
                        [
                              "landbouw",
                              "werk op het land met planten of dieren"
                        ],
                        [
                              "lauw",
                              "niet warm en niet koud"
                        ],
                        [
                              "mijlpaal",
                              "belangrijk moment"
                        ],
                        [
                              "milieubeleid",
                              "plannen en regels voor het milieu"
                        ],
                        [
                              "milieu-impact",
                              "effect op het milieu"
                        ],
                        [
                              "mobiliteit",
                              "hoe mensen zich verplaatsen"
                        ],
                        [
                              "natuurbehoud",
                              "natuur beschermen"
                        ],
                        [
                              "omarmen",
                              "positief aannemen"
                        ],
                        [
                              "onderwijsinstelling",
                              "school, mbo, hogeschool of universiteit"
                        ],
                        [
                              "onmiddellijk",
                              "meteen."
                        ]
                  ],
                  "quiz": [
                        {
                              "question": "Wat leert Mila op de boerderij?",
                              "options": [
                                    "Landbouw verandert door klimaat.",
                                    "Koffie is altijd heet.",
                                    "De klas moet binnen blijven.",
                                    "Water is nooit belangrijk."
                              ],
                              "answer": "Landbouw verandert door klimaat.",
                              "explanation": "De boer praat over droge zomers.",
                              "relatedWords": [
                                    "landbouw",
                                    "lauw"
                              ]
                        },
                        {
                              "question": "Wat maakt het project een mijlpaal voor de school?",
                              "options": [
                                    "Duurzaamheid komt in meerdere lessen terug.",
                                    "De hal wordt geschilderd.",
                                    "De lessen stoppen.",
                                    "Mila leest niet mee."
                              ],
                              "answer": "Duurzaamheid komt in meerdere lessen terug.",
                              "explanation": "Het project wordt onderdeel van het onderwijs.",
                              "relatedWords": [
                                    "mijlpaal",
                                    "milieubeleid"
                              ]
                        },
                        {
                              "question": "Welke invloed van mobiliteit bespreekt de klas?",
                              "options": [
                                    "Auto's hebben milieu-impact.",
                                    "Niemand reist naar school.",
                                    "Fietsen zijn verboden.",
                                    "Regen bestaat niet in Groningen."
                              ],
                              "answer": "Auto's hebben milieu-impact.",
                              "explanation": "Vervoer hoort bij duurzaamheid.",
                              "relatedWords": [
                                    "milieu-impact",
                                    "mobiliteit"
                              ]
                        },
                        {
                              "question": "Wat doet de groep zodat de vogels rustig blijven?",
                              "options": [
                                    "De groep is stil.",
                                    "De vrijwilliger speelt muziek.",
                                    "Mila rent door het gras.",
                                    "De vogels zitten binnen."
                              ],
                              "answer": "De groep is stil.",
                              "explanation": "Rust helpt bij natuurbehoud.",
                              "relatedWords": [
                                    "natuurbehoud",
                                    "omarmen"
                              ]
                        },
                        {
                              "question": "Wat vindt de school belangrijker dan wachten?",
                              "options": [
                                    "Wachten levert weinig op.",
                                    "De workshop is al voorbij.",
                                    "Iedereen heeft vakantie.",
                                    "De stappen zijn te groot."
                              ],
                              "answer": "Wachten levert weinig op.",
                              "explanation": "Kleine stappen kunnen meteen starten.",
                              "relatedWords": [
                                    "onderwijsinstelling",
                                    "onmiddellijk"
                              ]
                        }
                  ],
                  "color": "#b66d9b",
                  "subsection": "Duurzaamheid in Nederland"
            },
            "6-Het repair cafe": {
                  "chapter": "Thema 6 - Duurzaamheid",
                  "title": "Het repair cafe",
                  "vocab": [
                        "oplaadbaar",
                        "opschalen",
                        "overheid",
                        "reparateur",
                        "reparatie",
                        "repareren",
                        "steenkool",
                        "stikstofuitstoot",
                        "stimuleren",
                        "technologie"
                  ],
                  "pages": [
                        {
                              "scene": "Pagina 1",
                              "targets": [
                                    "oplaadbaar",
                                    "opschalen"
                              ],
                              "text": "Omdat haar lampje oplaadbaar is, neemt Mila het mee naar het repair cafe. De organisatie wil het project opschalen. Er komen extra tafels. Wanneer meer bewoners meedoen, kan de middag elke maand doorgaan."
                        },
                        {
                              "scene": "Pagina 2",
                              "targets": [
                                    "overheid",
                                    "reparateur"
                              ],
                              "text": "De overheid geeft subsidie, omdat repareren afval kan verminderen. Een reparateur bekijkt Mila's lampje. Mila wacht geduldig. Als hij het kapje opent, ziet zij hoe klein het probleem eigenlijk is."
                        },
                        {
                              "scene": "Pagina 3",
                              "targets": [
                                    "reparatie",
                                    "repareren"
                              ],
                              "text": "De reparatie duurt kort, terwijl Mila ondertussen nieuwe woorden oefent. Zij leert zelf een stekker repareren. De vrijwilliger blijft naast haar. Omdat hij rustig voordoet wat zij moet doen, durft zij het te proberen."
                        },
                        {
                              "scene": "Pagina 4",
                              "targets": [
                                    "steenkool",
                                    "stikstofuitstoot"
                              ],
                              "text": "De docent noemt steenkool, omdat oude energiebronnen veel vervuiling geven. Stikstofuitstoot staat ook op de poster. Mila leest de woorden hardop. Wanneer voorbeelden uit Nederland erbij staan, begrijpt zij de discussie beter."
                        },
                        {
                              "scene": "Pagina 5",
                              "targets": [
                                    "stimuleren",
                                    "technologie"
                              ],
                              "text": "Het repair cafe wil bewoners stimuleren, omdat technologie niet meteen weggegooid hoeft te worden. Mila neemt haar lamp mee naar huis. Het licht werkt weer. Als zij 's avonds leert, voelt de kleine reparatie als een overwinning."
                        }
                  ],
                  "glossary": [
                        [
                              "oplaadbaar",
                              "opnieuw op te laden"
                        ],
                        [
                              "opschalen",
                              "groter maken"
                        ],
                        [
                              "overheid",
                              "regering, provincie of gemeente"
                        ],
                        [
                              "reparateur",
                              "iemand die iets repareert"
                        ],
                        [
                              "reparatie",
                              "het maken van iets kapots"
                        ],
                        [
                              "repareren",
                              "iets weer heel maken"
                        ],
                        [
                              "steenkool",
                              "oude fossiele brandstof"
                        ],
                        [
                              "stikstofuitstoot",
                              "uitstoot van stikstof"
                        ],
                        [
                              "stimuleren",
                              "aanmoedigen"
                        ],
                        [
                              "technologie",
                              "technische kennis en apparaten."
                        ]
                  ],
                  "quiz": [
                        {
                              "question": "Wat neemt Mila mee naar het repair cafe?",
                              "options": [
                                    "Het is oplaadbaar en kan misschien gemaakt worden.",
                                    "Zij wil het weggooien.",
                                    "Zij wil een nieuwe tafel kopen.",
                                    "Het is te groot voor huis."
                              ],
                              "answer": "Het is oplaadbaar en kan misschien gemaakt worden.",
                              "explanation": "Het lampje past bij het repair cafe.",
                              "relatedWords": [
                                    "oplaadbaar",
                                    "opschalen"
                              ]
                        },
                        {
                              "question": "Welk duurzaam doel heeft de subsidie?",
                              "options": [
                                    "Repareren kan afval verminderen.",
                                    "De reparateur wil koffie.",
                                    "Mila wil een cadeau.",
                                    "De winkel is dicht."
                              ],
                              "answer": "Repareren kan afval verminderen.",
                              "explanation": "Subsidie ondersteunt duurzaam gedrag.",
                              "relatedWords": [
                                    "overheid",
                                    "reparateur"
                              ]
                        },
                        {
                              "question": "Wat doet de vrijwilliger zodat Mila durft te oefenen?",
                              "options": [
                                    "De vrijwilliger doet rustig voor wat zij moet doen.",
                                    "Niemand kijkt mee.",
                                    "Zij heeft haast.",
                                    "De stekker is niet kapot."
                              ],
                              "answer": "De vrijwilliger doet rustig voor wat zij moet doen.",
                              "explanation": "Rustige begeleiding helpt.",
                              "relatedWords": [
                                    "reparatie",
                                    "repareren"
                              ]
                        },
                        {
                              "question": "Wat maakt de poster voor Mila duidelijker?",
                              "options": [
                                    "Er staan voorbeelden uit Nederland bij.",
                                    "De poster heeft geen tekst.",
                                    "De docent praat over muziek.",
                                    "De woorden verdwijnen."
                              ],
                              "answer": "Er staan voorbeelden uit Nederland bij.",
                              "explanation": "Voorbeelden maken moeilijke woorden concreet.",
                              "relatedWords": [
                                    "steenkool",
                                    "stikstofuitstoot"
                              ]
                        },
                        {
                              "question": "Wat voelt voor Mila als een overwinning?",
                              "options": [
                                    "Dat het lampje weer werkt.",
                                    "Dat zij de lamp weggooit.",
                                    "Dat zij minder licht heeft.",
                                    "Dat het cafe sluit."
                              ],
                              "answer": "Dat het lampje weer werkt.",
                              "explanation": "De kleine reparatie heeft zichtbaar resultaat.",
                              "relatedWords": [
                                    "stimuleren",
                                    "technologie"
                              ]
                        }
                  ],
                  "color": "#b66d9b",
                  "subsection": "Repareren of nieuw?"
            },
            "6-Minder weggooien": {
                  "chapter": "Thema 6 - Duurzaamheid",
                  "title": "Minder weggooien",
                  "vocab": [
                        "transitie",
                        "uitstoot",
                        "vereisen",
                        "verreweg",
                        "verspilling",
                        "verstedelijking",
                        "verzinnen",
                        "voedselverspilling",
                        "volhouden",
                        "waterbeheer"
                  ],
                  "pages": [
                        {
                              "scene": "Pagina 1",
                              "targets": [
                                    "transitie",
                                    "uitstoot"
                              ],
                              "text": "Omdat de school duurzamer wil worden, noemt de docent dit een kleine transitie. Minder uitstoot is het doel. Mila kijkt naar de lunchtafel. Wanneer iedereen eigen bakjes meeneemt, ligt er al minder plastic in de prullenbak."
                        },
                        {
                              "scene": "Pagina 2",
                              "targets": [
                                    "vereisen",
                                    "verreweg"
                              ],
                              "text": "Goed plannen kan tijd vereisen, omdat boodschappen anders te snel bederven. Brood is verreweg het grootste probleem. De kantine telt de resten. Als studenten eerlijk opschrijven wat zij weggooien, ziet de klas waar winst zit."
                        },
                        {
                              "scene": "Pagina 3",
                              "targets": [
                                    "verspilling",
                                    "verstedelijking"
                              ],
                              "text": "Verspilling valt meer op, wanneer veel mensen dicht bij elkaar wonen. Verstedelijking maakt afval zichtbaar. Mila kijkt naar de containers. Omdat de straat klein is, ruik je volle bakken meteen."
                        },
                        {
                              "scene": "Pagina 4",
                              "targets": [
                                    "verzinnen",
                                    "voedselverspilling"
                              ],
                              "text": "De klas gaat oplossingen verzinnen, omdat voedselverspilling elke dag terugkomt. Mila stelt een deelkast voor. De docent schrijft mee. Wanneer buren eten kunnen ruilen, hoeft minder in de bak te verdwijnen."
                        },
                        {
                              "scene": "Pagina 5",
                              "targets": [
                                    "volhouden",
                                    "waterbeheer"
                              ],
                              "text": "Nieuwe gewoontes kun je alleen volhouden, als ze passen bij je gewone dag. Waterbeheer komt ook ter sprake. Mila vult haar fles. Omdat water en eten allebei kostbaar zijn, voelt de les heel praktisch."
                        }
                  ],
                  "glossary": [
                        [
                              "transitie",
                              "grote verandering"
                        ],
                        [
                              "uitstoot",
                              "vervuilende stoffen die vrijkomen"
                        ],
                        [
                              "vereisen",
                              "nodig hebben of vragen"
                        ],
                        [
                              "verreweg",
                              "duidelijk het meest"
                        ],
                        [
                              "verspilling",
                              "onnodig gebruik of verlies"
                        ],
                        [
                              "verstedelijking",
                              "groei van steden"
                        ],
                        [
                              "verzinnen",
                              "bedenken"
                        ],
                        [
                              "voedselverspilling",
                              "eten weggooien dat nog bruikbaar is"
                        ],
                        [
                              "volhouden",
                              "blijven doen"
                        ],
                        [
                              "waterbeheer",
                              "zorgen voor water en veiligheid."
                        ]
                  ],
                  "quiz": [
                        {
                              "question": "Wat is het doel van de kleine transitie op school?",
                              "options": [
                                    "Minder uitstoot.",
                                    "Meer plastic.",
                                    "Minder lunch.",
                                    "Meer prullenbakken in de klas."
                              ],
                              "answer": "Minder uitstoot.",
                              "explanation": "Eigen bakjes zorgen al voor minder afval.",
                              "relatedWords": [
                                    "transitie",
                                    "uitstoot"
                              ]
                        },
                        {
                              "question": "Wat is verreweg het grootste probleem in de kantine?",
                              "options": [
                                    "Brood.",
                                    "Koffie.",
                                    "Fietsen.",
                                    "Huiswerk."
                              ],
                              "answer": "Brood.",
                              "explanation": "De kantine telt vooral veel broodresten.",
                              "relatedWords": [
                                    "vereisen",
                                    "verreweg"
                              ]
                        },
                        {
                              "question": "Waardoor wordt afval in de straat snel zichtbaar?",
                              "options": [
                                    "Veel mensen wonen dicht bij elkaar.",
                                    "De straat heeft geen huizen.",
                                    "De containers zijn leeg.",
                                    "Niemand gooit iets weg."
                              ],
                              "answer": "Veel mensen wonen dicht bij elkaar.",
                              "explanation": "Verstedelijking maakt afvalproblemen duidelijker.",
                              "relatedWords": [
                                    "verspilling",
                                    "verstedelijking"
                              ]
                        },
                        {
                              "question": "Wat stelt Mila voor tegen voedselverspilling?",
                              "options": [
                                    "Een deelkast voor buren.",
                                    "Een grotere vuilniszak.",
                                    "Minder contact met buren.",
                                    "Een bus naar de supermarkt."
                              ],
                              "answer": "Een deelkast voor buren.",
                              "explanation": "Een deelkast laat eten bij iemand anders terechtkomen.",
                              "relatedWords": [
                                    "verzinnen",
                                    "voedselverspilling"
                              ]
                        },
                        {
                              "question": "Wat maakt de les heel praktisch?",
                              "options": [
                                    "Water en eten zijn allebei kostbaar.",
                                    "De klas praat alleen over theorie.",
                                    "Mila vergeet haar fles.",
                                    "De school sluit de kantine."
                              ],
                              "answer": "Water en eten zijn allebei kostbaar.",
                              "explanation": "De voorbeelden horen bij gewone dagen.",
                              "relatedWords": [
                                    "volhouden",
                                    "waterbeheer"
                              ]
                        }
                  ],
                  "color": "#b66d9b",
                  "subsection": "Voedselverspilling"
            },
            "6-Aan zee denken": {
                  "chapter": "Thema 6 - Duurzaamheid",
                  "title": "Aan zee denken",
                  "vocab": [
                        "waterkering",
                        "waterstof",
                        "weggooien",
                        "witgoed",
                        "witgoedwinkel",
                        "zeespiegel",
                        "zeespiegelstijging",
                        "zich verenigen",
                        "zuivel",
                        "zuivering"
                  ],
                  "pages": [
                        {
                              "scene": "Pagina 1",
                              "targets": [
                                    "waterkering",
                                    "waterstof"
                              ],
                              "text": "Omdat de klas een waterkering bezoekt, ziet Mila hoe Nederland zich tegen water beschermt. Waterstof staat op een informatiebord. De gids spreekt langzaam. Wanneer hij over nieuwe energie praat, schrijft Mila alleen de kernwoorden op."
                        },
                        {
                              "scene": "Pagina 2",
                              "targets": [
                                    "weggooien",
                                    "witgoed"
                              ],
                              "text": "Mila wil haar oude koelkast niet weggooien, omdat repareren misschien nog kan. Witgoed kost veel geld. Zij belt een monteur. Als het apparaat te veel stroom gebruikt, denkt zij toch na over vervangen."
                        },
                        {
                              "scene": "Pagina 3",
                              "targets": [
                                    "witgoedwinkel",
                                    "zeespiegel"
                              ],
                              "text": "In de witgoedwinkel vraagt Mila naar zuinige modellen, terwijl buiten de regen tegen het raam tikt. De zeespiegel lijkt ver weg. De verkoper wijst naar het label. Omdat energie thuis ook invloed heeft, voelt het onderwerp ineens dichtbij."
                        },
                        {
                              "scene": "Pagina 4",
                              "targets": [
                                    "zeespiegelstijging",
                                    "zich verenigen"
                              ],
                              "text": "Wanneer zeespiegelstijging doorgaat, moeten bewoners zich verenigen, zegt de gids tijdens de excursie. Mila denkt aan haar straat. De groep loopt verder. Wanneer mensen samen vragen stellen, krijgen ze duidelijker antwoord."
                        },
                        {
                              "scene": "Pagina 5",
                              "targets": [
                                    "zuivel",
                                    "zuivering"
                              ],
                              "text": "Mila koopt minder zuivel, omdat haar klas bespreekt hoeveel water voedsel kost. Zuivering maakt vies water schoon. Zij vult haar fles. Terwijl zij drinkt, beseft zij hoe gewoon schoon water soms lijkt."
                        }
                  ],
                  "glossary": [
                        [
                              "waterkering",
                              "bouwwerk dat water tegenhoudt"
                        ],
                        [
                              "waterstof",
                              "energiedrager die schoon kan zijn"
                        ],
                        [
                              "weggooien",
                              "in de afvalbak doen"
                        ],
                        [
                              "witgoed",
                              "grote huishoudelijke apparaten"
                        ],
                        [
                              "witgoedwinkel",
                              "winkel voor zulke apparaten"
                        ],
                        [
                              "zeespiegel",
                              "hoogte van de zee"
                        ],
                        [
                              "zeespiegelstijging",
                              "hoger worden van de zee"
                        ],
                        [
                              "zich verenigen",
                              "samen een groep vormen"
                        ],
                        [
                              "zuivel",
                              "melkproducten"
                        ],
                        [
                              "zuivering",
                              "schoonmaken, vooral van water."
                        ]
                  ],
                  "quiz": [
                        {
                              "question": "Wat ziet Mila bij de waterkering?",
                              "options": [
                                    "Hoe Nederland zich tegen water beschermt.",
                                    "Hoe een koelkast werkt.",
                                    "Hoe zuivel wordt gemaakt.",
                                    "Hoe een winkel sluit."
                              ],
                              "answer": "Hoe Nederland zich tegen water beschermt.",
                              "explanation": "De waterkering maakt bescherming zichtbaar.",
                              "relatedWords": [
                                    "waterkering",
                                    "waterstof"
                              ]
                        },
                        {
                              "question": "Wat doet Mila voordat zij haar koelkast eventueel vervangt?",
                              "options": [
                                    "Repareren kan misschien nog.",
                                    "Zij heeft geen keuken.",
                                    "Witgoed is altijd gratis.",
                                    "De monteur is haar docent."
                              ],
                              "answer": "Repareren kan misschien nog.",
                              "explanation": "Zij belt eerst een monteur.",
                              "relatedWords": [
                                    "weggooien",
                                    "witgoed"
                              ]
                        },
                        {
                              "question": "Wat verbindt de witgoedwinkel met klimaat?",
                              "options": [
                                    "Energie thuis heeft ook invloed.",
                                    "De zee stroomt de winkel in.",
                                    "De verkoper praat over melk.",
                                    "De regen stopt meteen."
                              ],
                              "answer": "Energie thuis heeft ook invloed.",
                              "explanation": "Het energielabel verbindt huis en klimaat.",
                              "relatedWords": [
                                    "witgoedwinkel",
                                    "zeespiegel"
                              ]
                        },
                        {
                              "question": "Wat helpt bewoners bij zeespiegelstijging?",
                              "options": [
                                    "Zich verenigen en samen vragen stellen.",
                                    "Alleen thuis blijven.",
                                    "Geen informatie vragen.",
                                    "Alle apparaten weggooien."
                              ],
                              "answer": "Zich verenigen en samen vragen stellen.",
                              "explanation": "Samen krijg je duidelijker antwoord.",
                              "relatedWords": [
                                    "zeespiegelstijging",
                                    "zich verenigen"
                              ]
                        },
                        {
                              "question": "Wat bespreekt de klas over voedsel en water?",
                              "options": [
                                    "De klas bespreekt hoeveel water voedsel kost.",
                                    "Zij lust geen water.",
                                    "De winkel is dicht.",
                                    "Zuivering is duur."
                              ],
                              "answer": "De klas bespreekt hoeveel water voedsel kost.",
                              "explanation": "Voedsel en watergebruik horen bij elkaar.",
                              "relatedWords": [
                                    "zuivel",
                                    "zuivering"
                              ]
                        }
                  ],
                  "color": "#b66d9b",
                  "subsection": "Water en huis"
            },
            "6-De groene buurtavond": {
                  "chapter": "Thema 6 - Duurzaamheid",
                  "title": "De groene buurtavond",
                  "vocab": [
                        "aan populariteit winnen",
                        "afval scheiden",
                        "bezwaren opzij zetten",
                        "Daar is nog winst te boeken",
                        "Dat scheelt behoorlijk",
                        "De voortekenen zijn gunstig",
                        "energie opwekken",
                        "Er is nog een lange weg te gaan",
                        "fossiele brandstoffen",
                        "geen kwaad kunnen"
                  ],
                  "pages": [
                        {
                              "scene": "Pagina 1",
                              "targets": [
                                    "aan populariteit winnen",
                                    "afval scheiden"
                              ],
                              "text": "Afval scheiden gaat aan populariteit winnen, omdat de buurt ziet hoeveel restafval overblijft. Mila plakt labels op de bakken. De kinderen helpen mee. Wanneer de bakken duidelijk zijn, maken bewoners minder fouten."
                        },
                        {
                              "scene": "Pagina 2",
                              "targets": [
                                    "bezwaren opzij zetten",
                                    "Daar is nog winst te boeken"
                              ],
                              "text": "De voorzitter vraagt bewoners hun bezwaren opzij zetten, omdat een proef maar drie maanden duurt. Daar is nog winst te boeken. Mila luistert naar de discussie. Als iemand bang is voor stank, noemt de buurvrouw een afsluitbare bak."
                        },
                        {
                              "scene": "Pagina 3",
                              "targets": [
                                    "Dat scheelt behoorlijk",
                                    "De voortekenen zijn gunstig"
                              ],
                              "text": "Dat scheelt behoorlijk. De voortekenen zijn gunstig. Omdat de eerste straat al minder afval heeft, wil de tweede straat meedoen. Mila voelt dat kleine successen mensen sneller overtuigen."
                        },
                        {
                              "scene": "Pagina 4",
                              "targets": [
                                    "energie opwekken",
                                    "Er is nog een lange weg te gaan"
                              ],
                              "text": "De school wil energie opwekken, terwijl het dak nog onderzocht moet worden. Er is nog een lange weg te gaan. Mila schrijft de planning over. Omdat de stappen duidelijk zijn, blijft het plan toch haalbaar."
                        },
                        {
                              "scene": "Pagina 5",
                              "targets": [
                                    "fossiele brandstoffen",
                                    "geen kwaad kunnen"
                              ],
                              "text": "Omdat Nederland minder fossiele brandstoffen wil gebruiken, kan besparen geen kwaad. Mila begrijpt de grap. De groep lacht mee. Wanneer de avond eindigt, neemt iedereen een kleine taak mee naar huis."
                        }
                  ],
                  "glossary": [
                        [
                              "aan populariteit winnen",
                              "steeds populairder worden"
                        ],
                        [
                              "afval scheiden",
                              "afval in aparte bakken doen"
                        ],
                        [
                              "bezwaren opzij zetten",
                              "minder nadruk leggen op bezwaren"
                        ],
                        [
                              "Daar is nog winst te boeken",
                              "daar kan het beter"
                        ],
                        [
                              "Dat scheelt behoorlijk",
                              "dat maakt veel verschil"
                        ],
                        [
                              "De voortekenen zijn gunstig",
                              "de eerste signalen zijn positief"
                        ],
                        [
                              "energie opwekken",
                              "energie maken"
                        ],
                        [
                              "Er is nog een lange weg te gaan",
                              "er moet nog veel gebeuren"
                        ],
                        [
                              "fossiele brandstoffen",
                              "steenkool, olie en gas"
                        ],
                        [
                              "geen kwaad kunnen",
                              "niet schadelijk zijn of best nuttig zijn."
                        ]
                  ],
                  "quiz": [
                        {
                              "question": "Wat helpen de labels op de bakken voorkomen?",
                              "options": [
                                    "Dan maken bewoners minder fouten.",
                                    "Dan worden de bakken zwaarder.",
                                    "Dan hoeft niemand afval te scheiden.",
                                    "Dan verdwijnen de kinderen."
                              ],
                              "answer": "Dan maken bewoners minder fouten.",
                              "explanation": "Duidelijke bakken helpen bij afval scheiden.",
                              "relatedWords": [
                                    "aan populariteit winnen",
                                    "afval scheiden"
                              ]
                        },
                        {
                              "question": "Hoe lang duurt de proef waarover de voorzitter praat?",
                              "options": [
                                    "De proef duurt maar drie maanden.",
                                    "De proef is al mislukt.",
                                    "Niemand mag vragen stellen.",
                                    "De bak is kapot."
                              ],
                              "answer": "De proef duurt maar drie maanden.",
                              "explanation": "Een korte proef maakt meedoen minder spannend.",
                              "relatedWords": [
                                    "bezwaren opzij zetten",
                                    "Daar is nog winst te boeken"
                              ]
                        },
                        {
                              "question": "Welk resultaat overtuigt de tweede straat?",
                              "options": [
                                    "De eerste straat heeft al minder afval.",
                                    "De eerste straat stopt meteen.",
                                    "Mila praat te snel.",
                                    "De bakken zijn verdwenen."
                              ],
                              "answer": "De eerste straat heeft al minder afval.",
                              "explanation": "De voortekenen zijn gunstig door een zichtbaar resultaat.",
                              "relatedWords": [
                                    "Dat scheelt behoorlijk",
                                    "De voortekenen zijn gunstig"
                              ]
                        },
                        {
                              "question": "Wat maakt het plan voor het dak haalbaar?",
                              "options": [
                                    "De stappen zijn duidelijk.",
                                    "Het dak hoeft niet onderzocht te worden.",
                                    "De school heeft geen dak.",
                                    "Iedereen vergeet de planning."
                              ],
                              "answer": "De stappen zijn duidelijk.",
                              "explanation": "Duidelijke stappen helpen bij een lange weg.",
                              "relatedWords": [
                                    "energie opwekken",
                                    "Er is nog een lange weg te gaan"
                              ]
                        },
                        {
                              "question": "Wat neemt iedereen mee naar huis?",
                              "options": [
                                    "Een kleine taak.",
                                    "Een fossiele brandstof.",
                                    "Een nieuw dak.",
                                    "Een kapotte bak."
                              ],
                              "answer": "Een kleine taak.",
                              "explanation": "De buurtavond eindigt met praktische acties.",
                              "relatedWords": [
                                    "fossiele brandstoffen",
                                    "geen kwaad kunnen"
                              ]
                        }
                  ],
                  "color": "#b66d9b",
                  "subsection": "Duurzaamheid in Nederland"
            },
            "6-Kleine keuzes": {
                  "chapter": "Thema 6 - Duurzaamheid",
                  "title": "Kleine keuzes",
                  "vocab": [
                        "Het staat of valt met",
                        "Het zit me dwars",
                        "Hoe je het ook wendt of keert",
                        "iets hoog op de agenda hebben staan",
                        "iets in de fik zetten",
                        "in een opwelling",
                        "met name",
                        "op energie besparen",
                        "op gas stoken",
                        "op lange termijn"
                  ],
                  "pages": [
                        {
                              "scene": "Pagina 1",
                              "targets": [
                                    "Het staat of valt met",
                                    "Het zit me dwars"
                              ],
                              "text": "Het staat of valt met duidelijke afspraken, omdat Mila met drie huisgenoten woont. Het zit me dwars, zegt zij zacht. De verwarming staat hoog. Wanneer niemand zich verantwoordelijk voelt, blijft het raam toch open."
                        },
                        {
                              "scene": "Pagina 2",
                              "targets": [
                                    "Hoe je het ook wendt of keert",
                                    "iets hoog op de agenda hebben staan"
                              ],
                              "text": "Hoe je het ook wendt of keert, de energierekening moet omlaag. Besparen staat hoog op de agenda. Mila maakt thee. Omdat iedereen iets anders gewend is, beginnen ze met een simpel schema."
                        },
                        {
                              "scene": "Pagina 3",
                              "targets": [
                                    "iets in de fik zetten",
                                    "in een opwelling"
                              ],
                              "text": "Niemand mag iets in de fik zetten, terwijl er oude dozen bij de schuur staan. Een buurjongen deed dat ooit in een opwelling. Mila kijkt ernstig. Omdat veiligheid ook duurzaamheid is, komt er een extra ronde door de berging."
                        },
                        {
                              "scene": "Pagina 4",
                              "targets": [
                                    "met name",
                                    "op energie besparen"
                              ],
                              "text": "Met name in de winter willen de bewoners op energie besparen, omdat de kosten dan stijgen. Mila koopt tochtstrip. De deur sluit beter. Wanneer de woonkamer warmer blijft, hoeft de verwarming minder hoog."
                        },
                        {
                              "scene": "Pagina 5",
                              "targets": [
                                    "op gas stoken",
                                    "op lange termijn"
                              ],
                              "text": "Het huis blijft voorlopig op gas stoken, omdat de verhuurder nog geen warmtepomp plaatst. Op lange termijn willen de bewoners anders wonen. Mila bewaart de notities. Wanneer zij later verhuist, weet zij beter welke vragen zij kan stellen."
                        }
                  ],
                  "glossary": [
                        [
                              "Het staat of valt met",
                              "het succes hangt af van"
                        ],
                        [
                              "Het zit me dwars",
                              "ik blijf eraan denken"
                        ],
                        [
                              "Hoe je het ook wendt of keert",
                              "hoe je er ook naar kijkt"
                        ],
                        [
                              "iets hoog op de agenda hebben staan",
                              "iets heel belangrijk vinden"
                        ],
                        [
                              "iets in de fik zetten",
                              "iets laten branden"
                        ],
                        [
                              "in een opwelling",
                              "plots, zonder lang na te denken"
                        ],
                        [
                              "met name",
                              "vooral"
                        ],
                        [
                              "op energie besparen",
                              "minder energie gebruiken"
                        ],
                        [
                              "op gas stoken",
                              "verwarmen met gas"
                        ],
                        [
                              "op lange termijn",
                              "over een langere periode."
                        ]
                  ],
                  "quiz": [
                        {
                              "question": "Wat maakt duidelijke afspraken in Mila's huis nodig?",
                              "options": [
                                    "Mila woont met drie huisgenoten.",
                                    "Mila woont alleen.",
                                    "De verwarming is nieuw.",
                                    "Het raam kan niet open."
                              ],
                              "answer": "Mila woont met drie huisgenoten.",
                              "explanation": "Samen wonen vraagt duidelijke regels.",
                              "relatedWords": [
                                    "Het staat of valt met",
                                    "Het zit me dwars"
                              ]
                        },
                        {
                              "question": "Waar beginnen de bewoners mee?",
                              "options": [
                                    "Een simpel schema.",
                                    "Een nieuwe keuken.",
                                    "Een lange vakantie.",
                                    "Een tweede raam."
                              ],
                              "answer": "Een simpel schema.",
                              "explanation": "Iedereen is iets anders gewend, dus ze starten klein.",
                              "relatedWords": [
                                    "Hoe je het ook wendt of keert",
                                    "iets hoog op de agenda hebben staan"
                              ]
                        },
                        {
                              "question": "Welk risico ziet de groep in de berging?",
                              "options": [
                                    "Veiligheid hoort ook bij duurzaamheid.",
                                    "De dozen zijn nieuw.",
                                    "Mila zoekt haar jas.",
                                    "De buurjongen geeft een feest."
                              ],
                              "answer": "Veiligheid hoort ook bij duurzaamheid.",
                              "explanation": "Oude dozen en brandgevaar maken veiligheid belangrijk.",
                              "relatedWords": [
                                    "iets in de fik zetten",
                                    "in een opwelling"
                              ]
                        },
                        {
                              "question": "Wat verandert er door de tochtstrip?",
                              "options": [
                                    "De deur sluit dan beter en de kamer blijft warmer.",
                                    "Zij wil de deur versieren.",
                                    "De verwarming moet hoger.",
                                    "De winter is voorbij."
                              ],
                              "answer": "De deur sluit dan beter en de kamer blijft warmer.",
                              "explanation": "Tochtstrip helpt om energie te besparen.",
                              "relatedWords": [
                                    "met name",
                                    "op energie besparen"
                              ]
                        },
                        {
                              "question": "Waarvoor bewaart Mila de notities?",
                              "options": [
                                    "Zij wil later betere vragen stellen bij een woning.",
                                    "Zij wil ze weggooien.",
                                    "Zij gaat stoppen met huren.",
                                    "De verhuurder vraagt om thee."
                              ],
                              "answer": "Zij wil later betere vragen stellen bij een woning.",
                              "explanation": "Op lange termijn wil zij bewuster wonen.",
                              "relatedWords": [
                                    "op gas stoken",
                                    "op lange termijn"
                              ]
                        }
                  ],
                  "color": "#b66d9b",
                  "subsection": "Energie thuis"
            },
            "6-Actie in de straat": {
                  "chapter": "Thema 6 - Duurzaamheid",
                  "title": "Actie in de straat",
                  "vocab": [
                        "tal van",
                        "uit zijn voegen barsten",
                        "van ondergeschikt belang zijn",
                        "We moeten actie ondernemen",
                        "Wie het kleine niet eert, is het grote niet weerd",
                        "duurzaamheid",
                        "afval scheiden",
                        "energie opwekken",
                        "voedselverspilling",
                        "waterbeheer"
                  ],
                  "pages": [
                        {
                              "scene": "Pagina 1",
                              "targets": [
                                    "tal van",
                                    "uit zijn voegen barsten"
                              ],
                              "text": "Er zijn tal van ideeën, omdat de straat samen groener wil worden. De fietsenstalling barst uit zijn voegen. Mila telt de plekken. Wanneer bewoners ruimte maken voor bakfietsen, blijft de stoep beter vrij."
                        },
                        {
                              "scene": "Pagina 2",
                              "targets": [
                                    "van ondergeschikt belang zijn",
                                    "We moeten actie ondernemen"
                              ],
                              "text": "De kleur van de bakken is van ondergeschikt belang, terwijl duidelijk gebruik juist telt. We moeten actie ondernemen. Mila zegt het rustig. Omdat iedereen hetzelfde probleem ziet, begint de groep meteen met verdelen."
                        },
                        {
                              "scene": "Pagina 3",
                              "targets": [
                                    "Wie het kleine niet eert, is het grote niet weerd",
                                    "duurzaamheid"
                              ],
                              "text": "Wie het kleine niet eert, is het grote niet weerd. Duurzaamheid begint bij gewoontes. Mila hangt een briefje op. Wanneer iemand het licht vergeet, wijst het briefje vriendelijk naar de schakelaar."
                        },
                        {
                              "scene": "Pagina 4",
                              "targets": [
                                    "afval scheiden",
                                    "energie opwekken"
                              ],
                              "text": "Omdat afval scheiden al beter gaat, durft de straat nu over energie opwekken te praten. Het dak krijgt veel zon. De buurman maakt foto's. Als de woningbouw akkoord gaat, kan er een kleine proef starten."
                        },
                        {
                              "scene": "Pagina 5",
                              "targets": [
                                    "voedselverspilling",
                                    "waterbeheer"
                              ],
                              "text": "Mila koppelt voedselverspilling aan waterbeheer, omdat eten maken ook veel water vraagt. De groep maakt een deelplank. Er liggen appels op. Wanneer de avond klaar is, neemt niemand meer dan nodig mee."
                        }
                  ],
                  "glossary": [
                        [
                              "tal van",
                              "veel"
                        ],
                        [
                              "uit zijn voegen barsten",
                              "veel te vol worden"
                        ],
                        [
                              "van ondergeschikt belang zijn",
                              "minder belangrijk zijn"
                        ],
                        [
                              "We moeten actie ondernemen",
                              "we moeten iets gaan doen"
                        ],
                        [
                              "Wie het kleine niet eert, is het grote niet weerd",
                              "kleine dingen zijn ook belangrijk"
                        ],
                        [
                              "duurzaamheid",
                              "zorgen voor toekomst en milieu"
                        ],
                        [
                              "afval scheiden",
                              "afval in aparte bakken doen"
                        ],
                        [
                              "energie opwekken",
                              "energie maken"
                        ],
                        [
                              "voedselverspilling",
                              "bruikbaar eten weggooien"
                        ],
                        [
                              "waterbeheer",
                              "zorgen voor water en veiligheid."
                        ]
                  ],
                  "quiz": [
                        {
                              "question": "Wat valt Mila op aan de fietsenstalling?",
                              "options": [
                                    "De stalling is veel te vol.",
                                    "Zij zoekt een appel.",
                                    "De straat is leeg.",
                                    "De bakfietsen zijn verboden."
                              ],
                              "answer": "De stalling is veel te vol.",
                              "explanation": "De fietsenstalling barst uit zijn voegen.",
                              "relatedWords": [
                                    "tal van",
                                    "uit zijn voegen barsten"
                              ]
                        },
                        {
                              "question": "Wat vindt de groep minder belangrijk dan duidelijk gebruik?",
                              "options": [
                                    "De kleur van de bakken.",
                                    "Het verdelen van taken.",
                                    "Het probleem in de straat.",
                                    "De actie zelf."
                              ],
                              "answer": "De kleur van de bakken.",
                              "explanation": "De kleur is van ondergeschikt belang.",
                              "relatedWords": [
                                    "van ondergeschikt belang zijn",
                                    "We moeten actie ondernemen"
                              ]
                        },
                        {
                              "question": "Waar begint duurzaamheid volgens het verhaal?",
                              "options": [
                                    "Bij gewoontes.",
                                    "Bij grote woorden alleen.",
                                    "Bij niets doen.",
                                    "Bij de verste straat."
                              ],
                              "answer": "Bij gewoontes.",
                              "explanation": "Kleine gewoontes krijgen veel aandacht.",
                              "relatedWords": [
                                    "Wie het kleine niet eert, is het grote niet weerd",
                                    "duurzaamheid"
                              ]
                        },
                        {
                              "question": "Wanneer kan de proef met energie starten?",
                              "options": [
                                    "Als de woningbouw akkoord gaat.",
                                    "Als het dak geen zon krijgt.",
                                    "Als de foto's verdwijnen.",
                                    "Als afval scheiden stopt."
                              ],
                              "answer": "Als de woningbouw akkoord gaat.",
                              "explanation": "Toestemming is nodig voor zonnepanelen of een proef.",
                              "relatedWords": [
                                    "afval scheiden",
                                    "energie opwekken"
                              ]
                        },
                        {
                              "question": "Welk verband legt Mila tussen voedsel en water?",
                              "options": [
                                    "Eten maken vraagt ook veel water.",
                                    "Appels groeien in de fietsenstalling.",
                                    "De deelplank staat onder water.",
                                    "Niemand eet fruit."
                              ],
                              "answer": "Eten maken vraagt ook veel water.",
                              "explanation": "Het verhaal laat zien dat thema's met elkaar verbonden zijn.",
                              "relatedWords": [
                                    "voedselverspilling",
                                    "waterbeheer"
                              ]
                        }
                  ],
                  "color": "#b66d9b",
                  "subsection": "Duurzaamheid in Nederland"
            }
      },
      "topicStoryGroups": {
            "5-maatschappelijke ondersteuning": [
                  "5-Bij het wijkloket",
                  "5-Veilig door de buurt"
            ],
            "5-is nederland vol?": [
                  "5-Een wijk die groeit",
                  "5-De wijk aan elkaar"
            ],
            "5-auto en openbaar vervoer": [
                  "5-Naar school en terug",
                  "5-Bus op afroep"
            ],
            "5-bereikbaarheid": [
                  "5-Over water en door groen",
                  "5-Samen aan tafel",
                  "5-Op eigen kracht verder"
            ],
            "6-duurzaamheid in nederland": [
                  "6-Groen beginnen",
                  "6-De buurttuin",
                  "6-De afvaldag",
                  "6-Schoolproject klimaat",
                  "6-Aan zee denken",
                  "6-Actie in de straat"
            ],
            "6-repareren of nieuw?": [
                  "6-Kleding een tweede leven",
                  "6-Het repair cafe"
            ],
            "6-vliegen": [
                  "6-Langs de dijk"
            ],
            "6-voedselverspilling": [
                  "6-Minder weggooien"
            ],
            "6-fossiele brandstoffen": [
                  "6-De groene buurtavond",
                  "6-Kleine keuzes"
            ]
      },
      "themeVocab": {
            "5": [
                  "aanvaring",
                  "acceptabel",
                  "achterstand",
                  "afdoende",
                  "afgelegen",
                  "beleid",
                  "beleidsontwikkeling",
                  "beschikken over",
                  "beschouwen",
                  "bespreekbaar",
                  "bevolking",
                  "bevolkingsgroei",
                  "botbreuk",
                  "directie",
                  "drempel",
                  "evenals",
                  "fenomeen",
                  "hemelsbreed",
                  "infrastructuur",
                  "inzet",
                  "klantvriendelijk",
                  "kwalijk",
                  "kwetsbaar",
                  "leefbaarheid",
                  "namens",
                  "nauw",
                  "nauwelijks",
                  "nieuwsbrief",
                  "omfietsen",
                  "onderling",
                  "ondersteuning",
                  "ongeval",
                  "opheffen",
                  "ouderavond",
                  "ouderraad",
                  "ov-abonnement",
                  "overigens",
                  "pendelbus",
                  "pendelen",
                  "petitie",
                  "planologie",
                  "plantsoen",
                  "pontje",
                  "respectievelijk",
                  "schipper",
                  "schrappen",
                  "spandoek",
                  "straatverlichting",
                  "uitgangspunt",
                  "veerpont",
                  "verschraling",
                  "versnipperd",
                  "verzwakken",
                  "voorkeur",
                  "vraagstuk",
                  "wal",
                  "wegbezuinigen",
                  "welzijn",
                  "wenselijk",
                  "wijk",
                  "aangewezen zijn op",
                  "alleen op afroep beschikbaar",
                  "Dat scheelt veel reistijd",
                  "De drempel is laag",
                  "de trossen losgooien",
                  "een beroep doen op",
                  "een beroep doen op iemand",
                  "een groot gebied bestrijken",
                  "een klacht indienen",
                  "een scenario schetsen",
                  "er zelf niet meer uitkomen",
                  "heen en weer",
                  "Het gaat ons allemaal aan",
                  "Het piept en het kraakt",
                  "het voor het zeggen hebben",
                  "iemands woorden verdraaien",
                  "in het geding zijn",
                  "in het leven roepen",
                  "je problemen de baas kunnen",
                  "met een rotvaart voorbij razen",
                  "op eigen kracht",
                  "slechter af zijn dan",
                  "ten koste gaan van",
                  "te wijten zijn aan"
            ],
            "6": [
                  "aanmoedigen",
                  "aanpakken",
                  "aansporen",
                  "aanzienlijk",
                  "afval",
                  "afvalbeheer",
                  "afvalrecycling",
                  "afwenden",
                  "amper",
                  "batterij",
                  "benzine",
                  "bepalen",
                  "betrekken bij",
                  "betrokkenheid",
                  "bevorderen",
                  "bewustwording",
                  "biodiversiteit",
                  "biomassa",
                  "broeikasgas",
                  "bron",
                  "buitenkans",
                  "CO2-uitstoot",
                  "consumeren",
                  "consumptie",
                  "cruciaal",
                  "dam",
                  "dienst",
                  "diepgeworteld",
                  "dijk",
                  "divers",
                  "duurzaam",
                  "duurzaamheid",
                  "echter",
                  "energieproductie",
                  "energieverbruik",
                  "faciliteit",
                  "gft-afval",
                  "goor",
                  "hergebruik",
                  "hernieuwbaar",
                  "herstel",
                  "innovatief",
                  "instabiel",
                  "integreren",
                  "inzetten op",
                  "kappen met",
                  "kleding",
                  "kledingstuk",
                  "kunstmest",
                  "laadpaal",
                  "landbouw",
                  "lauw",
                  "mijlpaal",
                  "milieubeleid",
                  "milieu-impact",
                  "mobiliteit",
                  "natuurbehoud",
                  "omarmen",
                  "onderwijsinstelling",
                  "onmiddellijk",
                  "oplaadbaar",
                  "opschalen",
                  "overheid",
                  "reparateur",
                  "reparatie",
                  "repareren",
                  "steenkool",
                  "stikstofuitstoot",
                  "stimuleren",
                  "technologie",
                  "transitie",
                  "uitstoot",
                  "vereisen",
                  "verreweg",
                  "verspilling",
                  "verstedelijking",
                  "verzinnen",
                  "voedselverspilling",
                  "volhouden",
                  "waterbeheer",
                  "waterkering",
                  "waterstof",
                  "weggooien",
                  "witgoed",
                  "witgoedwinkel",
                  "zeespiegel",
                  "zeespiegelstijging",
                  "zich verenigen",
                  "zuivel",
                  "zuivering",
                  "aan populariteit winnen",
                  "afval scheiden",
                  "bezwaren opzij zetten",
                  "Daar is nog winst te boeken",
                  "Dat scheelt behoorlijk",
                  "De voortekenen zijn gunstig",
                  "energie opwekken",
                  "Er is nog een lange weg te gaan",
                  "fossiele brandstoffen",
                  "geen kwaad kunnen",
                  "Het staat of valt met",
                  "Het zit me dwars",
                  "Hoe je het ook wendt of keert",
                  "iets hoog op de agenda hebben staan",
                  "iets in de fik zetten",
                  "in een opwelling",
                  "met name",
                  "op energie besparen",
                  "op gas stoken",
                  "op lange termijn",
                  "tal van",
                  "uit zijn voegen barsten",
                  "van ondergeschikt belang zijn",
                  "We moeten actie ondernemen",
                  "Wie het kleine niet eert, is het grote niet weerd"
            ]
      }
};
    Object.entries(theme56Imported.topicStoryGroups).forEach(([topicKey, storyKeys]) => {
      topicStoryGroups[topicKey] = storyKeys;
    });
    Object.entries(theme56Imported.themeVocab).forEach(([themeId, vocab]) => {
      const theme = themes.find((item) => String(item.id) === String(themeId));
      if (theme) theme.vocab = vocab;
    });
    Object.entries(theme56Imported.stories).forEach(([key, data]) => {
      stories[key] = makeStory(data.chapter, data.title, data.vocab, data.pages, data.glossary, data.quiz, data.color);
      stories[key].assetPending = key.startsWith('6-');
    });
    // END THEMA 5-6 IMPORTED STORIES

    function firstStorySentence(text) {
      const match = String(text || "").match(/[^.!?]+[.!?]/);
      return (match ? match[0] : String(text || "")).trim();
    }

    function shuffleArray(items) {
      const arr = [...items];
      for (let i = arr.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }

    function prepareQuizForSession(quiz) {
      return (Array.isArray(quiz) ? quiz : []).map((q) => {
        const seen = new Set();
        const options = [];
        const addOption = (option) => {
          const clean = String(option || "").trim();
          const key = normalize(clean);
          if (clean && !seen.has(key)) {
            seen.add(key);
            options.push(clean);
          }
        };
        (Array.isArray(q.options) ? q.options : []).forEach(addOption);
        addOption(q.answer);
        return { ...q, options: shuffleArray(options) };
      });
    }

    function completeStoryQuiz(storyKey, story) {
      if (!story || !Array.isArray(story.pages)) return;
      if (!Array.isArray(story.quiz)) story.quiz = [];
      if (story.quiz.length >= 5) {
        story.quiz = story.quiz.slice(0, 5);
        return;
      }

      const pageSentences = story.pages.map((page) => firstStorySentence(page.text));
      let pageIndex = 0;
      while (story.quiz.length < 5 && pageIndex < story.pages.length) {
        const page = story.pages[pageIndex];
        const correct = pageSentences[pageIndex];
        const options = [correct];

        pageSentences.forEach((sentence, index) => {
          if (index !== pageIndex && options.length < 4 && !options.includes(sentence)) {
            options.push(sentence);
          }
        });

        while (options.length < 4) {
          const filler = [
            "Deze zin hoort bij een andere pagina.",
            "Deze zin komt niet uit dit verhaal.",
            "Deze zin past niet bij deze pagina."
          ][options.length - 1] || "Deze zin is niet juist.";
          if (!options.includes(filler)) options.push(filler);
        }

        story.quiz.push({
          question: `Welke zin past bij pagina ${pageIndex + 1}?`,
          options,
          answer: correct,
          explanation: `Deze zin staat op pagina ${pageIndex + 1} van het verhaal.`,
          relatedWords: page.targets || []
        });
        pageIndex += 1;
      }

      if (story.quiz.length !== 5) {
        console.warn(`Quiz niet compleet voor ${storyKey}`);
      }
    }

    Object.keys(stories).forEach((key) => {
      const themeId = Number(key.split("-")[0]);
      const accents = { 1: "#9b6aa8", 2: "#86b89f", 3: "#d8a36d", 4: "#9b98d4" };
      applyConsistentImages(key, accents[themeId] || "#9b6aa8");
      completeStoryQuiz(key, stories[key]);
    });

    function ensurePreviewImages() {
      Object.values(stories).forEach((story) => {
        story.pages.forEach((page, index) => {
          if (!page.imageUrl) {
            page.imageUrl = fallbackPhoto("", page.scene || `pagina ${index + 1}`, page.targets);
            page.imagePack = false;
          }
        });
      });
    }

    ensurePreviewImages();

    const view = document.getElementById("view");
    const errorBox = document.getElementById("errorBox");
    const errorText = document.getElementById("errorText");
    const toastStack = document.getElementById("toastStack");
    const keyDrawer = document.getElementById("keyDrawer");
    const wordDrawer = document.getElementById("wordDrawer");

    function normalize(value) {
      return String(value || "").trim().toLowerCase();
    }

    function escapeHtml(value) {
      return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    function escapeRegExp(value) {
      return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    function themeIconSvg(id) {
      const icons = {
        1: '<svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
        2: '<svg viewBox="0 0 24 24"><path d="M11 20A7 7 0 0 1 4 13c0-5 4-9 12-9h4v4c0 8-4 12-9 12Z"/><path d="M12 18c0-4 2-7 6-9"/></svg>',
        3: '<svg viewBox="0 0 24 24"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 22a10 10 0 1 1 10-10c0 2-1.5 3-3.5 3h-1.2c-1 0-1.8.8-1.8 1.8 0 .5.2 1 .5 1.4.3.4.5.8.5 1.3 0 1.4-1.6 2.5-4.5 2.5Z"/></svg>',
        4: '<svg viewBox="0 0 24 24"><path d="M10 6V5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v1"/><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 12h18"/><path d="M12 6v14"/></svg>',
        5: '<svg viewBox="0 0 24 24"><path d="M3 6h7v7H3z"/><path d="M14 3h7v7h-7z"/><path d="M14 14h7v7h-7z"/><path d="M10 9h4"/><path d="M17 10v4"/><path d="M10 13l4 4"/></svg>',
        6: '<svg viewBox="0 0 24 24"><path d="M7 19H4l3-6"/><path d="M17 19h3l-3-6"/><path d="M12 5l3 6H9l3-6Z"/><path d="M9 19h6"/></svg>',
        7: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15 15 0 0 1 0 20"/><path d="M12 2a15 15 0 0 0 0 20"/></svg>',
        8: '<svg viewBox="0 0 24 24"><path d="M10 2v7.5L4.5 20A1.5 1.5 0 0 0 5.8 22h12.4a1.5 1.5 0 0 0 1.3-2L14 9.5V2"/><path d="M8 2h8"/><path d="M7 16h10"/></svg>'
      };
      return icons[id] || icons[1];
    }

    function saveProgress() {
      safeSet("nt2_stats", JSON.stringify(state.stats));
      safeSet("nt2_completed_stories", JSON.stringify([...state.completedStories]));
      safeSet("nt2_last_activity", JSON.stringify(state.lastActivity));
      safeSet("nt2_sentence_checks", JSON.stringify(state.sentenceChecks));
      safeSet("nt2_word_ease", JSON.stringify(state.wordEase));
      safeSet("nt2_review", JSON.stringify(state.reviewPool));
      safeSet("nt2_difficult_words", JSON.stringify(state.difficultWords));
      safeSet("nt2_discovered", JSON.stringify([...state.discoveredWords]));
    }

    function showError(message) {
      if (!message) {
        errorBox.classList.remove("show");
        errorText.textContent = "";
        return;
      }
      errorText.textContent = message;
      errorBox.classList.add("show");
    }

    function awardXP(amount, reason) {
      state.stats.xp += amount;
      state.stats.level = Math.floor(state.stats.xp / 100) + 1;
      saveProgress();
      updateHeader();
      const toast = document.createElement("div");
      toast.className = "toast";
      toast.textContent = `+${amount} XP (${reason || "Leren"})`;
      toastStack.appendChild(toast);
      setTimeout(() => toast.remove(), 2200);
    }

    function updateHeader() {
      document.getElementById("levelText").textContent = `Lvl ${state.stats.level}`;
      document.getElementById("xpText").textContent = `${state.stats.xp} XP`;
      document.getElementById("xpFill").style.width = `${state.stats.xp % 100}%`;
      document.getElementById("topHomeBtn").classList.toggle("hidden", state.appState === "landing");
      document.getElementById("bottomNav")?.classList.toggle("hidden", false);
      document.getElementById("bottomContinueBtn")?.toggleAttribute("disabled", !(state.lastActivity && stories[state.lastActivity.storyKey]));
    }

    function rememberActivity(storyKey, pageIndex) {
      if (!storyKey || !stories[storyKey]) return;
      const themeId = Number(String(storyKey).split("-")[0]);
      const theme = themes.find((item) => item.id === themeId);
      state.lastActivity = {
        storyKey,
        pageIndex: Math.max(0, pageIndex || 0),
        themeTitle: theme?.title || "",
        topic: state.selectedTopic || state.selectedSubsection || getStoryTitleFromKey(storyKey),
        storyTitle: getStoryTitleFromKey(storyKey),
        updatedAt: Date.now()
      };
      saveProgress();
    }

    function markStoryCompleted(storyKey) {
      if (!storyKey) return;
      state.completedStories.add(storyKey);
      saveProgress();
    }

    function getBestDutchVoice() {
      const voices = window.speechSynthesis?.getVoices?.() || [];
      return voices.find((voice) =>
        /^nl[-_]?NL$/i.test(voice.lang) && /google|microsoft|natural|colette|frank/i.test(voice.name)
      ) || voices.find((voice) => /^nl/i.test(voice.lang)) || null;
    }

    if ("speechSynthesis" in window) {
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }

    function speakDutch(text, rate, onEnd) {
      if (!("speechSynthesis" in window)) {
        showError("Deze browser ondersteunt geen tekst-naar-spraak.");
        return;
      }
      if (typeof SpeechSynthesisUtterance === "undefined") {
        showError("Deze browser kan de browserstem niet starten.");
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(String(text || ""));
      const dutchVoice = getBestDutchVoice();
      if (dutchVoice) utterance.voice = dutchVoice;
      utterance.lang = "nl-NL";
      utterance.rate = rate || 0.9;
      utterance.pitch = 1;
      utterance.onend = () => {
        state.isSpeaking = false;
        onEnd && onEnd();
        if (state.appState === "reading") renderReading();
      };
      utterance.onerror = (event) => {
        state.isSpeaking = false;
        showError(`Browserstem kon niet starten${event?.error ? ` (${event.error})` : ""}. Probeer de pagina te vernieuwen of gebruik Chrome/Edge.`);
        if (state.appState === "reading") renderReading();
      };
      state.isSpeaking = true;
      showError("");
      setTimeout(() => window.speechSynthesis.speak(utterance), 40);
    }

    function stopSpeaking() {
      window.speechSynthesis && window.speechSynthesis.cancel();
      if (state.currentAudio) {
        try {
          state.currentAudio.pause();
          state.currentAudio.currentTime = 0;
        } catch {}
        state.currentAudio = null;
      }
      state.isSpeaking = false;
    }

    function currentPageAudioKey() {
      return `${state.currentStoryKey || "story"}::${state.pageIndex}`;
    }

    function capturePageAudioState() {
      const audio = document.getElementById("pageAudio");
      if (!audio) return;
      const key = audio.dataset.audioKey || currentPageAudioKey();
      const time = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
      state.audioProgress[key] = {
        time: audio.ended ? 0 : time,
        playing: !audio.paused && !audio.ended,
        ended: !!audio.ended
      };
    }

    function pausePageAudioForNavigation() {
      const audio = document.getElementById("pageAudio");
      if (!audio) return;
      const key = audio.dataset.audioKey || currentPageAudioKey();
      state.audioProgress[key] = {
        time: Number.isFinite(audio.currentTime) && !audio.ended ? audio.currentTime : 0,
        playing: false,
        ended: !!audio.ended
      };
      try {
        audio.pause();
      } catch {}
    }

    function restorePageAudioState(audio) {
      if (!audio) return;
      const key = audio.dataset.audioKey || currentPageAudioKey();
      const saved = state.audioProgress[key];
      audio.playbackRate = state.playbackSpeed;
      const restoreTime = () => {
        if (!saved || !Number.isFinite(saved.time) || saved.time <= 0) return;
        const duration = Number.isFinite(audio.duration) ? audio.duration : Infinity;
        try {
          audio.currentTime = Math.min(saved.time, Math.max(0, duration - 0.25));
        } catch {}
      };
      const resumeIfNeeded = () => {
        if (!saved?.playing) return;
        audio.play().catch(() => {
          state.audioProgress[key] = {
            ...(state.audioProgress[key] || {}),
            playing: false
          };
        });
      };
      audio.addEventListener("loadedmetadata", () => {
        audio.playbackRate = state.playbackSpeed;
        restoreTime();
        resumeIfNeeded();
      }, { once: true });
      if (audio.readyState >= 1) {
        restoreTime();
        resumeIfNeeded();
      }
    }

    function playWordAudio(word) {
      const cleanWord = String(word || "").trim();
      if (!cleanWord) return;
      stopSpeaking();
      const audio = new Audio(localWordAudio(cleanWord));
      state.currentAudio = audio;
      state.isSpeaking = true;
      audio.onended = () => {
        state.currentAudio = null;
        state.isSpeaking = false;
      };
      audio.onerror = () => {
        state.currentAudio = null;
        state.isSpeaking = false;
        speakDutch(cleanWord, 0.78);
      };
      audio.play().catch(() => {
        state.currentAudio = null;
        state.isSpeaking = false;
        speakDutch(cleanWord, 0.78);
      });
    }

    async function generatePageImage(page, index) {
      if (!page) return false;
      if (!state.apiKey) {
        showError("Voer eerst je Gemini API-sleutel in via de API-knop. Exacte storybookbeelden worden pas via de beeld-API gemaakt.");
        return false;
      }
      try {
        const payload = {
          instances: [{ prompt: page.imagePrompt || storyImagePrompt(state.selectedTheme.title, state.selectedSubsection, `Pagina ${index + 1}`, page.targets, page.text) }],
          parameters: { sampleCount: 1, outputMimeType: "image/jpeg", aspectRatio: "16:9" }
        };
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${encodeURIComponent(state.apiKey)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const b64 = data.predictions?.[0]?.bytesBase64Encoded;
        if (!b64) throw new Error("Geen beelddata ontvangen.");
        page.imageUrl = `data:image/jpeg;base64,${b64}`;
        page.imageGenerated = true;
        return true;
      } catch (error) {
        throw error;
      }
    }

    async function generateCurrentPageImage() {
      const page = state.pages[state.pageIndex];
      if (!page || state.imageBusy) return;
      if (!state.apiKey) {
        showError("Voer eerst je Gemini API-sleutel in via de API-knop. Let op: Imagen-storybookbeelden vragen meestal een betaald of geschikt API-project.");
        return;
      }
      state.imageBusy = true;
      state.imageBusyLabel = "Beeld maken...";
      renderReading();
      showError("");
      try {
        await generatePageImage(page, state.pageIndex);
        awardXP(5, "Storybookbeeld");
      } catch (error) {
        showError(`Beeldgeneratie mislukt. Controleer of je API-project toegang tot Imagen en genoeg tegoed heeft. (${error.message || error})`);
      } finally {
        state.imageBusy = false;
        state.imageBusyLabel = "";
        renderReading();
      }
    }

    async function generateStorybookImages() {
      if (state.imageBusy) return;
      if (!state.apiKey) {
        showError("Voer eerst je Gemini API-sleutel in via de API-knop. Voor alle vijf beelden is genoeg tegoed voor beeldgeneratie nodig.");
        return;
      }
      state.imageBusy = true;
      showError("");
      let made = 0;
      try {
        for (let i = 0; i < state.pages.length; i += 1) {
          state.imageBusyLabel = `Beeld ${i + 1}/${state.pages.length} maken...`;
          renderReading();
          if (!state.pages[i].imageGenerated) {
            await generatePageImage(state.pages[i], i);
            made += 1;
          }
        }
        if (made > 0) awardXP(10, "Storybookreeks");
      } catch (error) {
        showError(`Reeks gestopt. De al gemaakte beelden blijven staan. (${error.message || error})`);
      } finally {
        state.imageBusy = false;
        state.imageBusyLabel = "";
        renderReading();
      }
    }

    function playGeneratedAudio(page) {
      if (!page?.audioUrl) return false;
      stopSpeaking();
      const audio = new Audio(page.audioUrl);
      state.currentAudio = audio;
      state.isSpeaking = true;
      audio.onended = () => {
        state.isSpeaking = false;
        state.currentAudio = null;
        awardXP(5, "Natuurlijke audio geluisterd");
        if (state.appState === "reading") renderReading();
      };
      audio.onerror = () => {
        state.isSpeaking = false;
        state.currentAudio = null;
        showError("De natuurlijke audio kon niet worden afgespeeld. Gebruik tijdelijk de browserstem.");
        if (state.appState === "reading") renderReading();
      };
      audio.play().catch((error) => {
        state.isSpeaking = false;
        showError(`Audio afspelen mislukt. (${error.message || error})`);
      });
      return true;
    }

    async function generateNaturalAudio() {
      const page = state.pages[state.pageIndex];
      if (!page || state.audioBusy) return;
      if (page.audioGenerated && page.audioUrl) {
        playGeneratedAudio(page);
        renderReading();
        return;
      }
      if (!state.apiKey) {
        showError("Voer eerst je Gemini API-sleutel in via de API-knop. Zonder sleutel gebruikt de app de browserstem.");
        return;
      }
      state.audioBusy = true;
      state.audioBusyLabel = "Natuurlijke stem maken...";
      renderReading();
      showError("");
      try {
        const payload = {
          contents: [{
            parts: [{
              text: `Lees deze Nederlandse NT2 B1-tekst natuurlijk en rustig voor, alsof een vriendelijke taalcoach in Groningen het verhaal vertelt. Spreek duidelijk, warm en niet mechanisch.\n\n${page.text}`
            }]
          }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: "Aoede" }
              }
            }
          }
        };
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${encodeURIComponent(state.apiKey)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const inline = data.candidates?.[0]?.content?.parts?.find((part) => part.inlineData)?.inlineData;
        const b64 = inline?.data;
        if (!b64) throw new Error("Geen audiodata ontvangen.");
        const mime = inline.mimeType || "audio/wav";
        const bytes = Uint8Array.from(atob(b64), (char) => char.charCodeAt(0));
        const blob = new Blob([bytes], { type: mime });
        page.audioUrl = URL.createObjectURL(blob);
        page.audioGenerated = true;
        awardXP(5, "Natuurlijke audio");
        playGeneratedAudio(page);
      } catch (error) {
        showError(`Natuurlijke audio mislukt. Browserstem blijft beschikbaar. (${error.message || error})`);
      } finally {
        state.audioBusy = false;
        state.audioBusyLabel = "";
        renderReading();
      }
    }

    function renderImagePanel(page) {
      if (page.imageUrl) {
        const previewAttr = page.previewImageUrl ? ` data-preview="${escapeHtml(page.previewImageUrl)}"` : "";
        return `
          <div class="image-panel">
            <img loading="eager" decoding="async" fetchpriority="high" src="${escapeHtml(page.imageUrl)}" alt="${escapeHtml(state.selectedTheme.title)}"${previewAttr} onerror="if(this.dataset.preview && this.src !== this.dataset.preview){this.src=this.dataset.preview}else{this.parentElement.innerHTML='<div class=&quot;image-fallback&quot;><div><strong>Beeld tijdelijk offline</strong><br>De leermodule blijft beschikbaar.</div></div>'}">
          </div>
        `;
      }

      return `
        <div class="image-panel">
          <div class="storybook-empty">
            <div class="shot-copy">
              <h3>Beeld nog niet gegenereerd</h3>
              <p>Voor deze pagina maakt de app pas een echte storybookfoto nadat je een Gemini API-sleutel invoert. Dan gebruikt hij de tekst, Mila als vaste hoofdpersoon, Groningen als omgeving en precies deze twee doelwoorden.</p>
              <div class="shot-tags">
                ${(page.targets || []).map((target) => `<span>${escapeHtml(target)}</span>`).join("")}
              </div>
            </div>
          </div>
          <div class="image-badge">${state.apiKey ? "Klaar om storybookbeeld te maken" : "Voer een API-sleutel in om exact storybookbeeld te maken"}</div>
        </div>
      `;
    }

    function preloadStoryImages() {
      const indexes = [state.pageIndex - 1, state.pageIndex + 1].filter((index) => index >= 0 && index < state.pages.length);
      indexes.forEach((index) => {
        const url = state.pages[index]?.imageUrl;
        if (!url) return;
        const img = new Image();
        img.decoding = "async";
        img.src = url;
      });
    }

    function scrollReaderToTop() {
      requestAnimationFrame(() => {
        document.querySelector(".reader")?.scrollIntoView({ block: "start", behavior: "smooth" });
      });
    }

    const highlightAliases = {
      "een beroep doen op iemand": ["een beroep te doen op iemand", "een beroep op iemand doen"],
      "je problemen de baas kunnen": ["problemen beter de baas kan", "problemen de baas kan"],
      "slechter af zijn dan": ["slechter af dan"],
      "te wijten zijn aan": ["te wijten aan"],
      "geen kwaad kunnen": ["geen kwaad"],
      "iets hoog op de agenda hebben staan": ["hoog op de agenda"],
      "uit zijn voegen barsten": ["barst uit zijn voegen"],
      "van ondergeschikt belang zijn": ["van ondergeschikt belang"]
    };

    function getHighlightEntries() {
      const page = state.pages[state.pageIndex] || {};
      const preferred = [...(page.targets || []), ...(state.vocab || [])];
      const seen = new Set();
      return preferred
        .flatMap((word) => {
          const clean = normalize(word);
          if (!clean || seen.has(clean)) return null;
          seen.add(clean);
          const glossary = state.glossary.find((entry) => normalize(entry.word) === clean);
          const definition = glossary?.definition || getDefinitionForWord(word);
          const canonical = {
            word,
            matchWord: word,
            norm: clean,
            definition
          };
          return [
            canonical,
            ...(highlightAliases[clean] || []).map((alias) => ({
              word,
              matchWord: alias,
              norm: normalize(alias),
              definition
            }))
          ];
        })
        .flat()
        .filter(Boolean)
        .sort((a, b) => b.norm.length - a.norm.length);
    }

    function highlightText(text) {
      const raw = String(text || "");
      const entries = getHighlightEntries();
      if (!entries.length) return escapeHtml(raw);
      const pattern = entries
        .map((entry) => {
          const matchWord = entry.matchWord || entry.word;
          const escaped = escapeRegExp(matchWord).replace(/\s+/g, "\\s+");
          return matchWord.includes(" ") ? escaped : `${escaped}[\\p{L}\\p{M}'-]*`;
        })
        .join("|");
      const matcher = new RegExp(`(^|[^\\p{L}\\p{N}])(${pattern})(?=$|[^\\p{L}\\p{N}])`, "giu");
      let html = "";
      let lastIndex = 0;
      raw.replace(matcher, (full, prefix, match, offset) => {
        const start = offset + prefix.length;
        const end = start + match.length;
        const clean = normalize(match);
        const entry = entries.find((item) =>
          item.word.includes(" ") ? clean === item.norm : (clean === item.norm || clean.startsWith(item.norm))
        );
        if (!entry) return full;
        html += escapeHtml(raw.slice(lastIndex, start));
        html += `<button class="word" type="button" data-word="${escapeHtml(entry.word)}" data-def="${escapeHtml(entry.definition)}">${escapeHtml(match)}</button>`;
        lastIndex = end;
        return full;
      });
      html += escapeHtml(raw.slice(lastIndex));
      return html;
    }

    function renderStoryText(text) {
      const sentences = getPageSentences(text);
      return sentences.map((sentence, index) => {
        const checked = !!state.sentenceChecks[getSentenceKey(index)];
        return `
          <span class="sentence-row ${checked ? "read" : ""}">
            <button class="sentence-check" type="button" data-sentence="${index}" aria-label="Markeer zin als gelezen">${checked ? "✓" : ""}</button>
            <span>${highlightText(sentence.trim())}</span>
          </span>
        `;
      }).join("");
    }

    function findWordContext(word) {
      const target = normalize(word);
      const text = state.pages.map((page) => page.text).join(" ");
      return text.split(/[.!?]/).find((part) => normalize(part).includes(target))?.trim() || "";
    }

    function getDefinitionForWord(word) {
      const item = state.glossary.find((entry) => normalize(entry.word) === normalize(word));
      if (item?.definition) return item.definition;
      for (const story of Object.values(stories)) {
        const found = story.glossary?.find((entry) => normalize(entry.word) === normalize(word));
        if (found?.definition) return found.definition;
      }
      return "Doelwoord";
    }

    function getAllPracticeWords() {
      const seen = new Set();
      const items = [];
      Object.entries(stories).forEach(([key, story]) => {
        (story.glossary || []).forEach((entry) => {
          const id = normalize(entry.word);
          if (!id || seen.has(id)) return;
          seen.add(id);
          const sentence = (story.pages || [])
            .map((page) => page.text)
            .join(" ")
            .split(/[.!?]/)
            .find((part) => normalize(part).includes(id))?.trim() || "";
          items.push({ word: entry.word, definition: entry.definition || "Doelwoord", sentence, source: key });
        });
      });
      return items;
    }

    function addDifficultWords(words) {
      const now = new Date().toISOString();
      const byWord = new Map(state.difficultWords.map((item) => [normalize(item.word), item]));
      words.forEach((word) => {
        const key = normalize(word);
        if (!key) return;
        const existing = byWord.get(key);
        if (existing) {
          existing.count = (existing.count || 1) + 1;
          existing.lastSeen = now;
          return;
        }
        const item = {
          word,
          definition: getDefinitionForWord(word),
          sentence: findWordContext(word),
          source: state.selectedSubsection || "Quiz",
          count: 1,
          lastSeen: now
        };
        state.difficultWords.unshift(item);
        byWord.set(key, item);
      });
      state.difficultWords = state.difficultWords.slice(0, 40);
      saveProgress();
    }

    function markWordEase(word, ease, stayOnPage = false) {
      const key = normalize(word);
      if (!key) return;
      state.wordEase[key] = { ease, updatedAt: Date.now() };
      if (ease === "hard") {
        addDifficultWords([word]);
        addReviewWords([word]);
        awardXP(2, "Woord gemarkeerd");
      } else {
        state.difficultWords = state.difficultWords.filter((item) => normalize(item.word) !== key);
        state.reviewPool = state.reviewPool.filter((item) => normalize(item.word) !== key);
        awardXP(3, "Woord beheerst");
      }
      saveProgress();
      if (stayOnPage || state.appState !== "flashcards") {
        const status = document.getElementById("drawerStatus");
        if (status) status.textContent = getWordStatusLabel(word);
        updateHeader();
        return;
      }
      if (state.cardIndex < getFlashItems().length - 1) {
        state.cardIndex += 1;
        state.cardFlipped = false;
        renderFlashcards();
      } else {
        renderFlashcards();
      }
    }

    function pickPracticeItems(sourceItems, count) {
      const seen = new Set();
      const clean = (sourceItems || []).filter((item) => {
        const key = normalize(item.word);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return shuffleArray(clean).slice(0, count);
    }

    function startPractice(items, title, mode) {
      const selected = pickPracticeItems(items, 8);
      if (!selected.length) {
        showError("Er zijn nog geen woorden om te oefenen. Open eerst een verhaal of maak een quiz.");
        return;
      }
      state.reviewPool = selected;
      state.reviewMode = true;
      state.practiceMode = mode || "practice";
      state.practiceTitle = title || "Korte oefening";
      state.cardIndex = 0;
      state.cardFlipped = false;
      awardXP(3, "Oefening gestart");
      renderFlashcards();
    }

    function startDifficultPractice() {
      if (!state.difficultWords.length) {
        showError("Je hebt nog geen moeilijke woorden. Maak eerst een quiz; foute woorden komen hier automatisch.");
        return;
      }
      startPractice(state.difficultWords, "Mijn moeilijke woorden", "difficult");
    }

    function renderPracticeComplete() {
      state.appState = "practiceComplete";
      updateHeader();
      const title = state.practiceTitle || "Oefening klaar";
      const count = state.reviewPool.length;
      view.innerHTML = `
        <section class="practice-complete">
          <div class="done-icon">✓</div>
          <h1>${escapeHtml(title)}</h1>
          <p style="color:#64748b;font-weight:850;line-height:1.6;">Goed gedaan. Je hebt ${count} woorden geoefend. Herhaal moeilijke woorden later nog een keer.</p>
          <div class="row" style="justify-content:center;margin-top:20px;">
            <button class="secondary" id="practiceHomeBtn" type="button">Start</button>
            <button class="primary" id="practiceAgainBtn" type="button">Nog een keer</button>
          </div>
        </section>
      `;
      document.getElementById("practiceHomeBtn").addEventListener("click", resetApp);
      document.getElementById("practiceAgainBtn").addEventListener("click", () => {
        const source = state.practiceMode === "difficult" ? state.difficultWords : [...state.difficultWords, ...getAllPracticeWords()];
        startPractice(source, title, state.practiceMode || "practice");
      });
    }

    function normalizeTopicKey(value) {
      return normalize(value).replace(/\s+/g, " ");
    }

    function getStoryTitleFromKey(key) {
      if (!key) return "";
      const dash = String(key).indexOf("-");
      return dash === -1 ? String(key) : String(key).slice(dash + 1);
    }

    function getTopicKey(theme, topic) {
      return `${theme.id}-${normalizeTopicKey(topic)}`;
    }

    function getStoryKeysForTopic(theme, topic) {
      const topicKey = getTopicKey(theme, topic);
      const configured = topicStoryGroups[topicKey] || [];
      const candidates = [
        ...configured,
        `${theme.id}-${topic}`,
        `${theme.id}-${String(topic).charAt(0).toUpperCase()}${String(topic).slice(1)}`
      ];
      const seen = new Set();
      return candidates.filter((key) => {
        if (!stories[key] || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    function countStoriesForTheme(theme) {
      return (theme.bookTopics || []).reduce((total, topic) => total + getStoryKeysForTopic(theme, topic).length, 0);
    }

    function getThemeStoryKeys(theme) {
      const keys = [];
      (theme.bookTopics || []).forEach((topic) => {
        getStoryKeysForTopic(theme, topic).forEach((key) => {
          if (!keys.includes(key)) keys.push(key);
        });
      });
      return keys;
    }

    function getThemeWordCount(theme) {
      return getThemeStoryKeys(theme).reduce((total, key) => total + ((stories[key]?.vocab || []).length), 0);
    }

    function getThemeProgress(theme) {
      const keys = getThemeStoryKeys(theme);
      const done = keys.filter((key) => state.completedStories.has(key)).length;
      return {
        done,
        total: keys.length,
        pct: keys.length ? Math.round((done / keys.length) * 100) : 0
      };
    }

    function getEstimatedMinutes(theme) {
      const pages = getThemeStoryKeys(theme).reduce((total, key) => total + ((stories[key]?.pages || []).length), 0);
      return Math.max(5, Math.round(pages * 1.5));
    }

    function getSentenceKey(index) {
      return `${state.currentStoryKey || "story"}:${state.pageIndex}:${index}`;
    }

    function getPageSentences(text) {
      return String(text || "").match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [String(text || "")];
    }

    function getPageReadProgress(page) {
      const sentences = getPageSentences(page?.text || "");
      const read = sentences.filter((_, index) => !!state.sentenceChecks[getSentenceKey(index)]).length;
      return {
        read,
        total: sentences.length,
        pct: sentences.length ? Math.round((read / sentences.length) * 100) : 0
      };
    }

    function getWordStatusLabel(word) {
      const ease = state.wordEase[normalize(word)]?.ease || "";
      if (ease === "hard") return "Moeilijk woord";
      if (ease === "easy") return "Gekend woord";
      return "Nieuw woord";
    }

    function getQuizProgress() {
      const answered = Object.keys(state.answers).length;
      return {
        answered,
        total: state.quiz.length,
        pct: state.quiz.length ? Math.round((answered / state.quiz.length) * 100) : 0
      };
    }

    function renderTopicDirectory(theme, topic) {
      showError("");
      stopSpeaking();
      state.appState = "topicDirectory";
      state.selectedTheme = theme;
      state.selectedTopic = topic;
      updateHeader();
      const storyKeys = getStoryKeysForTopic(theme, topic);
      const hasStories = storyKeys.length > 0;
      view.innerHTML = `
        <section class="theme-directory">
          <div class="directory-head">
            <div class="directory-kicker">
              <span class="chapter">${escapeHtml(theme.chapter)}</span>
              <span class="topic-chip">${escapeHtml(theme.title)}</span>
                </div>
                <h1>${escapeHtml(topic)}</h1>
                <div class="theme-subtitle" style="margin:10px 0 0;font-size:20px;">${escapeHtml(theme.subtitle || "")}</div>
                <p>Kies een verhaal dat bij dit onderwerp hoort.</p>
            <div class="directory-actions">
              <button class="secondary" type="button" id="backToThemesBtn">← Terug naar startpagina</button>
              ${hasStories ? `<button class="primary" type="button" id="startFirstStoryBtn">Start eerste verhaal</button>` : ""}
            </div>
          </div>
          ${hasStories ? `
            <div class="story-grid">
              ${storyKeys.map((key, index) => {
                const story = stories[key];
                const wordCount = story?.vocab?.length || story?.glossary?.length || 0;
                const name = storyKeys.length === 1 ? topic : getStoryTitleFromKey(key);
                return `
                  <button class="story-card" type="button" data-storykey="${escapeHtml(key)}">
                    <span>
                      Verhaal ${index + 1}: ${escapeHtml(name)}
                      <small>${wordCount || ""} doelwoorden · lezen, audio, woordkaarten en quiz</small>
                    </span>
                    <span aria-hidden="true">→</span>
                  </button>
                `;
              }).join("")}
            </div>
          ` : `
            <div class="coming-card">
              Dit onderwerp staat al in de structuur van het boek, maar de verhalen zijn nog niet ingevuld. Je kunt deze map later vullen met extra verhalen en woorden.
            </div>
          `}
        </section>
      `;

      document.getElementById("backToThemesBtn")?.addEventListener("click", renderLanding);
      document.getElementById("startFirstStoryBtn")?.addEventListener("click", () => startStoryByKey(storyKeys[0]));
      view.querySelectorAll("[data-storykey]").forEach((button) => {
        button.addEventListener("click", () => startStoryByKey(button.dataset.storykey));
      });
    }

    function renderLanding() {
      showError("");
      state.appState = "landing";
      updateHeader();
      const difficultCount = state.difficultWords.length;
      const lastActivity = state.lastActivity && stories[state.lastActivity.storyKey] ? state.lastActivity : null;
      view.innerHTML = `
        <section class="hero">
          <div>
            <h1>Dompel jezelf onder in<br><span>Groningen.</span></h1>
            <p>Kies een onderwerp uit <em>De finale</em>. Daarna zie je de korte verhalen die bij dat onderwerp horen.</p>
            ${lastActivity ? `
              <div class="continue-banner">
                <div>
                  <strong>Laatste activiteit</strong>
                  <span>${escapeHtml(lastActivity.themeTitle)} — ${escapeHtml(lastActivity.topic)} · pagina ${(lastActivity.pageIndex || 0) + 1}</span>
                </div>
                <button class="primary" type="button" id="continueBtn">Doorgaan</button>
              </div>
            ` : ""}
            ${difficultCount ? `
            <div class="home-actions one-action">
              <div class="quick-card ${difficultCount ? "" : "empty"}">
                <strong>Mijn moeilijke woorden</strong>
                <span>${difficultCount} woord${difficultCount === 1 ? "" : "en"} uit foute quizvragen.</span>
                <button class="secondary" type="button" id="difficultPracticeBtn">Oefen moeilijke woorden</button>
              </div>
            </div>
            ` : ""}
          </div>
          <div class="theme-grid">
            ${themes.map((theme) => {
              const progress = getThemeProgress(theme);
              const isLocked = countStoriesForTheme(theme) === 0;
              return `
                <article class="theme-card theme-${theme.id} ${isLocked ? "coming-soon" : ""}" ${isLocked ? 'aria-disabled="true"' : ""}>
                  <div class="theme-top">
                    <div>
                      <span class="chapter">${escapeHtml(theme.chapter)}</span>
                    </div>
                    <div class="theme-icon" aria-hidden="true">${themeIconSvg(theme.id)}</div>
                  </div>
                  <h3>${escapeHtml(theme.title)}</h3>
                  <div class="theme-subtitle">${escapeHtml(theme.subtitle || "")}</div>
                  ${isLocked ? `
                    <div class="locked-note">Nog niet ontgrendeld</div>
                  ` : `
                    <div class="theme-progress" aria-label="Voortgang ${progress.pct}%">
                      <div style="width:${progress.pct}%;"></div>
                    </div>
                    <div class="sub-list">
                      ${(theme.bookTopics || []).map((topic) => `<button class="sub-btn" type="button" data-topic-theme="${theme.id}" data-topic="${escapeHtml(topic)}">${escapeHtml(topic)}<span>→</span></button>`).join("")}
                    </div>
                  `}
                </article>
              `;
            }).join("")}
          </div>
        </section>
      `;

      const difficultBtn = document.getElementById("difficultPracticeBtn");
      if (difficultBtn) difficultBtn.addEventListener("click", startDifficultPractice);
      const continueBtn = document.getElementById("continueBtn");
      if (continueBtn && lastActivity) {
        continueBtn.addEventListener("click", () => startStoryByKey(lastActivity.storyKey, { pageIndex: lastActivity.pageIndex || 0 }));
      }

      view.querySelectorAll("[data-topic]").forEach((button) => {
        button.addEventListener("click", () => {
          const theme = themes.find((item) => String(item.id) === String(button.dataset.topicTheme));
          if (theme) renderTopicDirectory(theme, button.dataset.topic);
        });
      });
    }

    function startStoryByKey(key, options = {}) {
      const story = stories[key];
      const themeId = Number(String(key).split("-")[0]);
      const subsection = getStoryTitleFromKey(key);
      const theme = themes.find((item) => item.id === themeId);
      showError("");
      stopSpeaking();
      if (!theme || !story) {
        showError("Dit verhaal is nog niet gevuld in deze MVP. Kies een verhaal dat al beschikbaar is.");
        return;
      }
      state.appState = "reading";
      state.currentStoryKey = key;
      state.selectedTheme = theme;
      state.selectedSubsection = state.selectedTopic || subsection;
      state.pages = story.pages;
      state.glossary = story.glossary;
      state.vocab = story.vocab;
      state.quiz = prepareQuizForSession(story.quiz);
      state.answers = {};
      state.score = 0;
      state.pageIndex = Math.min(Math.max(0, options.pageIndex || 0), Math.max(0, story.pages.length - 1));
      state.reviewMode = false;
      state.practiceMode = "";
      state.practiceTitle = "";
      rememberActivity(key, state.pageIndex);
      awardXP(5, "Verhaal gestart");
      renderReading();
    }

    function startStory(theme, subsection) {
      startStoryByKey(`${theme.id}-${subsection}`);
    }

    function renderReading() {
      state.appState = "reading";
      capturePageAudioState();
      updateHeader();
      const page = state.pages[state.pageIndex];
      const readProgress = getPageReadProgress(page);
      const audioKey = currentPageAudioKey();
      view.innerHTML = `
        <section class="reader">
          <div class="toolbar">
            <span class="toolbar-title">${escapeHtml(state.selectedTheme.title)} / ${escapeHtml(state.selectedSubsection)}</span>
            <div class="toolbar-actions">
              <button class="plain-btn" type="button" id="speedBtn"><span>Tempo</span> ${state.playbackSpeed}x</button>
              <button class="plain-btn" type="button" id="fontBtn">Tekst ${state.fontSize === "size-lg" ? "klein" : state.fontSize === "size-xl" ? "normaal" : "groot"}</button>
            </div>
          </div>
          <article class="reader-card">
            ${renderImagePanel(page)}
            <div class="audio-actions">
              <div class="audio-player">
                ${page.audioUrl
                  ? `<audio id="pageAudio" controls preload="metadata" data-audio-key="${escapeHtml(audioKey)}" src="${escapeHtml(page.audioUrl)}"></audio>`
                  : `<button class="audio-fallback" type="button" id="browserAudioBtn">Lees deze pagina voor</button>`}
                <div class="audio-caption">${page.audioUrl ? "Luister eerst en lees daarna de tekst." : "Geen lokale audio gevonden; browserstem wordt gebruikt."}</div>
              </div>
            </div>
            <div class="targets"><span>Doelwoorden</span> ${page.targets.map(escapeHtml).join(", ")}</div>
            <div class="reader-progress">
              <div>
                <strong>Leesstap</strong>
                <span>${readProgress.read}/${readProgress.total} zinnen afgevinkt</span>
              </div>
              <div class="reader-progress-track"><div style="width:${readProgress.pct}%;"></div></div>
            </div>
            <div class="reader-hint">Luister eerst. Vink daarna zinnen af die je begrijpt. Tik op paarse woorden voor betekenis en uitspraak.</div>
            <div class="story-text ${state.fontSize}">${renderStoryText(page.text)}</div>
            <div class="prompt-note ${state.showPrompt ? "show" : ""}">${escapeHtml(page.imagePrompt || "")}</div>
            <div class="nav-row">
              <button class="secondary" type="button" id="prevBtn" ${state.pageIndex === 0 ? "disabled" : ""}>Vorige</button>
              <span class="page-pill">Spread ${state.pageIndex + 1} / ${state.pages.length}</span>
              ${state.pageIndex < state.pages.length - 1
                ? `<button class="primary" type="button" id="nextBtn">Volgende</button>`
                : `<button class="success" type="button" id="flashBtn">Woordentrainer</button>`}
            </div>
          </article>
        </section>
      `;
      preloadStoryImages();

      view.querySelectorAll(".word").forEach((button) => {
        button.addEventListener("mouseenter", () => discoverWord(button.dataset.word));
        button.addEventListener("click", () => openWordDrawer(button.dataset.word, button.dataset.def));
      });
      view.querySelectorAll(".sentence-check").forEach((button) => {
        button.addEventListener("click", (event) => {
          event.stopPropagation();
          const index = Number(button.dataset.sentence);
          const key = getSentenceKey(index);
          const wasRead = !!state.sentenceChecks[key];
          state.sentenceChecks[key] = !wasRead;
          saveProgress();
          if (!wasRead) awardXP(1, "Zin gelezen");
          const isRead = !!state.sentenceChecks[key];
          button.textContent = isRead ? "✓" : "";
          button.closest(".sentence-row")?.classList.toggle("read", isRead);
          const progress = getPageReadProgress(page);
          const progressText = document.querySelector(".reader-progress span");
          const progressFill = document.querySelector(".reader-progress-track div");
          if (progressText) progressText.textContent = `${progress.read}/${progress.total} zinnen afgevinkt`;
          if (progressFill) progressFill.style.width = `${progress.pct}%`;
        });
      });
      document.getElementById("speedBtn").addEventListener("click", () => {
        state.playbackSpeed = state.playbackSpeed === 0.9 ? 0.75 : state.playbackSpeed === 0.75 ? 1.15 : 0.9;
        const pageAudio = document.getElementById("pageAudio");
        if (pageAudio) pageAudio.playbackRate = state.playbackSpeed;
        const speedBtn = document.getElementById("speedBtn");
        if (speedBtn) speedBtn.innerHTML = `<span>Tempo</span> ${state.playbackSpeed}x`;
      });
      document.getElementById("fontBtn").addEventListener("click", () => {
        state.fontSize = state.fontSize === "size-lg" ? "size-xl" : state.fontSize === "size-xl" ? "size-2xl" : "size-lg";
        renderReading();
      });
      const pageAudio = document.getElementById("pageAudio");
      if (pageAudio) {
        restorePageAudioState(pageAudio);
        pageAudio.addEventListener("play", () => {
          window.speechSynthesis && window.speechSynthesis.cancel();
          state.audioProgress[pageAudio.dataset.audioKey || currentPageAudioKey()] = {
            time: Number.isFinite(pageAudio.currentTime) ? pageAudio.currentTime : 0,
            playing: true,
            ended: false
          };
          showError("");
        });
        pageAudio.addEventListener("pause", () => {
          const key = pageAudio.dataset.audioKey || currentPageAudioKey();
          state.audioProgress[key] = {
            time: Number.isFinite(pageAudio.currentTime) && !pageAudio.ended ? pageAudio.currentTime : 0,
            playing: false,
            ended: !!pageAudio.ended
          };
        });
        pageAudio.addEventListener("timeupdate", () => {
          const key = pageAudio.dataset.audioKey || currentPageAudioKey();
          state.audioProgress[key] = {
            time: Number.isFinite(pageAudio.currentTime) && !pageAudio.ended ? pageAudio.currentTime : 0,
            playing: !pageAudio.paused && !pageAudio.ended,
            ended: !!pageAudio.ended
          };
        });
        pageAudio.addEventListener("loadedmetadata", () => {
          pageAudio.playbackRate = state.playbackSpeed;
        });
        pageAudio.addEventListener("ended", () => {
          state.audioProgress[pageAudio.dataset.audioKey || currentPageAudioKey()] = {
            time: 0,
            playing: false,
            ended: true
          };
          awardXP(5, "Audio geluisterd");
        });
        pageAudio.addEventListener("error", () => showError("De lokale audio kon niet laden. Vernieuw de pagina of controleer het audiobestand."));
      }
      const browserAudioBtn = document.getElementById("browserAudioBtn");
      if (browserAudioBtn) browserAudioBtn.addEventListener("click", () => speakDutch(page.text, state.playbackSpeed, () => awardXP(5, "Audio geluisterd")));
      document.getElementById("prevBtn").addEventListener("click", () => {
        if (state.pageIndex > 0) {
          stopSpeaking();
          pausePageAudioForNavigation();
          state.pageIndex -= 1;
          rememberActivity(state.currentStoryKey, state.pageIndex);
          awardXP(2, "Teruggelezen");
          renderReading();
          scrollReaderToTop();
        }
      });
      const nextBtn = document.getElementById("nextBtn");
      if (nextBtn) {
        nextBtn.addEventListener("click", () => {
          stopSpeaking();
          pausePageAudioForNavigation();
          state.pageIndex += 1;
          rememberActivity(state.currentStoryKey, state.pageIndex);
          awardXP(5, "Pagina gelezen");
          renderReading();
          scrollReaderToTop();
        });
      }
      const flashBtn = document.getElementById("flashBtn");
      if (flashBtn) flashBtn.addEventListener("click", () => {
        markStoryCompleted(state.currentStoryKey);
        startFlashcards(false);
      });
    }

    function discoverWord(word) {
      if (!word || state.discoveredWords.has(word)) return;
      state.discoveredWords.add(word);
      saveProgress();
      awardXP(2, "Woord ontdekt");
    }

    function openWordDrawer(word, definition) {
      discoverWord(word);
      document.getElementById("drawerWord").textContent = word;
      document.getElementById("drawerDef").textContent = definition;
      document.getElementById("drawerStatus").textContent = getWordStatusLabel(word);
      wordDrawer.classList.add("show");
      playWordAudio(word);
    }

    function startFlashcards(onlyReview, title, mode) {
      state.appState = "flashcards";
      state.reviewMode = onlyReview;
      state.practiceTitle = title || (onlyReview ? "Fouten herhalen" : "Woordentrainer");
      state.practiceMode = mode || "";
      state.cardIndex = 0;
      state.cardFlipped = false;
      renderFlashcards();
    }

    function getFlashItems() {
      return state.reviewMode && state.reviewPool.length ? state.reviewPool : state.glossary;
    }

    function renderFlashcards() {
      updateHeader();
      const items = getFlashItems();
      if (!items.length) {
        view.innerHTML = `
          <section class="flash-wrap">
            <div class="center">
              <h1>Geen woorden meer</h1>
              <p style="color:#64748b;font-weight:850;">Je hebt deze woorden afgerond.</p>
              <button class="primary" type="button" id="emptyFlashHomeBtn">Terug naar startpagina</button>
            </div>
          </section>
        `;
        document.getElementById("emptyFlashHomeBtn").addEventListener("click", resetApp);
        return;
      }
      if (state.cardIndex >= items.length) state.cardIndex = Math.max(0, items.length - 1);
      if (state.cardIndex < 0) state.cardIndex = 0;
      const card = items[state.cardIndex] || {};
      const ease = state.wordEase[normalize(card.word)]?.ease || "";
      const progressPct = items.length ? Math.round(((state.cardIndex + 1) / items.length) * 100) : 0;
      view.innerHTML = `
        <section class="flash-wrap">
          <div class="center">
            <h1>${escapeHtml(state.practiceTitle || (state.reviewMode ? "Fouten herhalen" : "Woordentrainer"))}</h1>
            <p class="practice-guide">Luister naar het woord, draai de kaart om en kies daarna Makkelijk of Moeilijk.</p>
            <div class="flash-progress" aria-label="Kaart ${state.cardIndex + 1} van ${items.length}">
              <span>Kaart ${state.cardIndex + 1} / ${items.length}</span>
              <div><i style="width:${progressPct}%;"></i></div>
            </div>
          </div>
          <div class="flash-card" id="flipBtn" role="button" tabindex="0">
            ${state.cardFlipped
              ? `<div>
                  <div class="flash-def">${escapeHtml(card.definition || "")}</div>
                  <div class="ease-actions">
                    <button class="secondary ease-btn ${ease === "easy" ? "selected" : ""}" type="button" id="easyWordBtn">Makkelijk</button>
                    <button class="secondary ease-btn hard ${ease === "hard" ? "selected" : ""}" type="button" id="hardWordBtn">Moeilijk</button>
                  </div>
                </div>`
              : `<div><button class="icon-btn" type="button" id="speakCardBtn">Audio</button><div class="flash-word">${escapeHtml(card.word || "")}</div><p style="color:#64748b;font-weight:800;">Klik om om te draaien</p></div>`}
          </div>
          <div class="row" style="margin-top:18px;gap:12px;">
            <button class="secondary" type="button" id="prevCardBtn" style="flex:1;height:54px;" ${state.cardIndex === 0 ? "disabled" : ""}>Vorige</button>
            <button class="primary" type="button" id="nextCardBtn" style="flex:1;height:54px;">
              ${state.cardIndex < items.length - 1 ? "Volgende" : state.practiceMode ? "Klaar" : state.reviewMode ? "Terug naar resultaten" : "Naar Quiz"}
            </button>
          </div>
        </section>
      `;
      document.getElementById("flipBtn").addEventListener("click", () => {
        state.cardFlipped = !state.cardFlipped;
        renderFlashcards();
      });
      document.getElementById("flipBtn").addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          state.cardFlipped = !state.cardFlipped;
          renderFlashcards();
        }
      });
      const speakBtn = document.getElementById("speakCardBtn");
      if (speakBtn) {
        speakBtn.addEventListener("click", (event) => {
          event.stopPropagation();
          playWordAudio(card.word);
        });
      }
      const easyBtn = document.getElementById("easyWordBtn");
      if (easyBtn) easyBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        markWordEase(card.word, "easy");
      });
      const hardBtn = document.getElementById("hardWordBtn");
      if (hardBtn) hardBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        markWordEase(card.word, "hard");
      });
      document.getElementById("prevCardBtn").addEventListener("click", () => {
        if (state.cardIndex > 0) {
          state.cardIndex -= 1;
          state.cardFlipped = false;
          renderFlashcards();
        }
      });
      document.getElementById("nextCardBtn").addEventListener("click", () => {
        if (state.cardIndex < items.length - 1) {
          state.cardIndex += 1;
          state.cardFlipped = false;
          renderFlashcards();
        } else {
          awardXP(state.reviewMode ? 15 : 30, state.practiceMode ? "Korte oefening" : state.reviewMode ? "Fouten herhaald" : "Woordentrainer");
          if (state.practiceMode) renderPracticeComplete();
          else if (state.reviewMode) renderResults();
          else renderQuiz();
        }
      });
    }

    function renderCustomPrompt() {
      state.appState = "custom";
      updateHeader();
      view.innerHTML = `
        <section class="custom-grid">
          <section>
            <h2>Avatarvoorbeeld</h2>
            <p style="color:#64748b;line-height:1.5;">De foto blijft lokaal in deze browser en wordt niet gebruikt voor AI-generatie.</p>
            <label class="avatar-box" id="avatarBox" style="${state.userProfile.photo ? `background-image:url('${state.userProfile.photo}')` : ""}">
              ${state.userProfile.photo ? "" : "Kies foto (alleen lokaal voorbeeld)"}
              <input id="avatarInput" type="file" accept="image/*" class="hidden">
            </label>
            <div style="height:12px;"></div>
            <input class="field" id="nameInput" value="${escapeHtml(state.userProfile.name)}" placeholder="Naam">
          </section>
          <section>
            <h2>Jouw verhaallijn</h2>
            <textarea id="customPrompt" placeholder="Typ je Groningen-ideeën hier, of gebruik de microfoon voor Nederlandse spraak.">${escapeHtml(state.customPrompt)}</textarea>
            <div class="row" style="margin-top:12px;">
              <button class="secondary" id="micBtn" type="button">${state.listening ? "Stop opname" : "Microfoon"}</button>
              <button class="primary" id="customGenBtn" type="button">Maak mijn verhaal</button>
              <button class="secondary" id="skipQuizBtn" type="button">Overslaan naar Quiz</button>
            </div>
          </section>
        </section>
      `;
      document.getElementById("avatarInput").addEventListener("change", (event) => {
        const file = event.target.files?.[0];
        if (!file || !file.type.startsWith("image/")) return;
        const reader = new FileReader();
        reader.onload = () => {
          state.userProfile.photo = reader.result;
          renderCustomPrompt();
        };
        reader.readAsDataURL(file);
      });
      document.getElementById("nameInput").addEventListener("input", (event) => {
        state.userProfile.name = event.target.value;
      });
      document.getElementById("customPrompt").addEventListener("input", (event) => {
        state.customPrompt = event.target.value;
      });
      document.getElementById("micBtn").addEventListener("click", toggleListening);
      document.getElementById("customGenBtn").addEventListener("click", () => {
        showError("Deze offline versie heeft de Gemini-generatie bewust als aansluitpunt bewaard. Gebruik de quiz of sluit je API-route hier later aan.");
      });
      document.getElementById("skipQuizBtn").addEventListener("click", renderQuiz);
    }

    function toggleListening() {
      const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!Recognition) {
        showError("Spraakherkenning wordt niet ondersteund in deze browser.");
        return;
      }
      if (state.listening) {
        state.recognition && state.recognition.stop();
        state.listening = false;
        renderCustomPrompt();
        return;
      }
      const recognition = new Recognition();
      recognition.lang = "nl-NL";
      recognition.interimResults = false;
      recognition.onstart = () => { state.listening = true; renderCustomPrompt(); };
      recognition.onend = () => { state.listening = false; renderCustomPrompt(); };
      recognition.onresult = (event) => {
        const text = event.results?.[0]?.[0]?.transcript;
        if (text) state.customPrompt = state.customPrompt ? `${state.customPrompt} ${text}` : text;
      };
      state.recognition = recognition;
      recognition.start();
    }

    function renderQuiz() {
      state.appState = "quiz";
      updateHeader();
      const progress = getQuizProgress();
      view.innerHTML = `
        <section class="quiz-card">
          <div class="quiz-head">
            <div class="quiz-icon">OK</div>
            <div>
              <h1 style="margin:0;">Kennischeck</h1>
              <div style="color:#94a3b8;font-weight:900;text-transform:uppercase;font-size:12px;">Directe feedback per vraag</div>
            </div>
          </div>
          <div class="quiz-progress">
            <span>${progress.answered}/${progress.total} vragen beantwoord</span>
            <div><i style="width:${progress.pct}%;"></i></div>
          </div>
          <div id="questionList">
            ${state.quiz.map((q, index) => renderQuestion(q, index)).join("")}
          </div>
          <button class="primary" id="resultBtn" type="button" style="width:100%;height:56px;margin-top:16px;" ${Object.keys(state.answers).length !== state.quiz.length ? "disabled" : ""}>Bekijk resultaat</button>
        </section>
      `;
      view.querySelectorAll("[data-option]").forEach((button) => {
        button.addEventListener("click", () => answerQuestion(Number(button.dataset.q), button.dataset.option));
      });
      view.querySelectorAll("[data-speak]").forEach((button) => {
        button.addEventListener("click", () => playWordAudio(button.dataset.speak));
      });
      document.getElementById("resultBtn").addEventListener("click", renderResults);
    }

    function renderQuestion(q, index) {
      const answered = state.answers[index];
      const correct = answered && normalize(answered) === normalize(q.answer);
      const related = (q.relatedWords || []).map((word) => `<button class="mini-word" type="button" data-speak="${escapeHtml(word)}">${escapeHtml(word)}</button>`).join("");
      return `
        <article class="question ${answered ? (correct ? "correct" : "wrong") : ""}">
          <h3><span style="color:var(--purple);">Vraag ${index + 1}:</span> ${escapeHtml(q.question)}</h3>
          <div class="options">
            ${q.options.map((option) => {
              const isSelected = answered === option;
              const isCorrect = normalize(option) === normalize(q.answer);
              const className = answered && isCorrect ? "correct" : answered && isSelected ? "wrong" : "";
              return `<button class="option ${className}" type="button" data-q="${index}" data-option="${escapeHtml(option)}" ${answered ? "disabled" : ""}>${escapeHtml(option)}</button>`;
            }).join("")}
          </div>
          <div class="feedback ${answered ? "show" : ""}">
            <strong>${correct ? "Correct." : "Nog even oefenen."}</strong>
            <span>${escapeHtml(q.explanation)}</span>
            ${answered && !correct ? `<em>Het goede antwoord is: ${escapeHtml(q.answer)}</em>` : ""}
            ${related ? `<div class="feedback-words">${related}</div>` : ""}
          </div>
        </article>
      `;
    }

    function answerQuestion(index, option) {
      if (state.answers[index]) return;
      state.answers[index] = option;
      const q = state.quiz[index];
      if (normalize(option) === normalize(q.answer)) {
        awardXP(10, "Correct antwoord");
      } else {
        const focusWords = getQuestionFocusWords(q);
        addReviewWords(focusWords);
        addDifficultWords(focusWords);
      }
      renderQuiz();
    }

    function addReviewWords(words) {
      const existing = new Set(state.reviewPool.map((item) => normalize(item.word)));
      words.forEach((word) => {
        const key = normalize(word);
        if (!key || existing.has(key)) return;
        state.reviewPool.push({ word, definition: getDefinitionForWord(word), sentence: findWordContext(word) });
        existing.add(key);
      });
      saveProgress();
    }

    function getQuestionFocusWords(question) {
      const words = question?.relatedWords || [];
      return words.length ? [words[0]] : [];
    }

    function getCurrentMistakeItems() {
      const byWord = new Map();
      state.quiz.forEach((question, index) => {
        if (normalize(state.answers[index]) === normalize(question.answer)) return;
        getQuestionFocusWords(question).forEach((word) => {
          const key = normalize(word);
          if (!key || byWord.has(key)) return;
          byWord.set(key, {
            word,
            definition: getDefinitionForWord(word),
            sentence: findWordContext(word)
          });
        });
      });
      return [...byWord.values()];
    }

    function renderResults() {
      state.appState = "results";
      state.score = state.quiz.reduce((total, q, index) => normalize(state.answers[index]) === normalize(q.answer) ? total + 1 : total, 0);
      state.resultReviewWords = getCurrentMistakeItems();
      awardXP(state.score * 10 + (state.score === state.quiz.length ? 30 : 0), "Quiz voltooid");
      const total = state.quiz.length;
      const resultTitle = state.score === total ? "Geweldig gedaan!" : state.score >= Math.ceil(total * 0.6) ? "Goed gewerkt!" : "Nog even oefenen";
      const resultNote = state.score === total
        ? "Alles goed. Je kunt doorgaan naar een volgend verhaal."
        : state.score >= Math.ceil(total * 0.6)
          ? "Je begrijpt al veel. Herhaal nog een paar woorden."
          : "Geen probleem. Bekijk de feedback en oefen de belangrijkste woorden nog eens.";
      updateHeader();
      view.innerHTML = `
        <section class="result-card">
          <h2>${resultTitle}</h2>
          <p style="font-size:24px;font-weight:900;color:#64748b;">Jouw score: ${state.score} / ${total}</p>
          <p style="color:#64748b;font-weight:850;margin-top:-4px;">${resultNote}</p>
          ${state.resultReviewWords.length ? `
            <div class="review-box">
              <h3 style="margin-top:0;color:var(--purple);">Woorden om nog te oefenen</h3>
              ${state.resultReviewWords.map((item) => `
                <div class="review-item">
                  <button class="review-word" type="button" data-speak="${escapeHtml(item.word)}">${escapeHtml(item.word)}</button>
                  <div style="color:#475569;font-weight:800;margin-top:4px;">${escapeHtml(item.definition)}</div>
                  ${item.sentence ? `<div class="context">...${escapeHtml(item.sentence)}...</div>` : ""}
                </div>
              `).join("")}
              <button class="primary" id="reviewBtn" type="button" style="width:100%;margin-top:14px;">Oefen deze woorden opnieuw</button>
            </div>
          ` : ""}
          <div class="row" style="justify-content:center;">
            <button class="secondary" id="downloadBtn" type="button">Gegevens voor NotebookLM</button>
            <button class="primary" id="againBtn" type="button">Opnieuw</button>
          </div>
        </section>
      `;
      view.querySelectorAll("[data-speak]").forEach((button) => {
        button.addEventListener("click", () => speakDutch(button.dataset.speak, 0.85));
      });
      const reviewBtn = document.getElementById("reviewBtn");
      if (reviewBtn) reviewBtn.addEventListener("click", () => startPractice(state.resultReviewWords, "Woorden om nog te oefenen", "quiz-errors"));
      document.getElementById("downloadBtn").addEventListener("click", downloadData);
      document.getElementById("againBtn").addEventListener("click", resetApp);
    }

    function downloadData() {
      const story = state.pages.map((page, index) => `--- Pagina ${index + 1} ---\n${page.text}`).join("\n\n");
      const quiz = state.quiz.map((q, index) => `Vraag ${index + 1}: ${q.question}\nAntwoord: ${state.answers[index] || "Niet beantwoord"}\nCorrect: ${q.answer}`).join("\n\n");
      const content = `NT2 onderzoeksgegevens\nStudentnummer: ${state.userProfile.studentId}\n\n[VERHAAL]\n${story}\n\n[QUIZ]\n${quiz}`;
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `NT2_Gegevens_${state.userProfile.studentId}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }

    function resetApp() {
      stopSpeaking();
      state.appState = "landing";
      state.selectedTheme = null;
      state.selectedSubsection = "";
      state.currentStoryKey = "";
      state.pages = [];
      state.glossary = [];
      state.vocab = [];
      state.quiz = [];
      state.answers = {};
      state.score = 0;
      state.pageIndex = 0;
      state.reviewMode = false;
      state.practiceMode = "";
      state.practiceTitle = "";
      state.resultReviewWords = [];
      showError("");
      renderLanding();
    }

    document.getElementById("homeBtn").addEventListener("click", resetApp);
    document.getElementById("topHomeBtn").addEventListener("click", resetApp);
    document.getElementById("bottomHomeBtn")?.addEventListener("click", resetApp);
    document.getElementById("bottomContinueBtn")?.addEventListener("click", () => {
      const lastActivity = state.lastActivity && stories[state.lastActivity.storyKey] ? state.lastActivity : null;
      if (lastActivity) startStoryByKey(lastActivity.storyKey, { pageIndex: lastActivity.pageIndex || 0 });
    });
    document.getElementById("bottomWordsBtn")?.addEventListener("click", () => {
      if (state.difficultWords.length) startDifficultPractice();
      else startPractice(getAllPracticeWords(), "Woorden oefenen", "practice");
    });
    document.getElementById("keyBtn").addEventListener("click", () => {
      document.getElementById("apiKeyInput").value = state.apiKey;
      keyDrawer.classList.add("show");
    });
    document.getElementById("closeKeyBtn").addEventListener("click", () => keyDrawer.classList.remove("show"));
    document.getElementById("saveKeyBtn").addEventListener("click", () => {
      state.apiKey = document.getElementById("apiKeyInput").value.trim();
      safeSet("nt2_api_key", state.apiKey);
      keyDrawer.classList.remove("show");
      renderLanding();
    });
    document.getElementById("drawerCloseBtn").addEventListener("click", () => wordDrawer.classList.remove("show"));
    document.getElementById("drawerSpeakBtn").addEventListener("click", () => playWordAudio(document.getElementById("drawerWord").textContent));
    document.getElementById("drawerEasyBtn")?.addEventListener("click", () => markWordEase(document.getElementById("drawerWord").textContent, "easy", true));
    document.getElementById("drawerHardBtn")?.addEventListener("click", () => markWordEase(document.getElementById("drawerWord").textContent, "hard", true));

    updateHeader();
    renderLanding();
