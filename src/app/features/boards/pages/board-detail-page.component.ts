import { AsyncPipe, DatePipe, TitleCasePipe } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router } from '@angular/router';
import {
  BehaviorSubject,
  EMPTY,
  combineLatest,
  distinctUntilChanged,
  filter,
  forkJoin,
  map,
  of,
  shareReplay,
  startWith,
  switchMap,
  tap,
} from 'rxjs';
import { BoardColumn } from '../../../models/column.model';
import { SwimlaneMode } from '../../../models/board-view.model';
import { TaskItem, TaskPriority } from '../../../models/task.model';
import { SwimlaneRule } from '../../../models/swimlane.model';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { BoardService } from '../../../services/board.service';
import { ColumnService } from '../../../services/column.service';
import { NotificationService } from '../../../services/notification.service';
import { TaskService } from '../../../services/task.service';
import { SwimlaneService } from '../../../services/swimlane.service';
import {
  ColumnFormDialogComponent,
  ColumnFormDialogResult,
} from '../../columns/components/column-form-dialog.component';
import {
  TaskFormDialogComponent,
  TaskFormDialogResult,
} from '../../tasks/components/task-form-dialog.component';
import { TaskCardComponent } from '../../tasks/components/task-card.component';
import { Board } from '../../../models/board.model';
import {
  BoardFormDialogComponent,
  BoardFormDialogResult,
} from '../components/board-form-dialog.component';
import {
  SwimlaneFormDialogComponent,
  SwimlaneFormDialogResult,
} from '../components/swimlane-form-dialog.component';

interface FilterFormValue {
  search: string;
  priority: TaskPriority | 'all';
  columnId: string | 'all';
  swimlane: SwimlaneMode;
}

interface ColumnLane {
  id: string;
  label: string;
  tasks: TaskItem[];
}

interface ColumnViewModel {
  column: BoardColumn;
  tasks: TaskItem[];
  lanes: ColumnLane[];
}

@Component({
  selector: 'app-board-detail-page',
  standalone: true,
  imports: [
    AsyncPipe,
    DatePipe,
    TitleCasePipe,
    DragDropModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatProgressBarModule,
    MatSelectModule,
    MatTooltipModule,
    TaskCardComponent,
    EmptyStateComponent,
  ],
  templateUrl: './board-detail-page.component.html',
  styleUrl: './board-detail-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardDetailPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly boardService = inject(BoardService);
  private readonly columnService = inject(ColumnService);
  private readonly taskService = inject(TaskService);
  private readonly notification = inject(NotificationService);
  private readonly swimlaneService = inject(SwimlaneService);

  readonly isLoading = signal(true);
  readonly isMutating = signal(false);
  readonly contextMenuPosition = signal({ x: '0px', y: '0px' });
  readonly contextColumn = signal<BoardColumn | null>(null);
  readonly contextTask = signal<TaskItem | null>(null);

  readonly groupingModes: SwimlaneMode[] = ['none', 'priority', 'dueDate', 'custom'];
  readonly priorities: Array<TaskPriority | 'all'> = ['all', 'high', 'medium', 'low'];

  readonly filterForm = this.fb.nonNullable.group({
    search: '',
    priority: 'all' as TaskPriority | 'all',
    columnId: 'all' as string | 'all',
    swimlane: 'none' as SwimlaneMode,
  });

  private readonly activeBoardIdSubject = new BehaviorSubject<string | null>(null);
  private readonly destroyRef = inject(DestroyRef);

  private readonly activeBoardId$ = this.activeBoardIdSubject.pipe(
    filter((boardId): boardId is string => Boolean(boardId)),
    distinctUntilChanged(),
  );

  private readonly filters$ = this.filterForm.valueChanges.pipe(
    startWith(this.filterForm.getRawValue()),
    map((value): FilterFormValue => ({
      search: value.search ?? '',
      priority: value.priority ?? 'all',
      columnId: value.columnId ?? 'all',
      swimlane: value.swimlane ?? 'none',
    })),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly board$ = combineLatest([this.activeBoardId$, this.boardService.boards$]).pipe(
    map(([boardId, boards]) => boards.find((board) => board.id === boardId) ?? null),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly columns$ = combineLatest([this.activeBoardId$, this.columnService.columnsByBoard$]).pipe(
    map(([boardId, columnsByBoard]) => this.sortColumns(columnsByBoard[boardId] ?? [])),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly tasks$ = combineLatest([this.activeBoardId$, this.taskService.tasksByBoard$]).pipe(
    map(([boardId, tasksByBoard]) => this.sortTasks(tasksByBoard[boardId] ?? [])),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly customSwimlanes$ = combineLatest([
    this.activeBoardId$,
    this.swimlaneService.swimlanesByBoard$,
  ]).pipe(
    map(([boardId, swimlanesByBoard]) => swimlanesByBoard[boardId] ?? []),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly columnViewModels$ = combineLatest([
    this.columns$,
    this.tasks$,
    this.filters$,
    this.customSwimlanes$,
  ]).pipe(
    map(([columns, tasks, filters, customSwimlanes]) =>
      this.buildColumnViewModels(columns, tasks, filters, customSwimlanes),
    ),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly connectedDropLists$ = this.columns$.pipe(
    map((columns) => columns.map((column) => column.id)),
  );

  readonly hasActiveFilters$ = this.filters$.pipe(
    map(
      (filters) =>
        filters.search.trim().length > 0 ||
        filters.priority !== 'all' ||
        filters.columnId !== 'all' ||
        filters.swimlane !== 'none',
    ),
  );

  readonly canDragTasks$ = this.filters$.pipe(
    map(
      (filters) =>
        filters.search.trim().length === 0 &&
        filters.priority === 'all' &&
        filters.columnId === 'all' &&
        filters.swimlane === 'none',
    ),
  );

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        map((params) => params.get('boardId')),
        filter((boardId): boardId is string => Boolean(boardId)),
        distinctUntilChanged(),
        tap((boardId) => {
          this.activeBoardIdSubject.next(boardId);
          this.boardService.setLastOpenedBoard(boardId);
          this.isLoading.set(true);
        }),
        switchMap((boardId) =>
          forkJoin({
            boards: this.boardService.getBoards(),
            columns: this.columnService.getColumnsByBoard(boardId),
            tasks: this.taskService.getTasksByBoard(boardId),
            swimlanes: this.swimlaneService.getSwimlanesByBoard(boardId),
          }).pipe(
            switchMap(({ boards, columns }) => {
              const boardExists = boards.some((board) => board.id === boardId);

              if (!boardExists) {
                return of({ boardExists: false, boardId });
              }

              if (columns.length > 0) {
                return of({ boardExists: true, boardId });
              }

              return this.columnService.createDefaultColumns(boardId).pipe(
                map(() => ({ boardExists: true, boardId })),
              );
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ boardExists }) => {
          if (!boardExists) {
            this.notification.warn('Board not found.');
            this.router.navigate(['/boards']);
            return;
          }

          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.notification.warn('Unable to load board details.');
          this.router.navigate(['/boards']);
        },
      });
  }

  openCreateTask(columnId?: string): void {
    const boardId = this.activeBoardIdSubject.value;
    if (!boardId) {
      return;
    }

    const columns = this.columnService.getColumnsSnapshot(boardId);
    if (columns.length === 0) {
      this.notification.warn('Add a column before creating tasks.');
      return;
    }

    const dialogRef = this.dialog.open(TaskFormDialogComponent, {
      width: '620px',
      autoFocus: false,
      data: {
        mode: 'create',
        columns,
        initialValue: {
          title: '',
          description: '',
          columnId: columnId ?? columns[0].id,
          priority: 'medium',
          dueDate: null,
        },
      },
    });

    dialogRef
      .afterClosed()
      .pipe(
        switchMap((result: TaskFormDialogResult | undefined) => {
          if (!result) {
            return EMPTY;
          }

          this.isMutating.set(true);
          return this.taskService.createTask({
            boardId,
            ...result,
          });
        }),
      )
      .subscribe({
        next: () => {
          this.isMutating.set(false);
          this.notification.success('Task created.');
        },
        error: () => {
          this.isMutating.set(false);
          this.notification.warn('Failed to create task.');
        },
      });
  }

  editBoardDetails(board: Board): void {
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

          this.isMutating.set(true);
          return this.boardService.updateBoard(board.id, result);
        }),
      )
      .subscribe({
        next: (updatedBoard) => {
          this.isMutating.set(false);

          if (!updatedBoard) {
            this.notification.warn('Board not found.');
            return;
          }

          this.notification.success('Board updated.');
        },
        error: () => {
          this.isMutating.set(false);
          this.notification.warn('Unable to update board.');
        },
      });
  }

  openCreateSwimlane(): void {
    const boardId = this.activeBoardIdSubject.value;
    if (!boardId) {
      return;
    }

    const columns = this.columnService.getColumnsSnapshot(boardId);

    const dialogRef = this.dialog.open(SwimlaneFormDialogComponent, {
      width: '520px',
      autoFocus: false,
      data: {
        mode: 'create',
        columns,
      },
    });

    dialogRef
      .afterClosed()
      .pipe(
        switchMap((result: SwimlaneFormDialogResult | undefined) => {
          if (!result) {
            return EMPTY;
          }

          return this.swimlaneService.createSwimlane({
            boardId,
            name: result.name,
            criteriaType: result.criteriaType,
            criteriaValue: result.criteriaValue,
          });
        }),
      )
      .subscribe({
        next: () => this.notification.success('Custom swimlane created.'),
        error: () => this.notification.warn('Failed to create swimlane.'),
      });
  }

  editSwimlane(swimlane: SwimlaneRule): void {
    const boardId = this.activeBoardIdSubject.value;
    if (!boardId) {
      return;
    }

    const columns = this.columnService.getColumnsSnapshot(boardId);

    const dialogRef = this.dialog.open(SwimlaneFormDialogComponent, {
      width: '520px',
      autoFocus: false,
      data: {
        mode: 'edit',
        columns,
        initialValue: {
          name: swimlane.name,
          criteriaType: swimlane.criteriaType,
          criteriaValue: swimlane.criteriaValue,
        },
      },
    });

    dialogRef
      .afterClosed()
      .pipe(
        switchMap((result: SwimlaneFormDialogResult | undefined) => {
          if (!result) {
            return EMPTY;
          }

          return this.swimlaneService.updateSwimlane(boardId, swimlane.id, result);
        }),
      )
      .subscribe({
        next: () => this.notification.success('Swimlane updated.'),
        error: () => this.notification.warn('Failed to update swimlane.'),
      });
  }

  deleteSwimlane(swimlaneId: string): void {
    const boardId = this.activeBoardIdSubject.value;
    if (!boardId) {
      return;
    }

    const confirmed = window.confirm('Delete this custom swimlane?');
    if (!confirmed) {
      return;
    }

    this.swimlaneService.deleteSwimlane(boardId, swimlaneId).subscribe({
      next: () => this.notification.info('Swimlane deleted.'),
      error: () => this.notification.warn('Failed to delete swimlane.'),
    });
  }

  editTask(taskId: string): void {
    const boardId = this.activeBoardIdSubject.value;
    if (!boardId) {
      return;
    }

    const existingTask = this.taskService.getTasksSnapshot(boardId).find((task) => task.id === taskId);
    if (!existingTask) {
      return;
    }

    const columns = this.columnService.getColumnsSnapshot(boardId);

    const dialogRef = this.dialog.open(TaskFormDialogComponent, {
      width: '620px',
      autoFocus: false,
      data: {
        mode: 'edit',
        columns,
        initialValue: {
          title: existingTask.title,
          description: existingTask.description,
          columnId: existingTask.columnId,
          priority: existingTask.priority,
          dueDate: existingTask.dueDate,
        },
      },
    });

    dialogRef
      .afterClosed()
      .pipe(
        switchMap((result: TaskFormDialogResult | undefined) => {
          if (!result) {
            return EMPTY;
          }

          this.isMutating.set(true);
          return this.taskService.updateTask(boardId, taskId, result);
        }),
      )
      .subscribe({
        next: () => {
          this.isMutating.set(false);
          this.notification.success('Task updated.');
        },
        error: () => {
          this.isMutating.set(false);
          this.notification.warn('Failed to update task.');
        },
      });
  }

  deleteTask(taskId: string): void {
    const boardId = this.activeBoardIdSubject.value;
    if (!boardId) {
      return;
    }

    const confirmed = window.confirm('Delete this task?');
    if (!confirmed) {
      return;
    }

    this.taskService.deleteTask(boardId, taskId).subscribe({
      next: () => this.notification.info('Task deleted.'),
      error: () => this.notification.warn('Failed to delete task.'),
    });
  }

  openCreateColumn(): void {
    const boardId = this.activeBoardIdSubject.value;
    if (!boardId) {
      return;
    }

    const dialogRef = this.dialog.open(ColumnFormDialogComponent, {
      width: '430px',
      autoFocus: false,
      data: {
        mode: 'create',
      },
    });

    dialogRef
      .afterClosed()
      .pipe(
        switchMap((result: ColumnFormDialogResult | undefined) => {
          if (!result) {
            return EMPTY;
          }

          this.isMutating.set(true);
          return this.columnService.createColumn({
            boardId,
            title: result.title,
          });
        }),
      )
      .subscribe({
        next: () => {
          this.isMutating.set(false);
          this.notification.success('Column added.');
        },
        error: () => {
          this.isMutating.set(false);
          this.notification.warn('Failed to add column.');
        },
      });
  }

  renameColumn(column: BoardColumn): void {
    const boardId = this.activeBoardIdSubject.value;
    if (!boardId) {
      return;
    }

    const dialogRef = this.dialog.open(ColumnFormDialogComponent, {
      width: '430px',
      autoFocus: false,
      data: {
        title: column.title,
        mode: 'rename',
      },
    });

    dialogRef
      .afterClosed()
      .pipe(
        switchMap((result: ColumnFormDialogResult | undefined) => {
          if (!result) {
            return EMPTY;
          }

          this.isMutating.set(true);
          return this.columnService.renameColumn(boardId, column.id, result.title);
        }),
      )
      .subscribe({
        next: () => {
          this.isMutating.set(false);
          this.notification.success('Column renamed.');
        },
        error: () => {
          this.isMutating.set(false);
          this.notification.warn('Failed to rename column.');
        },
      });
  }

  deleteColumn(columnId: string): void {
    const boardId = this.activeBoardIdSubject.value;
    if (!boardId) {
      return;
    }

    const columns = this.columnService.getColumnsSnapshot(boardId);
    if (columns.length <= 1) {
      this.notification.warn('A board requires at least one column.');
      return;
    }

    const fallbackColumn = columns.find((column) => column.id !== columnId) ?? null;

    const confirmed = window.confirm('Delete this column? Tasks will be moved to another column.');
    if (!confirmed) {
      return;
    }

    this.isMutating.set(true);

    this.taskService
      .reassignTasksFromDeletedColumn(boardId, columnId, fallbackColumn?.id ?? null)
      .pipe(switchMap(() => this.columnService.deleteColumn(boardId, columnId)))
      .subscribe({
        next: () => {
          this.isMutating.set(false);
          this.notification.info('Column deleted and tasks moved.');
        },
        error: () => {
          this.isMutating.set(false);
          this.notification.warn('Failed to delete column.');
        },
      });
  }

  openColumnContextMenu(event: MouseEvent, column: BoardColumn, trigger: MatMenuTrigger): void {
    event.preventDefault();
    this.contextColumn.set(column);
    this.contextMenuPosition.set({
      x: `${event.clientX}px`,
      y: `${event.clientY}px`,
    });
    trigger.closeMenu();
    trigger.openMenu();
  }

  openTaskContextMenu(event: MouseEvent, task: TaskItem, trigger: MatMenuTrigger): void {
    event.preventDefault();
    this.contextTask.set(task);
    this.contextMenuPosition.set({
      x: `${event.clientX}px`,
      y: `${event.clientY}px`,
    });
    trigger.closeMenu();
    trigger.openMenu();
  }

  onColumnDrop(event: CdkDragDrop<ColumnViewModel[]>): void {
    const boardId = this.activeBoardIdSubject.value;
    if (!boardId || event.previousIndex === event.currentIndex) {
      return;
    }

    const nextColumns = [...event.container.data];
    moveItemInArray(nextColumns, event.previousIndex, event.currentIndex);

    this.columnService.reorderColumns(
      boardId,
      nextColumns.map((columnView) => columnView.column.id),
    ).subscribe({
      error: () => this.notification.warn('Failed to reorder columns.'),
    });
  }

  onTaskDrop(event: CdkDragDrop<TaskItem[]>, targetColumnId: string): void {
    const boardId = this.activeBoardIdSubject.value;

    if (!boardId || !event.previousContainer.data[event.previousIndex]) {
      return;
    }

    if (event.previousContainer === event.container && event.previousIndex === event.currentIndex) {
      return;
    }

    const movingTask = event.previousContainer.data[event.previousIndex];

    this.taskService.moveTask(boardId, movingTask.id, targetColumnId, event.currentIndex).subscribe({
      error: () => this.notification.warn('Failed to move task.'),
    });
  }

  resetFilters(): void {
    this.filterForm.patchValue({
      search: '',
      priority: 'all',
      columnId: 'all',
      swimlane: 'none',
    });
  }

  trackByColumn(_index: number, item: ColumnViewModel): string {
    return item.column.id;
  }

  trackByLane(_index: number, lane: ColumnLane): string {
    return lane.id;
  }

  trackByTask(_index: number, task: TaskItem): string {
    return task.id;
  }

  trackBySwimlaneRule(_index: number, swimlane: SwimlaneRule): string {
    return swimlane.id;
  }

  getSwimlaneCriteriaLabel(swimlane: SwimlaneRule): string {
    if (swimlane.criteriaType === 'priority') {
      return `Priority: ${swimlane.criteriaValue}`;
    }

    if (swimlane.criteriaType === 'column') {
      const boardId = this.activeBoardIdSubject.value;
      const column =
        boardId
          ? this.columnService
              .getColumnsSnapshot(boardId)
              .find((entry) => entry.id === swimlane.criteriaValue)
          : null;
      return `Column: ${column?.title ?? 'Unknown'}`;
    }

    const dueLabels: Record<string, string> = {
      overdue: 'Due: Overdue',
      today: 'Due: Today',
      next7days: 'Due: Next 7 Days',
      later: 'Due: Later',
      noDueDate: 'Due: No Due Date',
    };

    return dueLabels[swimlane.criteriaValue] ?? 'Due: Custom';
  }

  private buildColumnViewModels(
    columns: BoardColumn[],
    tasks: TaskItem[],
    filters: FilterFormValue,
    customSwimlanes: SwimlaneRule[],
  ): ColumnViewModel[] {
    const normalizedSearch = filters.search.trim().toLowerCase();

    const filteredTasks = tasks.filter((task) => {
      const matchesSearch =
        normalizedSearch.length === 0 || task.title.toLowerCase().includes(normalizedSearch);
      const matchesPriority = filters.priority === 'all' || task.priority === filters.priority;
      const matchesColumn = filters.columnId === 'all' || task.columnId === filters.columnId;

      return matchesSearch && matchesPriority && matchesColumn;
    });

    return columns.map((column) => {
      const columnTasks = this.sortTasks(filteredTasks.filter((task) => task.columnId === column.id));

      return {
        column,
        tasks: columnTasks,
        lanes: this.createLanes(columnTasks, filters.swimlane, customSwimlanes),
      };
    });
  }

  private createLanes(
    tasks: TaskItem[],
    mode: SwimlaneMode,
    customSwimlanes: SwimlaneRule[],
  ): ColumnLane[] {
    if (mode === 'none') {
      return [
        {
          id: 'all',
          label: 'Tasks',
          tasks,
        },
      ];
    }

    if (mode === 'priority') {
      const priorityOrder: TaskPriority[] = ['high', 'medium', 'low'];
      return priorityOrder
        .map((priority) => ({
          id: priority,
          label: `${priority[0].toUpperCase()}${priority.slice(1)} Priority`,
          tasks: tasks.filter((task) => task.priority === priority),
        }))
        .filter((lane) => lane.tasks.length > 0);
    }

    if (mode === 'custom') {
      return this.createCustomLanes(tasks, customSwimlanes);
    }

    return this.createDueDateLanes(tasks);
  }

  private createDueDateLanes(tasks: TaskItem[]): ColumnLane[] {
    const lanes: ColumnLane[] = [
      { id: 'overdue', label: 'Overdue', tasks: [] },
      { id: 'today', label: 'Today', tasks: [] },
      { id: 'next7days', label: 'Next 7 Days', tasks: [] },
      { id: 'later', label: 'Later', tasks: [] },
      { id: 'noDueDate', label: 'No Due Date', tasks: [] },
    ];

    for (const task of tasks) {
      const dueStatus = this.getDueStatusForTask(task);
      const lane = lanes.find((entry) => entry.id === dueStatus);

      if (lane) {
        lane.tasks.push(task);
      }
    }

    return lanes.filter((lane) => lane.tasks.length > 0);
  }

  private createCustomLanes(tasks: TaskItem[], customSwimlanes: SwimlaneRule[]): ColumnLane[] {
    if (customSwimlanes.length === 0) {
      return [];
    }

    const lanesById = new Map(
      customSwimlanes.map((swimlane) => [
        swimlane.id,
        {
          id: swimlane.id,
          label: swimlane.name,
          tasks: [] as TaskItem[],
        },
      ]),
    );

    const unassigned: TaskItem[] = [];

    for (const task of tasks) {
      const matchedSwimlane = customSwimlanes.find((swimlane) =>
        this.taskMatchesSwimlane(task, swimlane),
      );

      if (!matchedSwimlane) {
        unassigned.push(task);
        continue;
      }

      lanesById.get(matchedSwimlane.id)?.tasks.push(task);
    }

    const filledLanes = [...lanesById.values()].filter((lane) => lane.tasks.length > 0);

    if (unassigned.length > 0) {
      filledLanes.push({
        id: 'custom-unassigned',
        label: 'Unassigned',
        tasks: unassigned,
      });
    }

    return filledLanes;
  }

  private taskMatchesSwimlane(task: TaskItem, swimlane: SwimlaneRule): boolean {
    if (swimlane.criteriaType === 'priority') {
      return task.priority === swimlane.criteriaValue;
    }

    if (swimlane.criteriaType === 'column') {
      return task.columnId === swimlane.criteriaValue;
    }

    return this.getDueStatusForTask(task) === swimlane.criteriaValue;
  }

  private getDueStatusForTask(task: TaskItem): string {
    const startOfToday = this.startOfDay(new Date());
    const endOfWeek = new Date(startOfToday);
    endOfWeek.setDate(startOfToday.getDate() + 7);

    if (!task.dueDate) {
      return 'noDueDate';
    }

    const dueDate = this.startOfDay(new Date(`${task.dueDate}T00:00:00`));

    if (dueDate < startOfToday) {
      return 'overdue';
    }

    if (dueDate.getTime() === startOfToday.getTime()) {
      return 'today';
    }

    if (dueDate <= endOfWeek) {
      return 'next7days';
    }

    return 'later';
  }

  private startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private sortColumns(columns: BoardColumn[]): BoardColumn[] {
    return [...columns].sort((left, right) => left.order - right.order);
  }

  private sortTasks(tasks: TaskItem[]): TaskItem[] {
    return [...tasks].sort((left, right) => left.order - right.order);
  }
}
