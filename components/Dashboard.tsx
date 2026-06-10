"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Bucket, ComebackData, GameLine, Perspective } from "@/lib/mlb";
import { teamMeta } from "@/lib/teams";

/* ---------- formatting helpers ---------- */

function fmtPct(wins: number, games: number): string {
  if (games === 0) return "—";
  const p = wins / games;
  return p === 1 ? "1.000" : p.toFixed(3).replace(/^0\./, ".");
}

function fmtDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`)
    .toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
    .toUpperCase();
}

function fmtTimeET(iso: string): string {
  return (
    new Date(iso).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/New_York",
    }) + " ET"
  );
}

const PERSPECTIVES: { key: Perspective; label: string }[] = [
  { key: "trailing", label: "Trailing" },
  { key: "tied", label: "Tied" },
  { key: "leading", label: "Leading" },
];

type SortKey = "games" | "wins" | "losses" | "pct";
type LeagueFilter = "ALL" | "AL" | "NL";

/* ---------- chalk tally marks ---------- */

function TallyGroup({ count, color, dim }: { count: number; color: string; dim?: boolean }) {
  const strokes = [];
  const n = Math.min(count, 5);
  for (let i = 0; i < Math.min(n, 4); i++) {
    strokes.push(
      <line
        key={i}
        x1={4 + i * 6}
        y1={2.5}
        x2={4.6 + i * 6}
        y2={15.5}
        transform={`rotate(${((i * 7) % 5) - 2} ${4 + i * 6} 9)`}
      />,
    );
  }
  if (n === 5) {
    strokes.push(<line key="x" x1={0.5} y1={13.5} x2={25.5} y2={4.5} />);
  }
  return (
    <svg
      width={Math.min(n, 4) * 6 + 4}
      height={18}
      viewBox={`0 0 ${Math.min(n, 4) * 6 + 4} 18`}
      className="shrink-0"
      stroke={color}
      strokeWidth={1.7}
      strokeLinecap="round"
      opacity={dim ? 0.45 : 0.95}
      aria-hidden
    >
      {strokes}
    </svg>
  );
}

function Tally({ wins, losses }: { wins: number; losses: number }) {
  const MAX = 30;
  const shownW = Math.min(wins, MAX);
  const rem = MAX - shownW;
  const shownL = Math.min(losses, rem);
  const overflow = wins + losses - shownW - shownL;
  const groups = (n: number, color: string, dim: boolean, prefix: string) => {
    const out = [];
    for (let i = 0; i < Math.floor(n / 5); i++)
      out.push(<TallyGroup key={`${prefix}${i}`} count={5} color={color} dim={dim} />);
    if (n % 5 > 0) out.push(<TallyGroup key={`${prefix}r`} count={n % 5} color={color} dim={dim} />);
    return out;
  };
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      {groups(shownW, "var(--gold)", false, "w")}
      {groups(shownL, "var(--scarlet)", true, "l")}
      {overflow > 0 && (
        <span className="score text-[11px] text-chalk-faint">+{overflow}</span>
      )}
    </span>
  );
}

/* ---------- small pieces ---------- */

function FlipDigits({ text }: { text: string }) {
  return (
    <span className="inline-flex gap-[3px]">
      {text.split("").map((ch, i) => (
        <span
          key={i}
          className="plate anim-flip score inline-flex h-[3.4rem] min-w-[2.3rem] items-center justify-center rounded-[3px] px-1 text-[2rem] font-bold text-chalk sm:h-[4.4rem] sm:min-w-[3rem] sm:text-[2.8rem]"
          style={{ animationDelay: `${0.25 + i * 0.07}s` }}
        >
          {ch}
        </span>
      ))}
    </span>
  );
}

function StatCard({
  label,
  value,
  detail,
  delay,
}: {
  label: string;
  value: string;
  detail: string;
  delay: number;
}) {
  return (
    <div className="plate anim-rise rounded-[4px] px-5 py-4" style={{ animationDelay: `${delay}s` }}>
      <div className="display text-[10px] tracking-[0.22em] text-gold">{label}</div>
      <div className="score mt-2 text-2xl font-bold text-chalk">{value}</div>
      <div className="mt-1 text-sm text-chalk-dim">{detail}</div>
    </div>
  );
}

/* ---------- game log ---------- */

function GameLog({ lines, open }: { lines: GameLine[]; open: boolean }) {
  const recentFirst = useMemo(() => [...lines].reverse(), [lines]);
  return (
    <div className={`gamelog ${open ? "open" : ""}`}>
      <div>
        <div className="mx-2 mb-3 mt-1 rounded-[4px] border border-line bg-plate-deep/60 sm:mx-10">
          <div className="display grid grid-cols-[3.2rem_1fr_4.6rem_4.6rem_2.2rem_2rem] items-center gap-2 border-b border-line px-3 py-2 text-[9px] tracking-[0.18em] text-chalk-faint sm:grid-cols-[4rem_1fr_6rem_6rem_3rem_3rem] sm:px-4">
            <span>Date</span>
            <span>Opponent</span>
            <span className="text-right">After 8</span>
            <span className="text-right">Final</span>
            <span className="text-center">W/L</span>
            <span />
          </div>
          {recentFirst.length === 0 && (
            <div className="px-4 py-4 text-sm text-chalk-dim">
              Hasn&rsquo;t happened yet this season.
            </div>
          )}
          {recentFirst.map((g) => {
            const opp = teamMeta(g.opponentId);
            return (
              <div
                key={g.gamePk}
                className="score grid grid-cols-[3.2rem_1fr_4.6rem_4.6rem_2.2rem_2rem] items-center gap-2 border-b border-line/60 px-3 py-1.5 text-[13px] last:border-b-0 sm:grid-cols-[4rem_1fr_6rem_6rem_3rem_3rem] sm:px-4"
              >
                <span className="text-chalk-dim">{fmtDate(g.date)}</span>
                <span className="text-chalk">
                  <span className="text-chalk-faint">{g.home ? "vs" : "@"}</span> {opp.abbr}
                </span>
                <span className="text-right text-chalk-dim">
                  {g.runsFor8}–{g.runsAgainst8}
                </span>
                <span className="text-right text-chalk">
                  {g.finalFor}–{g.finalAgainst}
                  {g.innings > 9 && <span className="text-chalk-faint"> ·{g.innings}</span>}
                </span>
                <span
                  className={`display mx-auto inline-flex h-5 w-5 items-center justify-center rounded-[2px] text-[10px] ${
                    g.won ? "bg-gold text-plate-deep" : "bg-scarlet/25 text-scarlet"
                  }`}
                >
                  {g.won ? "W" : "L"}
                </span>
                <a
                  href={`https://www.mlb.com/gameday/${g.gamePk}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-center text-chalk-faint transition-colors hover:text-gold"
                  title="MLB Gameday"
                  tabIndex={open ? 0 : -1}
                >
                  ↗
                </a>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------- main dashboard ---------- */

export default function Dashboard({ initialData }: { initialData: ComebackData }) {
  const [data, setData] = useState<ComebackData>(initialData);
  const [perspective, setPerspective] = useState<Perspective>("trailing");
  const [filter, setFilter] = useState<LeagueFilter>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("pct");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(false);
  const lastFetch = useRef(Date.now());

  const applyData = useCallback((d: ComebackData) => {
    setData(d);
    lastFetch.current = Date.now();
  }, []);

  const refresh = useCallback(
    async (manual: boolean) => {
      if (manual) setRefreshing(true);
      setRefreshError(false);
      try {
        const res = await fetch("/api/comebacks", { method: manual ? "POST" : "GET" });
        if (!res.ok) throw new Error("bad status");
        const d = (await res.json()) as ComebackData;
        if (!d.teams) throw new Error("bad payload");
        applyData(d);
      } catch {
        if (manual) setRefreshError(true);
      } finally {
        setRefreshing(false);
      }
    },
    [applyData],
  );

  // Background refresh: every 20 minutes, plus when the tab comes back into focus.
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible" && Date.now() - lastFetch.current > 10 * 60_000) {
        refresh(false);
      }
    };
    const interval = setInterval(tick, 20 * 60_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [refresh]);

  const bucketOf = useCallback(
    (t: ComebackData["teams"][number]): Bucket => t[perspective],
    [perspective],
  );

  const sorted = useMemo(() => {
    const val = (b: Bucket): number => {
      switch (sortKey) {
        case "games":
          return b.games;
        case "wins":
          return b.wins;
        case "losses":
          return b.losses;
        case "pct":
          return b.games === 0 ? -1 : b.wins / b.games;
      }
    };
    return data.teams
      .filter((t) => filter === "ALL" || teamMeta(t.teamId).league === filter)
      .sort((a, b) => {
        const d = (val(bucketOf(a)) - val(bucketOf(b))) * sortDir;
        if (d !== 0) return d;
        const w = (bucketOf(a).wins - bucketOf(b).wins) * sortDir;
        if (w !== 0) return w;
        return teamMeta(a.teamId).abbr.localeCompare(teamMeta(b.teamId).abbr);
      });
  }, [data, filter, sortKey, sortDir, bucketOf]);

  const hero = useMemo(() => {
    const lg = data.league.trailing;
    let most: { abbr: string; wins: number } | null = null;
    let waiting: { abbr: string; losses: number } | null = null;
    for (const t of data.teams) {
      const m = teamMeta(t.teamId);
      if (!most || t.trailing.wins > most.wins) most = { abbr: m.abbr, wins: t.trailing.wins };
      if (t.trailing.wins === 0 && (!waiting || t.trailing.losses > waiting.losses))
        waiting = { abbr: m.abbr, losses: t.trailing.losses };
    }
    return { lg, most, waiting };
  }, [data]);

  const setSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === 1 ? -1 : 1));
    else {
      setSortKey(key);
      setSortDir(-1);
    }
  };

  const sortArrow = (key: SortKey) =>
    sortKey === key ? (sortDir === -1 ? " ▾" : " ▴") : "";

  const headerBtn = (key: SortKey, label: string, cls = "") => (
    <button
      onClick={() => setSort(key)}
      className={`display text-left text-[10px] tracking-[0.2em] transition-colors hover:text-gold ${
        sortKey === key ? "text-gold" : "text-chalk-faint"
      } ${cls}`}
    >
      {label}
      {sortArrow(key)}
    </button>
  );

  const perspectiveTitle =
    perspective === "trailing"
      ? "When trailing after 8"
      : perspective === "tied"
        ? "When tied after 8"
        : "When leading after 8";

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-24 sm:px-8">
      {/* top strip */}
      <header className="anim-rise flex flex-wrap items-center justify-between gap-3 border-b border-line py-4">
        <div className="display text-[10px] tracking-[0.28em] text-chalk-dim">
          THE LATE-INNING LEDGER <span className="text-gold">★</span> MLB {data.season}
        </div>
        <div className="flex items-center gap-4">
          <div className="score text-[11px] text-chalk-faint">
            {data.throughDate && <>THROUGH {fmtDate(data.throughDate)} · </>}
            UPDATED {fmtTimeET(data.computedAt)}
          </div>
          <button
            onClick={() => refresh(true)}
            disabled={refreshing}
            className="display group flex items-center gap-2 rounded-[3px] border border-line-strong bg-plate px-3 py-1.5 text-[10px] tracking-[0.2em] text-chalk transition-colors hover:border-gold hover:text-gold disabled:opacity-60"
          >
            <span className={`inline-block ${refreshing ? "spin" : ""}`}>⟳</span>
            {refreshing ? "PULLING" : "REFRESH"}
          </button>
        </div>
        {refreshError && (
          <div className="score w-full text-right text-[11px] text-scarlet">
            Couldn&rsquo;t reach the MLB feed — try again in a minute.
          </div>
        )}
      </header>

      {/* hero */}
      <section className="pt-12 sm:pt-16">
        <p className="anim-rise display text-[11px] tracking-[0.3em] text-gold" style={{ animationDelay: "0.05s" }}>
          {data.season} REGULAR SEASON · {data.gamesAnalyzed.toLocaleString()} GAMES SCORED
        </p>
        <h1
          className="anim-rise display mt-4 text-[2.6rem] leading-[1.05] text-chalk sm:text-[4.2rem]"
          style={{ animationDelay: "0.12s", textShadow: "0 3px 0 rgba(0,0,0,0.35)" }}
        >
          TRAILING
          <br />
          AFTER&nbsp;8
        </h1>
        <p
          className="anim-rise mt-5 max-w-xl text-[17px] leading-relaxed text-chalk-dim"
          style={{ animationDelay: "0.2s" }}
        >
          Walk into the ninth inning behind, and the ledger says you&rsquo;ve already lost. This
          board keeps the receipts for every club — every deficit carried into the ninth, every
          fold, and every great escape — refreshed all season long.
        </p>

        <div className="mt-10 flex flex-wrap items-end gap-x-10 gap-y-6">
          <div>
            <div className="display mb-3 text-[10px] tracking-[0.24em] text-chalk-faint">
              THE LEAGUE, WHEN TRAILING AFTER 8
            </div>
            <FlipDigits text={`${hero.lg.wins}-${hero.lg.losses}`} />
            <span
              className="score anim-rise ml-4 align-bottom text-lg text-gold"
              style={{ animationDelay: "0.7s" }}
            >
              {fmtPct(hero.lg.wins, hero.lg.games)}
            </span>
          </div>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <StatCard
            label="BIGGEST ESCAPE"
            value={
              data.biggestComeback
                ? `${teamMeta(data.biggestComeback.teamId).abbr} · DOWN ${data.biggestComeback.deficit}`
                : "NONE YET"
            }
            detail={
              data.biggestComeback
                ? `won after trailing by ${data.biggestComeback.deficit}, ${fmtDate(
                    data.biggestComeback.date,
                  )} vs ${teamMeta(data.biggestComeback.opponentId).abbr}`
                : "no team has come back yet"
            }
            delay={0.35}
          />
          <StatCard
            label="MOST ESCAPES"
            value={hero.most && hero.most.wins > 0 ? `${hero.most.abbr} · ${hero.most.wins}` : "NONE YET"}
            detail={
              hero.most && hero.most.wins > 0
                ? `comeback win${hero.most.wins === 1 ? "" : "s"} when trailing after 8`
                : "the ninth inning has been merciless"
            }
            delay={0.45}
          />
          <StatCard
            label="STILL WAITING"
            value={hero.waiting ? `${hero.waiting.abbr} · 0–${hero.waiting.losses}` : "—"}
            detail={
              hero.waiting
                ? `${hero.waiting.losses} tries without a single escape`
                : "every club has at least one comeback"
            }
            delay={0.55}
          />
        </div>
      </section>

      {/* controls */}
      <section className="anim-rise mt-16 flex flex-wrap items-center justify-between gap-4" style={{ animationDelay: "0.5s" }}>
        <div className="flex items-center gap-1 rounded-[4px] border border-line bg-plate-deep/60 p-1">
          {PERSPECTIVES.map((p) => (
            <button
              key={p.key}
              onClick={() => {
                setPerspective(p.key);
                setExpanded(null);
              }}
              className={`display rounded-[3px] px-4 py-2 text-[10px] tracking-[0.2em] transition-all ${
                perspective === p.key
                  ? "plate text-gold"
                  : "text-chalk-faint hover:text-chalk"
              }`}
            >
              {p.label.toUpperCase()}
            </button>
          ))}
          <span className="display ml-2 mr-2 hidden text-[9px] tracking-[0.2em] text-chalk-faint sm:inline">
            AFTER 8
          </span>
        </div>
        <div className="flex items-center gap-1">
          {(["ALL", "AL", "NL"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`display rounded-[3px] border px-3 py-2 text-[10px] tracking-[0.2em] transition-colors ${
                filter === f
                  ? "border-gold text-gold"
                  : "border-line text-chalk-faint hover:text-chalk"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </section>

      {/* the board */}
      <section className="anim-rise mt-6" style={{ animationDelay: "0.6s" }}>
        <div className="frame rounded-[6px] bg-monster-light/30 backdrop-blur-[1px]">
          <div className="flex flex-wrap items-baseline justify-between gap-2 px-4 pb-1 pt-4 sm:px-6">
            <h2 className="display text-sm tracking-[0.2em] text-chalk">{perspectiveTitle.toUpperCase()}</h2>
            <span className="score text-[11px] text-chalk-faint">
              league {data.league[perspective].wins}–{data.league[perspective].losses} (
              {fmtPct(data.league[perspective].wins, data.league[perspective].games)})
            </span>
          </div>

          {/* header row */}
          <div className="grid grid-cols-[2rem_minmax(0,1fr)_2.6rem_2.6rem_2.6rem_3.4rem_1.2rem] items-center gap-2 border-b border-line-strong px-4 py-3 sm:grid-cols-[2.6rem_minmax(0,1fr)_3rem_3rem_3rem_4rem_minmax(0,200px)_1.5rem] sm:px-6">
            <span className="display text-[10px] tracking-[0.2em] text-chalk-faint">RK</span>
            <span className="display text-[10px] tracking-[0.2em] text-chalk-faint">CLUB</span>
            {headerBtn("games", "G", "text-right")}
            {headerBtn("wins", "W", "text-right")}
            {headerBtn("losses", "L", "text-right")}
            {headerBtn("pct", "PCT", "text-right")}
            <span className="display hidden text-[10px] tracking-[0.2em] text-chalk-faint sm:block">
              THE LEDGER
            </span>
            <span />
          </div>

          <ul>
            {sorted.map((t, idx) => {
              const m = teamMeta(t.teamId);
              const b = bucketOf(t);
              const open = expanded === t.teamId;
              return (
                <li key={t.teamId} className="border-b border-line/50 last:border-b-0">
                  <button
                    onClick={() => setExpanded(open ? null : t.teamId)}
                    aria-expanded={open}
                    className={`grid w-full grid-cols-[2rem_minmax(0,1fr)_2.6rem_2.6rem_2.6rem_3.4rem_1.2rem] items-center gap-2 px-4 py-2.5 text-left transition-colors sm:grid-cols-[2.6rem_minmax(0,1fr)_3rem_3rem_3rem_4rem_minmax(0,200px)_1.5rem] sm:px-6 ${
                      open ? "bg-plate-deep/50" : "hover:bg-plate-deep/40"
                    }`}
                  >
                    <span className="score text-[13px] text-chalk-faint">{idx + 1}</span>
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span
                        className="display inline-flex h-7 w-10 shrink-0 items-center justify-center rounded-[2px] text-[11px] text-chalk"
                        style={{
                          background: `linear-gradient(180deg, ${m.color}33, ${m.color}1f)`,
                          boxShadow: `inset 0 0 0 1px ${m.color}66, inset 0 -4px 8px rgba(0,0,0,0.35)`,
                        }}
                      >
                        {m.abbr}
                      </span>
                      <span className="hidden truncate text-[15px] font-medium text-chalk-dim md:inline">
                        {m.name}
                      </span>
                      <span className="truncate text-[15px] font-medium text-chalk-dim md:hidden">
                        {m.shortName}
                      </span>
                    </span>
                    <span className="score text-right text-[15px] text-chalk-dim">{b.games}</span>
                    <span className={`score text-right text-[15px] font-bold ${b.wins > 0 ? "text-gold" : "text-chalk-faint"}`}>
                      {b.wins}
                    </span>
                    <span className="score text-right text-[15px] text-scarlet">{b.losses}</span>
                    <span className="score text-right text-[15px] font-medium text-chalk">
                      {fmtPct(b.wins, b.games)}
                    </span>
                    <span className="hidden sm:block">
                      <Tally wins={b.wins} losses={b.losses} />
                    </span>
                    <span
                      className={`text-center text-[11px] text-chalk-faint transition-transform duration-300 ${
                        open ? "rotate-180" : ""
                      }`}
                    >
                      ▼
                    </span>
                  </button>
                  <GameLog lines={b.gameLines} open={open} />
                </li>
              );
            })}
          </ul>
        </div>

        <p className="score mt-4 text-center text-[11px] leading-relaxed text-chalk-faint">
          Scores after eight full innings, from official inning-by-inning linescores ·
          rain-shortened games excluded · gold tallies are wins, red are losses
        </p>
      </section>

      <footer className="mt-20 border-t border-line pt-6 text-center">
        <div className="display text-[9px] tracking-[0.26em] text-chalk-faint">
          DATA · MLB STATS API — NOT AFFILIATED WITH MLB · REFRESHES EVERY 30 MINUTES
        </div>
      </footer>
    </div>
  );
}
