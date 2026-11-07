import { Component, EventEmitter, Output, signal, computed, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

export interface StoryItem {
  id: string;
  title: string;
  category: 'Animal' | 'Trickster' | 'Wisdom' | 'Folklore';
  categoryBadge: string;
  tribe: string;
  region: string;
  readTime: string;
  listenTime: string;
  image: string;
  moral: string;
}

@Component({
  selector: 'app-home',
  imports: [CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  readonly auth = inject(AuthService);

  @Output() openStory = new EventEmitter<StoryItem | void>();
  @Output() openTribes = new EventEmitter<void>();
  @Output() playAudio = new EventEmitter<StoryItem | void>();
  @Output() openMenu = new EventEmitter<void>();
  @Output() openProfile = new EventEmitter<void>();

  @ViewChild('searchInput') searchInputElement?: ElementRef<HTMLInputElement>;

  isSearchOpen = signal<boolean>(false);
  searchQuery = signal<string>('');
  selectedCategory = signal<string>('All');

  categories = ['All', 'Animal', 'Trickster', 'Wisdom', 'Folklore'];

  stories: StoryItem[] = [
    {
      id: 'turtle-hare',
      title: 'The Turtle and the Hare',
      category: 'Animal',
      categoryBadge: 'ANIMAL TALE',
      tribe: 'Yoruba',
      region: 'WEST AFRICA',
      readTime: '5 min Read',
      listenTime: '5 min Listen',
      image: 'assets/images/turtle_hare.jpg',
      moral: 'Patience and steadfast humility overcome boastful haste.'
    },
    {
      id: 'lion-mouse',
      title: 'The Lion and the Humble Mouse',
      category: 'Animal',
      categoryBadge: 'ANIMAL TALE',
      tribe: 'Swahili',
      region: 'EAST AFRICA',
      readTime: '5 min Read',
      listenTime: '4 min Listen',
      image: 'assets/images/lion_cave.jpg',
      moral: 'No act of kindness is ever wasted; the small can aid the mighty.'
    },
    {
      id: 'tortoise-shell',
      title: 'How the Tortoise Got Its Cracked Shell',
      category: 'Wisdom',
      categoryBadge: 'WISDOM TALE',
      tribe: 'Igbo',
      region: 'IGBO, NIGERIA',
      readTime: '5 min Read',
      listenTime: '6 min Listen',
      image: 'assets/images/baobab_hero.jpg',
      moral: 'Greed and dishonesty crumble any illusion of triumph.'
    },
    {
      id: 'ananse-wisdom',
      title: 'Ananse and the Pot of Wisdom',
      category: 'Trickster',
      categoryBadge: 'TRICKSTER TALE',
      tribe: 'Ashanti',
      region: 'ASHANTI, GHANA',
      readTime: '5 min Read',
      listenTime: '7 min Listen',
      image: 'assets/images/ananse_spider.jpg',
      moral: 'Wisdom is like water in a river; it belongs to everyone and cannot be hoarded.'
    },
    {
      id: 'wisdom-baobab',
      title: 'The Wisdom of the Baobab Tree',
      category: 'Wisdom',
      categoryBadge: 'SACRED WISDOM',
      tribe: 'Shona',
      region: 'SOUTHERN AFRICA',
      readTime: '4 min Read',
      listenTime: '5 min Listen',
      image: 'assets/images/baobab_hero.jpg',
      moral: 'Deep roots withstand the fiercest winds; shelter all under your branches.'
    },
    {
      id: 'elephant-pride',
      title: "The Elephant's Pride",
      category: 'Folklore',
      categoryBadge: 'ZULU FOLKLORE',
      tribe: 'Zulu',
      region: 'SOUTHERN AFRICA',
      readTime: '6 min Read',
      listenTime: '6 min Listen',
      image: 'assets/images/tribe_portrait_1.jpg',
      moral: 'Great strength without gentleness leads to painful isolation.'
    },
    {
      id: 'creation-nommo',
      title: 'Creation and The First Nommo',
      category: 'Folklore',
      categoryBadge: 'DOGON FOLKLORE',
      tribe: 'Dogon',
      region: 'MALI, WEST AFRICA',
      readTime: '7 min Read',
      listenTime: '8 min Listen',
      image: 'assets/images/tribe_portrait_2.jpg',
      moral: 'Living in harmony with sacred water and cosmic rhythm sustains community.'
    },
    {
      id: 'sundiata-lion',
      title: 'The Legend of Sundiata Keita',
      category: 'Wisdom',
      categoryBadge: 'HEROIC TALE',
      tribe: 'Mandinka',
      region: 'MALI EMPIRE',
      readTime: '8 min Read',
      listenTime: '9 min Listen',
      image: 'assets/images/onboarding_warrior.jpg',
      moral: 'Destiny cannot be delayed when patience and honor guide the warrior.'
    },
    {
      id: 'san-mantis',
      title: 'The Mantis and the Moon',
      category: 'Wisdom',
      categoryBadge: 'SAN FOLKLORE',
      tribe: 'San / Khoikhoi',
      region: 'KALAHARI DESERT',
      readTime: '5 min Read',
      listenTime: '6 min Listen',
      image: 'assets/images/mask_san.jpg',
      moral: 'Light shines for all who journey through the vast starry night.'
    },
    {
      id: 'kuba-woot',
      title: 'Woot and the Sacred Patterns',
      category: 'Folklore',
      categoryBadge: 'KUBA FOLKLORE',
      tribe: 'Kuba',
      region: 'DR CONGO',
      readTime: '6 min Read',
      listenTime: '7 min Listen',
      image: 'assets/images/mask_kuba.jpg',
      moral: 'Beauty, geometry, and dignity reflect the enduring harmony of ancestors.'
    },
    {
      id: 'tonga-nyaminyami',
      title: 'Nyaminyami the River Spirit',
      category: 'Wisdom',
      categoryBadge: 'TONGA FOLKLORE',
      tribe: 'Tonga',
      region: 'ZAMBEZI VALLEY',
      readTime: '5 min Read',
      listenTime: '6 min Listen',
      image: 'assets/images/mask_tonga.jpg',
      moral: 'Respect the flow of ancient waters and nature will shelter the community.'
    }
  ];

  filteredStories = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const cat = this.selectedCategory().toLowerCase();

    return this.stories.filter(story => {
      const matchCat = cat === 'all' || story.category.toLowerCase() === cat;
      if (!q) return matchCat;

      const matchQuery =
        story.title.toLowerCase().includes(q) ||
        story.tribe.toLowerCase().includes(q) ||
        story.region.toLowerCase().includes(q) ||
        story.category.toLowerCase().includes(q) ||
        story.categoryBadge.toLowerCase().includes(q) ||
        story.moral.toLowerCase().includes(q);

      return matchCat && matchQuery;
    });
  });

  toggleSearch() {
    const next = !this.isSearchOpen();
    this.isSearchOpen.set(next);
    if (next) {
      setTimeout(() => {
        this.searchInputElement?.nativeElement.focus();
      }, 150);
    }
  }

  onSearchInput(event: Event) {
    const target = event.target as HTMLInputElement;
    this.searchQuery.set(target.value);
  }

  setKeyword(kw: string) {
    this.searchQuery.set(kw);
    this.isSearchOpen.set(true);
  }

  clearSearch() {
    this.searchQuery.set('');
    this.searchInputElement?.nativeElement.focus();
  }

  selectCategory(category: string) {
    this.selectedCategory.set(category);
  }

  resetAllFilters() {
    this.searchQuery.set('');
    this.selectedCategory.set('All');
  }

  onSelectStory(story?: StoryItem) {
    this.openStory.emit(story);
  }

  onViewAllTribes() {
    this.openTribes.emit();
  }

  onPlayAudio(event: Event, story?: StoryItem) {
    event.stopPropagation();
    this.playAudio.emit(story);
  }
}
