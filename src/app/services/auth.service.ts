import { Injectable, signal, computed } from '@angular/core';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  password?: string;
  tribe: string;
  clanOrLineage: string;
  role?: string; // e.g. "Storyteller", "Seeker", "Writer", "Storyteller & Seeker", or empty for normal users
  talesRead: number;
  tribesExplored: number;
  listeningTimeMins: number;
  isOnline: boolean;
}

const SEED_USERS: UserProfile[] = [
  {
    id: 'user-kwame',
    name: 'Kwame Asante',
    email: 'kwame@ubuntutales.com',
    password: 'password123',
    tribe: 'Ashanti',
    clanOrLineage: 'Ashanti & Yoruba Lineage',
    role: 'Storyteller & Seeker',
    talesRead: 14,
    tribesExplored: 4,
    listeningTimeMins: 85,
    isOnline: true
  },
  {
    id: 'user-thandiwe',
    name: 'Thandiwe Khumalo',
    email: 'thandiwe@ubuntutales.com',
    password: 'password123',
    tribe: 'Zulu',
    clanOrLineage: 'Zulu Lineage',
    role: 'Writer',
    talesRead: 9,
    tribesExplored: 3,
    listeningTimeMins: 54,
    isOnline: true
  },
  {
    id: 'user-tendai',
    name: 'Tendai Moyo',
    email: 'tendai@ubuntutales.com',
    password: 'password123',
    tribe: 'Shona',
    clanOrLineage: 'Shona Tribe',
    role: 'Seeker',
    talesRead: 6,
    tribesExplored: 2,
    listeningTimeMins: 38,
    isOnline: true
  },
  {
    id: 'user-amina',
    name: 'Amina Diallo',
    email: 'amina@ubuntutales.com',
    password: 'password123',
    tribe: 'Dogon',
    clanOrLineage: 'Dogon Lineage',
    role: '', // Normal reader without role
    talesRead: 3,
    tribesExplored: 1,
    listeningTimeMins: 19,
    isOnline: true
  }
];

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly USERS_STORAGE_KEY = 'ubuntu_tales_users_v1';
  private readonly CURRENT_USER_KEY = 'ubuntu_tales_current_user_v1';

  private users = signal<UserProfile[]>([]);
  readonly currentUser = signal<UserProfile | null>(null);
  readonly isLoggedIn = computed(() => this.currentUser() !== null);
  readonly isOnline = computed(() => this.currentUser()?.isOnline ?? false);

  constructor() {
    this.initUsers();
  }

  private initUsers() {
    let savedUsers: UserProfile[] = [];
    try {
      const stored = localStorage.getItem(this.USERS_STORAGE_KEY);
      if (stored) {
        savedUsers = JSON.parse(stored);
      }
    } catch {
      savedUsers = [];
    }

    if (!savedUsers || savedUsers.length === 0) {
      savedUsers = [...SEED_USERS];
      this.persistUsers(savedUsers);
    }
    this.users.set(savedUsers);

    // Load active session if any, default to Kwame for immediate rich experience
    try {
      const activeStored = localStorage.getItem(this.CURRENT_USER_KEY);
      if (activeStored) {
        const user = JSON.parse(activeStored);
        this.currentUser.set(user);
      } else {
        // Initial state: logged in as Kwame Asante by default
        const defaultUser = savedUsers[0] || SEED_USERS[0];
        this.setCurrentUser(defaultUser);
      }
    } catch {
      this.setCurrentUser(savedUsers[0] || SEED_USERS[0]);
    }
  }

  private persistUsers(usersList: UserProfile[]) {
    try {
      localStorage.setItem(this.USERS_STORAGE_KEY, JSON.stringify(usersList));
    } catch (e) {
      console.warn('Unable to persist users to localStorage', e);
    }
  }

  private setCurrentUser(user: UserProfile | null) {
    if (user) {
      user.isOnline = true;
      this.currentUser.set({ ...user });
      try {
        localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(user));
      } catch (e) {
        console.warn('Unable to persist session to localStorage', e);
      }
    } else {
      this.currentUser.set(null);
      try {
        localStorage.removeItem(this.CURRENT_USER_KEY);
      } catch (e) {
        console.warn('Unable to clear session from localStorage', e);
      }
    }
  }

  login(emailOrName: string, password: string): { success: boolean; message: string } {
    const cleanEmailOrName = emailOrName.trim().toLowerCase();
    const cleanPassword = password.trim();

    const matched = this.users().find(
      u => (u.email.toLowerCase() === cleanEmailOrName || u.name.toLowerCase() === cleanEmailOrName)
    );

    if (!matched) {
      return { success: false, message: 'No account found with this email or username. Please check or sign up.' };
    }

    if (matched.password && matched.password !== cleanPassword) {
      return { success: false, message: 'Incorrect password. Please try again.' };
    }

    this.setCurrentUser(matched);
    return { success: true, message: `Welcome back, ${matched.name}!` };
  }

  signup(data: {
    name: string;
    email: string;
    password: string;
    tribe: string;
    clanOrLineage?: string;
    role?: string;
  }): { success: boolean; message: string } {
    const cleanEmail = data.email.trim().toLowerCase();
    const cleanName = data.name.trim();

    if (!cleanName || !cleanEmail || !data.password) {
      return { success: false, message: 'Please fill in your name, email, and password.' };
    }

    if (!data.tribe || !data.tribe.trim()) {
      return { success: false, message: 'Please select or enter your tribal or clan lineage.' };
    }

    const existing = this.users().find(u => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      return { success: false, message: 'An account with this email already exists. Please log in.' };
    }

    const lineage = data.clanOrLineage?.trim() || `${data.tribe.trim()} Lineage`;
    const cleanRole = data.role?.trim() || '';

    const newUser: UserProfile = {
      id: 'user-' + Date.now(),
      name: cleanName,
      email: cleanEmail,
      password: data.password.trim(),
      tribe: data.tribe.trim(),
      clanOrLineage: lineage,
      role: cleanRole,
      talesRead: 0,
      tribesExplored: 1,
      listeningTimeMins: 0,
      isOnline: true
    };

    const updated = [newUser, ...this.users()];
    this.users.set(updated);
    this.persistUsers(updated);
    this.setCurrentUser(newUser);

    return { success: true, message: `Welcome to the tribe, ${newUser.name}!` };
  }

  logout() {
    this.setCurrentUser(null);
  }

  getRegisteredUsers(): UserProfile[] {
    return this.users();
  }
}
