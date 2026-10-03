import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BottomNav } from "./components/bottom-nav/bottom-nav";
import { Home } from "./components/home/home";
import { Onboarding } from "./components/onboarding/onboarding";
import { ReadMode } from "./components/read-mode/read-mode";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, BottomNav, Home, Onboarding, ReadMode],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('ubuntu-tales');
  currentScreen = signal<'home' | 'onboarding' | 'read-mode'>('onboarding');

  goToHome() {
    this.currentScreen.set('home');
  }

  goToOnboarding() {
    this.currentScreen.set('onboarding');
  }

  goToReadMode() {
    this.currentScreen.set('read-mode');
  }
}
