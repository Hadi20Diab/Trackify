import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import {
  CreateSwimlanePayload,
  SwimlaneFormPayload,
  SwimlaneRule,
} from '../models/swimlane.model';
import { generateId } from '../shared/utils/id.util';
import { StorageService } from './storage.service';

const SWIMLANES_STORAGE_KEY = 'trackify_swimlanes';
const API_DELAY_MS = 220;

@Injectable({
  providedIn: 'root',
})
export class SwimlaneService {
  private readonly storage = inject(StorageService);

  private readonly swimlanesByBoardSubject = new BehaviorSubject<Record<string, SwimlaneRule[]>>(
    this.storage.getItem<Record<string, SwimlaneRule[]>>(SWIMLANES_STORAGE_KEY, {}),
  );

  readonly swimlanesByBoard$ = this.swimlanesByBoardSubject.asObservable();

  getSwimlanesByBoard(boardId: string): Observable<SwimlaneRule[]> {
    return of(null).pipe(
      delay(API_DELAY_MS),
      map(() => this.getSwimlanesSnapshot(boardId)),
    );
  }

  watchSwimlanesByBoard(boardId: string): Observable<SwimlaneRule[]> {
    return this.swimlanesByBoard$.pipe(
      map((swimlanesByBoard) => this.sortByCreatedAt(swimlanesByBoard[boardId] ?? [])),
    );
  }

  createSwimlane(payload: CreateSwimlanePayload): Observable<SwimlaneRule> {
    return of(null).pipe(
      delay(API_DELAY_MS),
      map(() => {
        const swimlane: SwimlaneRule = {
          id: generateId(),
          boardId: payload.boardId,
          name: payload.name.trim(),
          criteriaType: payload.criteriaType,
          criteriaValue: payload.criteriaValue,
          createdAt: new Date().toISOString(),
        };

        const nextSwimlanes = [...this.getSwimlanesSnapshot(payload.boardId), swimlane];
        this.persistSwimlanes(payload.boardId, nextSwimlanes);

        return swimlane;
      }),
    );
  }

  updateSwimlane(
    boardId: string,
    swimlaneId: string,
    payload: SwimlaneFormPayload,
  ): Observable<SwimlaneRule | null> {
    return of(null).pipe(
      delay(API_DELAY_MS),
      map(() => {
        let updatedSwimlane: SwimlaneRule | null = null;

        const nextSwimlanes = this.getSwimlanesSnapshot(boardId).map((swimlane) => {
          if (swimlane.id !== swimlaneId) {
            return swimlane;
          }

          updatedSwimlane = {
            ...swimlane,
            name: payload.name.trim(),
            criteriaType: payload.criteriaType,
            criteriaValue: payload.criteriaValue,
          };

          return updatedSwimlane;
        });

        this.persistSwimlanes(boardId, nextSwimlanes);
        return updatedSwimlane;
      }),
    );
  }

  deleteSwimlane(boardId: string, swimlaneId: string): Observable<SwimlaneRule[]> {
    return of(null).pipe(
      delay(API_DELAY_MS),
      map(() => {
        const nextSwimlanes = this.getSwimlanesSnapshot(boardId).filter(
          (swimlane) => swimlane.id !== swimlaneId,
        );

        this.persistSwimlanes(boardId, nextSwimlanes);
        return nextSwimlanes;
      }),
    );
  }

  deleteSwimlanesByBoard(boardId: string): Observable<void> {
    return of(null).pipe(
      delay(API_DELAY_MS),
      map(() => {
        const nextState = {
          ...this.swimlanesByBoardSubject.value,
        };

        delete nextState[boardId];
        this.swimlanesByBoardSubject.next(nextState);
        this.storage.setItem(SWIMLANES_STORAGE_KEY, nextState);
      }),
    );
  }

  getSwimlanesSnapshot(boardId: string): SwimlaneRule[] {
    return this.sortByCreatedAt(this.swimlanesByBoardSubject.value[boardId] ?? []).map((lane) => ({
      ...lane,
    }));
  }

  private persistSwimlanes(boardId: string, swimlanes: SwimlaneRule[]): void {
    const nextState = {
      ...this.swimlanesByBoardSubject.value,
      [boardId]: this.sortByCreatedAt(swimlanes),
    };

    this.swimlanesByBoardSubject.next(nextState);
    this.storage.setItem(SWIMLANES_STORAGE_KEY, nextState);
  }

  private sortByCreatedAt(swimlanes: SwimlaneRule[]): SwimlaneRule[] {
    return [...swimlanes].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }
}
