import CalendarViewMachine from "@/components/calendar/CalendarViewMachine";
import DashboardShell from "@/components/layout/DashboardShell";
import LockControl from "@/components/layout/LockControl";
import ClockWidget from "@/components/widgets/ClockWidget";
import WeatherWidget from "@/components/widgets/WeatherWidget";
import { getDashboardConfig } from "@/lib/config";

export default async function Home({ searchParams }: PageProps<"/">) {
  const config = getDashboardConfig();
  const params = await searchParams;
  const previewDemo =
    process.env.NODE_ENV === "development" && params.demo === "1";

  return (
    <>
      <div className="kiosk-rotate-notice">
        <div className="kiosk-rotate-card">
          <svg
            className="kiosk-rotate-icon"
            viewBox="0 0 64 64"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="24" y="6" width="16" height="30" rx="3" />
            <path d="M32 12h.01" />
            <path d="M16 40a16 16 0 0 0 28 6" />
            <path d="M44 34v12H32" />
          </svg>
          <h1 className="kiosk-rotate-title">Rotate to landscape</h1>
          <p className="kiosk-rotate-copy">
            Family Calendar is a wall display. Turn your phone sideways to view it.
          </p>
        </div>
      </div>
      <div className="kiosk-frame">
        <div className="kiosk-fit">
          <div className="kiosk-stage">
            <main
              className="relative h-full min-h-0 w-full overflow-hidden bg-[#0a0a0f]"
              aria-label="Family Wall Dashboard"
            >
              <DashboardShell
                lock={config.isDemoMode ? null : <LockControl />}
                clock={
                  <ClockWidget timezone={config.timezone} timeFormat={config.timeFormat} />
                }
                weather={
                  <WeatherWidget
                    timezone={config.timezone}
                    temperatureUnit={config.temperatureUnit}
                    locationName={config.location.displayName}
                  />
                }
                main={
                  <CalendarViewMachine
                    timezone={config.timezone}
                    weekStartDay={config.weekStartDay}
                    timeFormat={config.timeFormat}
                    idleTimeoutMs={config.idleTimeoutMs}
                    previewDemo={previewDemo}
                  />
                }
              />
            </main>
          </div>
        </div>
      </div>
    </>
  );
}
