import CalendarViewMachine from "@/components/calendar/CalendarViewMachine";
import LockControl from "@/components/layout/LockControl";
import RotateNotice from "@/components/layout/RotateNotice";
import WallApp from "@/components/wall/WallApp";
import { getDashboardConfig } from "@/lib/config";

// Prototype of the tabbed wall from the redesign plan. It sits beside the
// current wall at / and shares its PIN gate, calendar and weather. Meals,
// shopping, to-dos, notes and photos are sample data kept in this browser.
export default async function WallPage({ searchParams }: PageProps<"/wall">) {
  const config = getDashboardConfig();
  const params = await searchParams;
  const previewDemo = process.env.NODE_ENV === "development" && params.demo === "1";

  return (
    <>
      <RotateNotice />
      <div className="kiosk-frame">
        <div className="kiosk-fit">
          <div className="kiosk-stage">
            <WallApp
              timeFormat={config.timeFormat}
              idleTimeoutMs={config.idleTimeoutMs}
              isDemoMode={config.isDemoMode || previewDemo}
              lock={config.isDemoMode ? null : <LockControl />}
              calendar={
                <CalendarViewMachine
                  timezone={config.timezone}
                  weekStartDay={config.weekStartDay}
                  timeFormat={config.timeFormat}
                  idleTimeoutMs={config.idleTimeoutMs}
                  previewDemo={previewDemo}
                  monthTimes
                />
              }
            />
          </div>
        </div>
      </div>
    </>
  );
}
