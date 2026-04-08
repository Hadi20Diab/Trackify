import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, forkJoin, map, of, switchMap, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { BoardColumn, CreateColumnPayload } from '../models/column.model';

const DEFAULT_COLUMN_TITLES = ['To Do', 'In Progress', 'Done'];

@Injectable({
  providedIn: 'root',
})
export class ColumnService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = environment.apiBaseUrl;

  private readonly columnsByBoardSubject = new BehaviorSubject<Record<string, BoardColumn[]>>({});

  readonly columnsByBoard$ = this.columnsByBoardSubject.asObservable();

  getColumnsByBoard(boardId: string): Observable<BoardColumn[]> {
    return this.http.get<BoardColumn[]>(`${this.apiBaseUrl}/boards/${boardId}/columns`).pipe(
      map((columns) => this.sortByOrder(columns ?? [])),
      tap((columns) => this.setColumns(boardId, columns)),
    );
  }

  watchColumnsByBoard(boardId: string): Observable<BoardColumn[]> {
    return this.columnsByBoard$.pipe(map((columnsByBoard) => this.sortByOrder(columnsByBoard[boardId] ?? [])));
  }

  createDefaultColumns(boardId: string): Observable<BoardColumn[]> {
    return this.getColumnsByBoard(boardId).pipe(
      switchMap((existingColumns) => {
        if (existingColumns.length > 0) {
          return of(existingColumns);
        }

        return forkJoin(
          DEFAULT_COLUMN_TITLES.map((title) => this.createColumn({ boardId, title })),
        ).pipe(map((columns) => this.sortByOrder(columns)));
      }),
    );
  }

  createColumn(payload: CreateColumnPayload): Observable<BoardColumn> {
    return this.http
      .post<BoardColumn>(`${this.apiBaseUrl}/boards/${payload.boardId}/columns`, { title: payload.title })
      .pipe(
        tap((column) => {
          const currentColumns = this.getColumnsSnapshot(payload.boardId);
          this.setColumns(payload.boardId, [...currentColumns, column]);
        }),
      );
  }

  renameColumn(boardId: string, columnId: string, title: string): Observable<BoardColumn | null> {
    return this.http.patch<BoardColumn>(`${this.apiBaseUrl}/columns/${columnId}`, { title }).pipe(
      tap((updatedColumn) => {
        const nextColumns = this.getColumnsSnapshot(boardId).map((column) =>
          column.id === columnId ? updatedColumn : column,
        );
        this.setColumns(boardId, nextColumns);
      }),
    );
  }

  deleteColumn(boardId: string, columnId: string): Observable<BoardColumn[]> {
    return this.http
      .delete<BoardColumn[]>(`${this.apiBaseUrl}/boards/${boardId}/columns/${columnId}`)
      .pipe(
        map((columns) => this.sortByOrder(columns ?? [])),
        tap((columns) => this.setColumns(boardId, columns)),
      );
  }

  reorderColumns(boardId: string, orderedColumnIds: string[]): Observable<BoardColumn[]> {
    return this.http
      .post<BoardColumn[]>(`${this.apiBaseUrl}/boards/${boardId}/columns/reorder`, {
        orderedColumnIds,
      })
      .pipe(
        map((columns) => this.sortByOrder(columns ?? [])),
        tap((columns) => this.setColumns(boardId, columns)),
      );
  }

  deleteColumnsByBoard(boardId: string): Observable<void> {
    return of(void 0).pipe(
      tap(() => {
        const nextState = {
          ...this.columnsByBoardSubject.value,
        };

        delete nextState[boardId];
        this.columnsByBoardSubject.next(nextState);
      }),
    );
  }

  getColumnsSnapshot(boardId: string): BoardColumn[] {
    return this.sortByOrder(this.columnsByBoardSubject.value[boardId] ?? []).map((column) => ({ ...column }));
  }

  clearWorkspaceState(): void {
    this.columnsByBoardSubject.next({});
  }

  private setColumns(boardId: string, columns: BoardColumn[]): void {
    const nextState = {
      ...this.columnsByBoardSubject.value,
      [boardId]: this.sortByOrder(columns),
    };

    this.columnsByBoardSubject.next(nextState);
  }

  private sortByOrder(columns: BoardColumn[]): BoardColumn[] {
    return [...columns].sort((left, right) => left.order - right.order);
  }
}
