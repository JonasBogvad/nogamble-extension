// ─── Locale + Registry types ───────────────────────────────────────────────

export type LocaleKey = 'da' | 'en' | 'sv' | 'de' | 'de-CH' | 'nl' | 'fr' | 'fr-BE' | 'it' | 'pt' | 'es';
export type RegistryKey = 'ROFUS' | 'GAMSTOP' | 'SPELPAUS' | 'OASIS' | 'CRUKS' | 'EPIS' | 'RGIAJ' | 'ANJ' | 'RUA' | 'SRIJ' | 'SELBST';

export interface LocaleData {
  overlayHeadline: string;
  overlayDescChannel: string;   // {username} placeholder
  overlayDescCategory: string;  // {username} placeholder
  nudgeHeadline: string;
  backBtn: string;
  proceedBtn: string;
  widgetQuestion: string;
  reportChannel: string;
  quotes: string[];
}

export interface RegistryData {
  name: string;
  url: string;
}

// ─── Translations ──────────────────────────────────────────────────────────

export const LOCALES: Record<LocaleKey, LocaleData> = {
  da: {
    overlayHeadline: 'Gambling Advarsel',
    overlayDescChannel: '{username} er markeret for at reklamere for gambling på stream. At se dette indhold kan udsætte dig for gambling-reklame.',
    overlayDescCategory: '{username} er en gambling-kategori på Twitch. At se dette indhold kan udsætte dig for gambling-reklame.',
    nudgeHeadline: 'Vidste du det?',
    backBtn: '← Gå tilbage',
    proceedBtn: 'Fortsæt Alligevel',
    widgetQuestion: 'Spiller du for meget?',
    reportChannel: 'Tip denne kanal',
    quotes: [
      'Investerer du 800 kr/md. i 10 år med 7% gns. afkast, ender du på ~138.000 kr.',
      'Huset vinder altid. Gambling-sider er designet til at tage dine penge over tid.',
      'Renters rente er magisk: 300 kr/md. som 25-årig giver over 800.000 kr. ved pensionsalderen.',
      'Den gennemsnitlige ludomane taber 120.000 kr. om året – svarende til en ny bil hvert år.',
      'Et globalt indeksfond har aldrig givet negativt afkast over en 15-årig periode. Gambling kan tømme din konto på en aften.',
    ],
  },
  en: {
    overlayHeadline: 'Gambling Warning',
    overlayDescChannel: '{username} has been flagged for promoting gambling on stream. Watching this content may expose you to gambling advertising.',
    overlayDescCategory: '{username} is a gambling category on Twitch. Watching this content may expose you to gambling advertising.',
    nudgeHeadline: 'Did you know?',
    backBtn: '← Go back',
    proceedBtn: 'Continue Anyway',
    widgetQuestion: 'Are you gambling too much?',
    reportChannel: 'Tip this channel',
    quotes: [
      "Invest £90/month for 10 years at 7% average return and you'll end up with ~£15,000.",
      'The house always wins. Gambling sites are designed to take your money over time.',
      'Compound interest is magic: £35/month at age 25 gives you over £85,000 by retirement.',
      'The average problem gambler loses £14,000 a year – the equivalent of a new car, every single year.',
      'A global index fund has never delivered a negative return over any 15-year period. Gambling can empty your account in one night.',
    ],
  },
  sv: {
    overlayHeadline: 'Spelvarning',
    overlayDescChannel: '{username} har flaggats för att marknadsföra gambling i sin stream. Att titta på detta innehåll kan utsätta dig för spelreklam.',
    overlayDescCategory: '{username} är en spelkategori på Twitch. Att titta på detta innehåll kan utsätta dig för spelreklam.',
    nudgeHeadline: 'Visste du det?',
    backBtn: '← Gå tillbaka',
    proceedBtn: 'Fortsätt ändå',
    widgetQuestion: 'Spelar du för mycket?',
    reportChannel: 'Tipsa om den här kanalen',
    quotes: [
      'Investerar du 1 100 kr/mån i 10 år med 7% genomsnittlig avkastning, landar du på ~190 000 kr.',
      'Huset vinner alltid. Spelbolag är utformade för att ta dina pengar över tid.',
      'Ränta på ränta är magiskt: 400 kr/mån som 25-åring ger dig nära 1 000 000 kr vid pensionen.',
      'En genomsnittlig spelberoende förlorar 165 000 kr per år – det är en ny bil varje enskilt år.',
      'En global indexfond har aldrig gett negativ avkastning under någon 15-årsperiod. Gambling kan tömma ditt konto på en enda kväll.',
    ],
  },
  de: {
    overlayHeadline: 'Glücksspiel-Warnung',
    overlayDescChannel: '{username} wurde als Kanal markiert, der Glücksspiel im Stream bewirbt. Das Ansehen dieses Inhalts kann dich Glücksspielwerbung aussetzen.',
    overlayDescCategory: '{username} ist eine Glücksspiel-Kategorie auf Twitch. Das Ansehen dieses Inhalts kann dich Glücksspielwerbung aussetzen.',
    nudgeHeadline: 'Wusstest du das?',
    backBtn: '← Zurück',
    proceedBtn: 'Trotzdem fortfahren',
    widgetQuestion: 'Spielst du zu viel?',
    reportChannel: 'Tipp zu diesem Kanal senden',
    quotes: [
      'Wer 100 €/Monat für 10 Jahre bei 7% durchschnittlicher Rendite anlegt, kommt auf ~17.000 €.',
      'Das Haus gewinnt immer. Glücksspielseiten sind darauf ausgelegt, dir über die Zeit dein Geld abzunehmen.',
      'Zinseszins ist magisch: 40 €/Monat ab 25 Jahren ergibt bis zur Rente fast 100.000 €.',
      'Ein durchschnittlicher Spielsüchtiger verliert 16.000 € im Jahr – das entspricht jedes Jahr einem Neuwagen.',
      'Ein globaler Indexfonds hat über jeden beliebigen 15-Jahres-Zeitraum noch nie negative Renditen erzielt. Beim Glücksspiel kann dein Konto in einer einzigen Nacht leer sein.',
    ],
  },
  'de-CH': {
    overlayHeadline: 'Glücksspiel-Warnung',
    overlayDescChannel: '{username} wurde als Kanal markiert, der Glücksspiel im Stream bewirbt. Das Ansehen dieses Inhalts kann dich Glücksspielwerbung aussetzen.',
    overlayDescCategory: '{username} ist eine Glücksspiel-Kategorie auf Twitch. Das Ansehen dieses Inhalts kann dich Glücksspielwerbung aussetzen.',
    nudgeHeadline: 'Wusstest du das?',
    backBtn: '← Zurück',
    proceedBtn: 'Trotzdem fortfahren',
    widgetQuestion: 'Spielst du zu viel?',
    reportChannel: 'Tipp zu diesem Kanal senden',
    quotes: [
      'Wer 100 CHF/Monat für 10 Jahre bei 7% durchschnittlicher Rendite anlegt, kommt auf ~17.000 CHF.',
      'Das Haus gewinnt immer. Glücksspielseiten sind darauf ausgelegt, dir über die Zeit dein Geld abzunehmen.',
      'Zinseszins ist magisch: 40 CHF/Monat ab 25 Jahren ergibt bis zur Rente fast 100.000 CHF.',
      'Ein durchschnittlicher Spielsüchtiger verliert 16.000 CHF im Jahr – das entspricht jedes Jahr einem Neuwagen.',
      'Ein globaler Indexfonds hat über jeden beliebigen 15-Jahres-Zeitraum noch nie negative Renditen erzielt. Beim Glücksspiel kann dein Konto in einer einzigen Nacht leer sein.',
    ],
  },
  nl: {
    overlayHeadline: 'Gokwaarschuwing',
    overlayDescChannel: '{username} is gemarkeerd voor het promoten van gokken op stream. Het bekijken van deze content kan je blootstellen aan gokreclame.',
    overlayDescCategory: '{username} is een gokgategorie op Twitch. Het bekijken van deze content kan je blootstellen aan gokreclame.',
    nudgeHeadline: 'Wist je dat?',
    backBtn: '← Ga terug',
    proceedBtn: 'Toch doorgaan',
    widgetQuestion: 'Gok je te veel?',
    reportChannel: 'Tip over dit kanaal sturen',
    quotes: [
      'Beleg je €100/maand gedurende 10 jaar bij 7% gemiddeld rendement, dan eindig je op ~€17.000.',
      'Het huis wint altijd. Goksites zijn ontworpen om jouw geld over tijd af te pakken.',
      'Rente op rente is magisch: €40/maand als 25-jarige levert je meer dan €95.000 op bij pensionering.',
      'Een gemiddelde gokverslaafde verliest €16.000 per jaar – elk jaar een nieuwe auto, maar dan kwijt.',
      'Een wereldwijd indexfonds heeft nog nooit een negatief rendement opgeleverd over een periode van 15 jaar. Gokken kan je rekening op één avond leegmaken.',
    ],
  },
  fr: {
    overlayHeadline: "Avertissement Jeux d'Argent",
    overlayDescChannel: "{username} a été signalé pour la promotion de jeux d'argent sur stream. Regarder ce contenu peut t'exposer à des publicités pour les jeux d'argent.",
    overlayDescCategory: "{username} est une catégorie de jeux d'argent sur Twitch. Regarder ce contenu peut t'exposer à des publicités pour les jeux d'argent.",
    nudgeHeadline: 'Le savais-tu ?',
    backBtn: '← Retour',
    proceedBtn: 'Continuer quand même',
    widgetQuestion: 'Joues-tu trop ?',
    reportChannel: 'Envoyer un signalement',
    quotes: [
      "En investissant 100 €/mois pendant 10 ans avec un rendement moyen de 7%, tu arrives à ~17 000 €.",
      "La maison gagne toujours. Les sites de jeux d'argent sont conçus pour prendre ton argent sur la durée.",
      "Les intérêts composés, c'est magique : 40 €/mois à 25 ans, c'est plus de 95 000 € à la retraite.",
      "Un joueur compulsif moyen perd 16 000 € par an – l'équivalent d'une nouvelle voiture chaque année.",
      "Un fonds indiciel mondial n'a jamais généré de rendement négatif sur une période de 15 ans. Les jeux d'argent peuvent vider ton compte en une seule soirée.",
    ],
  },
  'fr-BE': {
    overlayHeadline: "Avertissement Jeux d'Argent",
    overlayDescChannel: "{username} a été signalé pour la promotion de jeux d'argent sur stream. Regarder ce contenu peut t'exposer à des publicités pour les jeux d'argent.",
    overlayDescCategory: "{username} est une catégorie de jeux d'argent sur Twitch. Regarder ce contenu peut t'exposer à des publicités pour les jeux d'argent.",
    nudgeHeadline: 'Le savais-tu ?',
    backBtn: '← Retour',
    proceedBtn: 'Continuer quand même',
    widgetQuestion: 'Joues-tu trop ?',
    reportChannel: 'Envoyer un signalement',
    quotes: [
      "En investissant 100 €/mois pendant 10 ans avec un rendement moyen de 7%, tu arrives à ~17 000 €.",
      "La maison gagne toujours. Les sites de jeux d'argent sont conçus pour prendre ton argent sur la durée.",
      "Les intérêts composés, c'est magique : 40 €/mois à 25 ans, c'est plus de 95 000 € à la retraite.",
      "Un joueur compulsif moyen perd 16 000 € par an – l'équivalent d'une nouvelle voiture chaque année.",
      "Un fonds indiciel mondial n'a jamais généré de rendement négatif sur une période de 15 ans. Les jeux d'argent peuvent vider ton compte en une seule soirée.",
    ],
  },
  it: {
    overlayHeadline: "Avviso Gioco d'Azzardo",
    overlayDescChannel: "{username} è stato segnalato per la promozione del gioco d'azzardo in stream. Guardare questo contenuto potrebbe esporti a pubblicità sul gioco d'azzardo.",
    overlayDescCategory: "{username} è una categoria di gioco d'azzardo su Twitch. Guardare questo contenuto potrebbe esporti a pubblicità sul gioco d'azzardo.",
    nudgeHeadline: 'Lo sapevi?',
    backBtn: '← Torna indietro',
    proceedBtn: 'Continua comunque',
    widgetQuestion: "Giochi d'azzardo troppo spesso?",
    reportChannel: 'Invia una segnalazione',
    quotes: [
      "Se investi 100 €/mese per 10 anni con un rendimento medio del 7%, arrivi a ~17.000 €.",
      "Il banco vince sempre. I siti di gioco d'azzardo sono progettati per prendere i tuoi soldi nel tempo.",
      "L'interesse composto è magico: 40 €/mese a 25 anni ti danno quasi 100.000 € alla pensione.",
      "Il giocatore compulsivo medio perde 16.000 € all'anno – come comprare un'auto nuova ogni anno e buttarla via.",
      "Un fondo indicizzato globale non ha mai prodotto rendimenti negativi in un arco di 15 anni. Con il gioco d'azzardo puoi svuotare il conto in una sola serata.",
    ],
  },
  pt: {
    overlayHeadline: 'Aviso de Jogo',
    overlayDescChannel: '{username} foi sinalizado por promover jogos de azar na stream. Ver este conteúdo pode expor-te a publicidade sobre jogos de azar.',
    overlayDescCategory: '{username} é uma categoria de jogo de azar no Twitch. Ver este conteúdo pode expor-te a publicidade sobre jogos de azar.',
    nudgeHeadline: 'Sabias que...?',
    backBtn: '← Voltar',
    proceedBtn: 'Continuar na mesma',
    widgetQuestion: 'Jogas demasiado?',
    reportChannel: 'Enviar uma denúncia',
    quotes: [
      'Se investires 100 €/mês durante 10 anos com uma rentabilidade média de 7%, acabas com ~17.000 €.',
      'A casa ganha sempre. Os sites de apostas são feitos para ficar com o teu dinheiro ao longo do tempo.',
      'Os juros compostos são mágicos: 40 €/mês aos 25 anos dá-te quase 100.000 € na reforma.',
      'O jogador compulsivo médio perde 16.000 € por ano – o equivalente a um carro novo todos os anos.',
      'Um fundo de índice global nunca gerou retornos negativos ao longo de qualquer período de 15 anos. Nas apostas, podes esvaziar a conta numa única noite.',
    ],
  },
  es: {
    overlayHeadline: 'Advertencia de Juego',
    overlayDescChannel: '{username} ha sido marcado por promocionar el juego de azar en stream. Ver este contenido puede exponerte a publicidad sobre juego de azar.',
    overlayDescCategory: '{username} es una categoría de juego de azar en Twitch. Ver este contenido puede exponerte a publicidad sobre juego de azar.',
    nudgeHeadline: '¿Lo sabías?',
    backBtn: '← Volver',
    proceedBtn: 'Continuar de todas formas',
    widgetQuestion: '¿Juegas demasiado?',
    reportChannel: 'Enviar un aviso',
    quotes: [
      'Si inviertes 100 €/mes durante 10 años con una rentabilidad media del 7%, llegas a ~17.000 €.',
      'La banca siempre gana. Los sitios de apuestas están diseñados para quedarse con tu dinero con el tiempo.',
      'El interés compuesto es mágico: 40 €/mes a los 25 años te da casi 100.000 € al jubilarte.',
      'El jugador problemático medio pierde 16.000 € al año – el equivalente a un coche nuevo cada año.',
      'Un fondo índice global nunca ha generado rentabilidades negativas a lo largo de cualquier período de 15 años. Con el juego de azar, puedes vaciar tu cuenta en una sola noche.',
    ],
  },
};

// ─── Self-exclusion registries ────────────────────────────────────────────

export const REGISTRIES: Record<RegistryKey, RegistryData> = {
  ROFUS:    { name: 'ROFUS',       url: 'https://www.rofus.nu/' },
  GAMSTOP:  { name: 'GamStop',     url: 'https://www.gamstop.co.uk/' },
  SPELPAUS: { name: 'Spelpaus',    url: 'https://www.spelpaus.se/' },
  OASIS:    { name: 'OASIS',       url: 'https://rp-darmstadt.hessen.de/sicherheit-und-kommunales/gluecksspiel/spielersperrsystem-oasis/spieler-faqs' },
  CRUKS:    { name: 'CRUKS',       url: 'https://cruksregister.nl/' },
  EPIS:     { name: 'EPIS',        url: 'https://www.gamingcommission.be/en/protection-of-players/access-ban' },
  RGIAJ:    { name: 'RGIAJ',       url: 'https://www.ordenacionjuego.es/en/rgiaj' },
  ANJ:      { name: 'ANJ',         url: 'https://interdictiondejeux.anj.fr/' },
  RUA:      { name: 'RUA',         url: 'https://www.adm.gov.it/portale/en/autoesclusione-dal-gioco-a-distanza-giochi' },
  SRIJ:     { name: 'SRIJ',        url: 'https://www.srij.turismodeportugal.pt/pt/sos-jogadores/autoexclusao-e-proibicao' },
  SELBST:   { name: 'Spielsperre', url: 'https://www.playerprotection.ch/' },
};

// ─── Language → locale + registry ────────────────────────────────────────
// Exact language code match only — no base-language fallback.
// Intentionally excluded: 'en', 'en-US', 'en-AU', 'nb', 'no', 'nn', 'pl', 'fi', 'de-AT'

export const LANGUAGE_MAP: Record<string, { locale: LocaleKey; registry: RegistryKey | null }> = {
  'da':    { locale: 'da',    registry: 'ROFUS' },
  'da-DK': { locale: 'da',    registry: 'ROFUS' },
  'sv':    { locale: 'sv',    registry: 'SPELPAUS' },
  'sv-SE': { locale: 'sv',    registry: 'SPELPAUS' },
  'de':    { locale: 'de',    registry: 'OASIS' },
  'de-DE': { locale: 'de',    registry: 'OASIS' },
  'de-AT': { locale: 'de',    registry: null },
  'de-CH': { locale: 'de-CH', registry: 'SELBST' },
  'nl':    { locale: 'nl',    registry: 'CRUKS' },
  'nl-NL': { locale: 'nl',    registry: 'CRUKS' },
  'nl-BE': { locale: 'nl',    registry: 'EPIS' },
  'fr':    { locale: 'fr',    registry: 'ANJ' },
  'fr-FR': { locale: 'fr',    registry: 'ANJ' },
  'fr-BE': { locale: 'fr-BE', registry: 'EPIS' },
  'fr-CH': { locale: 'fr',    registry: 'SELBST' },
  'it':    { locale: 'it',    registry: 'RUA' },
  'it-IT': { locale: 'it',    registry: 'RUA' },
  'it-CH': { locale: 'it',    registry: 'SELBST' },
  'pt':    { locale: 'pt',    registry: 'SRIJ' },
  'pt-PT': { locale: 'pt',    registry: 'SRIJ' },
  'es':    { locale: 'es',    registry: 'RGIAJ' },
  'es-ES': { locale: 'es',    registry: 'RGIAJ' },
  'en-GB': { locale: 'en',    registry: 'GAMSTOP' },
};

// ─── Timezone → locale + registry (fallback) ──────────────────────────────

export const TIMEZONE_MAP: Record<string, { locale: LocaleKey; registry: RegistryKey | null }> = {
  'Europe/Copenhagen': { locale: 'da',    registry: 'ROFUS' },
  'Europe/Faroe':      { locale: 'da',    registry: 'ROFUS' },
  'Europe/London':     { locale: 'en',    registry: 'GAMSTOP' },
  'Europe/Stockholm':  { locale: 'sv',    registry: 'SPELPAUS' },
  'Europe/Berlin':     { locale: 'de',    registry: 'OASIS' },
  'Europe/Amsterdam':  { locale: 'nl',    registry: 'CRUKS' },
  'Europe/Brussels':   { locale: 'fr',    registry: 'EPIS' },
  'Europe/Paris':      { locale: 'fr',    registry: 'ANJ' },
  'Europe/Madrid':     { locale: 'es',    registry: 'RGIAJ' },
  'Atlantic/Canary':   { locale: 'es',    registry: 'RGIAJ' },
  'Europe/Rome':       { locale: 'it',    registry: 'RUA' },
  'Europe/Lisbon':     { locale: 'pt',    registry: 'SRIJ' },
  'Atlantic/Azores':   { locale: 'pt',    registry: 'SRIJ' },
  'Atlantic/Madeira':  { locale: 'pt',    registry: 'SRIJ' },
  'Europe/Zurich':     { locale: 'de-CH', registry: 'SELBST' },
  'Europe/Vienna':     { locale: 'de',    registry: null },
  'Europe/Oslo':       { locale: 'en',    registry: null },
  'Europe/Warsaw':     { locale: 'en',    registry: null },
  'Europe/Helsinki':   { locale: 'en',    registry: null },
};

// ─── Detection ────────────────────────────────────────────────────────────
// Priority: exact language match → timezone fallback → English + no widget.

export function detectLocaleAndRegistry(): { locale: LocaleKey; registry: RegistryKey | null } {
  for (const lang of (navigator.languages ?? [])) {
    const match = LANGUAGE_MAP[lang];
    if (match !== undefined) return match;
  }
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const tzMatch = TIMEZONE_MAP[tz];
    if (tzMatch) return tzMatch;
  } catch { /* ignore */ }
  return { locale: 'en', registry: null };
}
