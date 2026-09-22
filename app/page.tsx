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
    <div className="kiosk-frame">
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
              previewDemo={previewDemo}
            />
          }
        />
        </main>
      </div>
    </div>
  );
}
