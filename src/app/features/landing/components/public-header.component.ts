import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ThemeService } from '../../../services/theme.service';

@Component({
  selector: 'app-public-header',
  standalone: true,
  imports: [AsyncPipe, MatButtonModule, MatIconModule, MatTooltipModule, RouterLink, RouterLinkActive],
  templateUrl: './public-header.component.html',
  styleUrl: './public-header.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicHeaderComponent {
  private readonly themeService = inject(ThemeService);

  readonly isDarkMode$ = this.themeService.isDarkMode$;

  toggleTheme(): void {
    this.themeService.toggleDarkMode();
  }
}
