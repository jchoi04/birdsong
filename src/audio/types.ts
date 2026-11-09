import { Recording } from '../domain/bird';
import { BirdTrackState } from '../domain/soundscape';

export type PlaybackStatus =
  | 'idle'
  | 'loading'
  | 'playing'
  | 'paused'
  | 'stopped'
  | 'error';

export interface AudioEngineState {
  tracks: Record<string, BirdTrackState>;
}

export type AudioEngineListener = (state: AudioEngineState) => void;

export interface AudioEngine {
  /** Starts a clip from the beginning and loops it continuously. */
  playTrack(
    speciesId: string,
    recording: Pick<Recording, 'recId' | 'assetId'>
  ): Promise<void>;
  /** Pauses a currently playing bird track and preserves its playback position. */
  pauseTrack(speciesId: string): Promise<void>;
  /** Resumes a paused bird track from where it left off. */
  resumeTrack(speciesId: string): Promise<void>;
  /** Stops playback for a single bird track and resets its position to 0. */
  stopTrack(speciesId: string): Promise<void>;
  /** Stops and resets all bird tracks. */
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