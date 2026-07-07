export interface CardFormErrors {
  title?: string;
  description?: string;
  due_date?: string;
}

export interface CardFormValues {
  title: string;
  description: string;
  due_date: string;
  assignee_id: string;
}

export function isPastDate(dateStr: string): boolean {
  if (!dateStr) return false;
  const [y, m, d] = dateStr.split("-").map(Number);
  const selected = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  selected.setHours(0, 0, 0, 0);
  return selected < today;
}

export function validateCardForm(values: CardFormValues): CardFormErrors {
  const errors: CardFormErrors = {};

  if (!values.title.trim()) {
    errors.title = "Summary is required";
  }

  if (values.due_date && isPastDate(values.due_date)) {
    errors.due_date = "Due date cannot be in the past";
  }

  return errors;
}

export function hasCardFormErrors(errors: CardFormErrors): boolean {
  return Object.keys(errors).length > 0;
}
