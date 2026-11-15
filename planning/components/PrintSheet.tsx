import type { AppState, Shift } from "@/lib/types";
import { hoursByEmployee } from "@/lib/rules";
import { DAYS, formatDayDate, formatHours, formatTime, formatWeekRange } from "@/lib/time";

/** Version imprimable (export PDF) du planning de la semaine. */
export function PrintSheet({ state, week, shifts }: { state: AppState; week: string; shifts: Shift[] }) {
  const hours = hoursByEmployee(shifts);
  const post = (id: string) => state.posts.find((p) => p.id === id)?.name ?? "";
  return (
    <div className="print-area print-only bg-white p-2 text-[10px] text-black">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <div className="text-base font-bold">{state.establishment.name}</div>
          <div className="text-xs">Planning de la semaine du {formatWeekRange(week)}</div>
        </div>
        <div className="text-[9px] text-slate-500">Généré avec Créno</div>
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="border border-slate-300 bg-slate-100 p-1 text-left">Employé</th>
            {DAYS.map((d, i) => (
              <th key={d} className="border border-slate-300 bg-slate-100 p-1">
                {d} {formatDayDate(week, i)}
              </th>
            ))}
            <th className="border border-slate-300 bg-slate-100 p-1">Total</th>
          </tr>
        </thead>
        <tbody>
          {state.employees.map((e) => (
            <tr key={e.id}>
              <td className="border border-slate-300 p-1 font-semibold">
                {e.firstName} {e.lastName}
                <div className="font-normal text-slate-500">{post(e.postIds[0])}</div>
              </td>
              {DAYS.map((_, d) => {
                const list = shifts.filter((s) => s.employeeId === e.id && s.day === d).sort((a, b) => a.start.localeCompare(b.start));
                return (
                  <td key={d} className="border border-slate-300 p-1 text-center">
                    {list.length ? (
                      list.map((s) => (
                        <div key={s.id}>
                          {formatTime(s.start)}–{formatTime(s.end)}
                          {s.postId !== e.postIds[0] && <span className="text-slate-500"> ({post(s.postId)})</span>}
                        </div>
                      ))
                    ) : (
                      <span className="text-slate-400">Repos</span>
                    )}
                  </td>
                );
              })}
              <td className="border border-slate-300 p-1 text-center font-semibold">
                {formatHours(hours[e.id] ?? 0)} / {e.contractHours} h
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
