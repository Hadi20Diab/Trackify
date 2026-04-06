import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { BoardService } from '../../../services/board.service';

@Component({
  selector: 'app-board-entry-page',
  standalone: true,
  imports: [MatProgressSpinnerModule],
  templateUrl: './board-entry-page.component.html',
  styleUrl: './board-entry-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardEntryPageComponent implements OnInit {
  constructor(
    private readonly boardService: BoardService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.boardService.getBoards().subscribe({
      next: (boards) => {
        const lastOpenedBoardId = this.boardService.getLastOpenedBoardIdSnapshot();
        const targetBoard =
          boards.find((board) => board.id === lastOpenedBoardId) ?? boards[0] ?? null;

        if (!targetBoard) {
          this.router.navigate(['/boards']);
          return;
        }

        this.boardService.setLastOpenedBoard(targetBoard.id);
        this.router.navigate(['/board', targetBoard.id]);
      },
      error: () => this.router.navigate(['/boards']),
    });
  }
}
