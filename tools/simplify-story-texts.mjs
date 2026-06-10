import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = process.cwd();
const htmlPath = path.join(root, "NT2-Verhalenmaker-Fixed.html");
let html = fs.readFileSync(htmlPath, "utf8");

const newTexts = {
  "1-Gelukkig zijn": [
    "Mila is nieuw in Groningen. Uit gesprekken met buren kan blijken dat veel nieuwkomers zich alleen voelen. Sommige mensen aarzelen om aan te bellen. Een buurvrouw nodigt haar uit voor koffie.",
    "Het wijkcentrum heeft een uitgebreid programma. Mila wil hulp aanvragen voor een kleine moestuin. Ze vult samen met een buurman een formulier in. Daarna plant de groep groente in bakken.",
    "Mila krijgt tijdelijk een uitkering. De gemeente wil haar stimuleren om vrijwilligerswerk te doen. Ze helpt op woensdag in het buurthuis. Zo leert ze meer mensen kennen.",
    "Vrijwilligerswerk helpt Mila op de arbeidsmarkt. Een taalcoach wil haar Nederlands bevorderen. Ze oefenen woorden voor werk en gesprekken. Mila durft daarna meer te zeggen.",
    "In de straat merkt Mila een cultuurverschil. Buren groeten elkaar soms op een andere manier. Mila leert de nieuwe gewoonte toepassen. Ze voelt zich stap voor stap thuis."
  ],
  "1-Een streetarts": [
    "In Groningen helpt een straatdokter mensen buiten. Uit zijn werk kan blijken dat sommige mensen geen zorg vragen. Ze aarzelen om naar een ziekenhuis te gaan. Mila ziet hoe rustig de arts praat.",
    "De arts heeft een uitgebreid spreekuur in een bus. Mensen kunnen daar hulp aanvragen. Mila geeft thee aan wachtende mensen. De arts luistert naar elke klacht.",
    "Sommige mensen hebben geen adres en geen uitkering. De straatdokter wil hen stimuleren om hulp te zoeken. Mila loopt mee naar een hulpverlener. Zo komt er een eerste stap.",
    "Gezond zijn helpt later op de arbeidsmarkt. Een opvangplek kan herstel bevorderen. Mila ziet dat rust en eten belangrijk zijn. Daarna kan iemand weer plannen maken.",
    "De arts kan pijn en koorts snel signaleren. Hij weet welke hulp hij moet toepassen. Mila leert dat snelle zorg veel helpt. Iedereen verdient een veilige plek."
  ],
  "1-Het UWV": [
    "Mila verliest haar baan in Groningen. Uit haar gesprek kan blijken dat ze snel hulp nodig heeft. Toch aarzelen veel mensen bij het UWV. De medewerker legt alles rustig uit.",
    "Mila kan online een uitkering aanvragen. Het UWV heeft een uitgebreid formulier. Ze verzamelt loonstroken en haar paspoort. Daarna verstuurt ze de aanvraag.",
    "De adviseur wil Mila stimuleren om een cursus te volgen. Nieuwe computerkennis helpt aanzienlijk bij werk zoeken. Mila oefent elke dinsdag. Ze krijgt weer vertrouwen.",
    "Samen bekijken ze de arbeidsmarkt in Groningen. De adviseur wil haar kans op werk bevorderen. Mila schrijft een korte brief. Daarna oefent ze een gesprek.",
    "Mila leert tips toepassen tijdens het zoeken. Als zij werk vindt, stopt haar uitkering. Ze maakt een lijst met bedrijven. Elke dag stuurt ze één bericht."
  ],
  "1-Buurtbewoners": [
    "In Mila's straat wonen veel soorten mensen. Tijdens een buurtavond kan blijken dat veel buren contact willen. Sommige bewoners aarzelen nog. Mila begint met een korte groet.",
    "De buurt maakt een uitgebreid plan voor een feest. Mila wil tafels aanvragen bij de wijk. Ze vraagt ook wie eten kan maken. Daarna hangt ze uitnodigingen op.",
    "Bij het eten merkt Mila een cultuurverschil. Sommige buren eten anders of later. Ze leert rustig vragen stellen en luisteren. Zo kan zij nieuwe gewoontes toepassen.",
    "Actieve buren willen contact bevorderen. Ze stimuleren mensen om elkaar te helpen. Mila brengt soep naar een zieke buur. Daarna praten ze vaker.",
    "Buren kunnen problemen snel signaleren. Ze kennen ook mensen op de arbeidsmarkt. Mila helpt een jongere met een contact. De straat voelt veiliger."
  ],
  "2-Druk in de natuur": [
    "Groningen wil meer groene paden aanleggen. Drukte vraagt om een kleine aanpassing. Mila blijft op het pad. Zo krijgen dieren meer rust.",
    "Een schoon park is aantrekkelijk voor gezinnen. Een afvalstof hoort niet in het gras. Mila raapt een blikje op. Daarna gooit ze het in de bak.",
    "Na regen moeten we water afvoeren. De beheerder kijkt naar de natte paden. Mila ziet plassen bij de brug. Samen zetten ze een lint neer.",
    "Onderzoekers benadrukken dat natuur hulp nodig heeft. Bezoekers moeten jonge planten beschermen. Mila blijft op afstand. Zo blijven de planten heel.",
    "Mila wil thuis water besparen. Een duurzaam leven begint klein. Ze doet de kraan sneller dicht. Ook neemt ze vaker de fiets."
  ],
  "2-Nationale parken": [
    "Mila bezoekt een natuurgebied buiten Groningen. De beheerder loopt met haar over het pad. Hij wil benadrukken dat stilte belangrijk is. Vogels krijgen zo meer rust.",
    "Wandelaars blijven op de route om dieren te beschermen. Mila leert ook water besparen. Ze neemt een kleine fles mee. Ze vult die thuis opnieuw.",
    "Een duurzaam plan helpt het park. Door klimaatverandering zijn zomers droger. Mila ziet geel gras langs het pad. De gids wijst naar jonge bomen.",
    "Jonge heide is kwetsbaar. Vrijwilligers willen duidelijke paden aanleggen. Mila helpt houten paaltjes dragen. Niemand loopt meer door de planten.",
    "Een aanpassing van de route helpt vogels. Het park blijft aantrekkelijk voor bezoekers. Mila loopt een klein stukje om. Ze begrijpt de regel."
  ],
  "2-Drinkwatertekort": [
    "Mila volgt een les over drinkwater. Een afvalstof mag niet in de rivier komen. Vuil water moeten we veilig afvoeren. De docent laat twee flessen zien.",
    "De beheerder van het waterbedrijf geeft uitleg. Hij wil benadrukken dat schoon water kostbaar is. Mila kijkt naar de filters. Ze stelt een korte vraag.",
    "We moeten bronnen beschermen tegen vuil. Thuis kan Mila water besparen. Ze doucht korter. Ze draait de kraan dicht.",
    "Een duurzaam huis gebruikt water bewust. Door klimaatverandering zijn droge weken vaker normaal. Mila zet een bak onder de regenpijp. Ze gebruikt dat water voor planten.",
    "De watervoorziening is kwetsbaar bij lange droogte. Daarom is een aanpassing van gedrag nodig. Mila deelt tips met buren. Iedereen kan minder water gebruiken."
  ],
  "2-Een ecoduct": [
    "Mila bekijkt een plan voor een ecoduct. De provincie wil de brug aanleggen. De weg vraagt om een aanpassing. Zo steken dieren veilig over.",
    "Een groene brug is aantrekkelijk voor kleine dieren. Minder auto's geven minder afvalstof in het gebied. Mila ziet struiken en gras. De route lijkt op natuur.",
    "We moeten regenwater goed afvoeren. De beheerder controleert de helling. Mila kijkt naar een kleine camera. Zo weten ze of dieren komen.",
    "Biologen benadrukken dat gebieden verbonden moeten zijn. Ecoducten helpen dieren beschermen. Mila ziet sporen in zand. Ze maakt een foto.",
    "Kleine dieren zijn kwetsbaar bij drukke wegen. Een duurzaam netwerk van bruggen helpt. Mila kijkt naar de weg onder de brug. Ze vindt het plan slim."
  ],
  "3-UNESCO werelderfgoed": [
    "Groningen heeft oude monumenten. We willen ze behouden. We moeten muren en daken beschermen tegen schade. Mila kijkt naar een oud gebouw.",
    "Jongeren leren over de stad. Dat kan kennis bevorderen. Oude documenten bewaren we in het Groninger Archief. Mila kijkt naar foto's van vroeger.",
    "Mila maakt een eigentijds filmpje over een oud huis. Een expert wil de staat van het gebouw evalueren. Hij kijkt naar de stenen. Daarna praten ze over herstel.",
    "Elk oud gebouw heeft een verhaal. Soms is een aanpassing nodig bij de ingang. Dan kan een rolstoel naar binnen. Mila ziet een nieuwe helling.",
    "Een gids wil een stadswandeling aanraden. Het succes kan afhangen van onze zorg voor de stad. Mila loopt mee langs de gracht. Ze maakt foto's van oude huizen."
  ],
  "3-Gerrit Rietveld": [
    "Mila volgt een les over Gerrit Rietveld. Musea willen zijn stoelen behouden. Ze willen tekeningen veilig bewaren. Studenten kunnen ze zo bekijken.",
    "Rietvelds stijl was toen heel eigentijds. Mila leert kleuren en vormen evalueren. Ze kijkt naar rood, blauw en geel. De simpele stoel valt op.",
    "De docent toont een beroemd gebouw. Hij wil een bezoek aanraden. Mila kijkt naar de open kamers. Ze stelt een vraag over wonen.",
    "Of kunst je raakt, kan afhangen van je ervaring. Rietveld wilde veel mensen bereiken. Mila vergelijkt zijn stoel met moderne meubels. Ze ziet dat simpel mooi kan zijn.",
    "Rietveld hoort bij de Nederlandse beschaving. We moeten zijn werk beschermen. Mila maakt een korte presentatie. De klas luistert rustig."
  ],
  "3-Eetgewoontes": [
    "Mila ziet dat veel Nederlanders vroeg eten. Sommige gezinnen willen die gewoonte behouden. Ook een menu kan eigentijds zijn. Ze ziet oude en nieuwe smaken.",
    "Mila bezoekt een restaurant in een oud gebouw. Een buurvrouw wil mosterdsoep aanraden. Mila bestelt een kleine kom. De soep ruikt warm.",
    "De smaak kan afhangen van verse groente. Door samen te koken kun je mensen bereiken. Mila snijdt prei met buren. Ze praten over eten.",
    "Bij kruiden ontstaat een cultuurverschil. Mila leert smaakwoorden toepassen. Ze vraagt wat pittig betekent. Iedereen proeft en lacht.",
    "Na het eten wil Mila het recept bewaren. Ze wil ook de nieuwe woorden evalueren. Ze schrijft drie woorden op. Eten helpt haar met taal."
  ],
  "3-Cultuurverschillen": [
    "Mila wil haar eigen tradities behouden. Ze leert ook eigentijds praten in Nederland. Soms zegt ze direct wat ze bedoelt. Soms luistert ze eerst.",
    "De docent wil vragen stellen aanraden. Goed contact kan afhangen van openheid. Mila oefent korte zinnen. Ze durft vaker iets te vragen.",
    "Met eenvoudige taal kan Mila meer mensen bereiken. Een cultuurverschil voelt dan minder groot. Ze praat met een buurman over afspraken. Ze vragen rustig door.",
    "Mila leert tips toepassen in gesprekken. Ze wil nieuwe zinnen bewaren. Ze schrijft ze in haar boekje. Daarna oefent ze met een buurvrouw.",
    "Aan het einde van de week wil Mila haar leerpunten evalueren. Ze ziet cultuur als deel van beschaving. Groningen voelt meer als thuis. Ze groet haar buren op straat."
  ],
  "4-Stage lopen": [
    "Stage lopen vraagt een actieve aanpak. De plek moet aansluiten op de opleiding. Mila maakt een lijst. Daarna belt ze een bedrijf.",
    "Bedrijven willen jong talent aantrekken. Tijdens stage bouwt Mila een netwerk op. Ze praat met collega's. Ze bewaart hun namen.",
    "In sommige sectoren is hulp nijpend. Dat is een goed argument voor stage. Mila ziet dat haar hulp nodig is. Ze doet kleine taken.",
    "Mila leert theorie omzetten in werk. Ze moet keuzes onderbouwen. Haar mentor stelt vragen. Mila legt rustig uit.",
    "Stage helpt fouten beperken. Mila leert welke bedrijfstak bij haar past. Ze kijkt naar zorg en techniek. Haar toekomst wordt duidelijker."
  ],
  "4-Een eigen bedrijf starten": [
    "Mila wil een klein cateringbedrijf beginnen. Ze kiest een duidelijke aanpak. Daarmee wil ze klanten aantrekken. Ze start met drie gerechten.",
    "In het buurthuis bouwt Mila een netwerk op. Geld voor de start is nijpend. Andere ondernemers geven tips. Mila schrijft ze op.",
    "Een goed argument voor crowdfunding is steun uit de buurt. Mila wil haar idee omzetten in een dienst. Ze laat buren proeven. Daarna vraagt ze om advies.",
    "Mila wil haar prijzen onderbouwen met cijfers. Zo kan ze risico's beperken. Een vrijwilliger helpt met een tabel. Mila rekent rustig mee.",
    "Mila heeft de neiging om te snel te groeien. In deze bedrijfstak is rustig starten beter. Ze neemt eerst kleine opdrachten. Daarna kijkt ze verder."
  ],
  "4-Werk vinden": [
    "Mila zoekt werk met een duidelijke aanpak. Ze gebruikt haar netwerk. Een taalcoach kijkt naar haar cv. Daarna zoekt ze vacatures.",
    "Haar vaardigheden moeten aansluiten op de baan. Een korte brief kan aandacht aantrekken. Mila schrijft rustige zinnen. Ze controleert haar tekst.",
    "In de zorg is hulp nijpend. Deze bedrijfstak heeft nieuwe mensen nodig. Mila bekijkt een korte opleiding. Ze vraagt naar de lessen.",
    "Een goed argument voor omscholing is meer kans op werk. Mila leert haar keuze onderbouwen. Ze noemt voorbeelden uit haar leven. Dat helpt in gesprekken.",
    "Mila wil haar zenuwen beperken. Ze heeft de neiging om snel te praten. Daarom oefent ze met de taalcoach. In het gesprek blijft ze rustiger."
  ],
  "4-Import en export": [
    "Mila bezoekt een bedrijf in Groningen. De handel vraagt een goede aanpak. Het bedrijf wil nieuwe klanten aantrekken. Mila kijkt rond in het magazijn.",
    "Voor import en export is een netwerk belangrijk. Een argument voor export is een grotere markt. Mila luistert naar de manager. Hij laat een kaart zien.",
    "Het bedrijf wil lokale producten omzetten in winst. Het moet keuzes onderbouwen met cijfers. Mila kijkt naar een simpele grafiek. Ze ziet waar producten heen gaan.",
    "Exporteurs hebben soms de neiging om snel te groeien. Goede planning kan vertragingen beperken. Mila bekijkt routes op een kaart. Ze vraagt naar de planning.",
    "In deze bedrijfstak is transport soms nijpend. Daarom werken bedrijven samen. Mila ziet dozen klaarstaan. Ze begrijpt dat handel veel planning vraagt."
  ]
};

function jsString(value) {
  return JSON.stringify(value);
}

const script = html.match(/<script>([\s\S]*)<\/script>/)?.[1];
if (!script) throw new Error("Cannot find inline script");

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

let replacements = 0;
for (const [storyKey, texts] of Object.entries(newTexts)) {
  const story = sandbox.__stories[storyKey];
  if (!story) throw new Error(`Missing story: ${storyKey}`);
  if (story.pages.length !== texts.length) throw new Error(`Page count mismatch: ${storyKey}`);

  story.pages.forEach((page, index) => {
    const oldNeedle = `text: ${jsString(page.text)}`;
    const newNeedle = `text: ${jsString(texts[index])}`;
    if (!html.includes(oldNeedle)) {
      throw new Error(`Cannot find text field for ${storyKey} page ${index + 1}`);
    }
    html = html.replace(oldNeedle, newNeedle);
    replacements++;
  });
}

fs.writeFileSync(htmlPath, html, "utf8");
fs.writeFileSync(path.join(root, "NT2-Verhalenmaker-Optimized.html"), html, "utf8");
console.log(`Updated ${replacements} story page texts`);
