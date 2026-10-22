"use client";

import { Car, X } from "lucide-react";
import { Avatar, Slideshow, WeatherIcon, personStyle } from "@/components/wall/parts";
import type { WallTab } from "@/components/wall/Rail";
import { useWeather } from "@/lib/hooks/useWeather";
import { describeWeatherCode } from "@/lib/wmo-codes";
import {
  clockParts,
  dueLabel,
  minutesLabel,
  monthDay,
  rangeLabel,
  timeLabel,
  weekdayLong,
  weekdayShort,
  type ClockFormat,
} from "@/lib/wall/format";
import { FAMILY, SAMPLE_WEATHER, TRAVEL_BUFFER_MIN, dayKey } from "@/lib/wall/sample-data";
import { dismissNote } from "@/lib/wall/store";
import type { WallData, WallEvent, WallPerson } from "@/lib/wall/types";

type TodayTabProps = {
  now: Date;
  timeFormat: ClockFormat;
  people: WallPerson[];
  events: WallEvent[];
  data: WallData;
  onGo: (tab: WallTab) => void;
};

function sameDay(ms: number, day: Date): boolean {
  const date = new Date(ms);
  return (
    date.getFullYear() === day.getFullYear() &&
    date.getMonth() === day.getMonth() &&
    date.getDate() === day.getDate()
  );
}

// With live weather the strip shows the next five days: /api/weather only
// asks Open-Meteo for daily data today. The hourly strip in the sample is
// what the plan adds next.
function Weather() {
  const { data } = useWeather();
  const live = data?.weather ?? null;

  if (!live) {
    const w = SAMPLE_WEATHER;
    return (
      <div className="w-wx">
        <div className="w-wx-now">
          <WeatherIcon name={w.icon} />
          <span className="w-wx-temp w-num">{w.temp}°</span>
          <span className="w-wx-meta">
            <b>{w.label}</b>
            <span>
              H {w.hi}° · L {w.lo}°
            </span>
          </span>
        </div>
        <p className="w-wx-say">
          <i>{w.summary}</i> {w.advice}
        </p>
        <div className="w-wx-hours">
          {w.hourly.map((hour) => (
            <div key={hour.label} className={`w-hr${hour.wet ? " is-wet" : ""}`}>
              <small>{hour.label}</small>
              <WeatherIcon name={hour.icon} />
              <b>{hour.temp}°</b>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const info = describeWeatherCode(live.current.weatherCode);
  const today = live.daily[0];
  const wetDay = live.daily.find((day) => day.precipitationProbability >= 50);
  return (
    <div className="w-wx">
      <div className="w-wx-now">
        <WeatherIcon name={info.icon} />
        <span className="w-wx-temp w-num">{Math.round(live.current.temperature)}°</span>
        <span className="w-wx-meta">
          <b>{info.label}</b>
          {today ? (
            <span>
              H {Math.round(today.temperatureMax)}° · L {Math.round(today.temperatureMin)}°
            </span>
          ) : null}
        </span>
      </div>
      <p className="w-wx-say">
        <i>Feels like {Math.round(live.current.apparentTemperature)}°.</i>{" "}
        {wetDay
          ? `Rain likely ${wetDay === today ? "today" : weekdayLong(new Date(`${wetDay.date}T12:00`))}.`
          : "Dry for the next few days."}
      </p>
      <div className="w-wx-hours">
        {live.daily.slice(0, 5).map((day, index) => {
          const dayInfo = describeWeatherCode(day.weatherCode);
          return (
            <div
              key={day.date}
              className={`w-hr${day.precipitationProbability >= 50 ? " is-wet" : ""}`}
            >
              <small>{index === 0 ? "Today" : weekdayShort(new Date(`${day.date}T12:00`))}</small>
              <WeatherIcon name={dayInfo.icon} />
              <b>
                {Math.round(day.temperatureMax)}° / {Math.round(day.temperatureMin)}°
              </b>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Hero({
  now,
  timeFormat,
  events,
  people,
  onGo,
}: {
  now: Date;
  timeFormat: ClockFormat;
  events: WallEvent[];
  people: WallPerson[];
  onGo: (tab: WallTab) => void;
}) {
  const nowMs = now.getTime();
  const upcoming = events
    .filter((event) => !event.allDay && sameDay(event.start, now) && event.start > nowMs)
    .sort((a, b) => a.start - b.start);
  const next = upcoming[0];

  if (!next) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const first = events
      .filter((event) => !event.allDay && sameDay(event.start, tomorrow))
      .sort((a, b) => a.start - b.start)[0];
    return (
      <button type="button" className="w-hero w-hero--empty" onClick={() => onGo("calendar")}>
        <span className="w-label w-label--on">Rest of today</span>
        <span className="w-hero-title w-serif">
          Nothing else scheduled. <i>Enjoy the quiet.</i>
        </span>
        {first ? (
          <span className="w-hero-meta">
            Tomorrow starts with <b>{first.title}</b> at {timeLabel(first.start, timeFormat)}
          </span>
        ) : null}
      </button>
    );
  }

  const person = people.find((entry) => entry.id === next.personId) ?? FAMILY;
  const mins = (next.start - nowMs) / 60_000;
  const leave = mins - TRAVEL_BUFFER_MIN;
  const start = clockParts(new Date(next.start), timeFormat);
  return (
    <button
      type="button"
      className="w-hero"
      style={personStyle(person)}
      onClick={() => onGo("calendar")}
    >
      <span className="w-hero-main">
        <span className="w-label w-label--on">
          Next up · {person.id === "family" ? "Everyone" : person.name}
        </span>
        <span className="w-hero-title w-serif">{next.title}</span>
        <span className="w-hero-meta">
          {rangeLabel(next.start, next.end, timeFormat)}
          {next.location ? ` · ${next.location}` : ""}
        </span>
        <span className="w-hero-foot">
          {next.location ? (
            leave <= 0 ? (
              <span className="w-pill w-pill--now">Leave now</span>
            ) : (
              <span className={`w-pill${leave <= 15 ? " w-pill--soon" : ""}`}>
                <Car aria-hidden size="1.1em" /> Leave in {minutesLabel(leave)}
              </span>
            )
          ) : null}
          {upcoming[1] ? (
            <span className="w-hero-meta">
              Then {upcoming[1].title} at {timeLabel(upcoming[1].start, timeFormat)}
            </span>
          ) : null}
        </span>
      </span>
      {mins < 100 ? (
        <span className="w-hero-count w-num">
          {Math.round(mins)}
          <small>min</small>
        </span>
      ) : (
        <span className="w-hero-count w-num">
          {start.time}
          {start.suffix ? <small>{start.suffix}</small> : null}
        </span>
      )}
    </button>
  );
}

function Lanes({
  now,
  timeFormat,
  events,
  people,
  onGo,
}: {
  now: Date;
  timeFormat: ClockFormat;
  events: WallEvent[];
  people: WallPerson[];
  onGo: (tab: WallTab) => void;
}) {
  const nowMs = now.getTime();
  return (
    <div className="w-lanes">
      {people.map((person) => {
        const list = events
          .filter(
            (event) =>
              event.personId === person.id &&
              !event.allDay &&
              sameDay(event.start, now) &&
              event.end > nowMs,
          )
          .sort((a, b) => a.start - b.start);
        const shown = list.slice(0, 4);
        const more = list.length - shown.length;
        return (
          <div key={person.id} className="w-lane" style={personStyle(person)}>
            <div className="w-lane-head">
              <Avatar person={person} size={36} />
              <b>{person.name}</b>
            </div>
            {shown.length ? (
              shown.map((event) => {
                const current = event.start <= nowMs;
                return (
                  <div key={event.id} className={`w-ev${current ? " is-now" : ""}`}>
                    <span className="w-ev-t">
                      {current ? "Now" : timeLabel(event.start, timeFormat)}
                    </span>
                    <span className="w-ev-n">{event.title}</span>
                  </div>
                );
              })
            ) : (
              <p className="w-free">
                <i>Free</i> the rest of the day
              </p>
            )}
            {more > 0 ? (
              <button type="button" className="w-more" onClick={() => onGo("calendar")}>
                +{more} more
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export default function TodayTab({ now, timeFormat, people, events, data, onGo }: TodayTabProps) {
  const clock = clockParts(now, timeFormat);
  const nowMs = now.getTime();
  const note = data.notes.find((entry) => entry.until > nowMs);
  const allDay = events.filter((event) => event.allDay && sameDay(event.start, now));
  const today = data.meals.find((day) => day.date === dayKey(now));
  const dinner = today?.meals.find((meal) => meal.slot === "dinner");
  const openItems = data.shopping.filter((item) => !item.done);
  const dueTodos = data.todos
    .filter((todo) => {
      const tone = !todo.done && todo.due ? dueLabel(todo.due, now).tone : null;
      return tone === "late" || tone === "today";
    })
    .slice(0, 3);

  return (
    <div className="w-today">
      <header className="w-today-head">
        <div className="w-clock">
          <div className="w-clock-time w-num">
            {clock.time}
            {clock.suffix ? <span className="w-clock-suffix">{clock.suffix}</span> : null}
          </div>
          <div className="w-clock-date">
            <b>{weekdayLong(now)}</b>
            {monthDay(now)}
            {allDay.length ? ` · ${allDay.map((event) => event.title).join(", ")}` : ""}
          </div>
        </div>
        <Weather />
      </header>

      {note ? (
        <div className="w-banner" role="status">
          <span className="w-banner-text">{note.text}</span>
          <span className="w-banner-by">from {note.by}</span>
          <button
            type="button"
            className="w-icon-btn"
            aria-label="Dismiss note"
            onClick={() => dismissNote(note.id, "Wall")}
          >
            <X aria-hidden />
          </button>
        </div>
      ) : (
        <div />
      )}

      <div className="w-today-main">
        <div className="w-today-left">
          <Hero now={now} timeFormat={timeFormat} events={events} people={people} onGo={onGo} />
          <Lanes now={now} timeFormat={timeFormat} events={events} people={people} onGo={onGo} />
        </div>
        <div className="w-today-right">
          <button
            type="button"
            className="w-photo-tile"
            onClick={() => onGo("photos")}
            aria-label="Open photos"
          >
            <Slideshow width={900} height={700} offset={2} />
          </button>
          <button type="button" className="w-card" onClick={() => onGo("meals")}>
            <span className="w-label">
              Dinner tonight{dinner?.serveAt ? ` · ${dinner.serveAt}` : ""}
            </span>
            <span className="w-tile-title w-serif">{dinner?.name ?? "Nothing planned yet"}</span>
            {dinner?.heat ? (
              <span className="w-tile-sub">
                {dinner.heat.setting} · {dinner.heat.detail}
              </span>
            ) : null}
          </button>
          <div className="w-duo">
            <button type="button" className="w-card" onClick={() => onGo("shopping")}>
              <span className="w-label">Shopping</span>
              <span className="w-stat">
                <span className="w-num">{openItems.length}</span>
                <small>to get</small>
              </span>
              <ul className="w-mini-list">
                {openItems.slice(0, 3).map((item) => (
                  <li key={item.id}>
                    <i />
                    <span>{item.name}</span>
                  </li>
                ))}
              </ul>
            </button>
            <button type="button" className="w-card" onClick={() => onGo("todos")}>
              <span className="w-label">To-dos due</span>
              <span className="w-stat">
                <span className="w-num">{dueTodos.length}</span>
                <small>today or late</small>
              </span>
              <ul className="w-mini-list">
                {dueTodos.map((todo) => (
                  <li key={todo.id}>
                    <i />
                    <span>{todo.title}</span>
                  </li>
                ))}
              </ul>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
