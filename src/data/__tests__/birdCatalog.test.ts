import { getAllBirds, getBirdById, localBirdCatalog } from '../birdCatalog';

describe('birdCatalog', () => {
  describe('getAllBirds()', () => {
    it('returns all 6 species from the catalog', () => {
      const birds = getAllBirds();

      expect(birds).toHaveLength(6);
    });

    it('ensures every species has at least one audio recording', () => {
      const birds = getAllBirds();

      for (const bird of birds) {
        expect(bird.speciesId).toBeTruthy();
        expect(bird.displayName).toBeTruthy();
        expect(bird.speciesScientific).toBeTruthy();
        expect(bird.recordings.length).toBeGreaterThan(0);
      }
    });
  });

  describe('getBirdById()', () => {
    it('returns the matching BirdSpecies when given a valid speciesId', () => {
      const chickadee = getBirdById('black-capped-chickadee');

      expect(chickadee).toBeDefined();
      expect(chickadee?.displayName).toBe('Black-capped Chickadee');
      expect(chickadee?.speciesScientific).toBe('Poecile atricapillus');
      expect(chickadee?.recordings).toHaveLength(2);
    });

    it('returns undefined when given an unknown speciesId', () => {
      const unknownBird = getBirdById('emperor-penguin');

      expect(unknownBird).toBeUndefined();
    });
  });

  describe('recording asset & license integrity', () => {
    it('resolves a valid assetId for every recording', () => {
      const allBirds = Object.values(localBirdCatalog);

      for (const bird of allBirds) {
        for (const recording of bird.recordings) {
          expect(recording.recId).toMatch(/^XC\d+$/);
          expect(recording.assetId).toBeDefined();
        }
      }
    });

    it('includes complete TSAL Creative Commons attribution metadata for every recording', () => {
      const allBirds = Object.values(localBirdCatalog);

      for (const bird of allBirds) {
        for (const recording of bird.recordings) {
          // (T) Title & (A) Recordist must be non-empty strings
          expect(recording.title.trim().length).toBeGreaterThan(0);
          expect(recording.recordist.trim().length).toBeGreaterThan(0);
          expect(recording.license.trim().length).toBeGreaterThan(0);

          // (S) Source URL must reference xeno-canto.org and the recording's numeric ID
          const numericId = recording.recId.replace('XC', '');
          expect(recording.sourceUrl).toContain(`xeno-canto.org/${numericId}`);

          // (L) License URL must point to a valid Creative Commons license page
          expect(recording.licenseUrl).toMatch(
            /^https:\/\/creativecommons\.org\/licenses\//
          );
        }
      }
    });
  });
});