export interface Category {
  id: string;
  label: string;
  icon: string;
  color: string;
  is_system: boolean;
  created_at?: string;
}

export interface CategoryCreatePayload {
  label: string;
  icon?: string;
  color?: string;
}

export interface CategoryUpdatePayload {
  label?: string;
  icon?: string;
  color?: string;
}
