import { Component, EventEmitter, Output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

export interface SavedStoryItem {
  id: string;
  title: string;
  tag: string;
  subtitle: string;
  narrator: string;
  narratorAvatar: string;
  image: string;
  reflectionTag?: string;
  isOffline: boolean;
  progressPercent: number;
}

@Component({
  selector: 'app-saved',
  imports: [CommonModule],
  templateUrl: './saved.html',
  styleUrl: './saved.css',
})
export class Saved {
  readonly auth = inject(AuthService);

  @Output() openStory = new EventEmitter<void>();
  @Output() resumeStory = new EventEmitter<void>();
  @Output() openMenu = new EventEmitter<void>();
  @Output() openProfile = new EventEmitter<void>();

  activeFilter = signal<'all' | 'progress' | 'offline'>('all');

  savedStories: SavedStoryItem[] = [
    {
      id: 'baobab-breath',
      title: 'The Breath Of The Baobab',
      tag: 'FOLKLORE · ZULU',
      subtitle: 'In all myths, a celebratory notion of the life and wisdom... An heirloom of folklore in grand tales.',
      narrator: 'Kofi Mensah',
      narratorAvatar: 'assets/images/tribe_portrait_1.jpg',
      image: 'assets/images/baobab_hero.jpg',
      reflectionTag: 'Joy',
      isOffline: true,
      progressPercent: 100
    },
    {
      id: 'songweavers',
      title: 'The Songweavers of Tsodilo',
      tag: 'NIGHT TALES · KALAHARI',
      subtitle: 'In all myths, a celebratory notion of the life and wisdom... An heirloom of folklore in grand tales.',
      narrator: 'Amina Diallo',
      narratorAvatar: 'assets/images/tribe_portrait_2.jpg',
      image: 'assets/images/onboarding_warrior.jpg',
      reflectionTag: 'Thinking',
      isOffline: true,
      progressPercent: 52
    }
  ];

  setFilter(filter: 'all' | 'progress' | 'offline') {
    this.activeFilter.set(filter);
  }

  onStoryClick() {
    this.openStory.emit();
  }

  onResumeClick() {
    this.resumeStory.emit();
  }
}
