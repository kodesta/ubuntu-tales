import { Component, EventEmitter, Output, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

export interface LibraryStoryItem {
  id: string;
  title: string;
  tribe: string;
  image: string;
  type: 'story' | 'audio' | 'author';
  author?: string;
  duration?: string;
  readTime?: string;
}

@Component({
  selector: 'app-library',
  imports: [CommonModule, FormsModule],
  templateUrl: './library.html',
  styleUrl: './library.css',
})
export class Library {
  readonly auth = inject(AuthService);

  @Output() openStory = new EventEmitter<LibraryStoryItem | void>();
  @Output() playAudio = new EventEmitter<LibraryStoryItem | void>();
  @Output() openMenu = new EventEmitter<void>();
  @Output() openProfile = new EventEmitter<void>();

  // Active Tab: 'stories' | 'audio' | 'authors'
  activeTab = signal<'stories' | 'audio' | 'authors'>('stories');

  // Submit Story Modal state
  isSubmitModalOpen = signal<boolean>(false);
  newStoryTitle = signal<string>('');
  newStoryAuthor = signal<string>('');
  newStoryTribe = signal<string>('Zulu');
  newStoryImage = signal<string>('assets/images/baobab_hero.jpg');

  // 1. Stories Tab Data (Folktales & Myths from any tribe)
  storiesList = signal<LibraryStoryItem[]>([
    {
      id: 'lib-san-mantis',
      title: 'The Mantis and the Moon',
      tribe: 'San / Khoikhoi',
      image: 'assets/images/mask_san.jpg',
      type: 'story',
      readTime: '5 min'
    },
    {
      id: 'lib-kuba-woot',
      title: 'Woot & Sacred Cloth',
      tribe: 'Kuba',
      image: 'assets/images/mask_kuba.jpg',
      type: 'story',
      readTime: '6 min'
    },
    {
      id: 'lib-tonga-river',
      title: 'Nyaminyami River Spirit',
      tribe: 'Tonga',
      image: 'assets/images/mask_tonga.jpg',
      type: 'story',
      readTime: '5 min'
    },
    {
      id: 'lib-zulu-elephant',
      title: "The Elephant's Pride",
      tribe: 'Zulu',
      image: 'assets/images/mask_zulu.jpg',
      type: 'story',
      readTime: '6 min'
    },
    {
      id: 'lib-shona-baobab',
      title: 'Wisdom of the Baobab',
      tribe: 'Shona',
      image: 'assets/images/baobab_hero.jpg',
      type: 'story',
      readTime: '4 min'
    },
    {
      id: 'lib-yoruba-turtle',
      title: 'The Turtle and the Hare',
      tribe: 'Yoruba',
      image: 'assets/images/turtle_hare.jpg',
      type: 'story',
      readTime: '5 min'
    },
    {
      id: 'lib-ashanti-ananse',
      title: 'Ananse & Pot of Wisdom',
      tribe: 'Ashanti',
      image: 'assets/images/ananse_spider.jpg',
      type: 'story',
      readTime: '7 min'
    },
    {
      id: 'lib-swahili-lion',
      title: 'The Lion & Humble Mouse',
      tribe: 'Swahili',
      image: 'assets/images/lion_cave.jpg',
      type: 'story',
      readTime: '5 min'
    },
    {
      id: 'lib-dogon-nommo',
      title: 'Creation & First Nommo',
      tribe: 'Dogon',
      image: 'assets/images/mask_dogon.jpg',
      type: 'story',
      readTime: '8 min'
    },
    {
      id: 'lib-igbo-shell',
      title: 'The Cracked Shell',
      tribe: 'Igbo',
      image: 'assets/images/baobab_hero.jpg',
      type: 'story',
      readTime: '6 min'
    },
    {
      id: 'lib-mandinka-sundiata',
      title: 'Legend of Sundiata',
      tribe: 'Mandinka',
      image: 'assets/images/onboarding_warrior.jpg',
      type: 'story',
      readTime: '9 min'
    },
    {
      id: 'lib-maasai-enkai',
      title: 'Song of the Enkai',
      tribe: 'Maasai',
      image: 'assets/images/tribe_portrait_1.jpg',
      type: 'story',
      readTime: '5 min'
    },
    {
      id: 'lib-xhosa-stars',
      title: 'Calabash of Stars',
      tribe: 'Xhosa',
      image: 'assets/images/tribe_portrait_2.jpg',
      type: 'story',
      readTime: '6 min'
    },
    {
      id: 'lib-san-hornbill',
      title: 'Hornbill and the Rain',
      tribe: 'San / Khoikhoi',
      image: 'assets/images/mask_san.jpg',
      type: 'story',
      readTime: '4 min'
    },
    {
      id: 'lib-ashanti-stool',
      title: 'The Golden Stool',
      tribe: 'Ashanti',
      image: 'assets/images/mask_ashanti.jpg',
      type: 'story',
      readTime: '7 min'
    },
    {
      id: 'lib-yoruba-drum',
      title: "The Leopard's Drum",
      tribe: 'Yoruba',
      image: 'assets/images/mask_yoruba.jpg',
      type: 'story',
      readTime: '6 min'
    }
  ]);

  // 2. Audio Tab Data (Folktales with Tribe and Audio Duration)
  audioList = signal<LibraryStoryItem[]>([
    {
      id: 'audio-shona-baobab',
      title: 'Wisdom of the Baobab',
      tribe: 'Shona',
      duration: '5 min',
      image: 'assets/images/baobab_hero.jpg',
      type: 'audio'
    },
    {
      id: 'audio-tonga-river',
      title: 'Nyaminyami Waters',
      tribe: 'Tonga',
      duration: '6 min',
      image: 'assets/images/mask_tonga.jpg',
      type: 'audio'
    },
    {
      id: 'audio-san-whispers',
      title: 'Whispers of Tsodilo',
      tribe: 'San / Khoikhoi',
      duration: '8 min',
      image: 'assets/images/mask_san.jpg',
      type: 'audio'
    },
    {
      id: 'audio-kuba-drum',
      title: 'Royal Helmet Drum',
      tribe: 'Kuba',
      duration: '7 min',
      image: 'assets/images/mask_kuba.jpg',
      type: 'audio'
    },
    {
      id: 'audio-zulu-elephant',
      title: 'The Great Elephant',
      tribe: 'Zulu',
      duration: '5 min',
      image: 'assets/images/mask_zulu.jpg',
      type: 'audio'
    },
    {
      id: 'audio-ashanti-ananse',
      title: 'How Ananse Won',
      tribe: 'Ashanti',
      duration: '6 min',
      image: 'assets/images/ananse_spider.jpg',
      type: 'audio'
    },
    {
      id: 'audio-dogon-nommo',
      title: 'Cosmic Nommo Descent',
      tribe: 'Dogon',
      duration: '9 min',
      image: 'assets/images/mask_dogon.jpg',
      type: 'audio'
    },
    {
      id: 'audio-yoruba-hare',
      title: 'The Clever Hare',
      tribe: 'Yoruba',
      duration: '4 min',
      image: 'assets/images/turtle_hare.jpg',
      type: 'audio'
    },
    {
      id: 'audio-swahili-lion',
      title: "The Lion's Oath",
      tribe: 'Swahili',
      duration: '5 min',
      image: 'assets/images/lion_cave.jpg',
      type: 'audio'
    },
    {
      id: 'audio-maasai-plains',
      title: 'Voice of the Plains',
      tribe: 'Maasai',
      duration: '6 min',
      image: 'assets/images/tribe_portrait_1.jpg',
      type: 'audio'
    },
    {
      id: 'audio-kuba-echoes',
      title: 'Echoes of the Congo',
      tribe: 'Kuba',
      duration: '7 min',
      image: 'assets/images/mask_kuba.jpg',
      type: 'audio'
    },
    {
      id: 'audio-san-stars',
      title: 'Stars Over Kalahari',
      tribe: 'San / Khoikhoi',
      duration: '5 min',
      image: 'assets/images/mask_san.jpg',
      type: 'audio'
    },
    {
      id: 'audio-mandinka-griot',
      title: "The King's Griot",
      tribe: 'Mandinka',
      duration: '8 min',
      image: 'assets/images/onboarding_warrior.jpg',
      type: 'audio'
    },
    {
      id: 'audio-tonga-lullaby',
      title: 'Zambezi River Lullaby',
      tribe: 'Tonga',
      duration: '4 min',
      image: 'assets/images/mask_tonga.jpg',
      type: 'audio'
    },
    {
      id: 'audio-ashanti-drumbeat',
      title: 'The Sacred Drumbeat',
      tribe: 'Ashanti',
      duration: '6 min',
      image: 'assets/images/mask_ashanti.jpg',
      type: 'audio'
    },
    {
      id: 'audio-zulu-dawn',
      title: 'Ancestral Fire at Dawn',
      tribe: 'Zulu',
      duration: '7 min',
      image: 'assets/images/mask_zulu.jpg',
      type: 'audio'
    }
  ]);

  // 3. Stories by Authors Tab Data (Title & Name of Author)
  authorsList = signal<LibraryStoryItem[]>([
    {
      id: 'author-whispering-grass',
      title: 'The Whispering Grass',
      author: 'Kofi Mansah',
      tribe: 'Ashanti',
      image: 'assets/images/baobab_hero.jpg',
      type: 'author'
    },
    {
      id: 'author-zambezi-shadows',
      title: 'Shadows of the Zambezi',
      author: 'Tendai Moyo',
      tribe: 'Tonga',
      image: 'assets/images/mask_tonga.jpg',
      type: 'author'
    },
    {
      id: 'author-weaving-dreams',
      title: 'The Weaving of Dreams',
      author: 'Kwame Asante',
      tribe: 'Ashanti',
      image: 'assets/images/mask_ashanti.jpg',
      type: 'author'
    },
    {
      id: 'author-hunter-compassion',
      title: "The Hunter's Compassion",
      author: 'Thandiwe Khumalo',
      tribe: 'Zulu',
      image: 'assets/images/mask_zulu.jpg',
      type: 'author'
    },
    {
      id: 'author-river-secret',
      title: "The River's Secret Gift",
      author: 'Amina Diallo',
      tribe: 'Dogon',
      image: 'assets/images/mask_dogon.jpg',
      type: 'author'
    },
    {
      id: 'author-red-earth',
      title: 'Song of the Red Earth',
      author: 'Nandi Cele',
      tribe: 'Zulu',
      image: 'assets/images/tribe_portrait_1.jpg',
      type: 'author'
    },
    {
      id: 'author-brass-bell',
      title: "The King's Brass Bell",
      author: 'Babatunde Lawal',
      tribe: 'Yoruba',
      image: 'assets/images/mask_yoruba.jpg',
      type: 'author'
    },
    {
      id: 'author-rainmaker',
      title: "Rainmaker's Daughter",
      author: 'Farai Chitepo',
      tribe: 'Shona',
      image: 'assets/images/tribe_portrait_2.jpg',
      type: 'author'
    },
    {
      id: 'author-ostrich-feather',
      title: 'The Ostrich Feather',
      author: '/Xam Storyteller',
      tribe: 'San / Khoikhoi',
      image: 'assets/images/mask_san.jpg',
      type: 'author'
    },
    {
      id: 'author-golden-cowrie',
      title: 'The Golden Cowrie',
      author: 'Patrice Ilunga',
      tribe: 'Kuba',
      image: 'assets/images/mask_kuba.jpg',
      type: 'author'
    },
    {
      id: 'author-kilimanjaro',
      title: 'Echoes of Kilimanjaro',
      author: 'Senteu Kiprono',
      tribe: 'Maasai',
      image: 'assets/images/turtle_hare.jpg',
      type: 'author'
    },
    {
      id: 'author-two-wells',
      title: 'The Tale of Two Wells',
      author: 'Malick Diop',
      tribe: 'Mandinka',
      image: 'assets/images/onboarding_warrior.jpg',
      type: 'author'
    },
    {
      id: 'author-baobab-guardian',
      title: 'The Baobab Guardian',
      author: 'Kwaku Boateng',
      tribe: 'Ashanti',
      image: 'assets/images/lion_cave.jpg',
      type: 'author'
    },
    {
      id: 'author-canoe',
      title: "The Fisherman's Canoe",
      author: 'Mutinta Mweetwa',
      tribe: 'Tonga',
      image: 'assets/images/mask_tonga.jpg',
      type: 'author'
    },
    {
      id: 'author-clay-spirit',
      title: 'The Spirit in the Clay',
      author: 'Chidinma Okafor',
      tribe: 'Igbo',
      image: 'assets/images/baobab_hero.jpg',
      type: 'author'
    },
    {
      id: 'author-night-sun',
      title: 'Dance of the Night Sun',
      author: 'Sipho Dlamini',
      tribe: 'Zulu',
      image: 'assets/images/mask_zulu.jpg',
      type: 'author'
    }
  ]);

  // Loading state for infinite scroll simulation
  isLoadingMore = signal<boolean>(false);

  // Active items computed based on selected tab
  currentItems = computed(() => {
    switch (this.activeTab()) {
      case 'stories':
        return this.storiesList();
      case 'audio':
        return this.audioList();
      case 'authors':
        return this.authorsList();
      default:
        return this.storiesList();
    }
  });

  setTab(tab: 'stories' | 'audio' | 'authors') {
    this.activeTab.set(tab);
  }

  onItemClick(item: LibraryStoryItem) {
    if (item.type === 'audio') {
      this.playAudio.emit(item);
    } else {
      this.openStory.emit(item);
    }
  }

  // Infinite Scroll Trigger (Dynamically appends more items into the 4-column grid)
  loadMore() {
    if (this.isLoadingMore()) return;
    this.isLoadingMore.set(true);

    setTimeout(() => {
      const tab = this.activeTab();
      const timestamp = Date.now();

      if (tab === 'stories') {
        const moreStories: LibraryStoryItem[] = [
          {
            id: `more-san-${timestamp}-1`,
            title: 'Kalahari Sun Chase',
            tribe: 'San / Khoikhoi',
            image: 'assets/images/mask_san.jpg',
            type: 'story',
            readTime: '5 min'
          },
          {
            id: `more-kuba-${timestamp}-2`,
            title: 'Mask of the King',
            tribe: 'Kuba',
            image: 'assets/images/mask_kuba.jpg',
            type: 'story',
            readTime: '6 min'
          },
          {
            id: `more-tonga-${timestamp}-3`,
            title: 'Gorge of the Spirit',
            tribe: 'Tonga',
            image: 'assets/images/mask_tonga.jpg',
            type: 'story',
            readTime: '7 min'
          },
          {
            id: `more-zulu-${timestamp}-4`,
            title: 'The Shield of Shaka',
            tribe: 'Zulu',
            image: 'assets/images/mask_zulu.jpg',
            type: 'story',
            readTime: '5 min'
          }
        ];
        this.storiesList.update(list => [...list, ...moreStories]);
      } else if (tab === 'audio') {
        const moreAudio: LibraryStoryItem[] = [
          {
            id: `more-audio-tonga-${timestamp}-1`,
            title: 'Song of the Victoria Falls',
            tribe: 'Tonga',
            duration: '6 min',
            image: 'assets/images/mask_tonga.jpg',
            type: 'audio'
          },
          {
            id: `more-audio-kuba-${timestamp}-2`,
            title: 'Rhythms of the Palm',
            tribe: 'Kuba',
            duration: '8 min',
            image: 'assets/images/mask_kuba.jpg',
            type: 'audio'
          },
          {
            id: `more-audio-san-${timestamp}-3`,
            title: 'Ochre Chant',
            tribe: 'San / Khoikhoi',
            duration: '5 min',
            image: 'assets/images/mask_san.jpg',
            type: 'audio'
          },
          {
            id: `more-audio-yoruba-${timestamp}-4`,
            title: 'Drums of Oyo',
            tribe: 'Yoruba',
            duration: '7 min',
            image: 'assets/images/mask_yoruba.jpg',
            type: 'audio'
          }
        ];
        this.audioList.update(list => [...list, ...moreAudio]);
      } else {
        const moreAuthors: LibraryStoryItem[] = [
          {
            id: `more-author-1-${timestamp}`,
            title: 'The Desert Bloom',
            author: 'Kagiso Tlou',
            tribe: 'San / Khoikhoi',
            image: 'assets/images/mask_san.jpg',
            type: 'author'
          },
          {
            id: `more-author-2-${timestamp}`,
            title: 'The Royal Weaver',
            author: 'Dieudonné Kabila',
            tribe: 'Kuba',
            image: 'assets/images/mask_kuba.jpg',
            type: 'author'
          },
          {
            id: `more-author-3-${timestamp}`,
            title: 'Voices on the Zambezi',
            author: 'Luyando Mudenda',
            tribe: 'Tonga',
            image: 'assets/images/mask_tonga.jpg',
            type: 'author'
          },
          {
            id: `more-author-4-${timestamp}`,
            title: 'Echoes of Ulundi',
            author: 'Nomusa Buthelezi',
            tribe: 'Zulu',
            image: 'assets/images/mask_zulu.jpg',
            type: 'author'
          }
        ];
        this.authorsList.update(list => [...list, ...moreAuthors]);
      }

      this.isLoadingMore.set(false);
    }, 600);
  }

  // Author story submission modal handlers
  openSubmitModal() {
    const user = this.auth.currentUser();
    this.newStoryAuthor.set(user?.name || '');
    this.newStoryTribe.set(user?.clanOrLineage?.split(' ')[0] || 'Zulu');
    this.newStoryTitle.set('');
    this.isSubmitModalOpen.set(true);
  }

  closeSubmitModal() {
    this.isSubmitModalOpen.set(false);
  }

  submitNewStory() {
    const title = this.newStoryTitle().trim();
    const author = this.newStoryAuthor().trim() || 'Ubuntu Storyteller';
    const tribe = this.newStoryTribe().trim() || 'African Folktale';
    const image = this.newStoryImage();

    if (!title) return;

    const newStory: LibraryStoryItem = {
      id: `author-user-${Date.now()}`,
      title,
      author,
      tribe,
      image,
      type: 'author'
    };

    // Prepend to authors list so it appears at the very beginning of the 4-column grid!
    this.authorsList.update(list => [newStory, ...list]);
    this.activeTab.set('authors');
    this.closeSubmitModal();
  }
}
