export type TaskPriority = 'low' | 'medium' | 'high';

export interface TaskItem {
  id: string;
  boardId: string;
  title: string;
  description: string;
  columnId: string;
  priority: TaskPriority;
  dueDate: string | null;
  order: number;
  createdAt: string;
}

export interface CreateTaskPayload {
  boardId: string;
  title: string;
  description: string;
  columnId: string;
  priority: TaskPriority;
  dueDate: string | null;
}

export interface UpdateTaskPayload {
  title: string;
  description: string;
  columnId: string;
  priority: TaskPriority;
  dueDate: string | null;
}
