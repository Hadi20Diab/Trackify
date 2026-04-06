export interface BoardColumn {
  id: string;
  boardId: string;
  title: string;
  order: number;
  createdAt: string;
}

export interface CreateColumnPayload {
  boardId: string;
  title: string;
}
