import { DOCUMENT } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';
import { StorageService } from './storage.service';

const THEME_STORAGE_KEY = 'trackify_theme';
const DARK_MODE_CLASS = 'theme-dark';

type ThemeMode = 'light' | 'dark';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly storage = inject(StorageService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);

  private readonly isDarkModeSubject = new BehaviorSubject<boolean>(false);
  readonly isDarkMode$ = this.isDarkModeSubject.asObservable();

  constructor() {
    const savedTheme = this.storage.getItem<ThemeMode>(THEME_STORAGE_KEY, 'light');
    this.applyTheme(savedTheme === 'dark');
  }

  setDarkMode(enabled: boolean): void {
    this.applyTheme(enabled);
  }

  toggleDarkMode(): void {
    this.applyTheme(!this.isDarkModeSubject.value);
  }

  getCurrentMode(): ThemeMode {
    return this.isDarkModeSubject.value ? 'dark' : 'light';
  }

  private applyTheme(enabled: boolean): void {
    this.isDarkModeSubject.next(enabled);
    this.storage.setItem<ThemeMode>(THEME_STORAGE_KEY, enabled ? 'dark' : 'light');

    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.document.body.classList.toggle(DARK_MODE_CLASS, enabled);
  }
}
