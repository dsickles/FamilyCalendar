"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

type ViewToolbarProps = {
  title: string;
  previousLabel: string;
  nextLabel: string;
  onPrevious: () => void;
  onNext: () => void;
  onShowWeek?: () => void;
  onShowFourWeeks?: () => void;
};

const textButtonClass =
  "inline-flex min-h-11 items-center justify-center rounded-full px-3 text-sm font-medium text-text-primary ring-1 ring-white/15";

const chevronButtonClass =
  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-text-primary";

export default function ViewToolbar({
  title,
  previousLabel,
  nextLabel,
  onPrevious,
  onNext,
  onShowWeek,
  onShowFourWeeks,
}: ViewToolbarProps) {
  return (
    <div className="grid shrink-0 grid-cols-[7rem_minmax(0,1fr)_7rem] items-center">
      <div className="flex items-center">
        {onShowWeek ? (
          <button type="button" className={textButtonClass} onClick={onShowWeek}>
            Week
          </button>
        ) : null}
      </div>
      <div className="flex min-w-0 items-center justify-center gap-1">
        <button type="button" className={chevronButtonClass} aria-label={previousLabel} onClick={onPrevious}>
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </button>
        <h2 className="min-w-0 truncate px-1 text-center text-lg text-text-primary">{title}</h2>
        <button type="button" className={chevronButtonClass} aria-label={nextLabel} onClick={onNext}>
          <ChevronRight className="h-5 w-5" aria-hidden />
        </button>
      </div>
      <div className="flex items-center justify-end">
        {onShowFourWeeks ? (
          <button type="button" className={textButtonClass} onClick={onShowFourWeeks}>
            4 weeks
          </button>
        ) : null}
      </div>
    </div>
  );
}
