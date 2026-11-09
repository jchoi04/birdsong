import { Image } from 'react-native';
import {
  AudioContext,
  AudioBuffer,
  AudioBufferSourceNode,
  GainNode,
} from 'react-native-audio-api';
import { Recording } from '../domain/bird';
import { BirdTrackState } from '../domain/soundscape';
import {
  AudioEngine,
  AudioEngineListener,
  AudioEngineState,
} from './types';

interface ActiveTrackRuntime {
  sourceNode: AudioBufferSourceNode | null;
  gainNode: GainNode | null;
  activeRecording: Pick<Recording, 'recId' | 'assetId'> | null;
  startedAt: number;
  pausedOffset: number;
  requestId: number;
}

const DEFAULT_VOLUME = 0.8;

export class ReactNativeAudioEngine implements AudioEngine {
  private audioContext: AudioContext | null = null;
  private bufferCache = new Map<string, AudioBuffer>();
  private runtimeTracks = new Map<string, ActiveTrackRuntime>();
  private listeners = new Set<AudioEngineListener>();
  private isDisposed = false;

  private state: AudioEngineState = {
    tracks: {},
  };

  getState(): AudioEngineState {
    return this.state;
  }

  subscribe(listener: AudioEngineListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private getTrackState(speciesId: string): BirdTrackState {
    return (
      this.state.tracks[speciesId] ?? {
        speciesId,
        activeRecId: null,
        status: 'idle',
        volume: DEFAULT_VOLUME,
        errorMessage: null,
      }
    );
  }

  private updateTrackState(
    speciesId: string,
    partial: Partial<BirdTrackState>
  ): void {
    if (this.isDisposed) return;
    const current = this.getTrackState(speciesId);
    this.state = {
      ...this.state,
      tracks: {
        ...this.state.tracks,
        [speciesId]: { ...current, ...partial },
      },
    };
    this.listeners.forEach((listener) => listener(this.state));
  }

  private getOrCreateContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    return this.audioContext;
  }

  private getOrCreateRuntime(speciesId: string): ActiveTrackRuntime {
    let runtime = this.runtimeTracks.get(speciesId);
    if (!runtime) {
      runtime = {
        sourceNode: null,
        gainNode: null,
        activeRecording: null,
        startedAt: 0,
        pausedOffset: 0,
        requestId: 0,
      };
      this.runtimeTracks.set(speciesId, runtime);
    }
    return runtime;
  }

  private async decodeAsset(
    ctx: AudioContext,
    assetId: number
  ): Promise<AudioBuffer> {
    const anyCtx = ctx as Record<string, any>;
    const resolved = Image.resolveAssetSource(assetId);
    const resolvedUri = resolved?.uri;

    if (typeof anyCtx.decodeAudioData === 'function') {
      try {
        return await anyCtx.decodeAudioData(assetId);
      } catch {
        if (resolvedUri) {
          const cleanPath = resolvedUri.startsWith('file://')
            ? decodeURIComponent(resolvedUri.replace('file://', ''))
            : resolvedUri;
          return await anyCtx.decodeAudioData(cleanPath);
        }
        throw new Error('Unable to resolve local audio asset for decoding.');
      }
    }

    if (typeof anyCtx.decodeAudioDataSource === 'function' && resolvedUri) {
      return await anyCtx.decodeAudioDataSource(resolvedUri);
    }

    throw new Error(
      'Installed react-native-audio-api version does not expose decodeAudioData.'
    );
  }

  private teardownTrackSource(speciesId: string): void {
    const runtime = this.runtimeTracks.get(speciesId);
    if (!runtime?.sourceNode) return;

    const node = runtime.sourceNode;
    runtime.sourceNode = null;

    try {
      const anyNode = node as Record<string, any>;
      if ('onEnded' in anyNode) anyNode.onEnded = null;
      if ('onended' in anyNode) anyNode.onended = null;
      node.stop();
    } catch {
      // Ignore if already stopped naturally
    }

    try {
      node.disconnect();
    } catch {
      // Ignore disconnect errors
    }
  }

  private startLoopingNode(
    ctx: AudioContext,
    speciesId: string,
    runtime: ActiveTrackRuntime,
    buffer: AudioBuffer,
    offsetSeconds: number
  ): void {
    if (!runtime.gainNode) {
      const gainNode = ctx.createGain();
      gainNode.gain.value = this.getTrackState(speciesId).volume;
      gainNode.connect(ctx.destination);
      runtime.gainNode = gainNode;
    } else {
      runtime.gainNode.gain.value = this.getTrackState(speciesId).volume;
    }

    const sourceNode = ctx.createBufferSource();
    sourceNode.buffer = buffer;
    sourceNode.loop = true;
    sourceNode.connect(runtime.gainNode);

    // Fallback in case a platform build finishes a non-looped buffer
    const handleEnded = () => {
      if (
        runtime.sourceNode === sourceNode &&
        this.getTrackState(speciesId).status === 'playing'
      ) {
        runtime.pausedOffset = 0;
        this.startLoopingNode(ctx, speciesId, runtime, buffer, 0);
      }
    };

    const anySource = sourceNode as Record<string, any>;
    if ('onended' in anySource) {
      anySource.onended = handleEnded;
    } else {
      anySource.onEnded = handleEnded;
    }

    const safeOffset =
      buffer.duration > 0 ? offsetSeconds % buffer.duration : 0;

    runtime.sourceNode = sourceNode;
    runtime.startedAt = ctx.currentTime;
    runtime.pausedOffset = safeOffset;

    sourceNode.start(0, safeOffset);
  }

  setTrackVolume(speciesId: string, volume: number): void {
    if (this.isDisposed) return;
    const clamped = Math.max(0, Math.min(1, volume));
    const runtime = this.runtimeTracks.get(speciesId);

    if (runtime?.gainNode) {
      runtime.gainNode.gain.value = clamped;
    }

    this.updateTrackState(speciesId, { volume: clamped });
  }

  async playTrack(
    speciesId: string,
    recording: Pick<Recording, 'recId' | 'assetId'>
  ): Promise<void> {
    if (this.isDisposed) return;

    const runtime = this.getOrCreateRuntime(speciesId);
    const currentRequestId = ++runtime.requestId;

    this.teardownTrackSource(speciesId);
    runtime.activeRecording = recording;
    runtime.pausedOffset = 0;

    this.updateTrackState(speciesId, {
      status: 'loading',
      activeRecId: recording.recId,
      errorMessage: null,
    });

    try {
      const ctx = this.getOrCreateContext();

      if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
        await ctx.resume();
      }

      let buffer = this.bufferCache.get(recording.recId);
      if (!buffer) {
        buffer = await this.decodeAsset(ctx, recording.assetId);
        if (this.isDisposed || currentRequestId !== runtime.requestId) {
          return;
        }
        this.bufferCache.set(recording.recId, buffer);
      }

      this.startLoopingNode(ctx, speciesId, runtime, buffer, 0);

      this.updateTrackState(speciesId, {
        status: 'playing',
        activeRecId: recording.recId,
        errorMessage: null,
      });
    } catch (err) {
      if (this.isDisposed || currentRequestId !== runtime.requestId) return;
      const message =
        err instanceof Error ? err.message : 'Unknown audio playback error';
      this.updateTrackState(speciesId, {
        status: 'error',
        errorMessage: message,
      });
    }
  }

  async pauseTrack(speciesId: string): Promise<void> {
    if (this.isDisposed) return;
    const runtime = this.runtimeTracks.get(speciesId);
    const trackState = this.getTrackState(speciesId);

    if (!runtime || trackState.status !== 'playing') return;

    runtime.requestId++;

    const ctx = this.audioContext;
    const recId = runtime.activeRecording?.recId;
    const buffer = recId ? this.bufferCache.get(recId) : undefined;

    if (ctx && buffer && buffer.duration > 0) {
      const elapsed = Math.max(0, ctx.currentTime - runtime.startedAt);
      runtime.pausedOffset = (runtime.pausedOffset + elapsed) % buffer.duration;
    }

    this.teardownTrackSource(speciesId);
    this.updateTrackState(speciesId, {
      status: 'paused',
      errorMessage: null,
    });
  }

  async resumeTrack(speciesId: string): Promise<void> {
    if (this.isDisposed) return;
    const runtime = this.runtimeTracks.get(speciesId);
    const trackState = this.getTrackState(speciesId);

    if (!runtime || trackState.status !== 'paused' || !runtime.activeRecording) {
      return;
    }

    const recording = runtime.activeRecording;
    const buffer = this.bufferCache.get(recording.recId);

    // If buffer was evicted for any reason, fall back to a fresh start
    if (!buffer) {
      await this.playTrack(speciesId, recording);
      return;
    }

    try {
      const ctx = this.getOrCreateContext();
      if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
        await ctx.resume();
      }

      this.teardownTrackSource(speciesId);
      this.startLoopingNode(
        ctx,
        speciesId,
        runtime,
        buffer,
        runtime.pausedOffset
      );

      this.updateTrackState(speciesId, {
        status: 'playing',
        errorMessage: null,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unknown audio resume error';
      this.updateTrackState(speciesId, {
        status: 'error',
        errorMessage: message,
      });
    }
  }

  async stopTrack(speciesId: string): Promise<void> {
    if (this.isDisposed) return;
    const runtime = this.runtimeTracks.get(speciesId);
    if (runtime) {
      runtime.requestId++;
      runtime.pausedOffset = 0;
    }
    this.teardownTrackSource(speciesId);

    const currentStatus = this.getTrackState(speciesId).status;
    if (
      currentStatus === 'playing' ||
      currentStatus === 'paused' ||
      currentStatus === 'loading'
    ) {
      this.updateTrackState(speciesId, {
        status: 'stopped',
        errorMessage: null,
      });
    }
  }

  async stopAll(): Promise<void> {
    if (this.isDisposed) return;
    const speciesIds = Array.from(this.runtimeTracks.keys());
    await Promise.all(speciesIds.map((id) => this.stopTrack(id)));
  }

  async dispose(): Promise<void> {
    this.isDisposed = true;
    for (const speciesId of this.runtimeTracks.keys()) {
      const runtime = this.runtimeTracks.get(speciesId);
      if (runtime) {
        runtime.requestId++;
      }
      this.teardownTrackSource(speciesId);
      if (runtime?.gainNode) {
        try {
          runtime.gainNode.disconnect();
        } catch {
          // Ignore disconnect errors
        }
      }
    }
    this.runtimeTracks.clear();
    this.bufferCache.clear();
    this.listeners.clear();

    if (this.audioContext) {
      const ctx = this.audioContext;
      this.audioContext = null;
      try {
        if (typeof ctx.close === 'function') {
          await ctx.close();
        }
      } catch {
        // Ignore context close errors during unmount
      }
    }
  }
}