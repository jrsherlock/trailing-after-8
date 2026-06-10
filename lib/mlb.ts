import { unstable_cache } from "next/cache";

export type Perspective = "trailing" | "tied" | "leading";

export interface GameLine {
  gamePk: number;
  date: string; // YYYY-MM-DD
  opponentId: number;
  home: boolean;
  runsFor8: number;
  runsAgainst8: number;
  finalFor: number;
  finalAgainst: number;
  won: boolean;
  innings: number;
}

export interface Bucket {
  games: number;
  wins: number;
  losses: number;
  gameLines: GameLine[];
}

export interface TeamStats {
  teamId: number;
  trailing: Bucket;
  tied: Bucket;
  leading: Bucket;
}

export interface LeagueTotals {
  games: number;
  wins: number;
  losses: number;
}

export interface ComebackData {
  season: number;
  computedAt: string;
  gamesAnalyzed: number;
  throughDate: string | null;
  teams: TeamStats[];
  league: Record<Perspective, LeagueTotals>;
  biggestComeback: {
    teamId: number;
    opponentId: number;
    gamePk: number;
    deficit: number;
    date: string;
  } | null;
}

interface ApiInningHalf {
  runs?: number;
}
interface ApiInning {
  num: number;
  home: ApiInningHalf;
  away: ApiInningHalf;
}
interface ApiGame {
  gamePk: number;
  officialDate: string;
  status: { codedGameState: string };
  teams: {
    away: { team: { id: number }; score?: number; isWinner?: boolean };
    home: { team: { id: number }; score?: number; isWinner?: boolean };
  };
  linescore?: {
    scheduledInnings?: number;
    innings?: ApiInning[];
  };
}

const MLB_API = "https://statsapi.mlb.com/api/v1";

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    cache: "no-store",
    headers: { "User-Agent": "trailing-after-8 (hobby stats site)" },
  });
  if (!res.ok) throw new Error(`MLB API ${res.status} for ${url}`);
  return res.json();
}

async function resolveSeason(): Promise<{ season: number; start: string; end: string }> {
  // Use Eastern time so a late west-coast game doesn't roll the date early.
  const todayET = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  const year = Number(todayET.slice(0, 4));

  for (const candidate of [year, year - 1]) {
    const data = (await fetchJson(`${MLB_API}/seasons/${candidate}?sportId=1`)) as {
      seasons?: { regularSeasonStartDate?: string; regularSeasonEndDate?: string }[];
    };
    const s = data.seasons?.[0];
    if (!s?.regularSeasonStartDate || !s.regularSeasonEndDate) continue;
    // Before this season's opening day (offseason/spring)? Fall back to last season.
    if (todayET < s.regularSeasonStartDate && candidate === year) continue;
    const end = todayET < s.regularSeasonEndDate ? todayET : s.regularSeasonEndDate;
    return { season: candidate, start: s.regularSeasonStartDate, end };
  }
  throw new Error("Could not resolve current MLB season");
}

function emptyBucket(): Bucket {
  return { games: 0, wins: 0, losses: 0, gameLines: [] };
}

function computeStats(games: ApiGame[], season: number): ComebackData {
  const byTeam = new Map<number, TeamStats>();
  const league: Record<Perspective, LeagueTotals> = {
    trailing: { games: 0, wins: 0, losses: 0 },
    tied: { games: 0, wins: 0, losses: 0 },
    leading: { games: 0, wins: 0, losses: 0 },
  };
  let biggest: ComebackData["biggestComeback"] = null;
  let throughDate: string | null = null;
  let analyzed = 0;

  const team = (id: number): TeamStats => {
    let t = byTeam.get(id);
    if (!t) {
      t = { teamId: id, trailing: emptyBucket(), tied: emptyBucket(), leading: emptyBucket() };
      byTeam.set(id, t);
    }
    return t;
  };

  // Suspended games can appear on two schedule dates with the same gamePk.
  const seen = new Set<number>();

  for (const g of games) {
    if (seen.has(g.gamePk)) continue;
    if (g.status.codedGameState !== "F" && g.status.codedGameState !== "O") continue;

    const innings = g.linescore?.innings ?? [];
    const scheduled = g.linescore?.scheduledInnings ?? 9;
    // "After 8" requires 8 full innings of a 9-inning game; skip shortened games.
    if (scheduled < 9 || innings.length < 8) continue;

    const first8 = innings.slice(0, 8);
    if (first8.some((i) => i.away.runs === undefined || i.home.runs === undefined)) continue;

    const awayScore = g.teams.away.score;
    const homeScore = g.teams.home.score;
    if (awayScore === undefined || homeScore === undefined || awayScore === homeScore) continue;

    seen.add(g.gamePk);
    analyzed++;
    if (!throughDate || g.officialDate > throughDate) throughDate = g.officialDate;

    const away8 = first8.reduce((s, i) => s + (i.away.runs ?? 0), 0);
    const home8 = first8.reduce((s, i) => s + (i.home.runs ?? 0), 0);

    const sides = [
      { id: g.teams.away.team.id, oppId: g.teams.home.team.id, home: false, for8: away8, against8: home8, final: awayScore, oppFinal: homeScore },
      { id: g.teams.home.team.id, oppId: g.teams.away.team.id, home: true, for8: home8, against8: away8, final: homeScore, oppFinal: awayScore },
    ];

    for (const s of sides) {
      const perspective: Perspective =
        s.for8 < s.against8 ? "trailing" : s.for8 > s.against8 ? "leading" : "tied";
      const won = s.final > s.oppFinal;
      const line: GameLine = {
        gamePk: g.gamePk,
        date: g.officialDate,
        opponentId: s.oppId,
        home: s.home,
        runsFor8: s.for8,
        runsAgainst8: s.against8,
        finalFor: s.final,
        finalAgainst: s.oppFinal,
        won,
        innings: innings.length,
      };
      const bucket = team(s.id)[perspective];
      bucket.games++;
      bucket.gameLines.push(line);
      if (won) bucket.wins++;
      else bucket.losses++;
      league[perspective].games++;
      if (won) league[perspective].wins++;
      else league[perspective].losses++;

      if (perspective === "trailing" && won) {
        const deficit = s.against8 - s.for8;
        if (!biggest || deficit > biggest.deficit || (deficit === biggest.deficit && line.date > biggest.date)) {
          biggest = { teamId: s.id, opponentId: s.oppId, gamePk: g.gamePk, deficit, date: line.date };
        }
      }
    }
  }

  const teams = [...byTeam.values()];
  for (const t of teams) {
    for (const p of ["trailing", "tied", "leading"] as const) {
      t[p].gameLines.sort((a, b) => (a.date < b.date ? -1 : 1));
    }
  }

  return {
    season,
    computedAt: new Date().toISOString(),
    gamesAnalyzed: analyzed,
    throughDate,
    teams,
    league,
    biggestComeback: biggest,
  };
}

async function buildComebackData(): Promise<ComebackData> {
  const { season, start, end } = await resolveSeason();
  const url =
    `${MLB_API}/schedule?sportId=1&season=${season}&gameType=R` +
    `&startDate=${start}&endDate=${end}&hydrate=linescore`;
  const data = (await fetchJson(url)) as { dates?: { games?: ApiGame[] }[] };
  const games = (data.dates ?? []).flatMap((d) => d.games ?? []);
  return computeStats(games, season);
}

export const getComebackData = unstable_cache(buildComebackData, ["comeback-data-v1"], {
  revalidate: 1800,
  tags: ["mlb-data"],
});

// Bypasses the cache; used by the manual refresh endpoint.
export const getFreshComebackData = buildComebackData;
