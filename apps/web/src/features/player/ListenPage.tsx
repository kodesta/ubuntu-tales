import { Link, notFound } from '@tanstack/react-router';
import { ArrowLeft, Pause, Play, RotateCcw, RotateCw } from 'lucide-react';
import { useEffect } from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';

import { ApiError } from '@/lib/api';
import { formatShortDate } from '@/lib/format';
import { useIsAuthenticated } from '@/stores/session';
import { Button, Image, PageShell, Skeleton } from '@/ui';

import { usePlayerStore } from './player-store';
import { formatClock, nextRate, PLAYBACK_RATES } from './rendition';
import { useAudioProgressSync } from './useAudioProgressSync';
import { useStory } from '@/features/reader/queries';
import { useReadAlong } from './useReadAlong';
import styles from './ListenPage.module.css';

export function ListenPage({ slug }: { slug: string }) {
  const storyQuery = useStory(slug);
  const isAuthed = useIsAuthenticated();

  const playStory = usePlayerStore((state) => state.playStory);
  const toggle = usePlayerStore((state) => state.toggle);
  const skip = usePlayerStore((state) => state.skip);
  const seek = usePlayerStore((state) => state.seek);
  const rate = usePlayerStore((state) => state.rate);
  const setPrefs = usePlayerStore((state) => state.setPrefs);
  const soundscapeOn = usePlayerStore((state) => state.soundscapeOn);
  const setSoundscape = usePlayerStore((state) => state.setSoundscape);
  const soundscapeGain = usePlayerStore((state) => state.soundscapeGain);
  const setSoundscapeGain = usePlayerStore((state) => state.setSoundscapeGain);

  const isCurrent = usePlayerStore((state) => state.storySlug === slug);
  const playing = usePlayerStore((state) => (isCurrent ? state.playing : false));
  const positionMs = usePlayerStore((state) => (isCurrent ? state.positionMs : 0));
  const durationMs = usePlayerStore((state) => (isCurrent ? state.durationMs : 0));
  const { activeSentenceId } = useReadAlong(slug);

  const story = storyQuery.data;
  useAudioProgressSync(story?.id);

  // Start narration when the reader lands on the player.
  useEffect(() => {
    if (!story?.defaultNarration) return;
    if (usePlayerStore.getState().storySlug === slug) return;
    const narration = story.defaultNarration;
    void playStory({
      storySlug: story.slug,
      storyId: story.id,
      storyTitle: story.title,
      tribeName: story.tribe.name,
      coverUrl: story.cover?.url,
      narration,
      startMs: story.viewer?.progressPercent
        ? Math.round((story.viewer.progressPercent / 100) * narration.durationMs)
        : 0,
    });
  }, [playStory, slug, story]);

  // Desktop keyboard shortcuts (production plan 06 §10).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (event.code === 'Space') {
        event.preventDefault();
        void toggle();
      } else if (event.key === 'ArrowLeft') skip(-15_000);
      else if (event.key === 'ArrowRight') skip(15_000);
      else if (event.key === '+' || event.key === '=') setPrefs({ rate: nextRate(rate) });
      else if (event.key === '-') setPrefs({ rate: Math.max(0.75, rate - 0.25) });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [rate, setPrefs, skip, toggle]);

  if (storyQuery.isPending) return <ListenSkeleton />;
  if (storyQuery.isError) {
    if (storyQuery.error instanceof ApiError && storyQuery.error.status === 404) throw notFound();
    return (
      <PageShell>
        <p>This narration could not be loaded.</p>
        <Button onClick={() => void storyQuery.refetch()}>Try again</Button>
      </PageShell>
    );
  }

  if (!story) return <ListenSkeleton />;

  if (!story.defaultNarration) {
    return (
      <PageShell>
        <div className={styles.missing}>
          <p className={styles.eyebrow}>Listening</p>
          <h1 className={styles.missingTitle}>This tale has not been recorded yet.</h1>
          <p className={styles.missingBody}>
            Read it instead — the words are all there, waiting for a voice.
          </p>
          <Link to="/stories/$slug" params={{ slug }} className={styles.link}>
            <Button>Read the tale</Button>
          </Link>
        </div>
      </PageShell>
    );
  }

  const narration = story.defaultNarration;
  const totalMs = durationMs || narration.durationMs;
  const timings = narration.sentenceTimings ?? [];

  return (
    <PageShell variant="full">
      <div className={styles.page}>
        <header className={styles.topBar}>
          <Link to="/stories/$slug" params={{ slug }} className={styles.back}>
            <ArrowLeft size={18} aria-hidden="true" /> Read the tale
          </Link>
          <span className={styles.topMeta}>
            {story.tribe.name} · {formatShortDate(story.publishedAt)}
          </span>
        </header>

        <div className={styles.layout}>
          <div className={styles.artwork}>
            <Image image={story.cover} ratio="3/2" loading="eager" />
            <p className={styles.caption}>{story.cover.alt ?? `Artwork for ${story.title}`}</p>
          </div>

          <div className={styles.player}>
            <p className={styles.eyebrow}>Listen · narrated by {narration.narrator.name}</p>
            <h1 className={styles.title}>{story.title}</h1>
            <p className={styles.dek}>{story.summary}</p>

            <div className={styles.transport}>
              <button
                type="button"
                className={styles.play}
                aria-label={playing ? 'Pause narration' : 'Play narration'}
                onClick={() => void toggle()}
              >
                {playing ? <Pause size={26} aria-hidden="true" /> : <Play size={26} aria-hidden="true" />}
              </button>
              <button type="button" className={styles.skip} aria-label="Back 15 seconds" onClick={() => skip(-15_000)}>
                <RotateCcw size={20} aria-hidden="true" />
              </button>
              <button type="button" className={styles.skip} aria-label="Forward 15 seconds" onClick={() => skip(15_000)}>
                <RotateCw size={20} aria-hidden="true" />
              </button>
            </div>

            <div className={styles.seek}>
              <SliderPrimitive.Root
                className={styles.slider}
                value={[Math.min(positionMs, totalMs || 0)]}
                max={totalMs || 1}
                step={1000}
                onValueChange={(values: number[]) => seek(values[0] ?? 0)}
              >
                <SliderPrimitive.Track className={styles.sliderTrack}>
                  <SliderPrimitive.Range className={styles.sliderRange} />
                </SliderPrimitive.Track>
                <SliderPrimitive.Thumb
                  className={styles.sliderThumb}
                  aria-label="Seek narration"
                  aria-valuetext={`${formatClock(positionMs)} of ${formatClock(totalMs)}`}
                />
              </SliderPrimitive.Root>
              <div className={styles.times}>
                <span>{formatClock(positionMs)}</span>
                <span>−{formatClock(Math.max(0, totalMs - positionMs))}</span>
              </div>
            </div>

            <div className={styles.options}>
              <div className={styles.option}>
                <span className={styles.optionLabel}>Speed</span>
                <div className={styles.rateGroup} role="group" aria-label="Playback speed">
                  {PLAYBACK_RATES.map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={rate === value ? styles.rateActive : styles.rate}
                      aria-pressed={rate === value}
                      onClick={() => setPrefs({ rate: value })}
                    >
                      {value}×
                    </button>
                  ))}
                </div>
              </div>

              {narration.soundscape ? (
                <div className={styles.option}>
                  <label className={styles.toggle}>
                    <input
                      type="checkbox"
                      checked={soundscapeOn}
                      onChange={(event) => setSoundscape(event.target.checked)}
                    />
                    <span>{narration.soundscape.name}</span>
                  </label>
                  <input
                    className={styles.gain}
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={soundscapeGain}
                    aria-label="Ambience volume"
                    onChange={(event) => setSoundscapeGain(Number(event.target.value))}
                  />
                </div>
              ) : null}
            </div>

            {isAuthed ? null : (
              <p className={styles.guestNote}>Listening progress is kept on this device until you sign in.</p>
            )}
          </div>
        </div>

        {timings.length > 0 ? (
          <section className={styles.sentences} aria-labelledby="sentences-heading">
            <h2 id="sentences-heading" className={styles.sentencesTitle}>
              Follow along
            </h2>
            <ol className={styles.sentenceList}>
              {story.body.paragraphs.flatMap((paragraph) =>
                paragraph.sentences.map((sentence) => {
                  const timing = timings.find((entry) => entry.sentenceId === sentence.id);
                  const active = activeSentenceId === sentence.id;
                  return (
                    <li key={sentence.id}>
                      <button
                        type="button"
                        className={active ? styles.sentenceActive : styles.sentence}
                        aria-current={active ? 'true' : undefined}
                        onClick={() => {
                          if (timing) seek(timing.startMs);
                        }}
                      >
                        {sentence.text}
                      </button>
                    </li>
                  );
                }),
              )}
            </ol>
          </section>
        ) : null}
      </div>
    </PageShell>
  );
}

function ListenSkeleton() {
  return (
    <PageShell variant="full">
      <div className={styles.skeleton}>
        <Skeleton variant="hero" />
        <Skeleton lines={3} />
      </div>
    </PageShell>
  );
}
