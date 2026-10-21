"use client";

import { ShoppingCart } from "lucide-react";
import { useState } from "react";
import { dateFromKey, timeLabel, weekdayShort, type ClockFormat } from "@/lib/wall/format";
import { dayKey } from "@/lib/wall/sample-data";
import { addMissingIngredients } from "@/lib/wall/store";
import type { Meal, WallData } from "@/lib/wall/types";

type MealsTabProps = {
  now: Date;
  timeFormat: ClockFormat;
  data: WallData;
};

/** "6:15 PM" on the given day, as a timestamp. */
function serveTime(day: Date, serveAt: string): number | null {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(serveAt.trim());
  if (!match) {
    return null;
  }
  let hours = Number(match[1]) % 12;
  if (match[3].toUpperCase() === "PM") {
    hours += 12;
  }
  const at = new Date(day);
  at.setHours(hours, Number(match[2]), 0, 0);
  return at.getTime();
}

function CookingCard({
  meal,
  date,
  now,
  timeFormat,
}: {
  meal: Meal;
  date: string;
  now: Date;
  timeFormat: ClockFormat;
}) {
  const [doneSteps, setDoneSteps] = useState<number[]>([]);
  const day = dateFromKey(date);
  const serve = meal.serveAt ? serveTime(day, meal.serveAt) : null;
  const nowMs = now.getTime();
  const timeline = (meal.timeline ?? []).map((step) => ({
    ...step,
    at: serve === null ? null : serve - step.before * 60_000,
  }));
  const nextIndex = timeline.findIndex((step) => step.at !== null && step.at >= nowMs);
  const missing = meal.ingredients?.filter((ingredient) => !ingredient.have) ?? [];
  const currentStep = (meal.steps ?? []).findIndex((_, index) => !doneSteps.includes(index));

  function toggleStep(index: number) {
    setDoneSteps((current) =>
      current.includes(index) ? current.filter((entry) => entry !== index) : [...current, index],
    );
  }

  return (
    <section className="w-card w-cook" aria-label="Tonight's dinner">
      <div className="w-cook-top">
        <div>
          <span className="w-label">
            Dinner{meal.serveAt ? ` · on the table ${meal.serveAt}` : ""}
          </span>
          <h2 className="w-cook-name w-serif">{meal.name}</h2>
          <p className="w-cook-sub">Planned by {meal.setBy}. Tap a step when it&apos;s done.</p>
        </div>
        {meal.heat ? (
          <div className="w-heat">
            <span className="w-label">Oven</span>
            <span className="w-heat-value w-num">{meal.heat.setting}</span>
            <span className="w-heat-detail">{meal.heat.detail}</span>
          </div>
        ) : null}
      </div>

      <div className="w-cook-cols">
        <div className="w-cook-col">
          <span className="w-label">Timeline</span>
          <div className="w-tl">
            {timeline.map((step, index) => {
              const past = step.at !== null && step.at < nowMs;
              const cls = past ? "is-past" : index === nextIndex ? "is-next" : "";
              return (
                <div key={step.label} style={{ display: "contents" }}>
                  <b className={`w-num ${cls}`}>
                    {step.at === null ? `−${step.before}m` : timeLabel(step.at, timeFormat)}
                  </b>
                  <span className={cls}>{step.label}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="w-cook-col">
          <span className="w-label">Prep</span>
          <div className="w-prep">
            {(meal.prep ?? []).map((item) => (
              <div key={item.item}>
                <b>{item.item}</b>
                <span>{item.cut}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="w-cook-col">
          <span className="w-label">Steps</span>
          <div className="w-steps">
            {(meal.steps ?? []).map((step, index) => (
              <button
                key={step}
                type="button"
                className={`w-step${doneSteps.includes(index) ? " is-done" : ""}${index === currentStep ? " is-current" : ""}`}
                onClick={() => toggleStep(index)}
                aria-pressed={doneSteps.includes(index)}
              >
                <span className="w-num">{index + 1}</span>
                <span>{step}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {meal.ingredients ? (
        <div className="w-ingredients">
          {meal.ingredients.map((ingredient) => (
            <span key={ingredient.name} className={`w-ing${ingredient.have ? "" : " is-missing"}`}>
              {ingredient.name}
              {ingredient.qty ? ` · ${ingredient.qty}` : ""}
            </span>
          ))}
          <button
            type="button"
            className="w-btn w-btn--solid"
            disabled={!missing.length}
            onClick={() => addMissingIngredients(date, "Wall")}
          >
            <ShoppingCart aria-hidden size="1.2em" />
            Add {missing.length} missing to list
          </button>
        </div>
      ) : null}
    </section>
  );
}

function SimpleDinner({ meal }: { meal: Meal }) {
  return (
    <section className="w-card w-cook w-simple-dinner" aria-label="Dinner">
      <div className="w-cook-top">
        <div>
          <span className="w-label">Dinner{meal.serveAt ? ` · ${meal.serveAt}` : ""}</span>
          <h2 className="w-cook-name w-serif">{meal.name}</h2>
          <p className="w-cook-sub">
            Planned by {meal.setBy}. The full recipe card shows up here once a bot sends prep
            details.
          </p>
        </div>
        {meal.heat ? (
          <div className="w-heat">
            <span className="w-label">Heat</span>
            <span className="w-heat-value w-num">{meal.heat.setting}</span>
            <span className="w-heat-detail">{meal.heat.detail}</span>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default function MealsTab({ now, timeFormat, data }: MealsTabProps) {
  const todayKey = dayKey(now);
  const [selected, setSelected] = useState(todayKey);
  const day = data.meals.find((entry) => entry.date === selected) ?? data.meals[0];
  const dinner = day?.meals.find((meal) => meal.slot === "dinner");
  const others = day?.meals.filter((meal) => meal.slot !== "dinner") ?? [];
  const isToday = day?.date === todayKey;

  return (
    <div className="w-meals">
      <div className="w-head">
        <h1>
          Meals <i>{isToday ? "today" : day ? weekdayShort(dateFromKey(day.date)) : ""}</i>
        </h1>
      </div>
      <div className="w-meals-body">
        {dinner ? (
          dinner.steps ? (
            <CookingCard
              key={day.date}
              meal={dinner}
              date={day.date}
              now={now}
              timeFormat={timeFormat}
            />
          ) : (
            <SimpleDinner meal={dinner} />
          )
        ) : (
          <section className="w-card w-cook w-simple-dinner">
            <h2 className="w-cook-name w-serif">No dinner planned</h2>
          </section>
        )}
        <aside className="w-meals-side">
          {others.length ? (
            <div className="w-card">
              {others.map((meal) => (
                <div
                  key={meal.slot}
                  className="w-meal-row"
                  style={{ marginBottom: "calc(10 * var(--u))" }}
                >
                  <span className="w-label">{meal.slot}</span>
                  <span>
                    {meal.name}
                    {meal.forWho ? (
                      <small style={{ color: "var(--mute)" }}> · {meal.forWho}</small>
                    ) : null}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
          <div className="w-card" style={{ flex: 1 }}>
            <span className="w-label" style={{ marginBottom: "calc(10 * var(--u))" }}>
              Dinners this week
            </span>
            <div className="w-week-dinners">
              {data.meals.map((entry) => {
                const meal = entry.meals.find((m) => m.slot === "dinner");
                return (
                  <button
                    key={entry.date}
                    type="button"
                    className={`w-week-dinner${entry.date === day?.date ? " is-on" : ""}`}
                    onClick={() => setSelected(entry.date)}
                  >
                    <b>
                      {entry.date === todayKey ? "Today" : weekdayShort(dateFromKey(entry.date))}
                    </b>
                    <span>
                      {meal?.name ?? "Not planned"}
                      {entry.defrost ? <small>{entry.defrost}</small> : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
