import { PlaybackStatus } from '../audio/types';

export interface BirdTrackState {
  speciesId: string;
  activeRecId: string | null;
  status: PlaybackStatus;
  /** Normalized linear gain from 0.0 (muted) to 1.0 (full volume) */
  volume: number;
  errorMessage: string | null;
}

export interface SoundscapePreset {
  id: string;
  name: string;
  tracks: Record<string, { volume: number; activeRecId?: string }>;
}