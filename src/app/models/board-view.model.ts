import { TaskPriority } from './task.model';
import { SwimlaneMode } from './swimlane.model';

export type { SwimlaneMode } from './swimlane.model';

export interface TaskFilterState {
  search: string;
  priority: TaskPriority | 'all';
  columnId: string | 'all';
  swimlane: SwimlaneMode;
}

export interface SwimlaneGroup {
  id: string;
  label: string;
  tasksCount: number;
}
