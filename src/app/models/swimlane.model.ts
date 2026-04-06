export type SwimlaneMode = 'none' | 'priority' | 'dueDate' | 'custom';
export type SwimlaneCriteriaType = 'priority' | 'column' | 'dueStatus';
export type DueStatusCriteriaValue = 'overdue' | 'today' | 'next7days' | 'later' | 'noDueDate';

export interface SwimlaneRule {
  id: string;
  boardId: string;
  name: string;
  criteriaType: SwimlaneCriteriaType;
  criteriaValue: string;
  createdAt: string;
}

export interface SwimlaneFormPayload {
  name: string;
  criteriaType: SwimlaneCriteriaType;
  criteriaValue: string;
}

export interface CreateSwimlanePayload extends SwimlaneFormPayload {
  boardId: string;
}
