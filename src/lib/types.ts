export type TaskStatus = "open" | "done" | "dropped";
export type TaskKind = "deep" | "admin" | "quick" | "meeting";
export interface Task {
  id: string;
  title: string;
  notes: string | null;
  status: TaskStatus;
  priority: 1 | 2 | 3;
  kind: TaskKind | null;
  owner: string | null;
  due_at: number | null;
  est_minutes: number | null;
  actual_minutes: number | null;
  parent_id: string | null;
  source: "chat" | "braindump";
  postponed_count: number;
  created_at: number;
  completed_at: number | null;
}
export interface Reminder {
  id: string;
  task_id: string;
  remind_at: number;
  schedule_id: string | null;
  fired: 0 | 1;
  cancelled: 0 | 1;
}
export interface Notification {
  id: string;
  task_id: string | null;
  message: string;
  created_at: number;
  read_at: number | null;
}
export interface TaskView extends Task {
  isOverdue: boolean;
  needsAttention: boolean;
}
export interface AgentState {
  timezone: string;
  openTasks: TaskView[];
  unreadNotifications: Notification[];
}
