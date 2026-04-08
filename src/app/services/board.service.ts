import { HttpErrorResponse, HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, catchError, map, of, tap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { Board, CreateBoardPayload } from '../models/board.model';
import { StorageService } from './storage.service';

const LAST_OPENED_BOARD_STORAGE_KEY = 'trackify_last_opened_board';

@Injectable({
  providedIn: 'root',
})
export class BoardService {
  private readonly http = inject(HttpClient);
  private readonly storage = inject(StorageService);

  private readonly apiBaseUrl = environment.apiBaseUrl;

  private readonly boardsSubject = new BehaviorSubject<Board[]>([]);

  private readonly lastOpenedBoardIdSubject = new BehaviorSubject<string | null>(
    this.storage.getItem<string | null>(LAST_OPENED_BOARD_STORAGE_KEY, null),
  );

  readonly boards$ = this.boardsSubject.asObservable();
  readonly lastOpenedBoardId$ = this.lastOpenedBoardIdSubject.asObservable();

  getBoards(): Observable<Board[]> {
    return this.http.get<Board[]>(`${this.apiBaseUrl}/boards`).pipe(
      map((boards) => this.sortBoards(boards ?? [])),
      tap((boards) => this.boardsSubject.next(boards)),
    );
  }

  getBoardById(boardId: string): Observable<Board | null> {
    const cachedBoard = this.boardsSubject.value.find((board) => board.id === boardId);
    if (cachedBoard) {
      return of(cachedBoard);
    }

    return this.http.get<Board>(`${this.apiBaseUrl}/boards/${boardId}`).pipe(
      tap((board) => this.upsertBoard(board)),
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 404) {
          return of(null);
        }

        return throwError(() => error);
      }),
    );
  }

  createBoard(payload: CreateBoardPayload): Observable<Board> {
    return this.http.post<Board>(`${this.apiBaseUrl}/boards`, payload).pipe(
      tap((board) => {
        const nextBoards = this.sortBoards([board, ...this.boardsSubject.value]);
        this.boardsSubject.next(nextBoards);
        this.setLastOpenedBoard(board.id);
      }),
    );
  }

  updateBoard(boardId: string, payload: CreateBoardPayload): Observable<Board | null> {
    return this.http.patch<Board>(`${this.apiBaseUrl}/boards/${boardId}`, payload).pipe(
      tap((updatedBoard) => this.upsertBoard(updatedBoard)),
      map((board) => board ?? null),
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 404) {
          return of(null);
        }

        return throwError(() => error);
      }),
    );
  }

  deleteBoard(boardId: string): Observable<Board[]> {
    return this.http.delete<void>(`${this.apiBaseUrl}/boards/${boardId}`).pipe(
      map(() => {
        const nextBoards = this.boardsSubject.value.filter((board) => board.id !== boardId);
        this.boardsSubject.next(nextBoards);

        if (this.lastOpenedBoardIdSubject.value === boardId) {
          this.setLastOpenedBoard(nextBoards[0]?.id ?? null);
        }

        return [...nextBoards];
      }),
    );
  }

  setLastOpenedBoard(boardId: string | null): void {
    this.lastOpenedBoardIdSubject.next(boardId);

    if (!boardId) {
      this.storage.removeItem(LAST_OPENED_BOARD_STORAGE_KEY);
      return;
    }

    this.storage.setItem(LAST_OPENED_BOARD_STORAGE_KEY, boardId);
  }

  getLastOpenedBoardIdSnapshot(): string | null {
    return this.lastOpenedBoardIdSubject.value;
  }

  getBoardsSnapshot(): Board[] {
    return [...this.boardsSubject.value];
  }

  clearWorkspaceState(): void {
    this.boardsSubject.next([]);
    this.setLastOpenedBoard(null);
  }

  private upsertBoard(board: Board): void {
    const boards = this.boardsSubject.value;
    const index = boards.findIndex((entry) => entry.id === board.id);

    if (index === -1) {
      this.boardsSubject.next(this.sortBoards([board, ...boards]));
      return;
    }

    const nextBoards = [...boards];
    nextBoards[index] = board;
    this.boardsSubject.next(this.sortBoards(nextBoards));
  }

  private sortBoards(boards: Board[]): Board[] {
    return [...boards].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }
}
