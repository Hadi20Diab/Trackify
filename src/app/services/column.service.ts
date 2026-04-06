import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { BoardColumn, CreateColumnPayload } from '../models/column.model';
import { generateId } from '../shared/utils/id.util';
import { StorageService } from './storage.service';

const COLUMNS_STORAGE_KEY = 'trackify_columns';
const API_DELAY_MS = 220;
const DEFAULT_COLUMN_TITLES = ['To Do', 'In Progress', 'Done'];

@Injectable({
  providedIn: 'root',
})
export class ColumnService {
  private readonly storage = inject(StorageService);

  private readonly columnsByBoardSubject = new BehaviorSubject<Record<string, BoardColumn[]>>(
    this.storage.getItem<Record<string, BoardColumn[]>>(COLUMNS_STORAGE_KEY, {}),
  );

  readonly columnsByBoard$ = this.columnsByBoardSubject.asObservable();

  getColumnsByBoard(boardId: string): Observable<BoardColumn[]> {
    return of(null).pipe(
      delay(API_DELAY_MS),
      map(() => this.getColumnsSnapshot(boardId)),
    );
  }

  watchColumnsByBoard(boardId: string): Observable<BoardColumn[]> {
    return this.columnsByBoard$.pipe(map((columnsByBoard) => this.sortByOrder(columnsByBoard[boardId] ?? [])));
  }

  createDefaultColumns(boardId: string): Observable<BoardColumn[]> {
    return of(null).pipe(
      delay(API_DELAY_MS),
      map(() => {
        const existingColumns = this.getColumnsSnapshot(boardId);
        if (existingColumns.length > 0) {
          return existingColumns;
        }

        const now = new Date().toISOString();
        const nextColumns = DEFAULT_COLUMN_TITLES.map((title, index) => ({
          id: generateId(),
          boardId,
          title,
          order: index,
          createdAt: now,
        }));

        this.setColumns(boardId, nextColumns);
        return nextColumns;
      }),
    );
  }

  createColumn(payload: CreateColumnPayload): Observable<BoardColumn> {
    return of(null).pipe(
      delay(API_DELAY_MS),
      map(() => {
        const currentColumns = this.getColumnsSnapshot(payload.boardId);

        const column: BoardColumn = {
          id: generateId(),
          boardId: payload.boardId,
          title: payload.title.trim(),
          order: currentColumns.length,
          createdAt: new Date().toISOString(),
        };

        this.setColumns(payload.boardId, [...currentColumns, column]);
        return column;
      }),
    );
  }

  renameColumn(boardId: string, columnId: string, title: string): Observable<BoardColumn | null> {
    return of(null).pipe(
      delay(API_DELAY_MS),
      map(() => {
        const columns = this.getColumnsSnapshot(boardId);
        let updatedColumn: BoardColumn | null = null;

        const nextColumns = columns.map((column) => {
          if (column.id !== columnId) {
            return column;
          }

          updatedColumn = {
            ...column,
            title: title.trim(),
          };

          return updatedColumn;
        });

        this.setColumns(boardId, nextColumns);
        return updatedColumn;
      }),
    );
  }

  deleteColumn(boardId: string, columnId: string): Observable<BoardColumn[]> {
    return of(null).pipe(
      delay(API_DELAY_MS),
      map(() => {
        const nextColumns = this.getColumnsSnapshot(boardId)
          .filter((column) => column.id !== columnId)
          .map((column, index) => ({
            ...column,
            order: index,
          }));

        this.setColumns(boardId, nextColumns);
        return nextColumns;
      }),
    );
  }

  reorderColumns(boardId: string, orderedColumnIds: string[]): Observable<BoardColumn[]> {
    return of(null).pipe(
      delay(API_DELAY_MS),
      map(() => {
        const columnById = new Map(
          this.getColumnsSnapshot(boardId).map((column) => [column.id, column] as const),
        );

        const reorderedColumns = orderedColumnIds
          .map((columnId) => columnById.get(columnId))
          .filter((column): column is BoardColumn => Boolean(column))
          .map((column, index) => ({
            ...column,
            order: index,
          }));

        this.setColumns(boardId, reorderedColumns);
        return reorderedColumns;
      }),
    );
  }

  deleteColumnsByBoard(boardId: string): Observable<void> {
    return of(null).pipe(
      delay(API_DELAY_MS),
      map(() => {
        const nextState = {
          ...this.columnsByBoardSubject.value,
        };

        delete nextState[boardId];

        this.columnsByBoardSubject.next(nextState);
        this.storage.setItem(COLUMNS_STORAGE_KEY, nextState);
      }),
    );
  }

  getColumnsSnapshot(boardId: string): BoardColumn[] {
    return this.sortByOrder(this.columnsByBoardSubject.value[boardId] ?? []).map((column) => ({ ...column }));
  }

  private setColumns(boardId: string, columns: BoardColumn[]): void {
    const nextState = {
      ...this.columnsByBoardSubject.value,
      [boardId]: this.sortByOrder(columns),
    };

    this.columnsByBoardSubject.next(nextState);
    this.storage.setItem(COLUMNS_STORAGE_KEY, nextState);
  }

  private sortByOrder(columns: BoardColumn[]): BoardColumn[] {
    return [...columns].sort((left, right) => left.order - right.order);
  }
}
