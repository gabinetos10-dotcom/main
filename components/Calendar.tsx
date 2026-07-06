"use client";

import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isBefore,
  isSameDay,
  isSameMonth,
  isWithinInterval,
  parseISO,
  startOfMonth,
  startOfToday,
  subMonths,
} from "date-fns";
import { fr } from "date-fns/locale";
import type { BookedRange } from "./types";

// Custom range calendar. Days already booked for the selected vehicle
// are grayed out and cannot be selected; a range containing a booked
// day cannot be completed.
export default function Calendar({
  booked,
  start,
  end,
  onChange,
}: {
  booked: BookedRange[];
  start: Date | null;
  end: Date | null;
  onChange: (start: Date | null, end: Date | null) => void;
}) {
  const today = startOfToday();
  const [month, setMonth] = useState(startOfMonth(today));

  const bookedIntervals = useMemo(
    () =>
      booked.map((r) => ({
        start: parseISO(r.start),
        end: parseISO(r.end),
      })),
    [booked]
  );

  const isBooked = (day: Date) =>
    bookedIntervals.some((r) => isWithinInterval(day, r));

  const rangeHasBooked = (a: Date, b: Date) =>
    eachDayOfInterval({ start: a, end: b }).some(isBooked);

  const days = useMemo(() => {
    const first = startOfMonth(month);
    const last = endOfMonth(month);
    // Monday-first grid padding
    const lead = (first.getDay() + 6) % 7;
    const cells: (Date | null)[] = Array(lead).fill(null);
    eachDayOfInterval({ start: first, end: last }).forEach((d) => cells.push(d));
    return cells;
  }, [month]);

  const pick = (day: Date) => {
    if (isBefore(day, today) || isBooked(day)) return;
    if (!start || (start && end)) {
      onChange(day, null);
      return;
    }
    // completing the range
    if (isBefore(day, start)) {
      onChange(day, null);
      return;
    }
    if (rangeHasBooked(start, day)) {
      // an occupied day sits inside — restart from the clicked day
      onChange(day, null);
      return;
    }
    onChange(start, day);
  };

  const inRange = (day: Date) =>
    start && end && isWithinInterval(day, { start, end });

  return (
    <div className="select-none rounded-2xl border border-noir-line bg-noir-card p-4 md:p-5">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonth(subMonths(month, 1))}
          disabled={isSameMonth(month, today)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-noir-line text-white transition-colors hover:border-blood disabled:opacity-30 disabled:hover:border-noir-line"
          aria-label="Mois précédent"
        >
          ←
        </button>
        <span className="font-display text-sm font-bold uppercase tracking-[0.2em] text-white">
          {format(month, "MMMM yyyy", { locale: fr })}
        </span>
        <button
          type="button"
          onClick={() => setMonth(addMonths(month, 1))}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-noir-line text-white transition-colors hover:border-blood"
          aria-label="Mois suivant"
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
          <span key={i} className="pb-2 text-[10px] uppercase tracking-widest text-smoke">
            {d}
          </span>
        ))}
        {days.map((day, i) => {
          if (!day) return <span key={`pad-${i}`} />;
          const past = isBefore(day, today);
          const occupied = isBooked(day);
          const disabled = past || occupied;
          const isStart = start && isSameDay(day, start);
          const isEnd = end && isSameDay(day, end);
          const selected = isStart || isEnd;
          const between = inRange(day) && !selected;

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => pick(day)}
              disabled={disabled}
              title={occupied ? "Déjà réservé" : undefined}
              className={[
                "relative flex aspect-square items-center justify-center rounded-lg text-sm transition-all duration-200",
                disabled
                  ? occupied
                    ? "cursor-not-allowed text-smoke/30 line-through decoration-blood/50"
                    : "cursor-not-allowed text-smoke/20"
                  : "text-smoke-light hover:bg-blood/15 hover:text-white",
                selected ? "bg-blood font-bold text-white shadow-[0_0_18px_rgba(225,29,46,0.45)]" : "",
                between ? "bg-blood/20 text-white" : "",
              ].join(" ")}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center gap-5 border-t border-noir-line pt-3 text-[10px] uppercase tracking-widest text-smoke">
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-blood" /> Sélection
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-noir-line line-through" /> Indisponible
        </span>
      </div>
    </div>
  );
}
