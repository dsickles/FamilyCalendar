import type { ReactNode } from "react";

type DashboardShellProps = {
  clock: ReactNode;
  weather: ReactNode;
  main: ReactNode;
  lock?: ReactNode;
};

export default function DashboardShell({
  clock,
  weather,
  main,
  lock,
}: DashboardShellProps) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <header className="flex items-center gap-6 px-6 pt-4 pb-2">
        <div className="min-w-0 shrink-0">{clock}</div>
        <div className="ml-auto flex min-w-0 items-center gap-4">
          {weather}
          {lock ? <div className="shrink-0">{lock}</div> : null}
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-hidden">{main}</div>
    </div>
  );
}
