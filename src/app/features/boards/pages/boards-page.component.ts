import { AsyncPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router } from '@angular/router';
import { EMPTY, forkJoin, switchMap } from 'rxjs';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { Board } from '../../../models/board.model';
import { BoardService } from '../../../services/board.service';
import { ColumnService } from '../../../services/column.service';
import { NotificationService } from '../../../services/notification.service';
import { TaskService } from '../../../services/task.service';
import {
  BoardFormDialogComponent,
  BoardFormDialogResult,
} from '../components/board-form-dialog.component';

@Component({
  selector: 'app-boards-page',
  standalone: true,
  imports: [
    AsyncPipe,
    DatePipe,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressBarModule,
    EmptyStateComponent,
  ],
  templateUrl: './boards-page.component.html',
  styleUrl: './boards-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardsPageComponent implements OnInit {
  private readonly boardService = inject(BoardService);
  private readonly columnService = inject(ColumnService);
  private readonly taskService = inject(TaskService);
  private readonly notification = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  readonly boards$ = this.boardService.boards$;
  readonly isLoading = signal(true);
  readonly isCreating = signal(false);

  ngOnInit(): void {
    this.boardService.getBoards().subscribe({
      next: () => this.isLoading.set(false),
      error: () => this.isLoading.set(false),
    });
  }

  createBoard(): void {
    const dialogRef = this.dialog.open(BoardFormDialogComponent, {
      width: '560px',
      autoFocus: false,
      data: {
        mode: 'create',
      },
    });

    dialogRef
      .afterClosed()
      .pipe(
        switchMap((result: BoardFormDialogResult | undefined) => {
          if (!result) {
            return EMPTY;
          }

          this.isCreating.set(true);

          return this.boardService.createBoard(result).pipe(
            switchMap((board) =>
              this.columnService.createDefaultColumns(board.id).pipe(
                switchMap(() => {
                  this.boardService.setLastOpenedBoard(board.id);
                  this.notification.success('Board created successfully.');
                  return this.router.navigate(['/board', board.id]);
                }),
              ),
            ),
          );
        }),
      )
      .subscribe({
        next: () => this.isCreating.set(false),
        error: () => {
          this.isCreating.set(false);
          this.notification.warn('Unable to create board right now.');
        },
      });
  }

  openBoard(board: Board): void {
    this.boardService.setLastOpenedBoard(board.id);
    this.router.navigate(['/board', board.id]);
  }

  deleteBoard(board: Board): void {
    const confirmed = window.confirm(`Delete board "${board.title}" and all related tasks?`);
    if (!confirmed) {
      return;
    }

    this.boardService
      .deleteBoard(board.id)
      .pipe(
        switchMap(() =>
          forkJoin([
            this.columnService.deleteColumnsByBoard(board.id),
            this.taskService.deleteTasksByBoard(board.id),
          ]),
        ),
      )
      .subscribe({
        next: () => this.notification.info('Board deleted.'),
        error: () => this.notification.warn('Failed to delete board.'),
      });
  }

  editBoard(board: Board): void {
    const dialogRef = this.dialog.open(BoardFormDialogComponent, {
      width: '560px',
      autoFocus: false,
      data: {
        mode: 'edit',
        title: board.title,
        description: board.description,
      },
    });

    dialogRef
      .afterClosed()
      .pipe(
        switchMap((result: BoardFormDialogResult | undefined) => {
          if (!result) {
            return EMPTY;
          }

          return this.boardService.updateBoard(board.id, result);
        }),
      )
      .subscribe({
        next: (updatedBoard) => {
          if (!updatedBoard) {
            this.notification.warn('Board not found.');
            return;
          }

          this.notification.success('Board details updated.');
        },
        error: () => this.notification.warn('Failed to update board.'),
      });
  }

  trackBoard(_index: number, board: Board): string {
    return board.id;
  }
}
