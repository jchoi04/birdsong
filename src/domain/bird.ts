export interface Recording {
  recId: string;          // The Xeno-canto ID (e.g., 'XC76509')
  type: string;        // 'call', 'song', 'imitation', 'drumming'
  assetId: any;        // The React Native require() reference
  license: string;     // e.g., 'CC BY-NC-SA 4.0' or 'unverified'


  //TSAL requirement
  title: string;       // (T) e.g., 'Black-capped Chickadee call'
  recordist: string;   // (A) e.g., 'Jon Doe' (Maps to API 'rec')
  sourceUrl: string;   // (S) e.g., 'https://xeno-canto.org/76509' (Maps to API 'url')
  licenseUrl: string;  // (L) e.g., 'https://creativecommons.org/licenses/by-nc-sa/4.0/' (Maps to API 'lic')
}

export interface BirdSpecies {
  speciesId: string;          // stable internal id, also layman's name for species
  speciesScientific: string;  //Scientific name for the species
  displayName: string;          // The name to be displayed
  recordings: Recording[];
}