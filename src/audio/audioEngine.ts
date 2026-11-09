import { useEffect, useRef, useState, useCallback } from 'react';
import { Recording } from '../domain/bird';
import {
  AudioEngine,
  AudioEngineListener,
  AudioEngineState,
  PlaybackStatus,
} from './types';

export { AudioEngine, AudioEngineListener, AudioEngineState, PlaybackStatus };

export function useAudioClipController(createEngine: () => AudioEngine) {
  const engineRef = useRef<AudioEngine | null>(null);
  if (!engineRef.current) {
    engineRef.current = createEngine();
  }

  const [state, setState] = useState<AudioEngineState>(() =>
    engineRef.current!.getState()
  );

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    const unsubscribe = engine.subscribe(setState);
    return () => {
      unsubscribe();
      void engine.dispose();
    };
  }, []);

  const playTrack = useCallback(
    async (
      speciesId: string,
      recording: Pick<Recording, 'recId' | 'assetId'>
    ) => {
      await engineRef.current?.playTrack(speciesId, recording);
    },
    []
  );

  const pauseTrack = useCallback(async (speciesId: string) => {
    await engineRef.current?.pauseTrack(speciesId);
  }, []);

  const resumeTrack = useCallback(async (speciesId: string) => {
    await engineRef.current?.resumeTrack(speciesId);
  }, []);

  const stopTrack = useCallback(async (speciesId: string) => {
    await engineRef.current?.stopTrack(speciesId);
  }, []);

  const stopAll = useCallback(async () => {
    await engineRef.current?.stopAll();
  }, []);

  const setTrackVolume = useCallback((speciesId: string, volume: number) => {
    engineRef.current?.setTrackVolume(speciesId, volume);
  }, []);

  return {
    tracks: state.tracks,
    playTrack,
    pauseTrack,
    resumeTrack,
    stopTrack,
    stopAll,
    setTrackVolume,
  };
}