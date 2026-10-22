import { BirdSpecies } from '../domain/bird';

export const localBirdCatalog: Record<string, BirdSpecies> = {
  'black-capped-chickadee': {
    speciesId: 'black-capped-chickadee',
    displayName: 'Black-capped Chickadee',
    speciesScientific: 'Poecile atricapillus',
    recordings: [
      {
        recId: 'XC717105',
        type: 'song',
        assetId: require('../../assets/audio/black-capped_chickadee_xc717105_song.mp3'),
        license: 'CC BY-NC-SA 4.0',

        title: 'Black-capped Chickadee (XC717105)',
        recordist: 'Bobby Wilcox',
        sourceUrl: 'xeno-canto.org/717105',
        licenseUrl: 'https://creativecommons.org/licenses/by-nc-sa/4.0/'
      },
      {
        recId: 'XC76509',
        type: 'call',
        assetId: require('../../assets/audio/black-capped_chickadee _xc76509_call.mp3'),
        license: 'CC BY-NC-ND 2.5',
        title: 'Black-capped Chickadee (XC76509)',
        recordist: 'Andrew Spencer',
        sourceUrl: 'xeno-canto.org/76509',
        licenseUrl: 'https://creativecommons.org/licenses/by-nc-nd/2.5/'
      }
    ]
  },
  'blue-jay': {
    speciesId: 'blue-jay',
    displayName: 'Blue Jay',
    speciesScientific: 'Cyanocitta cristata',
    recordings: [
      {
        recId: 'XC691163',
        type: 'call2',
        assetId: require('../../assets/audio/blue_jay_xc691163_call2.mp3'),
        license: 'CC BY-NC-SA 4.0',
        title: 'Blue Jay (XC691163)',
        recordist: 'Christopher McPherson',
        sourceUrl: 'xeno-canto.org/691163',
        licenseUrl: 'https://creativecommons.org/licenses/by-nc-sa/4.0/'
      },
      {
        recId: 'XC760144',
        type: 'call1',
        assetId: require('../../assets/audio/blue_jay_xc760144_call1.mp3'),
        license: 'CC BY-NC-SA 4.0',
        title: 'Blue Jay (XC760144)',
        recordist: 'Emily Brhel',
        sourceUrl: 'xeno-canto.org/760144',
        licenseUrl: 'https://creativecommons.org/licenses/by-nc-sa/4.0/'
      },
      {
        recId: 'XC391461',
        type: 'imitation',
        assetId: require('../../assets/audio/blue-jay_xc391461_imitation.mp3'),
        license: 'CC BY-NC-ND 4.0',
        title: 'Blue Jay (XC391461)',
        recordist: 'Peter Boesman',
        sourceUrl: 'xeno-canto.org/391461',
        licenseUrl: 'https://creativecommons.org/licenses/by-nc-nd/4.0/'
      }
    ]
  },
  'downy-woodpecker': {
    speciesId: 'downy-woodpecker',
    displayName: 'Downy Woodpecker',
    speciesScientific: 'Dryobates pubescens',
    recordings: [
      {
        recId: 'XC33615',
        type: 'call',
        assetId: require('../../assets/audio/downy_woodpecker_xc33615_call.mp3'),
        license: 'CC BY-NC-ND 2.5',
        title: 'Downy Woodpecker (XC33615)',
        recordist: 'Andrew Spencer',
        sourceUrl: 'xeno-canto.org/33615',
        licenseUrl: 'https://creativecommons.org/licenses/by-nc-nd/2.5/'
      },
      {
        recId: 'XC33614',
        type: 'drumming',
        assetId: require('../../assets/audio/downy_woodpecker_xc33614_drumming.mp3'),
        license: 'CC BY-NC-ND 2.5',
        title: 'Downy Woodpecker (XC33614)',
        recordist: 'Andrew Spencer',
        sourceUrl: 'xeno-canto.org/33614',
        licenseUrl: 'https://creativecommons.org/licenses/by-nc-nd/2.5/'
      }
    ]
  },
  'mourning-dove': {
    speciesId: 'mourning-dove',
    displayName: 'Mourning Dove',
    speciesScientific: 'Zenaida macroura',
    recordings: [
      {
        recId: 'XC35100',
        type: 'wing_sound',
        assetId: require('../../assets/audio/mourning_dove_xc35100_wing_sound.mp3'),
        license: 'CC BY-NC-ND 2.5',
        title: 'Mourning Dove (XC35100)',
        recordist: 'Andrew Spencer',
        sourceUrl: 'xeno-canto.org/35100',
        licenseUrl: 'https://creativecommons.org/licenses/by-nc-nd/2.5/'
      },
      {
        recId: 'XC109033',
        type: 'song',
        assetId: require('../../assets/audio/mourning_dove_xc109033_song.mp3'),
        license: 'CC BY-NC-SA 3.0',
        title: 'Mourning Dove (XC109033)',
        recordist: 'Andrew Spencer',
        sourceUrl: 'xeno-canto.org/109033',
        licenseUrl: 'https://creativecommons.org/licenses/by-nc-sa/3.0/'
      }
    ]
  },
  'northern-cardinal': {
    speciesId: 'northern-cardinal',
    displayName: 'Northern Cardinal',
    speciesScientific: 'Cardinalis cardinalis',
    recordings: [
      {
        recId: 'XC220399',
        type: 'call',
        assetId: require('../../assets/audio/northern_cardinal_xc220399_call.mp3'),
        license: 'CC BY-NC-ND 4.0',
        title: 'Northern Cardinal (XC220399)',
        recordist: 'Peter Boesman',
        sourceUrl: 'xeno-canto.org/220399',
        licenseUrl: 'https://creativecommons.org/licenses/by-nc-nd/4.0/'
      },
      {
        recId: 'XC220401',
        type: 'song',
        assetId: require('../../assets/audio/northern_cardinal_xc220401_song.mp3'),
        license: 'CC BY-NC-ND 4.0',
        title: 'Northern Cardinal (XC220401)',
        recordist: 'Peter Boesman',
        sourceUrl: 'xeno-canto.org/220401',
        licenseUrl: 'https://creativecommons.org/licenses/by-nc-nd/4.0/'
      }
    ]
  },
  'tufted-titmouse': {
    speciesId: 'tufted-titmouse',
    displayName: 'Tufted Titmouse',
    speciesScientific: 'Baeolophus bicolor',
    recordings: [
      {
        recId: 'XC29511',
        type: 'call',
        assetId: require('../../assets/audio/tufted_titmouse_xc29511_call.mp3'),
        license: 'CC BY-NC-ND 2.5',
        title: 'Tufted Titmouse (XC29511)',
        recordist: 'Andrew Spencer',
        sourceUrl: 'xeno-canto.org/29511',
        licenseUrl: 'https://creativecommons.org/licenses/by-nc-nd/2.5/'
      },
      {
        recId: 'XC29512',
        type: 'atypical song',
        assetId: require('../../assets/audio/tufted_titmouse_xc29512_atypical song.mp3'),
        license: 'CC BY-NC-ND 2.5',
        title: 'Tufted Titmouse (XC29512)',
        recordist: 'Andrew Spencer',
        sourceUrl: 'xeno-canto.org/29512',
        licenseUrl: 'https://creativecommons.org/licenses/by-nc-nd/2.5/'
      },
      {
        recId: 'XC33585',
        type: 'song',
        assetId: require('../../assets/audio/tufted_titmouse_xc33585_song.mp3'),
        license: 'CC BY-NC-ND 2.5',
        title: 'Tufted Titmouse (XC33585)',
        recordist: 'Andrew Spencer',
        sourceUrl: 'xeno-canto.org/33585',
        licenseUrl: 'https://creativecommons.org/licenses/by-nc-nd/2.5/'
      }
    ]
  }
};

// Helper function to simulate the future API we will build
// export function getBirdById(id: string): BirdSpecies | undefined {
//   return localBirdCatalog[id];
// }

// export function getAllBirds(): BirdSpecies[] {
//   return Object.values(localBirdCatalog);
// }