import type { NarrationDetail } from '@ubuntu-tales/shared';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { audioEngine } from './audio-engine';
import { nextRate, type PlaybackRate } from './rendition';

interface PlayerPrefs {
  rate: number;
  soundscapeDefault: boolean;
  saveData: boolean;
  setPrefs: (patch: Partial<Omit<PlayerPrefs, 'setPrefs'>>) => void;
  cycleRate: () => PlaybackRate;
  toggleSoundscape: () => void;
}

interface PlayerPlayback {
  storySlug: string | null;
  storyTitle: string | null;
  tribeName: string | null;
  coverUrl: string | null;
  narration: NarrationDetail | null;
  playing: boolean;
  positionMs: number;
  durationMs: number;
  soundscapeOn: boolean;
  soundscapeGain: number;
  error?: string;
  /** Song title/metadata for the mini player while audio is loading. */
  loading: boolean;
  playStory: (input: {
    storySlug: string;
    storyTitle: string;
    storyId: string;
    tribeName: string;
    coverUrl?: string;
    narration: NarrationDetail;
    startMs?: number;
  }) => Promise<void>;
  toggle: () => Promise<void>;
  play: () => Promise<void>;
  pause: () => void;
  seek: (ms: number) => void;
  skip: (deltaMs: number) => void;
  stop: () => void;
  setSoundscape: (on: boolean) => void;
  setSoundscapeGain: (gain: number) => void;
}

export type PlayerState = PlayerPrefs & PlayerPlayback;

/**
 * Player state (production plan 06 §4). Playback mirrors the engine; preferences persist to
 * `ut.player` (non-sensitive). The engine is the source of truth for position/playing.
 */
export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      rate: 1,
      soundscapeDefault: false,
      saveData: false,
      setPrefs: (patch) => {
        set(patch);
        if (patch.rate !== undefined) audioEngine.setRate(patch.rate);
      },
      cycleRate: () => {
        const rate = nextRate(get().rate);
        set({ rate });
        audioEngine.setRate(rate);
        return rate;
      },
      toggleSoundscape: () => set({ soundscapeDefault: !get().soundscapeDefault }),

      storySlug: null,
      storyTitle: null,
      tribeName: null,
      coverUrl: null,
      narration: null,
      playing: false,
      positionMs: 0,
      durationMs: 0,
      soundscapeOn: false,
      soundscapeGain: 0.25,
      loading: false,

      playStory: async (input) => {
        set({
          loading: true,
          storySlug: input.storySlug,
          storyTitle: input.storyTitle,
          tribeName: input.tribeName,
          coverUrl: input.coverUrl ?? null,
          narration: input.narration,
        });
        await audioEngine.load(
          {
            storySlug: input.storySlug,
            storyId: input.storyId,
            storyTitle: input.storyTitle,
            tribeName: input.tribeName,
            coverUrl: input.coverUrl,
            narration: input.narration,
            startMs: input.startMs,
            soundscapeUrl: input.narration.soundscape?.url,
            soundscapeGain: input.narration.soundscape?.defaultGain,
          },
        );
        audioEngine.setRate(get().rate);
        if (get().soundscapeDefault) audioEngine.setSoundscape(true);
        set({ loading: false });
        await audioEngine.play();
      },

      toggle: async () => {
        await audioEngine.toggle();
      },
      play: async () => {
        await audioEngine.play();
      },
      pause: () => audioEngine.pause(),
      seek: (ms) => audioEngine.seek(ms),
      skip: (deltaMs) => audioEngine.skip(deltaMs),
      stop: () => audioEngine.unload(),
      setSoundscape: (on) => audioEngine.setSoundscape(on),
      setSoundscapeGain: (gain) => audioEngine.setSoundscapeGain(gain),
    }),
    {
      name: 'ut.player',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        rate: state.rate,
        soundscapeDefault: state.soundscapeDefault,
        saveData: state.saveData,
      }),
    },
  ),
);

// Mirror engine events into the store once (module side effect, browser only).
if (typeof window !== 'undefined') {
  audioEngine.subscribe((engineState) => {
    usePlayerStore.setState({
      playing: engineState.playing,
      positionMs: engineState.positionMs,
      durationMs: engineState.durationMs || usePlayerStore.getState().durationMs,
      soundscapeOn: engineState.soundscapeOn,
      soundscapeGain: engineState.soundscapeGain,
      ...(engineState.error ? { error: engineState.error } : {}),
    });
  });
}
