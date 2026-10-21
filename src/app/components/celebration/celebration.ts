import { Component, EventEmitter, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface EmotionReaction {
  id: string;
  label: string;
  meaning: string;
  iconType: string;
}

export interface RecommendedStory {
  id: string;
  title: string;
  region: string;
  snippet: string;
  image: string;
}

@Component({
  selector: 'app-celebration',
  imports: [CommonModule],
  templateUrl: './celebration.html',
  styleUrl: './celebration.css',
})
export class Celebration {
  @Output() returnHome = new EventEmitter<void>();
  @Output() openRecommended = new EventEmitter<RecommendedStory>();

  selectedReactionId = signal<string | null>('joy');
  showSavedToast = signal<boolean>(false);
  showShareModal = signal<boolean>(false);

  reactions: EmotionReaction[] = [
    { id: 'joy', label: 'Joy', meaning: 'Celebration & laughter', iconType: 'sun' },
    { id: 'great', label: 'Great', meaning: 'Pride & cultural roots', iconType: 'crest' },
    { id: 'good', label: 'Good', meaning: 'Inner strength & power', iconType: 'shield' },
    { id: 'thinking', label: 'Thinking', meaning: 'Wisdom & reflection', iconType: 'mind' },
    { id: 'happy', label: 'Happy', meaning: 'Love, warmth & community', iconType: 'heart' }
  ];

  recommendations: RecommendedStory[] = [
    {
      id: 'spider-weaver',
      title: 'The Spider Weaver',
      region: 'WEST AFRICA',
      snippet: 'Long ago in an Ashanti village, two friends watched a spider spin its delicate web. What they observed would inspire the royal Kente cloth forever.',
      image: 'assets/images/ananse_spider.jpg'
    },
    {
      id: 'animals-dam',
      title: "The Animals' Dam",
      region: 'EAST AFRICA',
      snippet: 'During a severe drought, the creatures of the savanna gathered in harmony to dig a deep pool, while the trickster hare plotted in the shadows.',
      image: 'assets/images/baobab_hero.jpg'
    }
  ];

  selectReaction(reaction: EmotionReaction) {
    this.selectedReactionId.set(reaction.id);
    this.showSavedToast.set(true);
    setTimeout(() => {
      this.showSavedToast.set(false);
    }, 2800);
  }

  onReturnHome() {
    this.returnHome.emit();
  }

  onSelectRecommended(story: RecommendedStory) {
    this.openRecommended.emit(story);
  }

  toggleShareModal(show: boolean) {
    this.showShareModal.set(show);
  }
}
