"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import BotPanel from "@/components/wall/BotPanel";
import MealsTab from "@/components/wall/MealsTab";
import Rail, { TABS, type WallTab } from "@/components/wall/Rail";
import ShoppingTab from "@/components/wall/ShoppingTab";
import TodayTab from "@/components/wall/TodayTab";
import TodosTab from "@/components/wall/TodosTab";
import { Slideshow } from "@/components/wall/parts";
import { clockParts, type ClockFormat } from "@/lib/wall/format";
import { NowProvider, useNow } from "@/lib/wall/now";
import { SAMPLE_PHOTOS, dayKey } from "@/lib/wall/sample-data";
import { useWallData } from "@/lib/wall/store";
import { useWallEvents } from "@/lib/wall/useWallEvents";

type WallAppProps = {
  timeFormat: ClockFormat;
  idleTimeoutMs: number;
  isDemoMode: boolean;
  calendar: ReactNode;
  lock: ReactNode;
};

function noSubscribe() {
  return () => {};
}

function tabFromHash(): WallTab | null {
  const hash = window.location.hash.replace("#", "");
  return TABS.some((tab) => tab.id === hash) ? (hash as WallTab) : null;
}

function PhotosTab({ timeFormat }: { timeFormat: ClockFormat }) {
  const { now } = useNow();
  const [index, setIndex] = useState(0);
  const clock = clockParts(now, timeFormat);
  return (
    <button
      type="button"
      className="w-photos-full"
      aria-label="Next photo"
      onClick={() => setIndex((current) => (current + 1) % SAMPLE_PHOTOS.length)}
    >
      <Slideshow width={1920} height={1080} index={index} onIndex={setIndex} />
      <span className="w-photos-clock w-num">
        {clock.time}
        {clock.suffix ? (
          <small style={{ fontSize: "0.4em", marginLeft: "0.2em" }}>{clock.suffix}</small>
        ) : null}
      </span>
    </button>
  );
}

function Wall({ timeFormat, idleTimeoutMs, isDemoMode, calendar, lock }: WallAppProps) {
  const { now } = useNow();
  // Deep links such as /wall#meals open that tab.
  const [tab, setTab] = useState<WallTab>(() => tabFromHash() ?? "today");
  const [botsOpen, setBotsOpen] = useState(false);
  const [lastTouch, setLastTouch] = useState(0);
  const data = useWallData();
  const { people, events, sample } = useWallEvents(isDemoMode, dayKey(now));

  useEffect(() => {
    if (window.location.hash !== `#${tab}`) {
      window.history.replaceState(null, "", tab === "today" ? window.location.pathname : `#${tab}`);
    }
  }, [tab]);

  // After the idle timeout with no touch, any tab returns to Today.
  // Photos is left alone: a slideshow is an ambient screen too.
  useEffect(() => {
    if (tab === "today" || tab === "photos") {
      return;
    }
    const id = window.setTimeout(() => {
      setTab("today");
      setBotsOpen(false);
    }, idleTimeoutMs);
    return () => window.clearTimeout(id);
  }, [tab, lastTouch, idleTimeoutMs]);

  function go(next: WallTab) {
    setTab(next);
    setBotsOpen(false);
  }

  return (
    <div className="w-stage" onPointerDown={() => setLastTouch(Date.now())}>
      <Rail
        tab={tab}
        onTab={go}
        now={now}
        timeFormat={timeFormat}
        lock={lock}
        botsOpen={botsOpen}
        onBots={() => setBotsOpen((open) => !open)}
      />
      <main className="w-views" aria-label="Family wall">
        {tab === "today" ? (
          <section className="w-view" aria-label="Today">
            <TodayTab
              now={now}
              timeFormat={timeFormat}
              people={people}
              events={events}
              data={data}
              onGo={go}
            />
          </section>
        ) : null}
        {/* The calendar stays mounted so its view and filters survive tab switches. */}
        <section className="w-view" aria-label="Calendar" hidden={tab !== "calendar"}>
          <div className="w-calendar">{calendar}</div>
        </section>
        {tab === "meals" ? (
          <section className="w-view" aria-label="Meals">
            <MealsTab now={now} timeFormat={timeFormat} data={data} />
          </section>
        ) : null}
        {tab === "shopping" ? (
          <section className="w-view" aria-label="Shopping">
            <ShoppingTab now={now} data={data} />
          </section>
        ) : null}
        {tab === "todos" ? (
          <section className="w-view" aria-label="To-dos">
            <TodosTab now={now} data={data} people={people} />
          </section>
        ) : null}
        {tab === "photos" ? (
          <section className="w-view w-view--bleed" aria-label="Photos">
            <PhotosTab timeFormat={timeFormat} />
          </section>
        ) : null}
        {botsOpen ? <BotPanel data={data} onClose={() => setBotsOpen(false)} /> : null}
        {sample && tab !== "photos" ? (
          <span className="w-sample-flag">Prototype · sample data</span>
        ) : null}
      </main>
    </div>
  );
}

export default function WallApp(props: WallAppProps) {
  // The wall reads localStorage and the clock, so it renders after mount.
  const mounted = useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false,
  );

  return (
    <div className="w-root">
      {mounted ? (
        <NowProvider>
          <Wall {...props} />
        </NowProvider>
      ) : (
        <div className="w-boot" aria-hidden />
      )}
    </div>
  );
}
