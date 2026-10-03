import { Component, EventEmitter, Output, signal } from '@angular/core';

@Component({
  selector: 'app-read-mode',
  templateUrl: './read-mode.html',
  styleUrl: './read-mode.css',
})
export class ReadMode {
  @Output() back = new EventEmitter<void>();
  @Output() openFullPlayer = new EventEmitter<void>();
  @Output() storyFinished = new EventEmitter<void>();

  // State
  isPlaying = signal<boolean>(true);
  currentSentenceIndex = signal<number>(2); // 0-indexed active highlighted sentence
  fontSize = signal<'sm' | 'md' | 'lg'>('md');
  isBookmarked = signal<boolean>(false);

  // Story paragraphs with sentence segments for dynamic highlighting
  paragraphs = [
    {
      sentences: [
        { text: 'Long ago, when the world was young, the Great Creator fashioned the first trees.', id: 0 },
        { text: 'Each was given a unique gift.', id: 1 },
        { text: 'The palm received tall grace, the flame tree blazed with vibrant scarlet blossoms, and the fig offered sweet nourishment to all who wandered beneath its boughs.', id: 2 }
      ]
    },
    {
      sentences: [
        { text: 'Then came the Baobab.', id: 3 },
        { text: 'Unlike the others, it was not content with what it had been given.', id: 4 },
        { text: 'It gazed upon the palm and wept for slender elegance.', id: 5 },
        { text: 'It looked at the flame tree and complained of its own plain leaves.', id: 6 },
        { text: 'Day and night, the Baobab’s complaints echoed across the savanna winds.', id: 7 }
      ]
    },
    {
      sentences: [
        { text: 'Weary of the ceaseless discontent, the Great Creator reached down from the heavens, plucked the Baobab from the earth, and planted it upside down.', id: 8 },
        { text: 'Its branches now reached into the soil, and its roots stretched upward toward the open sky.', id: 9 },
        { text: 'In silence, the Baobab learned patience, holding deep water for all living creatures through the longest droughts.', id: 10 }
      ]
    }
  ];

  togglePlay() {
    this.isPlaying.update(v => !v);
  }

  toggleBookmark() {
    this.isBookmarked.update(v => !v);
  }

  selectSentence(id: number) {
    this.currentSentenceIndex.set(id);
  }

  cycleFontSize() {
    const current = this.fontSize();
    if (current === 'sm') this.fontSize.set('md');
    else if (current === 'md') this.fontSize.set('lg');
    else this.fontSize.set('sm');
  }

  onBack() {
    this.back.emit();
  }

  onExpandPlayer() {
    this.openFullPlayer.emit();
  }

  onFinishStory() {
    this.storyFinished.emit();
  }
}
