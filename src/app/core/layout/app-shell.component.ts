import { AsyncPipe } from '@angular/common';
import { BreakpointObserver } from '@angular/cdk/layout';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { distinctUntilChanged, map } from 'rxjs';
import { Board } from '../../models/board.model';
import { AuthService } from '../../services/auth.service';
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
  private readonly authService = inject(AuthService);
  private readonly themeService = inject(ThemeService);
  private readonly storageService = inject(StorageService);
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly destroyRef = inject(DestroyRef);

  readonly boards$ = this.boardService.boards$;
  readonly lastOpenedBoardId$ = this.boardService.lastOpenedBoardId$;
  readonly isDarkMode$ = this.themeService.isDarkMode$;
  readonly currentUser$ = this.authService.user$;
  readonly isSidebarCollapsed = signal(
    this.storageService.getItem<boolean>(SIDEBAR_COLLAPSE_STORAGE_KEY, false),
  );
  readonly isMobileViewport = signal(false);

  constructor() {
    this.breakpointObserver
      .observe('(max-width: 1100px)')
      .pipe(
        map((state) => state.matches),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((isMobileViewport) => {
        this.isMobileViewport.set(isMobileViewport);

        if (isMobileViewport && !this.isSidebarCollapsed()) {
          this.setSidebarState(true);
        }
      });
  }

  toggleTheme(): void {
    this.themeService.toggleDarkMode();
  }

  toggleSidebar(): void {
    this.setSidebarState(!this.isSidebarCollapsed());
  }

  persistOpenedBoard(boardId: string): void {
    this.boardService.setLastOpenedBoard(boardId);
  }

  logout(): void {
    this.authService.logout();
  }

  trackBoard(_index: number, board: Board): string {
    return board.id;
  }

  private setSidebarState(nextState: boolean): void {
    this.isSidebarCollapsed.set(nextState);
    this.storageService.setItem(SIDEBAR_COLLAPSE_STORAGE_KEY, nextState);
  }
}
