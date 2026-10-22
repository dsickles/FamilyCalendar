"use client";

import {
  Check,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSnow,
  CloudSun,
  Moon,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";
import { SAMPLE_PHOTOS, photoUrl } from "@/lib/wall/sample-data";
import type { WallPerson } from "@/lib/wall/types";

export function personStyle(person: WallPerson): CSSProperties {
  return { "--c": person.color, "--c-ink": person.ink } as CSSProperties;
}

export function Avatar({ person, size }: { person: WallPerson; size: number }) {
  return (
    <span
      className="w-avatar"
      style={{
        ...personStyle(person),
        width: `calc(${size} * var(--u))`,
        height: `calc(${size} * var(--u))`,
        fontSize: `calc(${Math.round(size * 0.48)} * var(--u))`,
      }}
      aria-hidden
    >
      {person.id === "family" ? "★" : person.name[0]}
    </span>
  );
}

export function CheckBox({ on }: { on: boolean }) {
  return <span className="w-check">{on ? <Check strokeWidth={3.5} aria-hidden /> : null}</span>;
}

const WEATHER_ICONS: Record<string, LucideIcon> = {
  Sun,
  Moon,
  CloudSun,
  CloudMoon,
  Cloud,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudSnow,
  CloudLightning,
};

export function WeatherIcon({ name }: { name: string }) {
  const Icon = WEATHER_ICONS[name] ?? Cloud;
  return <Icon aria-hidden strokeWidth={1.8} />;
}

const SLIDE_MS = 20_000;

/**
 * Crossfading slideshow. Only the current and next photo are in the DOM,
 * so memory stays flat however many photos the folder holds.
 */
export function Slideshow({
  width,
  height,
  offset = 0,
  showCaption = true,
  index: controlled,
  onIndex,
}: {
  width: number;
  height: number;
  offset?: number;
  showCaption?: boolean;
  index?: number;
  onIndex?: (next: number) => void;
}) {
  const [own, setOwn] = useState(0);
  const index = controlled ?? own;
  const setIndex = onIndex ?? setOwn;
  const [failed, setFailed] = useState<Record<number, boolean>>({});
  const count = SAMPLE_PHOTOS.length;

  useEffect(() => {
    const id = window.setTimeout(() => setIndex((index + 1) % count), SLIDE_MS);
    return () => window.clearTimeout(id);
  }, [index, count, setIndex]);

  // Previous (fading out), current, and next (preloading).
  const shown = [(index + count - 1) % count, index, (index + 1) % count];
  return (
    <div className="w-slides">
      {shown.map((i, slot) => {
        const photo = SAMPLE_PHOTOS[(i + offset) % count];
        return (
          <div
            key={photo.id}
            className={`w-slide${slot === 1 ? " is-on" : ""}`}
            style={{ background: `linear-gradient(135deg, ${photo.tint}, #1b1b1b)` }}
            aria-hidden={slot !== 1}
          >
            {failed[photo.id] ? null : (
              // Sample photos stand in for the Drive folder; next/image would
              // need a remote pattern for a host the live wall won't use.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoUrl(photo.id, width, height)}
                alt={slot === 1 ? photo.caption : ""}
                onError={() => setFailed((current) => ({ ...current, [photo.id]: true }))}
              />
            )}
            {showCaption ? (
              <div className="w-slide-cap">
                <b>{photo.when}</b>
                <span>{photo.caption}</span>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
