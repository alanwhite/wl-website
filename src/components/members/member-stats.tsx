import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, startOfMonth, subMonths } from "date-fns";

// Opt-in stats for the members page (members.showStats). Server-rendered
// inline SVG/flex — no chart library. Palette values are the validated
// categorical slots from the data-viz reference palette, selected per mode
// (dark is its own set, not an automatic flip); series identity is always
// carried by legend + table view, never color alone.

const TIER_SLOTS = ["c1", "c2", "c3", "c4", "c5", "c6"] as const;

interface MonthBucket {
  key: string;
  label: string;
  registrations: number;
  approvals: number;
  rejections: number;
}

/** Rounded top, square baseline (the mark spec for columns). */
function columnPath(x: number, y: number, w: number, h: number): string {
  const r = Math.min(3, w / 2, h);
  const bottom = y + h;
  return `M ${x} ${bottom} L ${x} ${y + r} Q ${x} ${y} ${x + r} ${y} L ${x + w - r} ${y} Q ${x + w} ${y} ${x + w} ${y + r} L ${x + w} ${bottom} Z`;
}

function niceCeiling(n: number): number {
  if (n <= 4) return 4;
  const pow = Math.pow(10, Math.floor(Math.log10(n)));
  for (const m of [1, 2, 4, 5, 10]) {
    if (m * pow >= n) return m * pow;
  }
  return 10 * pow;
}

export async function MemberStats() {
  const now = new Date();
  const since = startOfMonth(subMonths(now, 11));

  const [tierCounts, recentUsers, reviews] = await Promise.all([
    prisma.user.groupBy({
      by: ["tierName", "tierLevel"],
      where: { status: "APPROVED", tierLevel: { gt: 0, lt: 999 } },
      _count: { _all: true },
      orderBy: { tierLevel: "desc" },
    }),
    prisma.user.findMany({
      where: { createdAt: { gte: since }, tierLevel: { lt: 999 } },
      select: { createdAt: true },
    }),
    prisma.registration.findMany({
      where: { reviewedAt: { gte: since } },
      select: { reviewedAt: true, user: { select: { status: true } } },
    }),
  ]);

  // ── Tier split ──
  const totalMembers = tierCounts.reduce((sum, t) => sum + t._count._all, 0);
  // Stable slot order follows tier level, not count rank
  const tiers = tierCounts.map((t, i) => ({
    name: t.tierName,
    count: t._count._all,
    slot: TIER_SLOTS[Math.min(i, TIER_SLOTS.length - 1)],
  }));
  // >6 tiers: fold the tail into "Other" rather than generating hues
  const shownTiers =
    tiers.length <= 6
      ? tiers
      : [
          ...tiers.slice(0, 5),
          {
            name: "Other",
            count: tiers.slice(5).reduce((s, t) => s + t.count, 0),
            slot: "other" as const,
          },
        ];

  // ── Monthly buckets ──
  const buckets: MonthBucket[] = [];
  const index = new Map<string, MonthBucket>();
  for (let i = 11; i >= 0; i--) {
    const d = startOfMonth(subMonths(now, i));
    const key = format(d, "yyyy-MM");
    const bucket: MonthBucket = {
      key,
      label: format(d, "MMM"),
      registrations: 0,
      approvals: 0,
      rejections: 0,
    };
    buckets.push(bucket);
    index.set(key, bucket);
  }
  for (const u of recentUsers) {
    const bucket = index.get(format(u.createdAt, "yyyy-MM"));
    if (bucket) bucket.registrations++;
  }
  for (const r of reviews) {
    if (!r.reviewedAt) continue;
    const bucket = index.get(format(r.reviewedAt, "yyyy-MM"));
    if (!bucket) continue;
    if (r.user.status === "REJECTED") bucket.rejections++;
    else if (r.user.status === "APPROVED" || r.user.status === "SUSPENDED") bucket.approvals++;
  }
  const hasActivity = buckets.some((b) => b.registrations + b.approvals + b.rejections > 0);

  // ── Column chart geometry ──
  const W = 720;
  const H = 220;
  const M = { top: 8, right: 8, bottom: 24, left: 36 };
  const plotW = W - M.left - M.right;
  const plotH = H - M.top - M.bottom;
  const yMax = niceCeiling(
    Math.max(1, ...buckets.map((b) => Math.max(b.registrations, b.approvals, b.rejections))),
  );
  const ySteps = 4;
  const groupW = plotW / 12;
  const barW = Math.min(12, (groupW - 8) / 3 - 2);
  const seriesOffset = (barW + 2) * 3 - 2; // three bars incl. 2px gaps
  const yFor = (v: number) => M.top + plotH - (v / yMax) * plotH;

  const SERIES = [
    { key: "registrations" as const, label: "Registrations", varName: "--ms-reg" },
    { key: "approvals" as const, label: "Approvals", varName: "--ms-app" },
    { key: "rejections" as const, label: "Rejections", varName: "--ms-rej" },
  ];

  return (
    <div className="member-stats grid gap-4 lg:grid-cols-2">
      <style>{`
        .member-stats{--ms-c1:#2a78d6;--ms-c2:#1baf7a;--ms-c3:#eda100;--ms-c4:#4a3aa7;--ms-c5:#e87ba4;--ms-c6:#eb6834;--ms-other:#898781;--ms-reg:#2a78d6;--ms-app:#008300;--ms-rej:#e34948;--ms-grid:#e1e0d9;--ms-axis:#c3c2b7}
        .dark .member-stats{--ms-c1:#3987e5;--ms-c2:#199e70;--ms-c3:#c98500;--ms-c4:#9085e9;--ms-c5:#d55181;--ms-c6:#d95926;--ms-other:#898781;--ms-reg:#3987e5;--ms-app:#008300;--ms-rej:#e66767;--ms-grid:#2c2c2a;--ms-axis:#383835}
      `}</style>

      {/* Tier split */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Membership by tier</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          {totalMembers === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">No approved members yet.</p>
          ) : (
            <>
              <p className="text-2xl font-semibold">
                {totalMembers}
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  approved member{totalMembers === 1 ? "" : "s"}
                </span>
              </p>
              {/* Composition bar: 2px gaps in the surface colour separate segments */}
              <div className="flex h-5 w-full gap-[2px] overflow-hidden" role="img" aria-label={`Membership split: ${shownTiers.map((t) => `${t.name} ${t.count}`).join(", ")}`}>
                {shownTiers.map((t, i) => (
                  <div
                    key={t.name}
                    title={`${t.name}: ${t.count} (${Math.round((t.count / totalMembers) * 100)}%)`}
                    className={`${i === 0 ? "rounded-l" : ""} ${i === shownTiers.length - 1 ? "rounded-r" : ""}`}
                    style={{
                      flexGrow: t.count,
                      flexBasis: 0,
                      minWidth: 3,
                      background: `var(--ms-${t.slot})`,
                    }}
                  />
                ))}
              </div>
              <ul className="space-y-1">
                {shownTiers.map((t) => (
                  <li key={t.name} className="flex items-center gap-2 text-sm">
                    <span
                      className="inline-block h-3 w-3 shrink-0 rounded-sm"
                      style={{ background: `var(--ms-${t.slot})` }}
                    />
                    <span className="min-w-0 flex-1 truncate">{t.name}</span>
                    <span className="text-muted-foreground">
                      {t.count} · {Math.round((t.count / totalMembers) * 100)}%
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>

      {/* Registrations over time */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Registrations — last 12 months</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {/* Legend (identity never rides on color alone) */}
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {SERIES.map((s) => (
              <span key={s.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="inline-block h-3 w-3 rounded-sm" style={{ background: `var(${s.varName})` }} />
                {s.label}
              </span>
            ))}
          </div>

          {!hasActivity ? (
            <p className="py-4 text-sm text-muted-foreground">No registration activity in the last 12 months.</p>
          ) : (
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Monthly registrations, approvals and rejections">
              {/* hairline gridlines + clean ticks */}
              {Array.from({ length: ySteps + 1 }, (_, i) => {
                const v = (yMax / ySteps) * i;
                const y = yFor(v);
                return (
                  <g key={i}>
                    <line x1={M.left} x2={W - M.right} y1={y} y2={y} stroke={i === 0 ? "var(--ms-axis)" : "var(--ms-grid)"} strokeWidth={1} />
                    <text x={M.left - 6} y={y + 3} textAnchor="end" fontSize={10} fill="currentColor" className="text-muted-foreground" style={{ fontVariantNumeric: "tabular-nums" }}>
                      {v}
                    </text>
                  </g>
                );
              })}
              {/* grouped columns: rounded data-end, square baseline, 2px gaps */}
              {buckets.map((b, mi) => {
                const groupX = M.left + mi * groupW + (groupW - seriesOffset) / 2;
                return (
                  <g key={b.key}>
                    {SERIES.map((s, si) => {
                      const v = b[s.key];
                      if (v === 0) return null;
                      const x = groupX + si * (barW + 2);
                      const y = yFor(v);
                      return (
                        <path key={s.key} d={columnPath(x, y, barW, M.top + plotH - y)} fill={`var(${s.varName})`}>
                          <title>{`${b.label}: ${v} ${s.label.toLowerCase()}`}</title>
                        </path>
                      );
                    })}
                    <text x={M.left + mi * groupW + groupW / 2} y={H - 8} textAnchor="middle" fontSize={10} fill="currentColor" className="text-muted-foreground">
                      {b.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}

          {/* Table twin: every value reachable without the chart */}
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer select-none">View data</summary>
            <table className="mt-2 w-full" style={{ fontVariantNumeric: "tabular-nums" }}>
              <thead>
                <tr className="border-b text-left">
                  <th className="py-1 font-medium">Month</th>
                  <th className="py-1 text-right font-medium">Registered</th>
                  <th className="py-1 text-right font-medium">Approved</th>
                  <th className="py-1 text-right font-medium">Rejected</th>
                </tr>
              </thead>
              <tbody>
                {buckets.map((b) => (
                  <tr key={b.key} className="border-b last:border-0">
                    <td className="py-1">{b.label}</td>
                    <td className="py-1 text-right">{b.registrations}</td>
                    <td className="py-1 text-right">{b.approvals}</td>
                    <td className="py-1 text-right">{b.rejections}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </CardContent>
      </Card>
    </div>
  );
}
