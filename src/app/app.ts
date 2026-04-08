import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { take } from 'rxjs/operators';
import { AuthService } from './services/auth.service';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class App {
  constructor() {
    // Initialize theme globally so landing/public routes honor persisted theme.
    inject(ThemeService);
    inject(AuthService)
      .restoreCurrentUser()
      .pipe(take(1))
      .subscribe();
  }
}
