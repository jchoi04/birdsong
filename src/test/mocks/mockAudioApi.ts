export interface MockGainNode {
  gain: { value: number };
  connect: jest.Mock;
  disconnect: jest.Mock;
}

export interface MockAudioBufferSourceNode {
  buffer: { duration: number } | null;
  loop: boolean;
  onended: (() => void) | null;
  onEnded: (() => void) | null;
  connect: jest.Mock;
  disconnect: jest.Mock;
  start: jest.Mock;
  stop: jest.Mock;
}

const defaultDecodeImpl = async (_assetInput: unknown) => ({
  duration: 10,
  length: 441000,
  sampleRate: 44100,
});

export class MockAudioContext {
  static latestInstance: MockAudioContext | null = null;
  static mockDecodeAudioData = jest.fn(defaultDecodeImpl);

  state: 'running' | 'suspended' | 'closed' = 'running';
  currentTime = 0;

  createdSources: MockAudioBufferSourceNode[] = [];
  createdGains: MockGainNode[] = [];

  resume = jest.fn(async () => {
    this.state = 'running';
  });

  close = jest.fn(async () => {
    this.state = 'closed';
  });

  decodeAudioData = MockAudioContext.mockDecodeAudioData;

  createGain = jest.fn((): MockGainNode => {
    const gainNode: MockGainNode = {
      gain: { value: 1 },
      connect: jest.fn(),
      disconnect: jest.fn(),
    };
    this.createdGains.push(gainNode);
    return gainNode;
  });

  createBufferSource = jest.fn((): MockAudioBufferSourceNode => {
    const sourceNode: MockAudioBufferSourceNode = {
      buffer: null,
      loop: false,
      onended: null,
      onEnded: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
    };
    this.createdSources.push(sourceNode);
    return sourceNode;
  });

  destination = { id: 'mock-destination' };

  constructor() {
    MockAudioContext.latestInstance = this;
  }

  static reset(): void {
    MockAudioContext.latestInstance = null;
    MockAudioContext.mockDecodeAudioData.mockReset();
    MockAudioContext.mockDecodeAudioData.mockImplementation(defaultDecodeImpl);
  }
}