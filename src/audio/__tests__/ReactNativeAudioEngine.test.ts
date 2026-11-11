import { Image } from 'react-native';
import { MockAudioContext } from '../../test/mocks/mockAudioApi';
import { ReactNativeAudioEngine } from '../ReactNativeAudioEngine';

jest.mock('react-native-audio-api', () => ({
  AudioContext: jest.fn().mockImplementation(() => new MockAudioContext()),
}));

const CHICKADEE_CLIP = { recId: 'XC717105', assetId: 101 };
const BLUE_JAY_CLIP = { recId: 'XC691163', assetId: 202 };

describe('ReactNativeAudioEngine', () => {
  let engine: ReactNativeAudioEngine;

  beforeEach(() => {
    MockAudioContext.reset();
    jest.clearAllMocks();

    jest
      .spyOn(Image, 'resolveAssetSource')
      .mockReturnValue({ uri: 'file:///mock/audio.mp3', width: 0, height: 0, scale: 1 });

    engine = new ReactNativeAudioEngine();
  });

  afterEach(async () => {
    await engine.dispose();
  });

  it('starts in an empty tracks state', () => {
    expect(engine.getState()).toEqual({ tracks: {} });
  });

  it('decodes, loops, and plays a bird track from offset 0', async () => {
    await engine.playTrack('black-capped-chickadee', CHICKADEE_CLIP);

    const track = engine.getState().tracks['black-capped-chickadee'];
    const ctx = MockAudioContext.latestInstance!;
    const sourceNode = ctx.createdSources[0];

    expect(track.status).toBe('playing');
    expect(track.activeRecId).toBe('XC717105');
    expect(track.errorMessage).toBeNull();

    expect(sourceNode.loop).toBe(true);
    expect(sourceNode.start).toHaveBeenCalledWith(0, 0);
  });

  it('allows multiple bird tracks to play simultaneously without stopping each other', async () => {
    await engine.playTrack('black-capped-chickadee', CHICKADEE_CLIP);
    await engine.playTrack('blue-jay', BLUE_JAY_CLIP);

    const { tracks } = engine.getState();
    const ctx = MockAudioContext.latestInstance!;

    expect(tracks['black-capped-chickadee'].status).toBe('playing');
    expect(tracks['blue-jay'].status).toBe('playing');

    expect(ctx.createdSources[0].stop).not.toHaveBeenCalled();
    expect(ctx.createdSources[1].start).toHaveBeenCalledWith(0, 0);
  });

  it('caches decoded AudioBuffers by recId so replaying does not re-decode the file', async () => {
    await engine.playTrack('black-capped-chickadee', CHICKADEE_CLIP);
    await engine.stopTrack('black-capped-chickadee');
    await engine.playTrack('black-capped-chickadee', CHICKADEE_CLIP);

    const ctx = MockAudioContext.latestInstance!;

    expect(ctx.decodeAudioData).toHaveBeenCalledTimes(1);
    expect(ctx.createdSources).toHaveLength(2);
  });

  it('updates GainNode volume in real time and clamps values between 0.0 and 1.0', async () => {
    await engine.playTrack('black-capped-chickadee', CHICKADEE_CLIP);
    const ctx = MockAudioContext.latestInstance!;
    const gainNode = ctx.createdGains[0];

    engine.setTrackVolume('black-capped-chickadee', 0.35);
    expect(gainNode.gain.value).toBe(0.35);
    expect(engine.getState().tracks['black-capped-chickadee'].volume).toBe(0.35);

    engine.setTrackVolume('black-capped-chickadee', 1.8);
    expect(gainNode.gain.value).toBe(1);

    engine.setTrackVolume('black-capped-chickadee', -0.5);
    expect(gainNode.gain.value).toBe(0);
  });

  it('pauses a playing track and resumes from the exact elapsed offset', async () => {
    await engine.playTrack('black-capped-chickadee', CHICKADEE_CLIP);
    const ctx = MockAudioContext.latestInstance!;
    const firstSource = ctx.createdSources[0];

    ctx.currentTime = 3.5;
    await engine.pauseTrack('black-capped-chickadee');

    expect(engine.getState().tracks['black-capped-chickadee'].status).toBe('paused');
    expect(firstSource.stop).toHaveBeenCalledTimes(1);

    await engine.resumeTrack('black-capped-chickadee');

    const secondSource = ctx.createdSources[1];
    expect(engine.getState().tracks['black-capped-chickadee'].status).toBe('playing');
    expect(secondSource.loop).toBe(true);
    expect(secondSource.start).toHaveBeenCalledWith(0, 3.5);
  });

  it('stops a track and resets its position so starting again plays from 0', async () => {
    await engine.playTrack('black-capped-chickadee', CHICKADEE_CLIP);
    const ctx = MockAudioContext.latestInstance!;

    ctx.currentTime = 4.2;
    await engine.pauseTrack('black-capped-chickadee');
    await engine.stopTrack('black-capped-chickadee');

    expect(engine.getState().tracks['black-capped-chickadee'].status).toBe('stopped');

    await engine.playTrack('black-capped-chickadee', CHICKADEE_CLIP);
    const restartedSource = ctx.createdSources[1];
    expect(restartedSource.start).toHaveBeenCalledWith(0, 0);
  });

  it('stops all active bird tracks when stopAll() is called', async () => {
    await engine.playTrack('black-capped-chickadee', CHICKADEE_CLIP);
    await engine.playTrack('blue-jay', BLUE_JAY_CLIP);

    await engine.stopAll();

    const { tracks } = engine.getState();
    expect(tracks['black-capped-chickadee'].status).toBe('stopped');
    expect(tracks['blue-jay'].status).toBe('stopped');
  });

  it('recovers via the iOS clean URI fallback if decoding by numeric assetId fails once', async () => {
    MockAudioContext.mockDecodeAudioData.mockRejectedValueOnce(
      new Error('Numeric assetId decode failed')
    );

    await engine.playTrack('blue-jay', BLUE_JAY_CLIP);

    const track = engine.getState().tracks['blue-jay'];
    expect(track.status).toBe('playing');
    expect(MockAudioContext.mockDecodeAudioData).toHaveBeenCalledTimes(2);
    expect(MockAudioContext.mockDecodeAudioData).toHaveBeenNthCalledWith(1, 202);
    expect(MockAudioContext.mockDecodeAudioData).toHaveBeenNthCalledWith(
      2,
      '/mock/audio.mp3'
    );
  });

  it('transitions track to error status when audio decoding fails completely', async () => {
    MockAudioContext.mockDecodeAudioData.mockRejectedValue(
      new Error('Corrupted MP3 file')
    );

    await engine.playTrack('blue-jay', BLUE_JAY_CLIP);

    const track = engine.getState().tracks['blue-jay'];
    expect(track.status).toBe('error');
    expect(track.errorMessage).toBe('Corrupted MP3 file');
  });
});