import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { CreateTaskPayload, TaskItem, UpdateTaskPayload } from '../models/task.model';
import { generateId } from '../shared/utils/id.util';
import { StorageService } from './storage.service';

const TASKS_STORAGE_KEY = 'trackify_tasks';
const API_DELAY_MS = 240;

@Injectable({
  providedIn: 'root',
})
export class TaskService {
  private readonly storage = inject(StorageService);

  private readonly tasksByBoardSubject = new BehaviorSubject<Record<string, TaskItem[]>>(
    this.storage.getItem<Record<string, TaskItem[]>>(TASKS_STORAGE_KEY, {}),
  );

  readonly tasksByBoard$ = this.tasksByBoardSubject.asObservable();

  getTasksByBoard(boardId: string): Observable<TaskItem[]> {
    return of(null).pipe(
      delay(API_DELAY_MS),
      map(() => this.getTasksSnapshot(boardId)),
    );
  }

  watchTasksByBoard(boardId: string): Observable<TaskItem[]> {
    return this.tasksByBoard$.pipe(
      map((tasksByBoard) => this.sortByOrder(tasksByBoard[boardId] ?? []).map((task) => ({ ...task }))),
    );
  }

  createTask(payload: CreateTaskPayload): Observable<TaskItem> {
    return of(null).pipe(
      delay(API_DELAY_MS),
      map(() => {
        const boardTasks = this.getTasksSnapshot(payload.boardId);
        const newTask: TaskItem = {
          id: generateId(),
          boardId: payload.boardId,
          title: payload.title.trim(),
          description: payload.description.trim(),
          columnId: payload.columnId,
          priority: payload.priority,
          dueDate: payload.dueDate,
          order: this.getNextOrder(boardTasks, payload.columnId),
          createdAt: new Date().toISOString(),
        };

        const nextTasks = [...boardTasks, newTask];
        this.setBoardTasks(payload.boardId, nextTasks);

        return newTask;
      }),
    );
  }

  updateTask(boardId: string, taskId: string, payload: UpdateTaskPayload): Observable<TaskItem | null> {
    return of(null).pipe(
      delay(API_DELAY_MS),
      map(() => {
        const boardTasks = this.getTasksSnapshot(boardId);
        const existingTask = boardTasks.find((task) => task.id === taskId);

        if (!existingTask) {
          return null;
        }

        const movedToAnotherColumn = existingTask.columnId !== payload.columnId;

        const taskWithoutCurrent = boardTasks.filter((task) => task.id !== taskId);

        const updatedTask: TaskItem = {
          ...existingTask,
          title: payload.title.trim(),
          description: payload.description.trim(),
          priority: payload.priority,
          dueDate: payload.dueDate,
          columnId: payload.columnId,
          order: movedToAnotherColumn
            ? this.getNextOrder(taskWithoutCurrent, payload.columnId)
            : existingTask.order,
        };

        const nextTasks = [...taskWithoutCurrent, updatedTask];
        this.setBoardTasks(boardId, nextTasks);

        return updatedTask;
      }),
    );
  }

  deleteTask(boardId: string, taskId: string): Observable<TaskItem[]> {
    return of(null).pipe(
      delay(API_DELAY_MS),
      map(() => {
        const nextTasks = this.getTasksSnapshot(boardId).filter((task) => task.id !== taskId);
        this.setBoardTasks(boardId, nextTasks);
        return nextTasks;
      }),
    );
  }

  moveTask(boardId: string, taskId: string, targetColumnId: string, targetIndex: number): Observable<TaskItem[]> {
    return of(null).pipe(
      delay(API_DELAY_MS),
      map(() => {
        const boardTasks = this.getTasksSnapshot(boardId);
        const taskById = new Map(boardTasks.map((task) => [task.id, task] as const));
        const movingTask = taskById.get(taskId);

        if (!movingTask) {
          return boardTasks;
        }

        const tasksByColumn = new Map<string, TaskItem[]>();
        for (const task of this.sortByOrder(boardTasks)) {
          const list = tasksByColumn.get(task.columnId) ?? [];
          list.push({ ...task });
          tasksByColumn.set(task.columnId, list);
        }

        const sourceColumnId = movingTask.columnId;
        const sourceTasks = tasksByColumn.get(sourceColumnId) ?? [];
        const sourceIndex = sourceTasks.findIndex((task) => task.id === taskId);

        if (sourceIndex === -1) {
          return boardTasks;
        }

        const [removedTask] = sourceTasks.splice(sourceIndex, 1);
        removedTask.columnId = targetColumnId;

        const targetTasks = sourceColumnId === targetColumnId ? sourceTasks : tasksByColumn.get(targetColumnId) ?? [];
        const safeIndex = Math.max(0, Math.min(targetIndex, targetTasks.length));
        targetTasks.splice(safeIndex, 0, removedTask);

        tasksByColumn.set(sourceColumnId, sourceTasks);
        tasksByColumn.set(targetColumnId, targetTasks);

        const nextTasks: TaskItem[] = [];
        for (const columnTasks of tasksByColumn.values()) {
          columnTasks.forEach((task, index) => {
            nextTasks.push({
              ...task,
              order: index,
            });
          });
        }

        this.setBoardTasks(boardId, nextTasks);
        return this.getTasksSnapshot(boardId);
      }),
    );
  }

  reassignTasksFromDeletedColumn(
    boardId: string,
    deletedColumnId: string,
    fallbackColumnId: string | null,
  ): Observable<TaskItem[]> {
    return of(null).pipe(
      delay(API_DELAY_MS),
      map(() => {
        if (!fallbackColumnId) {
          const nextTasks: TaskItem[] = [];
          this.setBoardTasks(boardId, nextTasks);
          return nextTasks;
        }

        const nextTasks = this.getTasksSnapshot(boardId).map((task) => {
          if (task.columnId !== deletedColumnId) {
            return task;
          }

          return {
            ...task,
            columnId: fallbackColumnId,
            order: Number.MAX_SAFE_INTEGER,
          };
        });

        this.setBoardTasks(boardId, nextTasks);
        return this.getTasksSnapshot(boardId);
      }),
    );
  }

  deleteTasksByBoard(boardId: string): Observable<void> {
    return of(null).pipe(
      delay(API_DELAY_MS),
      map(() => {
        const nextState = {
          ...this.tasksByBoardSubject.value,
        };

        delete nextState[boardId];

        this.tasksByBoardSubject.next(nextState);
        this.storage.setItem(TASKS_STORAGE_KEY, nextState);
      }),
    );
  }

  getTasksSnapshot(boardId: string): TaskItem[] {
    return this.sortByOrder(this.tasksByBoardSubject.value[boardId] ?? []).map((task) => ({ ...task }));
  }

  private getNextOrder(tasks: TaskItem[], columnId: string): number {
    return tasks.filter((task) => task.columnId === columnId).length;
  }

  private setBoardTasks(boardId: string, tasks: TaskItem[]): void {
    const normalizedTasks = this.normalizeOrders(tasks);
    const nextState = {
      ...this.tasksByBoardSubject.value,
      [boardId]: normalizedTasks,
    };

    this.tasksByBoardSubject.next(nextState);
    this.storage.setItem(TASKS_STORAGE_KEY, nextState);
  }

  private normalizeOrders(tasks: TaskItem[]): TaskItem[] {
    const grouped = new Map<string, TaskItem[]>();

    for (const task of tasks) {
      const list = grouped.get(task.columnId) ?? [];
      list.push(task);
      grouped.set(task.columnId, list);
    }

    const normalized: TaskItem[] = [];

    for (const [columnId, columnTasks] of grouped.entries()) {
      this.sortByOrder(columnTasks).forEach((task, index) => {
        normalized.push({
          ...task,
          columnId,
          order: index,
        });
      });
    }

    return normalized;
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
