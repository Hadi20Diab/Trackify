import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, map, of, switchMap, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { CreateTaskPayload, TaskItem, UpdateTaskPayload } from '../models/task.model';

@Injectable({
  providedIn: 'root',
})
export class TaskService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = environment.apiBaseUrl;

  private readonly tasksByBoardSubject = new BehaviorSubject<Record<string, TaskItem[]>>({});

  readonly tasksByBoard$ = this.tasksByBoardSubject.asObservable();

  getTasksByBoard(boardId: string): Observable<TaskItem[]> {
    return this.http.get<TaskItem[]>(`${this.apiBaseUrl}/boards/${boardId}/tasks`).pipe(
      map((tasks) => this.sortByOrder(tasks ?? [])),
      tap((tasks) => this.setBoardTasks(boardId, tasks)),
    );
  }

  watchTasksByBoard(boardId: string): Observable<TaskItem[]> {
    return this.tasksByBoard$.pipe(
      map((tasksByBoard) => this.sortByOrder(tasksByBoard[boardId] ?? []).map((task) => ({ ...task }))),
    );
  }

  createTask(payload: CreateTaskPayload): Observable<TaskItem> {
    return this.http
      .post<TaskItem>(`${this.apiBaseUrl}/boards/${payload.boardId}/tasks`, {
        columnId: payload.columnId,
        title: payload.title,
        description: payload.description,
        priority: payload.priority,
        dueDate: payload.dueDate,
      })
      .pipe(
        tap((task) => {
          const nextTasks = [...this.getTasksSnapshot(payload.boardId), task];
          this.setBoardTasks(payload.boardId, nextTasks);
        }),
      );
  }

  updateTask(boardId: string, taskId: string, payload: UpdateTaskPayload): Observable<TaskItem | null> {
    return this.http
      .patch<TaskItem>(`${this.apiBaseUrl}/tasks/${taskId}`, {
        columnId: payload.columnId,
        title: payload.title,
        description: payload.description,
        priority: payload.priority,
        dueDate: payload.dueDate,
      })
      .pipe(
        tap((updatedTask) => {
          const nextTasks = this.getTasksSnapshot(boardId).map((task) =>
            task.id === taskId ? updatedTask : task,
          );
          this.setBoardTasks(boardId, nextTasks);
        }),
      );
  }

  deleteTask(boardId: string, taskId: string): Observable<TaskItem[]> {
    return this.http.delete<void>(`${this.apiBaseUrl}/tasks/${taskId}`).pipe(
      switchMap(() => this.getTasksByBoard(boardId)),
    );
  }

  moveTask(boardId: string, taskId: string, targetColumnId: string, targetIndex: number): Observable<TaskItem[]> {
    return this.http
      .post<TaskItem[]>(`${this.apiBaseUrl}/tasks/${taskId}/move`, {
        targetColumnId,
        targetIndex,
      })
      .pipe(
        map((tasks) => this.sortByOrder(tasks ?? [])),
        tap((tasks) => this.setBoardTasks(boardId, tasks)),
      );
  }

  reassignTasksFromDeletedColumn(
    boardId: string,
    _deletedColumnId: string,
    _fallbackColumnId: string | null,
  ): Observable<TaskItem[]> {
    return of(this.getTasksSnapshot(boardId));
  }

  deleteTasksByBoard(boardId: string): Observable<void> {
    return of(void 0).pipe(
      tap(() => {
        const nextState = {
          ...this.tasksByBoardSubject.value,
        };

        delete nextState[boardId];

        this.tasksByBoardSubject.next(nextState);
      }),
    );
  }

  getTasksSnapshot(boardId: string): TaskItem[] {
    return this.sortByOrder(this.tasksByBoardSubject.value[boardId] ?? []).map((task) => ({ ...task }));
  }

  clearWorkspaceState(): void {
    this.tasksByBoardSubject.next({});
  }

  private setBoardTasks(boardId: string, tasks: TaskItem[]): void {
    const nextState = {
      ...this.tasksByBoardSubject.value,
      [boardId]: this.sortByOrder(tasks),
    };

    this.tasksByBoardSubject.next(nextState);
  }

  private sortByOrder(tasks: TaskItem[]): TaskItem[] {
    return [...tasks].sort((left, right) => {
      if (left.columnId === right.columnId) {
        return left.order - right.order;
      }

      return left.createdAt.localeCompare(right.createdAt);
    });
  }
}
