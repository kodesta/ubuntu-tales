import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterOutlet } from '@angular/router';
import { BottomNav } from "./components/bottom-nav/bottom-nav";
import { Home } from "./components/home/home";
import { Onboarding } from "./components/onboarding/onboarding";
import { ReadMode } from "./components/read-mode/read-mode";
import { TribeSelection } from "./components/tribe-selection/tribe-selection";
import { Celebration } from "./components/celebration/celebration";
import { Library } from "./components/library/library";
import { Saved } from "./components/saved/saved";
import { Player } from "./components/player/player";
import { AuthService, UserProfile } from "./services/auth.service";

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    FormsModule,
    RouterOutlet,
    BottomNav,
    Home,
    Onboarding,
    ReadMode,
    TribeSelection,
    Celebration,
    Library,
    Saved,
    Player
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  readonly auth = inject(AuthService);

  protected readonly title = signal('ubuntu-tales');
  currentScreen = signal<'home' | 'onboarding' | 'read-mode' | 'tribes' | 'celebration' | 'library' | 'saved' | 'player'>('onboarding');
  activeTab = signal<'home' | 'library' | 'tribes' | 'saved'>('home');

  isDrawerOpen = signal<boolean>(false);
  isProfileOpen = signal<boolean>(false);
  isAuthModalOpen = signal<boolean>(false);
  authTab = signal<'login' | 'signup'>('login');

  // Form Models
  loginEmail = signal<string>('kwame@ubuntutales.com');
  loginPassword = signal<string>('password123');
  loginError = signal<string>('');

  signupName = signal<string>('');
  signupEmail = signal<string>('');
  signupPassword = signal<string>('');
  signupTribe = signal<string>('Zulu');
  signupCustomTribe = signal<string>('');
  signupRole = signal<string>('Storyteller');
  signupError = signal<string>('');

  toastMessage = signal<string>('');

  tribesList = [
    'Zulu',
    'Shona',
    'Yoruba',
    'Ashanti',
    'Maasai',
    'Dogon',
    'San / Khoikhoi',
    'Kuba',
    'Tonga',
    'Igbo',
    'Xhosa',
    'Mandinka',
    'Kikuyu',
    'Amhara',
    'Oromo',
    'Hausa',
    'Other / Custom Lineage'
  ];

  rolesList = [
    { value: 'Storyteller', label: 'Storyteller' },
    { value: 'Seeker', label: 'Seeker' },
    { value: 'Writer', label: 'Writer' },
    { value: 'Storyteller & Seeker', label: 'Storyteller & Seeker' },
    { value: 'Elder / Guardian', label: 'Elder / Guardian' },
    { value: '', label: 'Normal User / Reader' }
  ];

  openDrawer() {
    this.isDrawerOpen.set(true);
  }

  closeDrawer() {
    this.isDrawerOpen.set(false);
  }

  openProfile() {
    if (this.auth.isLoggedIn()) {
      this.isProfileOpen.set(true);
    } else {
      this.authTab.set('login');
      this.isAuthModalOpen.set(true);
    }
  }

  closeProfile() {
    this.isProfileOpen.set(false);
  }

  openAuthModal(tab: 'login' | 'signup' = 'login') {
    this.authTab.set(tab);
    this.loginError.set('');
    this.signupError.set('');
    this.isAuthModalOpen.set(true);
    this.isDrawerOpen.set(false);
    this.isProfileOpen.set(false);
  }

  closeAuthModal() {
    this.isAuthModalOpen.set(false);
    this.loginError.set('');
    this.signupError.set('');
  }

  switchAuthTab(tab: 'login' | 'signup') {
    this.authTab.set(tab);
    this.loginError.set('');
    this.signupError.set('');
  }

  onLoginSubmit() {
    this.loginError.set('');
    const email = this.loginEmail();
    const password = this.loginPassword();

    if (!email || !password) {
      this.loginError.set('Please enter both email and password.');
      return;
    }

    const res = this.auth.login(email, password);
    if (res.success) {
      this.closeAuthModal();
      this.showToast(res.message);
      this.isProfileOpen.set(true);
    } else {
      this.loginError.set(res.message);
    }
  }

  onSignupSubmit() {
    this.signupError.set('');
    const name = this.signupName().trim();
    const email = this.signupEmail().trim();
    const password = this.signupPassword().trim();
    const selectedTribe = this.signupTribe();
    const finalTribe = selectedTribe === 'Other / Custom Lineage' 
      ? this.signupCustomTribe().trim() 
      : selectedTribe;

    if (!name || !email || !password) {
      this.signupError.set('Please fill in your name, email, and password.');
      return;
    }

    if (!finalTribe) {
      this.signupError.set('Please provide your tribal or clan lineage.');
      return;
    }

    const res = this.auth.signup({
      name,
      email,
      password,
      tribe: finalTribe,
      clanOrLineage: `${finalTribe} Lineage`,
      role: this.signupRole()
    });

    if (res.success) {
      this.closeAuthModal();
      this.showToast(res.message);
      this.isProfileOpen.set(true);
      // Reset signup fields
      this.signupName.set('');
      this.signupEmail.set('');
      this.signupPassword.set('');
    } else {
      this.signupError.set(res.message);
    }
  }

  quickLogin(user: UserProfile) {
    const res = this.auth.login(user.email, user.password || 'password123');
    if (res.success) {
      this.closeAuthModal();
      this.showToast(`Logged in as ${user.name}`);
      this.isProfileOpen.set(true);
    }
  }

  onLogout() {
    const userName = this.auth.currentUser()?.name || 'Friend';
    this.auth.logout();
    this.closeProfile();
    this.showToast(`Goodbye for now, ${userName}. Walk in peace.`);
  }

  showToast(msg: string) {
    this.toastMessage.set(msg);
    setTimeout(() => {
      if (this.toastMessage() === msg) {
        this.toastMessage.set('');
      }
    }, 3500);
  }

  navigateTo(screen: 'home' | 'onboarding' | 'read-mode' | 'tribes' | 'celebration' | 'library' | 'saved' | 'player', tab?: 'home' | 'library' | 'tribes' | 'saved') {
    this.currentScreen.set(screen);
    if (tab) {
      this.activeTab.set(tab);
    }
    this.closeDrawer();
  }

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

  goToSaved() {
    this.currentScreen.set('saved');
    this.activeTab.set('saved');
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
    } else if (tab === 'library') {
      this.currentScreen.set('library');
    } else if (tab === 'saved') {
      this.currentScreen.set('saved');
    }
  }
}
