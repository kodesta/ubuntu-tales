import { Link } from '@tanstack/react-router';
import { ArrowRight, Bookmark, Menu, Search, Share2, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import {
  sampleStories,
  sampleStory,
  sampleStoryThree,
  sampleStoryTwo,
  sampleTribe,
  sampleTribeTwo,
  sampleWisdomNotes,
} from '@/test/fixtures';
import { useToastStore } from '@/stores/toast';
import {
  ArchiveList,
  Avatar,
  Badge,
  BottomSheet,
  Button,
  CategoryBadge,
  Dialog,
  Drawer,
  EmptyState,
  FilterPills,
  FollowButton,
  IconButton,
  Image,
  Meta,
  Ornament,
  PageShell,
  ProgressBar,
  PublicationCard,
  PublicationMark,
  ReactionRow,
  ReadingProgress,
  Rule,
  SaveButton,
  SearchField,
  SectionHeader,
  Skeleton,
  StoryCard,
  Tabs,
  TaleRow,
} from '@/ui';

import styles from './UiGallery.module.css';

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <section className={styles.section}>
      <header className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        {note ? <p className={styles.sectionNote}>{note}</p> : null}
      </header>
      <div className={styles.sectionBody}>{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.row}>
      <span className={styles.rowLabel}>{label}</span>
      <div className={styles.rowBody}>{children}</div>
    </div>
  );
}

/** DEV-only design-system gallery. Route guards on `import.meta.env.DEV`. */
export function UiGallery() {
  const [search, setSearch] = useState('');
  const [region, setRegion] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tab, setTab] = useState('stories');
  const showToast = useToastStore((state) => state.show);

  return (
    <PageShell variant="publication">
      <div className={styles.page}>
        <header className={styles.intro}>
          <p className={styles.eyebrow}>Internal · design system</p>
          <h1 className={styles.title}>The gallery.</h1>
          <p className={styles.introText}>
            Every component and variant in the Ubuntu Tales system. Dev only — this page is not
            shipped in production builds.
          </p>
        </header>

        <ReadingProgress value={42} />

        <Section title="Typography & meta" note="Lora for editorial voice, DM Sans for UI.">
          <p className="t-display">Stories your grandmother knew.</p>
          <p className="t-h1">Your reading list.</p>
          <p className="t-h2">From your publications</p>
          <p className="t-h3">Wisdom notes</p>
          <p className="t-dek">
            Read folktales from across Africa — one tribe, one telling at a time.
          </p>
          <p className="t-body measure">
            Long ago, when the rivers were young, a herder walked to the oldest tree on the plain
            and made a promise he could not keep alone.
          </p>
          <p className="eyebrow">Eyebrow · oral tradition, kept alive</p>
          <Meta>
            <span>Zulu</span>
            <span>14 Nov 2026</span>
            <span>6 min read</span>
          </Meta>
          <Meta size="eyebrow">
            <span>The publications</span>
            <span>Southern Africa</span>
          </Meta>
          <Rule />
          <Ornament />
        </Section>

        <Section title="Buttons" note="44px minimum height; one primary action per screen.">
          <Row label="Variants">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="quiet">Quiet link</Button>
            <Button variant="pill">Pill</Button>
          </Row>
          <Row label="Sizes">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </Row>
          <Row label="With icon">
            <Button iconRight={<ArrowRight size={16} />}>Read the tale</Button>
            <Button variant="secondary" iconLeft={<Search size={16} />}>
              Search
            </Button>
            <Button disabled>Disabled</Button>
          </Row>
          <Row label="Full width">
            <div className={styles.fullWidthDemo}>
              <Button fullWidth>Begin reading</Button>
            </div>
          </Row>
          <Row label="As link">
            <Link to="/tribes" className={styles.demoLink}>
              A Link wearing the button skin
            </Link>
          </Row>
        </Section>

        <Section title="Icon buttons" note="Always labelled for screen readers.">
          <Row label="Variants">
            <IconButton label="Menu">
              <Menu size={20} />
            </IconButton>
            <IconButton label="Search" variant="paper">
              <Search size={20} />
            </IconButton>
            <IconButton label="Share" variant="solid">
              <Share2 size={20} />
            </IconButton>
            <IconButton label="Close" size="sm">
              <X size={18} />
            </IconButton>
            <IconButton label="Saved" aria-pressed="true">
              <Bookmark size={20} />
            </IconButton>
          </Row>
        </Section>

        <Section title="Badges" note="Category badges are uppercase micro type.">
          <Row label="Badges">
            <CategoryBadge category={sampleStory.category} />
            <Badge variant="neutral">Neutral</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="accent" accentColor={sampleTribe.accentColor}>
              Accent
            </Badge>
          </Row>
        </Section>

        <Section title="Publication marks & avatars" note="Monogram fallbacks in the accent colour.">
          <Row label="Marks">
            <PublicationMark name="Zulu" accentColor={sampleTribe.accentColor} size="sm" />
            <PublicationMark
              name="Zulu"
              accentColor={sampleTribe.accentColor}
              image={sampleTribe.image}
              size="md"
            />
            <PublicationMark name="Yoruba" accentColor={sampleTribeTwo.accentColor} size="lg" />
            <PublicationMark name="Zulu" accentColor={sampleTribe.accentColor} size="xl" />
            <PublicationMark
              name="Zulu"
              accentColor={sampleTribe.accentColor}
              size="md"
              shape="circle"
            />
          </Row>
          <Row label="Avatars">
            <Avatar name="Thandiwe Nkosi" accentColor={sampleTribe.accentColor} size="sm" />
            <Avatar name="Thandiwe Nkosi" accentColor={sampleTribe.accentColor} size="md" />
            <Avatar name="Thandiwe Nkosi" accentColor={sampleTribe.accentColor} size="lg" />
          </Row>
        </Section>

        <Section title="Image" note="Fixed aspect ratios — no layout shift, paper fallback.">
          <div className={styles.imageGrid}>
            <Image image={sampleStory.cover} ratio="3/2" />
            <Image image={sampleStory.cover} ratio="16/10" />
            <Image image={sampleStory.cover} ratio="4/3" />
            <Image image={sampleStory.cover} ratio="1/1" />
          </div>
        </Section>

        <Section title="Story cards" note="hero · list · row · mini">
          <StoryCard story={sampleStory} variant="hero" />
          <div className={styles.cardGrid}>
            {sampleStories.map((story) => (
              <StoryCard key={story.id} story={story} variant="list" />
            ))}
          </div>
          <div className={styles.stack}>
            {sampleStories.slice(0, 2).map((story) => (
              <StoryCard key={story.id} story={story} variant="row" />
            ))}
          </div>
          <div className={styles.miniGrid}>
            {sampleStories.map((story) => (
              <StoryCard key={story.id} story={story} variant="mini" />
            ))}
          </div>
        </Section>

        <Section title="Publication cards" note="default grid · rail">
          <div className={styles.pubGrid}>
            <PublicationCard tribe={sampleTribe} />
            <PublicationCard tribe={sampleTribeTwo} />
            <PublicationCard tribe={sampleTribe} selected onSelect={() => undefined} />
          </div>
          <div className={styles.railDemo}>
            <PublicationCard tribe={sampleTribe} variant="rail" />
            <PublicationCard tribe={sampleTribeTwo} variant="rail" />
          </div>
        </Section>

        <Section title="Tale rows & archive list" note="The library / publication archive grammar.">
          <div className={styles.stack}>
            <TaleRow story={sampleStory} />
            <TaleRow story={sampleStoryTwo} progressPercent={38} />
            <TaleRow
              story={sampleStoryThree}
              progressPercent={72}
              action={<span>Continue reading →</span>}
            />
          </div>
          <ArchiveList stories={sampleStories} />
        </Section>

        <Section title="Section header, filter pills, search" note="Controls used across the feed.">
          <SectionHeader
            title="From your publications"
            eyebrow="Your reading list"
            action={<Link to="/library">View all →</Link>}
          />
          <FilterPills
            label="Filter by region"
            value={region}
            onChange={setRegion}
            options={[
              { value: '', label: 'All regions' },
              { value: 'SOUTHERN_AFRICA', label: 'Southern Africa' },
              { value: 'WEST_AFRICA', label: 'West Africa' },
              { value: 'EAST_AFRICA', label: 'East Africa' },
            ]}
          />
          <SearchField value={search} onChange={setSearch} onSubmit={() => undefined} />
        </Section>

        <Section title="Tabs (Radix)" note="Bound to URL state in real screens.">
          <Tabs.Root value={tab} onValueChange={setTab}>
            <Tabs.List aria-label="Library tabs">
              <Tabs.Trigger value="stories">All tales</Tabs.Trigger>
              <Tabs.Trigger value="audio">Audio</Tabs.Trigger>
              <Tabs.Trigger value="authors">Voices</Tabs.Trigger>
            </Tabs.List>
            <Tabs.Content value="stories">
              <p className={styles.sectionNote}>Every tale in the archive.</p>
            </Tabs.Content>
            <Tabs.Content value="audio">
              <p className={styles.sectionNote}>Narrations are being recorded.</p>
            </Tabs.Content>
            <Tabs.Content value="authors">
              <p className={styles.sectionNote}>The griots behind the voices.</p>
            </Tabs.Content>
          </Tabs.Root>
        </Section>

        <Section title="Overlays" note="Radix Dialog: focus trap, Escape, scroll lock.">
          <Row label="Triggers">
            <Button variant="secondary" onClick={() => setDialogOpen(true)}>
              Open dialog
            </Button>
            <Button variant="secondary" onClick={() => setSheetOpen(true)}>
              Open bottom sheet
            </Button>
            <Button variant="secondary" onClick={() => setDrawerOpen(true)}>
              Open drawer
            </Button>
          </Row>
          <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
            <Dialog.Content
              title="A tale is waiting."
              description="Dialogs are for decisions: choosing a publication, confirming a path, or reading a note."
            >
              <div className={styles.dialogActions}>
                <Button onClick={() => setDialogOpen(false)}>Choose anyway</Button>
                <Button variant="secondary" onClick={() => setDialogOpen(false)}>
                  Explore others
                </Button>
              </div>
            </Dialog.Content>
          </Dialog.Root>
          <BottomSheet
            open={sheetOpen}
            onOpenChange={setSheetOpen}
            title="Share this tale"
            description="Sheets hold secondary actions on small screens."
            actions={
              <>
                <Button onClick={() => setSheetOpen(false)}>Copy link</Button>
                <Button variant="secondary" onClick={() => setSheetOpen(false)}>
                  Cancel
                </Button>
              </>
            }
          >
            <p className={styles.sectionNote}>Nothing is sent automatically.</p>
          </BottomSheet>
          <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} title="Gallery drawer">
            <p className={styles.sectionNote}>The navigation drawer lives here.</p>
          </Drawer>
        </Section>

        <Section title="Toasts" note="Confirmation only; never for errors that need a decision.">
          <Row label="Triggers">
            <Button onClick={() => showToast('Saved on this device — accounts are coming soon.')}>
              Default toast
            </Button>
            <Button
              variant="secondary"
              onClick={() => showToast('Link copied to your clipboard.', { variant: 'success' })}
            >
              Success toast
            </Button>
            <Button
              variant="secondary"
              onClick={() => showToast('This is a note from the archive.', { variant: 'info' })}
            >
              Info toast
            </Button>
          </Row>
        </Section>

        <Section title="Progress, skeleton, empty" note="Loading and quiet states.">
          <Row label="Progress">
            <div className={styles.progressDemo}>
              <ProgressBar value={24} label="Reading progress demo" />
              <ProgressBar
                value={68}
                accentColor={sampleTribe.accentColor}
                label="Reading progress demo"
              />
            </div>
          </Row>
          <Row label="Skeletons">
            <div className={styles.skeletonGrid}>
              <Skeleton variant="text" lines={3} />
              <Skeleton variant="title" />
              <Skeleton variant="row" />
              <Skeleton variant="card" />
              <Skeleton variant="mark" />
            </div>
          </Row>
          <EmptyState
            eyebrow="Empty state"
            title="Nothing saved yet."
            body="Lora line, quiet body and one action. Illustration-less on purpose."
            action={<Button variant="secondary">Browse the library</Button>}
          />
          <EmptyState
            variant="error"
            eyebrow="Error state"
            title="Something interrupted the telling."
            body="Retry once, then let it rest."
            action={<Button>Try again</Button>}
          />
        </Section>

        <Section title="Local actions" note="Saves, follows and reactions persist on this device.">
          <Row label="Save / follow">
            <SaveButton story={sampleStory} />
            <FollowButton tribe={sampleTribe} />
            <FollowButton tribe={sampleTribeTwo} />
            <FollowButton
              tribe={sampleTribe}
              labels={{ idle: 'Subscribe', active: 'Subscribed ✓' }}
            />
          </Row>
          <Row label="Reactions">
            <ReactionRow storySlug={sampleStory.slug} />
          </Row>
          <Row label="Wisdom note">
            <blockquote className={styles.quote}>
              “{sampleWisdomNotes[0]?.quote}”
              <footer className={styles.quoteSource}>
                {sampleWisdomNotes[0]?.storyTitle} · {sampleWisdomNotes[0]?.tribeName}
              </footer>
            </blockquote>
          </Row>
        </Section>
      </div>
    </PageShell>
  );
}
