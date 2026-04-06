import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { Board, CreateBoardPayload } from '../models/board.model';
import { generateId } from '../shared/utils/id.util';
import { StorageService } from './storage.service';

const BOARDS_STORAGE_KEY = 'trackify_boards';
const LAST_OPENED_BOARD_STORAGE_KEY = 'trackify_last_opened_board';
const API_DELAY_MS = 260;

@Injectable({
  providedIn: 'root',
})
export class BoardService {
  private readonly storage = inject(StorageService);

  private readonly boardsSubject = new BehaviorSubject<Board[]>(
    this.storage.getItem<Board[]>(BOARDS_STORAGE_KEY, []),
  );

  private readonly lastOpenedBoardIdSubject = new BehaviorSubject<string | null>(
    this.storage.getItem<string | null>(LAST_OPENED_BOARD_STORAGE_KEY, null),
  );

  readonly boards$ = this.boardsSubject.asObservable();
  readonly lastOpenedBoardId$ = this.lastOpenedBoardIdSubject.asObservable();

  getBoards(): Observable<Board[]> {
    return of(null).pipe(
      delay(API_DELAY_MS),
      map(() => this.getBoardsSnapshot()),
    );
  }

  getBoardById(boardId: string): Observable<Board | null> {
    return this.boards$.pipe(
      map((boards) => boards.find((board) => board.id === boardId) ?? null),
    );
  }

  createBoard(payload: CreateBoardPayload): Observable<Board> {
    return of(null).pipe(
      delay(API_DELAY_MS),
      map(() => {
        const board: Board = {
          id: generateId(),
          title: payload.title.trim(),
          description: payload.description.trim(),
          createdAt: new Date().toISOString(),
        };

        const nextBoards = [board, ...this.boardsSubject.value];
        this.persistBoards(nextBoards);
        this.setLastOpenedBoard(board.id);

        return board;
      }),
    );
  }

  deleteBoard(boardId: string): Observable<Board[]> {
    return of(null).pipe(
      delay(API_DELAY_MS),
      map(() => {
        const nextBoards = this.boardsSubject.value.filter((board) => board.id !== boardId);
        this.persistBoards(nextBoards);

        if (this.lastOpenedBoardIdSubject.value === boardId) {
          this.setLastOpenedBoard(nextBoards[0]?.id ?? null);
        }

        return nextBoards;
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

  private persistBoards(boards: Board[]): void {
    this.boardsSubject.next(boards);
    this.storage.setItem(BOARDS_STORAGE_KEY, boards);
  }
}
