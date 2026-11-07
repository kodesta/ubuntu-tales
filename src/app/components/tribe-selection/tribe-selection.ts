import { Component, EventEmitter, Output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

export interface Tribe {
  id: string;
  name: string;
  region: string;
  country: string;
  storyCount: number;
  image: string;
  blobClass: string;
}

@Component({
  selector: 'app-tribe-selection',
  imports: [CommonModule],
  templateUrl: './tribe-selection.html',
  styleUrl: './tribe-selection.css',
})
export class TribeSelection {
  readonly auth = inject(AuthService);

  @Output() tribeSelected = new EventEmitter<Tribe>();
  @Output() journeyOnwards = new EventEmitter<void>();
  @Output() openMenu = new EventEmitter<void>();
  @Output() openProfile = new EventEmitter<void>();

  searchQuery = signal<string>('');
  selectedTribeId = signal<string>('tribes');
  showLowStoryPopup = signal<boolean>(false);
  pendingLowStoryTribe = signal<Tribe | null>(null);

  tribes: Tribe[] = [
    {
      id: 'zulu',
      name: 'ZULU',
      region: 'Southern Africa',
      country: 'South Africa',
      storyCount: 18,
      image: 'assets/images/mask_zulu.jpg',
      blobClass: 'blob-zulu'
    },
    {
      id: 'yoruba',
      name: 'YORUBA',
      region: 'West Africa',
      country: 'Nigeria',
      storyCount: 24,
      image: 'assets/images/mask_yoruba.jpg',
      blobClass: 'blob-yoruba'
    },
    {
      id: 'maasai',
      name: 'MAASAI',
      region: 'East Africa',
      country: 'Kenya & Tanzania',
      storyCount: 3, // demonstrates the low-story threshold (< 5)
      image: 'assets/images/tribe_portrait_1.jpg',
      blobClass: 'blob-maasai'
    },
    {
      id: 'ashanti',
      name: 'ASHANTI',
      region: 'West Africa',
      country: 'Ghana',
      storyCount: 20,
      image: 'assets/images/mask_ashanti.jpg',
      blobClass: 'blob-ashanti'
    },
    {
      id: 'san',
      name: 'SAN / KHOIKHOI',
      region: 'Southern Africa',
      country: 'Botswana & Namibia',
      storyCount: 16,
      image: 'assets/images/mask_san.jpg',
      blobClass: 'blob-san'
    },
    {
      id: 'kuba',
      name: 'KUBA',
      region: 'Central Africa',
      country: 'DR Congo',
      storyCount: 14,
      image: 'assets/images/mask_kuba.jpg',
      blobClass: 'blob-kuba'
    },
    {
      id: 'tonga',
      name: 'TONGA',
      region: 'Southern Africa',
      country: 'Zambia & Zimbabwe',
      storyCount: 12,
      image: 'assets/images/mask_tonga.jpg',
      blobClass: 'blob-tonga'
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
