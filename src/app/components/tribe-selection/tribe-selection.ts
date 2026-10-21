import { Component, EventEmitter, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface Tribe {
  id: string;
  name: string;
  region: string;
  country: string;
  storyCount: number;
  image: string;
}

@Component({
  selector: 'app-tribe-selection',
  imports: [CommonModule],
  templateUrl: './tribe-selection.html',
  styleUrl: './tribe-selection.css',
})
export class TribeSelection {
  @Output() tribeSelected = new EventEmitter<Tribe>();
  @Output() journeyOnwards = new EventEmitter<void>();

  searchQuery = signal<string>('');
  selectedTribeId = signal<string>('zulu');
  showLowStoryPopup = signal<boolean>(false);
  pendingLowStoryTribe = signal<Tribe | null>(null);

  tribes: Tribe[] = [
    {
      id: 'zulu',
      name: 'Zulu',
      region: 'Southern Africa',
      country: 'South Africa',
      storyCount: 18,
      image: 'assets/images/mask_zulu.jpg'
    },
    {
      id: 'yoruba',
      name: 'Yoruba',
      region: 'West Africa',
      country: 'Nigeria',
      storyCount: 24,
      image: 'assets/images/mask_yoruba.jpg'
    },
    {
      id: 'dogon',
      name: 'Dogon',
      region: 'West Africa',
      country: 'Mali',
      storyCount: 3, // demonstrates the low-story threshold (< 5)
      image: 'assets/images/mask_dogon.jpg'
    },
    {
      id: 'ashanti',
      name: 'Ashanti',
      region: 'West Africa',
      country: 'Ghana',
      storyCount: 20,
      image: 'assets/images/mask_ashanti.jpg'
    }
  ];

  filteredTribes() {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.tribes;
    return this.tribes.filter(t => 
      t.name.toLowerCase().includes(q) || 
      t.region.toLowerCase().includes(q) || 
      t.country.toLowerCase().includes(q)
    );
  }

  selectTribe(tribe: Tribe) {
    if (tribe.storyCount < 5) {
      this.pendingLowStoryTribe.set(tribe);
      this.showLowStoryPopup.set(true);
      return;
    }
    this.applyTribeSelection(tribe);
  }

  applyTribeSelection(tribe: Tribe) {
    this.selectedTribeId.set(tribe.id);
    this.tribeSelected.emit(tribe);
    this.showLowStoryPopup.set(false);
  }

  proceedWithLowStoryTribe() {
    const tribe = this.pendingLowStoryTribe();
    if (tribe) {
      this.applyTribeSelection(tribe);
    }
  }

  exploreAllTribes() {
    this.showLowStoryPopup.set(false);
    this.journeyOnwards.emit();
  }

  onSearch(event: Event) {
    const target = event.target as HTMLInputElement;
    this.searchQuery.set(target.value);
  }

  onJourneyOnwards() {
    this.journeyOnwards.emit();
  }
}
