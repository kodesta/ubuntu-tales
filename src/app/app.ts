import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BottomNav } from "./components/bottom-nav/bottom-nav";
import { Home } from "./components/home/home";
import { Onboarding } from "./components/onboarding/onboarding";
import { ReadMode } from "./components/read-mode/read-mode";
import { TribeSelection } from "./components/tribe-selection/tribe-selection";
import { Celebration } from "./components/celebration/celebration";
import { Library } from "./components/library/library";
import { Player } from "./components/player/player";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, BottomNav, Home, Onboarding, ReadMode, TribeSelection, Celebration, Library, Player],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('ubuntu-tales');
  currentScreen = signal<'home' | 'onboarding' | 'read-mode' | 'tribes' | 'celebration' | 'library' | 'player'>('onboarding');
  activeTab = signal<'home' | 'library' | 'tribes' | 'saved'>('home');

  goToHome() {
    this.currentScreen.set('home');
    this.activeTab.set('home');
  }

  goToOnboarding() {
    this.currentScreen.set('onboarding');
  }

  goToReadMode() {
    this.currentScreen.set('read-mode');
  }

  goToTribes() {
    this.currentScreen.set('tribes');
    this.activeTab.set('tribes');
  }

  goToCelebration() {
    this.currentScreen.set('celebration');
  }

  goToLibrary() {
    this.currentScreen.set('library');
    this.activeTab.set('library');
  }

  goToPlayer() {
    this.currentScreen.set('player');
  }

  onTabChange(tab: 'home' | 'library' | 'tribes' | 'saved') {
    this.activeTab.set(tab);
    if (tab === 'home') {
      this.currentScreen.set('home');
    } else if (tab === 'tribes') {
      this.currentScreen.set('tribes');
    } else if (tab === 'library' || tab === 'saved') {
      this.currentScreen.set('library');
    }
  }
}
