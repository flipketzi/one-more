import { de } from './locales/de';
import { en } from './locales/en';

export type Locale = 'de' | 'en';

export interface LocaleDef {
  code: Locale;
  label: string;
  flag: string;
}

export const LOCALES: LocaleDef[] = [
  { code: 'de', label: 'DE', flag: '🇩🇪' },
  { code: 'en', label: 'EN', flag: '🇬🇧' },
];

export interface CardRuleTranslation {
  emoji: string;
  title: string;
  description: string;
}

export interface Translation {
  ageGate: {
    tagline: string;
    adultsOnly: string;
    adultsOnlyDesc: string;
    alcoholWarning: string;
    cta: string;
    disclaimer: string;
  };
  setup: {
    subtitle: string;
    nameLabel: string;
    namePlaceholder: string;
    avatarLabel: string;
    cta: string;
    errorTooShort: string;
    errorTooLong: string;
    errorInvalidChars: string;
  };
  home: {
    tagline: string;
    playingAs: string;
    edit: string;
    hostLabel: string;
    hostSub: string;
    joinLabel: string;
    joinSub: string;
    creating: string;
    footer: string;
    errorCreate: string;
  };
  join: {
    title: string;
    subtitle: string;
    back: string;
    codeLabel: string;
    cta: string;
    joining: string;
    joiningAsBefore: string;
    errorLength: string;
    errorNotFound: string;
    errorFull: string;
    errorTaken: string;
    errorTooMany: string;
    errorGeneral: string;
  };
  lobby: {
    sessionCode: string;
    copied: string;
    leave: string;
    shareCodeBefore: string;
    shareCodeAfter: string;
    players: string;
    chooseGame: string;
    game: string;
    waitingForHostGame: string;
    waitingForStart: string;
    start: string;
    starting: string;
    pickFirst: string;
    needMorePlayers: string;
    selectToUnlock: string;
    waitingForMore: string;
    errorSelect: string;
    errorKick: string;
    errorStart: string;
  };
  games: {
    KINGS_CUP: { name: string; tagline: string };
    HORSE_RACING: { name: string; tagline: string };
    SCHOCKEN: { name: string; tagline: string };
  };
  kingsCup: {
    cardRules: Record<string, CardRuleTranslation>;
    // DrawPhase
    yourTurn: string;
    drawCard: string;
    waitingForBefore: string;
    waitingForDrawAfter: string;
    // DisplayRuleView
    done: string;
    kingsDrawnLabel: string;
    cupContentsLabel: string;
    thumbQueenIsNow: (name: string) => string;
    // SipPickView
    whoLost: string;
    drawerPickingLost: string;
    pickSip: string;
    drawerPickingSip: string;
    playFirstCategory: string;
    playFirstRhyme: string;
    wordLabelCategory: string;
    wordLabelRhyme: string;
    // BuddyPickView
    pickBuddy: string;
    drawerPickingBuddy: string;
    hasBuddy: string;
    // TouchRaceView
    touchButton: string;
    watchRace: string;
    secondsRemaining: (n: number) => string;
    playersTouched: (touched: number, total: number) => string;
    youTouched: string;
    // WordRoundView
    yourAnswer: string;
    yourRhyme: string;
    pass: string;
    waitingForSpeakerBefore: string;
    // JackRuleSubmitView
    createRule: string;
    rulePlaceholder: string;
    setRule: string;
    drawerMakingRule: string;
    // KingsCupScreen
    cards: (n: number) => string;
    // Overlays
    drink: string;
    sipSaysYouDrink: (name: string) => string;
    tapToDismiss: string;
    tooSlow: string;
    raceOver: string;
    youDrink: string;
    loserDrinks: (name: string) => string;
    brainFreeze: string;
    roundOver: string;
    gameOver: string;
    backToHome: string;
    // ThumbQueenButton
    usesLeft: (n: number) => string;
    // KingsCupScreen host button
    returnToLobby: string;
  };
}

export const translations: Record<Locale, Translation> = { de, en };
