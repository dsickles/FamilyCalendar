export type CalendarViewMode = "month" | "week" | "day";

export interface CalendarViewState {
  mode: CalendarViewMode;
  anchorDate: string;
  selectedWeekStart?: string;
  selectedDay?: string;
  activeFilters: string[];
  lastInteractionAt: number;
}
