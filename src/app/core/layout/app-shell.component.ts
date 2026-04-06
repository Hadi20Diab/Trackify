import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Board } from '../../models/board.model';
import { BoardService } from '../../services/board.service';
import { ThemeService } from '../../services/theme.service';

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

  readonly boards$ = this.boardService.boards$;
  readonly lastOpenedBoardId$ = this.boardService.lastOpenedBoardId$;
  readonly isDarkMode$ = this.themeService.isDarkMode$;

  toggleTheme(): void {
    this.themeService.toggleDarkMode();
  }

  persistOpenedBoard(boardId: string): void {
    this.boardService.setLastOpenedBoard(boardId);
  }

  trackBoard(_index: number, board: Board): string {
    return board.id;
  }
}
