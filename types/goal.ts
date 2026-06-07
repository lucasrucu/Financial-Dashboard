export interface Goal {
  id: string;
  name: string;
  target_usd: number;
  saved_usd: number;
  deadline: string | null;
}

export interface GoalUpdatePayload {
  target_usd?: number;
  saved_usd?: number;
  deadline?: string | null;
  name?: string;
}

export interface GoalCreatePayload {
  name: string;
  target_usd: number;
  saved_usd?: number;
  deadline?: string | null;
}
