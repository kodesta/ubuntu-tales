import { Component, EventEmitter, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

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
  selector: 'app-library',
  imports: [CommonModule],
  templateUrl: './library.html',
  styleUrl: './library.css',
})
export class Library {
  @Output() openStory = new EventEmitter<void>();
  @Output() resumeStory = new EventEmitter<void>();

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
