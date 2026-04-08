import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, map, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { CreateSwimlanePayload, SwimlaneFormPayload, SwimlaneRule } from '../models/swimlane.model';

@Injectable({
  providedIn: 'root',
})
export class SwimlaneService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = environment.apiBaseUrl;

  private readonly swimlanesByBoardSubject = new BehaviorSubject<Record<string, SwimlaneRule[]>>({});

  readonly swimlanesByBoard$ = this.swimlanesByBoardSubject.asObservable();

  getSwimlanesByBoard(boardId: string): Observable<SwimlaneRule[]> {
    return this.http.get<SwimlaneRule[]>(`${this.apiBaseUrl}/boards/${boardId}/swimlanes`).pipe(
      map((swimlanes) => this.sortByCreatedAt(swimlanes ?? [])),
      tap((swimlanes) => this.persistSwimlanes(boardId, swimlanes)),
    );
  }

  watchSwimlanesByBoard(boardId: string): Observable<SwimlaneRule[]> {
    return this.swimlanesByBoard$.pipe(
      map((swimlanesByBoard) => this.sortByCreatedAt(swimlanesByBoard[boardId] ?? [])),
    );
  }

  createSwimlane(payload: CreateSwimlanePayload): Observable<SwimlaneRule> {
    return this.http
      .post<SwimlaneRule>(`${this.apiBaseUrl}/boards/${payload.boardId}/swimlanes`, {
        name: payload.name,
        criteriaType: payload.criteriaType,
        criteriaValue: payload.criteriaValue,
      })
      .pipe(
        tap((swimlane) => {
          const nextSwimlanes = [...this.getSwimlanesSnapshot(payload.boardId), swimlane];
          this.persistSwimlanes(payload.boardId, nextSwimlanes);
        }),
      );
  }

  updateSwimlane(
    boardId: string,
    swimlaneId: string,
    payload: SwimlaneFormPayload,
  ): Observable<SwimlaneRule | null> {
    return this.http
      .patch<SwimlaneRule>(`${this.apiBaseUrl}/swimlanes/${swimlaneId}`, {
        name: payload.name,
        criteriaType: payload.criteriaType,
        criteriaValue: payload.criteriaValue,
      })
      .pipe(
        tap((updatedSwimlane) => {
          const nextSwimlanes = this.getSwimlanesSnapshot(boardId).map((swimlane) =>
            swimlane.id === swimlaneId ? updatedSwimlane : swimlane,
          );
          this.persistSwimlanes(boardId, nextSwimlanes);
        }),
      );
  }

  deleteSwimlane(boardId: string, swimlaneId: string): Observable<SwimlaneRule[]> {
    return this.http.delete<void>(`${this.apiBaseUrl}/swimlanes/${swimlaneId}`).pipe(
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
    return of(void 0).pipe(
      tap(() => {
        const nextState = {
          ...this.swimlanesByBoardSubject.value,
        };

        delete nextState[boardId];
        this.swimlanesByBoardSubject.next(nextState);
      }),
    );
  }

  getSwimlanesSnapshot(boardId: string): SwimlaneRule[] {
    return this.sortByCreatedAt(this.swimlanesByBoardSubject.value[boardId] ?? []).map((lane) => ({
      ...lane,
    }));
  }

  clearWorkspaceState(): void {
    this.swimlanesByBoardSubject.next({});
  }

  private persistSwimlanes(boardId: string, swimlanes: SwimlaneRule[]): void {
    const nextState = {
      ...this.swimlanesByBoardSubject.value,
      [boardId]: this.sortByCreatedAt(swimlanes),
    };

    this.swimlanesByBoardSubject.next(nextState);
  }

  private sortByCreatedAt(swimlanes: SwimlaneRule[]): SwimlaneRule[] {
    return [...swimlanes].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }
}
