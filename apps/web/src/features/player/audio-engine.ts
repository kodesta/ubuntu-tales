import type { AudioRendition, NarrationDetail, SentenceTiming } from '@ubuntu-tales/shared';

import { chooseRendition } from './rendition';

export interface EngineTrack {
  storySlug: string;
  storyTitle: string;
  storyId: string;
  tribeName: string;
  coverUrl?: string;
  narration: NarrationDetail;
  /** Optional ambience loop for this narration. */
  soundscapeUrl?: string;
  soundscapeGain?: number;
  /** Where to resume (ms). */
  startMs?: number;
}

export interface EngineState {
  track: EngineTrack | null;
  playing: boolean;
  positionMs: number;
  durationMs: number;
  rate: number;
  soundscapeOn: boolean;
  soundscapeGain: number;
  error?: string;
}

type Listener = (state: EngineState) => void;

/**
 * One audio engine for the whole app (production plan 06 §5.1). Lives outside React so playback
 * survives route changes. Narration is an `HTMLAudioElement`; the ambience loop runs through a Web
 * Audio gain node because iOS Safari ignores `audio.volume`.
 */
export class AudioEngine {
  private narration: HTMLAudioElement | null = null;
  private ambience: HTMLAudioElement | null = null;
  private audioContext: AudioContext | null = null;
  private ambienceGain: GainNode | null = null;
  private listeners = new Set<Listener>();
  private state: EngineState = {
    track: null,
    playing: false,
    positionMs: 0,
    durationMs: 0,
    rate: 1,
    soundscapeOn: false,
    soundscapeGain: 0.25,
  };
  private sentinels: SentenceTiming[] = [];

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => this.listeners.delete(listener);
  }

  snapshot(): EngineState {
    return this.state;
  }

  private emit(patch: Partial<EngineState>): void {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener(this.state);
  }

  private ensureElements(): void {
    if (this.narration) return;
    const narration = new Audio();
    narration.preload = 'metadata';
    narration.crossOrigin = 'anonymous';
    narration.addEventListener('timeupdate', () => {
      this.emit({ positionMs: Math.round(narration.currentTime * 1000) });
    });
    narration.addEventListener('durationchange', () => {
      if (Number.isFinite(narration.duration)) {
        this.emit({ durationMs: Math.round(narration.duration * 1000) });
      }
    });
    narration.addEventListener('play', () => this.emit({ playing: true }));
    narration.addEventListener('pause', () => this.emit({ playing: false }));
    narration.addEventListener('ended', () => {
      this.emit({ playing: false, positionMs: this.state.durationMs });
      this.stopSoundscape();
    });
    narration.addEventListener('error', () => {
      this.emit({ error: 'This narration could not be played.', playing: false });
    });
    narration.addEventListener('stalled', () => {
      // Keep the UI calm: the browser retries automatically.
    });
    this.narration = narration;
  }

  private buildMediaSession(track: EngineTrack): void {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    const artwork = track.coverUrl
      ? [{ src: new URL(track.coverUrl, window.location.origin).toString(), sizes: '1200x800' }]
      : [];
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.storyTitle,
      artist: track.narration.narrator.name,
      album: track.tribeName,
      artwork,
    });
    const set = (action: MediaSessionAction, handler: MediaSessionActionHandler) => {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        // Unsupported actions are fine to ignore.
      }
    };
    set('play', () => void this.play());
    set('pause', () => this.pause());
    set('seekbackward', () => this.skip(-15_000));
    set('seekforward', () => this.skip(15_000));
    set('seekto', (details) => {
      if (typeof details.seekTime === 'number') {
        this.seek(details.seekTime * 1000);
      }
    });
  }

  async load(track: EngineTrack, rendition?: AudioRendition): Promise<void> {
    this.ensureElements();
    const chosen = rendition ?? chooseRendition(track.narration.audio);
    if (!chosen) {
      this.emit({ error: 'This tale has no playable narration yet.' });
      return;
    }

    const narration = this.narration as HTMLAudioElement;
    narration.src = new URL(chosen.url, window.location.origin).toString();
    narration.playbackRate = this.state.rate;
    this.sentinels = track.narration.sentenceTimings ?? [];

    const startMs = Math.max(0, track.startMs ?? 0);
    this.emit({
      track,
      playing: false,
      positionMs: startMs,
      durationMs: track.narration.durationMs,
      soundscapeGain: track.soundscapeGain ?? 0.25,
      error: undefined,
    });

    if (startMs > 0) {
      try {
        await new Promise<void>((resolve) => {
          const onMeta = () => {
            narration.removeEventListener('loadedmetadata', onMeta);
            resolve();
          };
          narration.addEventListener('loadedmetadata', onMeta);
          window.setTimeout(resolve, 3000);
        });
        narration.currentTime = startMs / 1000;
      } catch {
        // Seeking before metadata is best effort.
      }
    }

    this.buildMediaSession(track);
    if (track.soundscapeUrl) this.prepareSoundscape(track.soundscapeUrl);
  }

  private prepareSoundscape(url: string): void {
    if (typeof window === 'undefined') return;
    if (!this.ambience) {
      this.ambience = new Audio();
      this.ambience.loop = true;
      this.ambience.crossOrigin = 'anonymous';
      this.ambience.preload = 'auto';
    }
    this.ambience.src = new URL(url, window.location.origin).toString();
  }

  private ensureAudioContext(): void {
    if (this.audioContext || !this.ambience) return;
    const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Context) return;
    this.audioContext = new Context();
    const source = this.audioContext.createMediaElementSource(this.ambience);
    this.ambienceGain = this.audioContext.createGain();
    this.ambienceGain.gain.value = this.state.soundscapeOn ? this.state.soundscapeGain : 0;
    source.connect(this.ambienceGain).connect(this.audioContext.destination);
  }

  private startSoundscape(): void {
    if (!this.ambience || !this.state.soundscapeOn) return;
    this.ensureAudioContext();
    void this.audioContext?.resume();
    if (this.ambienceGain) this.ambienceGain.gain.value = this.state.soundscapeGain;
    this.ambience.volume = 1;
    void this.ambience.play().catch(() => undefined);
  }

  private stopSoundscape(): void {
    this.ambience?.pause();
  }

  async play(): Promise<void> {
    if (!this.narration?.src) return;
    try {
      await this.narration.play();
      this.startSoundscape();
    } catch {
      this.emit({ error: 'Playback was blocked by the browser. Tap play again.', playing: false });
    }
  }

  pause(): void {
    this.narration?.pause();
    this.stopSoundscape();
  }

  async toggle(): Promise<void> {
    if (this.state.playing) this.pause();
    else await this.play();
  }

  seek(ms: number): void {
    if (!this.narration) return;
    const clamped = Math.min(Math.max(0, ms), this.state.durationMs || ms);
    this.narration.currentTime = clamped / 1000;
    this.emit({ positionMs: Math.round(clamped) });
  }

  skip(deltaMs: number): void {
    this.seek(this.state.positionMs + deltaMs);
  }

  setRate(rate: number): void {
    if (this.narration) this.narration.playbackRate = rate;
    this.emit({ rate });
  }

  setSoundscape(on: boolean, gain = this.state.soundscapeGain): void {
    this.emit({ soundscapeOn: on, soundscapeGain: gain });
    if (on) {
      if (this.state.playing) this.startSoundscape();
    } else {
      this.stopSoundscape();
    }
    if (this.ambienceGain) this.ambienceGain.gain.value = on ? gain : 0;
  }

  setSoundscapeGain(gain: number): void {
    const clamped = Math.min(1, Math.max(0, gain));
    this.emit({ soundscapeGain: clamped });
    if (this.ambienceGain && this.state.soundscapeOn) this.ambienceGain.gain.value = clamped;
  }

  /** Sentence timings for read-along (empty when the narration is untimed). */
  timings(): SentenceTiming[] {
    return this.sentinels;
  }

  unload(): void {
    this.pause();
    if (this.narration) {
      this.narration.removeAttribute('src');
      this.narration.load();
    }
    this.ambience?.pause();
    this.sentinels = [];
    this.emit({
      track: null,
      playing: false,
      positionMs: 0,
      durationMs: 0,
      error: undefined,
      soundscapeOn: false,
    });
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      navigator.mediaSession.metadata = null;
    }
  }
}

export const audioEngine = new AudioEngine();
