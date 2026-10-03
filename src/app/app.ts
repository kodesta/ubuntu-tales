import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BottomNav } from "./components/bottom-nav/bottom-nav";
import { Home } from "./components/home/home";
import { Onboarding } from "./components/onboarding/onboarding";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, BottomNav, Home, Onboarding],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('ubuntu-tales');
  currentScreen = signal<'home' | 'onboarding'>('onboarding');

  goToHome() {
    this.currentScreen.set('home');
  }

  goToOnboarding() {
    this.currentScreen.set('onboarding');
  }
}

