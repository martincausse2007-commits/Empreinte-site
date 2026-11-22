"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Plus } from "lucide-react";
import type { AbsenceType, AppState, Employee, Shift } from "@/lib/types";
import { ABSENCE_TYPES, absencesForWeek, expectedHours } from "@/lib/absences";
import { holidaysInWeek, isHolidayClosed } from "@/lib/holidays";
import { forWeek } from "@/lib/week";
import { coverage, hoursByEmployee, isUnavailable, rulesOf, serviceActive } from "@/lib/rules";
import { DAYS_SHORT, formatDayDate } from "@/lib/time";
import { POST_COLORS } from "@/lib/colors";
import { Avatar, cx } from "../ui";
import { ShiftChip } from "./ShiftChip";
import { HoursMeter } from "./HoursMeter";
import { groupByPost } from "./helpers";

type Props = {
  state: AppState;
  week: string;
  shifts: Shift[];
  errorShifts: Set<string>;
  onEdit: (shift: Shift) => void;
  onAdd: (employeeId: string, day: number) => void;
  onMove: (shiftId: string, employeeId: string, day: number, copy: boolean) => void;
};

export function WeekGrid({ state, week, shifts, errorShifts, onEdit, onAdd, onMove }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
  );
  const hours = hoursByEmployee(shifts);
  const cov = coverage(forWeek(state, week), shifts);
  const absent = absencesForWeek(state, week);
  const fer = holidaysInWeek(week);
  const active = shifts.find((s) => s.id === activeId);
  const postOf = (id: string) => state.posts.find((p) => p.id === id);

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }
  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    if (!e.over) return;
    const [, employeeId, day] = String(e.over.id).split("|");
    const ev = e.activatorEvent as MouseEvent;
    onMove(String(e.active.id), employeeId, Number(day), Boolean(ev?.altKey));
  }

  const cols = "grid grid-cols-[150px_repeat(7,minmax(112px,1fr))] sm:grid-cols-[210px_repeat(7,minmax(118px,1fr))]";

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
      <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <div className="min-w-[934px] sm:min-w-[1036px]">
          {/* En-tête des jours */}
          <div className={cx(cols, "sticky top-0 z-10 border-b border-slate-200/80 bg-white")}>
            <div className="sticky left-0 z-10 flex items-end bg-white px-3 pb-2 text-xs font-medium text-slate-500 sm:px-4">Équipe</div>
            {DAYS_SHORT.map((d, day) => {
              const dayCov = cov.filter((c) => c.day === day);
              const needed = dayCov.reduce((a, c) => a + c.needed, 0);
              const missing = dayCov.reduce((a, c) => a + Math.max(0, c.needed - c.assigned), 0);
              return (
                <div key={day} id={`day-${day}`} className={cx("border-l border-slate-100 px-2.5 py-2.5", day >= 5 && "bg-slate-50/60")}>
                  <div className="text-[13px] font-semibold">
                    {d} <span className="font-normal text-slate-500">{formatDayDate(week, day)}</span>
                  </div>
                  {fer.has(day) && (
                    <div className="mt-0.5 truncate text-[11px] font-medium text-brand-800" title={fer.get(day)!.label}>
                      Férié{isHolidayClosed(state, fer.get(day)!.id) ? " · fermé" : ""}
                    </div>
                  )}
                  <div className="mt-1 text-[11px]">
                    {needed === 0 ? (
                      <span className="text-slate-500">Fermé</span>
                    ) : missing > 0 ? (
                      <span className="rounded-full bg-amber-100 px-1.5 py-0.5 font-medium text-amber-800">{missing} à pourvoir</span>
                    ) : (
                      <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 font-medium text-emerald-700">Couvert</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {groupByPost(state, shifts).map(({ post, employees }) => (
            <div key={post.id}>
              <div className={cx(cols, "border-b border-slate-100 bg-slate-50/70")}>
                <div className="sticky left-0 flex items-center gap-2 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold tracking-wide text-slate-500 uppercase sm:px-4">
                  <span className={cx("h-2 w-2 rounded-full", POST_COLORS[post.color].dot)} />
                  {post.name} · {employees.length}
                </div>
                <div className="col-span-7" />
              </div>
              {employees.map((e) => (
                <Row
                  key={e.id}
                  cols={cols}
                  employee={e}
                  absent={absent.get(e.id)}
                  state={state}
                  shifts={shifts.filter((s) => s.employeeId === e.id)}
                  hours={hours[e.id] ?? 0}
                  errorShifts={errorShifts}
                  activeId={activeId}
                  onEdit={onEdit}
                  onAdd={onAdd}
                  postOf={postOf}
                />
              ))}
            </div>
          ))}

          {/* Ligne de couverture par service */}
          <div className={cx(cols, "bg-slate-50/70")}>
            <div className="sticky left-0 bg-slate-50 px-3 py-2.5 text-xs font-medium text-slate-500 sm:px-4">Couverture</div>
            {DAYS_SHORT.map((_, day) => (
              <div key={day} className="space-y-1 border-l border-slate-100 px-2.5 py-2.5">
                {state.services.map((sv) => {
                  const c = cov.filter((x) => x.day === day && x.serviceId === sv.id);
                  const needed = c.reduce((a, x) => a + x.needed, 0);
                  const ok = c.reduce((a, x) => a + Math.min(x.assigned, x.needed), 0);
                  if (needed === 0) return null;
                  return (
                    <div key={sv.id} className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">{sv.name}</span>
                      <span className={cx("font-semibold tabular-nums", ok < needed ? "text-amber-700" : "text-emerald-700")}>
                        {ok}/{needed}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      <DragOverlay dropAnimation={{ duration: 160, easing: "ease-out" }}>
        {active ? (
          <div className="w-[110px]">
            <ShiftChip shift={active} post={postOf(active.postId)} showPost dragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function Row({
  cols,
  absent,
  employee: e,
  state,
  shifts,
  hours,
  errorShifts,
  activeId,
  onEdit,
  onAdd,
  postOf,
}: {
  cols: string;
  absent?: Map<number, AbsenceType>;
  employee: Employee;
  state: AppState;
  shifts: Shift[];
  hours: number;
  errorShifts: Set<string>;
  activeId: string | null;
  onEdit: (s: Shift) => void;
  onAdd: (employeeId: string, day: number) => void;
  postOf: (id: string) => AppState["posts"][number] | undefined;
}) {
  return (
    <div id={`row-${e.id}`} className={cx(cols, "scroll-mt-24 border-b border-slate-100 last:border-b-0")}>
      <div className="sticky left-0 z-[5] flex items-center gap-2.5 bg-white px-3 py-2 sm:px-4">
        <Avatar id={e.id} name={`${e.firstName} ${e.lastName}`} size={30} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium">
            {e.firstName} <span className="hidden sm:inline">{e.lastName}</span>
          </div>
          <HoursMeter hours={hours} contract={Math.round(expectedHours(e, absent, rulesOf(state)) * 10) / 10} compact />
        </div>
      </div>
      {Array.from({ length: 7 }, (_, day) => (
        <Cell
          key={day}
          absence={absent?.get(day)}
          employee={e}
          day={day}
          state={state}
          shifts={shifts.filter((s) => s.day === day)}
          errorShifts={errorShifts}
          activeId={activeId}
          onEdit={onEdit}
          onAdd={onAdd}
          postOf={postOf}
        />
      ))}
    </div>
  );
}

function Cell({
  absence,
  employee: e,
  day,
  state,
  shifts,
  errorShifts,
  activeId,
  onEdit,
  onAdd,
  postOf,
}: {
  absence?: AbsenceType;
  employee: Employee;
  day: number;
  state: AppState;
  shifts: Shift[];
  errorShifts: Set<string>;
  activeId: string | null;
  onEdit: (s: Shift) => void;
  onAdd: (employeeId: string, day: number) => void;
  postOf: (id: string) => AppState["posts"][number] | undefined;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `cell|${e.id}|${day}` });
  const allDay = isUnavailable(e, day) || !!absence;
  const partial = state.services.filter((sv) => !allDay && serviceActive(sv, day) && isUnavailable(e, day, sv.id));

  return (
    <div
      ref={setNodeRef}
      id={`cell-${e.id}-${day}`}
      onClick={(ev) => ev.target === ev.currentTarget && onAdd(e.id, day)}
      className={cx(
        "group/cell relative min-h-[64px] cursor-copy border-l border-slate-100 p-1.5 transition-colors",
        day >= 5 && "bg-slate-50/40",
        allDay && "hatch",
        isOver && "bg-brand-50 ring-2 ring-brand-400 ring-inset",
      )}
    >
      <div className="flex flex-col gap-1">
        {shifts
          .sort((a, b) => a.start.localeCompare(b.start))
          .map((s) => (
            <DraggableShift
              key={s.id}
              shift={s}
              post={postOf(s.postId)}
              showPost={s.postId !== e.postIds[0]}
              error={errorShifts.has(s.id)}
              hidden={activeId === s.id}
              onClick={() => onEdit(s)}
            />
          ))}
      </div>
      {shifts.length === 0 && (allDay || partial.length > 0) && (
        <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-[11px] text-slate-500">
          {absence ? <span className="font-semibold text-slate-700">{ABSENCE_TYPES[absence].label}</span> : allDay ? "Indisponible" : `Indispo ${partial.map((p) => p.name.toLowerCase()).join(", ")}`}
        </div>
      )}
      {shifts.length === 0 && !allDay && partial.length === 0 && (
        <button
          onClick={() => onAdd(e.id, day)}
          aria-label="Ajouter un créneau"
          className="absolute inset-1.5 flex items-center justify-center rounded-md text-slate-500 opacity-0 transition hover:bg-slate-100 hover:text-slate-700 focus:opacity-100 group-hover/cell:opacity-100"
        >
          <Plus size={15} />
        </button>
      )}
    </div>
  );
}

function DraggableShift({
  shift,
  post,
  showPost,
  error,
  hidden,
  onClick,
}: {
  shift: Shift;
  post?: AppState["posts"][number];
  showPost: boolean;
  error: boolean;
  hidden: boolean;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: shift.id });
  return (
    <button
      ref={setNodeRef}
      id={`shift-${shift.id}`}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={cx("relative z-[1] block w-full cursor-grab touch-manipulation active:cursor-grabbing", hidden && "opacity-30")}
    >
      <ShiftChip shift={shift} post={post} showPost={showPost} error={error} />
    </button>
  );
}
