import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Board } from '../../models/board.model';
import { BoardService } from '../../services/board.service';
import { StorageService } from '../../services/storage.service';
import { ThemeService } from '../../services/theme.service';

const SIDEBAR_COLLAPSE_STORAGE_KEY = 'trackify_sidebar_collapsed';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    AsyncPipe,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
  ],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShellComponent {
  private readonly boardService = inject(BoardService);
  private readonly themeService = inject(ThemeService);
  private readonly storageService = inject(StorageService);

  readonly boards$ = this.boardService.boards$;
  readonly lastOpenedBoardId$ = this.boardService.lastOpenedBoardId$;
  readonly isDarkMode$ = this.themeService.isDarkMode$;
  readonly isSidebarCollapsed = signal(
    this.storageService.getItem<boolean>(SIDEBAR_COLLAPSE_STORAGE_KEY, false),
  );

  toggleTheme(): void {
    this.themeService.toggleDarkMode();
  }

  toggleSidebar(): void {
    const nextState = !this.isSidebarCollapsed();
    this.isSidebarCollapsed.set(nextState);
    this.storageService.setItem(SIDEBAR_COLLAPSE_STORAGE_KEY, nextState);
  }

  persistOpenedBoard(boardId: string): void {
    this.boardService.setLastOpenedBoard(boardId);
  }

  trackBoard(_index: number, board: Board): string {
    return board.id;
  }
}
