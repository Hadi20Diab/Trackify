import { TaskPriority } from './task.model';

export type SwimlaneMode = 'none' | 'priority' | 'dueDate';

export interface TaskFilterState {
  search: string;
  priority: TaskPriority | 'all';
  columnId: string | 'all';
}

export interface SwimlaneGroup {
  id: string;
  label: string;
  tasksCount: number;
}
