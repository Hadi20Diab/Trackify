import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  private readonly platformId = inject(PLATFORM_ID);

  getItem<T>(key: string, fallbackValue: T): T {
    if (!isPlatformBrowser(this.platformId)) {
      return fallbackValue;
    }

    try {
      const rawValue = localStorage.getItem(key);
      if (!rawValue) {
        return fallbackValue;
      }

      return JSON.parse(rawValue) as T;
    } catch {
      return fallbackValue;
    }
  }

  setItem<T>(key: string, value: T): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    localStorage.setItem(key, JSON.stringify(value));
  }

  removeItem(key: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    localStorage.removeItem(key);
  }
}
