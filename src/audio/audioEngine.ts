import { useEffect, useRef, useState, useCallback } from 'react';
import { Recording } from '../domain/bird';

export type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'stopped' | 'error';

export interface AudioEngineState {
  status: PlaybackStatus;
  activeRecId: string | null;
  errorMessage: string | null;
}

export type AudioEngineListener = (state: AudioEngineState) => void;

export interface AudioEngine {
  /** Loads (if needed) and plays the given recording clip from the beginning. */
  playClip(recording: Pick<Recording, 'recId' | 'assetId'>): Promise<void>;
  /** Stops any currently playing clip immediately. */
  stop(): Promise<void>;
  /** Releases all underlying audio context, buffer, and node resources. */
  dispose(): Promise<void>;
  /** Returns current snapshot of the engine state. */
  getState(): AudioEngineState;
  /** Subscribes to state changes; returns an unsubscribe function. */
  subscribe(listener: AudioEngineListener): () => void;
}

/**
 * Encapsulates engine instantiation, state subscription, and unmount cleanup
 * so screens and routes do not manage raw audio resources directly.
 */
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

  const play = useCallback(async (recording: Pick<Recording, 'recId' | 'assetId'>) => {
    await engineRef.current?.playClip(recording);
  }, []);

  const stop = useCallback(async () => {
    await engineRef.current?.stop();
  }, []);

  return {
    status: state.status,
    activeRecId: state.activeRecId,
    errorMessage: state.errorMessage,
    play,
    stop,
  };
}