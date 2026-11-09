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
      runtime = { sourceNode: null, gainNode: null, requestId: 0 };
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

    // Only stop this specific bird's previous source; other birds keep playing
    this.teardownTrackSource(speciesId);

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
      sourceNode.connect(runtime.gainNode);

      const handleEnded = () => {
        if (runtime.sourceNode === sourceNode) {
          runtime.sourceNode = null;
          this.updateTrackState(speciesId, { status: 'stopped' });
        }
      };

      const anySource = sourceNode as Record<string, any>;
      if ('onended' in anySource) {
        anySource.onended = handleEnded;
      } else {
        anySource.onEnded = handleEnded;
      }

      runtime.sourceNode = sourceNode;
      sourceNode.start();

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

  async stopTrack(speciesId: string): Promise<void> {
    if (this.isDisposed) return;
    const runtime = this.runtimeTracks.get(speciesId);
    if (runtime) {
      runtime.requestId++;
    }
    this.teardownTrackSource(speciesId);

    const currentStatus = this.getTrackState(speciesId).status;
    if (currentStatus === 'playing' || currentStatus === 'loading') {
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

// import { Image } from 'react-native';
// import {
//   AudioContext,
//   AudioBuffer,
//   AudioBufferSourceNode,
// } from 'react-native-audio-api';
// import { Recording } from '../domain/bird';
// import {
//   AudioEngine,
//   AudioEngineListener,
//   AudioEngineState,
// } from './audioEngine';

// export class ReactNativeAudioEngine implements AudioEngine {
//   private audioContext: AudioContext | null = null;
//   private activeSourceNode: AudioBufferSourceNode | null = null;
//   private bufferCache = new Map<string, AudioBuffer>();
//   private listeners = new Set<AudioEngineListener>();
//   private isDisposed = false;
//   private playRequestId = 0;

//   private state: AudioEngineState = {
//     status: 'idle',
//     activeRecId: null,
//     errorMessage: null,
//   };

//   getState(): AudioEngineState {
//     return this.state;
//   }

//   subscribe(listener: AudioEngineListener): () => void {
//     this.listeners.add(listener);
//     listener(this.state);
//     return () => {
//       this.listeners.delete(listener);
//     };
//   }

//   private setState(partial: Partial<AudioEngineState>): void {
//     if (this.isDisposed) return;
//     this.state = { ...this.state, ...partial };
//     this.listeners.forEach((listener) => listener(this.state));
//   }

//   private getOrCreateContext(): AudioContext {
//     if (!this.audioContext) {
//       this.audioContext = new AudioContext();
//     }
//     return this.audioContext;
//   }

//   private async decodeAsset(
//     ctx: AudioContext,
//     assetId: number
//   ): Promise<AudioBuffer> {
//     const anyCtx = ctx as Record<string, any>;

//     // 1. Resolve asset URI via React Native's built-in resolver for safe path handling
//     const resolved = Image.resolveAssetSource(assetId);
//     const resolvedUri = resolved?.uri;

//     // 2. Prefer standard decodeAudioData (react-native-audio-api >= 0.6)
//     if (typeof anyCtx.decodeAudioData === 'function') {
//       try {
//         return await anyCtx.decodeAudioData(assetId);
//       } catch {
//         // Fallback if percent-encoded spaces in bundle path fail on iOS
//         if (resolvedUri) {
//           const cleanPath = resolvedUri.startsWith('file://')
//             ? decodeURIComponent(resolvedUri.replace('file://', ''))
//             : resolvedUri;
//           return await anyCtx.decodeAudioData(cleanPath);
//         }
//         throw new Error('Unable to resolve local audio asset for decoding.');
//       }
//     }

//     // 3. Fallback for older react-native-audio-api (0.4.x - 0.5.x)
//     if (typeof anyCtx.decodeAudioDataSource === 'function' && resolvedUri) {
//       return await anyCtx.decodeAudioDataSource(resolvedUri);
//     }

//     throw new Error(
//       'Installed react-native-audio-api version does not expose decodeAudioData.'
//     );
//   }

//   private teardownActiveSource(): void {
//     if (!this.activeSourceNode) return;
//     const node = this.activeSourceNode;
//     this.activeSourceNode = null;

//     try {
//       // Clear ended callbacks before stopping so manual stop doesn't race natural end
//       const anyNode = node as Record<string, any>;
//       if ('onEnded' in anyNode) anyNode.onEnded = null;
//       if ('onended' in anyNode) anyNode.onended = null;
//       node.stop();
//     } catch {
//       // Ignore InvalidStateError if node already finished naturally
//     }

//     try {
//       node.disconnect();
//     } catch {
//       // Ignore disconnect errors on already torn-down nodes
//     }
//   }

//   async playClip(recording: Pick<Recording, 'recId' | 'assetId'>): Promise<void> {
//     if (this.isDisposed) return;

//     const currentRequestId = ++this.playRequestId;
//     this.teardownActiveSource();

//     this.setState({
//       status: 'loading',
//       activeRecId: recording.recId,
//       errorMessage: null,
//     });

//     try {
//       const ctx = this.getOrCreateContext();

//       if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
//         await ctx.resume();
//       }

//       let buffer = this.bufferCache.get(recording.recId);
//       if (!buffer) {
//         buffer = await this.decodeAsset(ctx, recording.assetId);
//         if (this.isDisposed || currentRequestId !== this.playRequestId) {
//           return;
//         }
//         this.bufferCache.set(recording.recId, buffer);
//       }

//       const sourceNode = ctx.createBufferSource();
//       sourceNode.buffer = buffer;
//       sourceNode.connect(ctx.destination);

//       const handleEnded = () => {
//         if (this.activeSourceNode === sourceNode) {
//           this.activeSourceNode = null;
//           this.setState({ status: 'stopped' });
//         }
//       };

//       // Support both camelCase (0.4-0.8) and lowercase (0.9+) event property names
//       const anySource = sourceNode as Record<string, any>;
//       if ('onended' in anySource) {
//         anySource.onended = handleEnded;
//       } else {
//         anySource.onEnded = handleEnded;
//       }

//       this.activeSourceNode = sourceNode;
//       sourceNode.start();

//       this.setState({
//         status: 'playing',
//         activeRecId: recording.recId,
//         errorMessage: null,
//       });
//     } catch (err) {
//       if (this.isDisposed || currentRequestId !== this.playRequestId) return;
//       const message =
//         err instanceof Error ? err.message : 'Unknown audio playback error';
//       this.setState({
//         status: 'error',
//         errorMessage: message,
//       });
//     }
//   }

//   async stop(): Promise<void> {
//     if (this.isDisposed) return;
//     this.playRequestId++; // Cancel any in-flight load
//     this.teardownActiveSource();

//     if (this.state.status === 'playing' || this.state.status === 'loading') {
//       this.setState({
//         status: 'stopped',
//         errorMessage: null,
//       });
//     }
//   }

//   async dispose(): Promise<void> {
//     this.isDisposed = true;
//     this.playRequestId++;
//     this.teardownActiveSource();
//     this.bufferCache.clear();
//     this.listeners.clear();

//     if (this.audioContext) {
//       const ctx = this.audioContext;
//       this.audioContext = null;
//       try {
//         if (typeof ctx.close === 'function') {
//           await ctx.close();
//         }
//       } catch {
//         // Ignore context close errors during unmount
//       }
//     }
//   }
// }