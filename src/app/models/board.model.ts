export interface Board {
  id: string;
  title: string;
  description: string;
  createdAt: string;
}

export interface CreateBoardPayload {
  title: string;
  description: string;
}
