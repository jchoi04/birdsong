import { Recording } from '../domain/bird';
import { BirdTrackState } from '../domain/soundscape';

export type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'stopped' | 'error';

export interface AudioEngineState {
  /** Keyed by speciesId so multiple birds can play simultaneously */
  tracks: Record<string, BirdTrackState>;
}

export type AudioEngineListener = (state: AudioEngineState) => void;

export interface AudioEngine {
  /** Plays a clip for a specific bird track without stopping other birds. */
  playTrack(
    speciesId: string,
    recording: Pick<Recording, 'recId' | 'assetId'>
  ): Promise<void>;
  /** Stops playback for a single bird track. */
  stopTrack(speciesId: string): Promise<void>;
  /** Stops all currently playing bird tracks. */
  stopAll(): Promise<void>;
  /** Sets the volume (0.0 to 1.0) for a specific bird track in real time. */
  setTrackVolume(speciesId: string, volume: number): void;
  /** Releases all underlying audio context, buffer, and node resources. */
  dispose(): Promise<void>;
  /** Returns current snapshot of all tracks. */
  getState(): AudioEngineState;
  /** Subscribes to state changes; returns an unsubscribe function. */
  subscribe(listener: AudioEngineListener): () => void;
}