export interface TeamMeta {
  id: number;
  abbr: string;
  name: string;
  shortName: string;
  league: "AL" | "NL";
  division: "East" | "Central" | "West";
  color: string;
}

export const TEAMS: Record<number, TeamMeta> = {
  109: { id: 109, abbr: "AZ", name: "Arizona Diamondbacks", shortName: "D-backs", league: "NL", division: "West", color: "#A71930" },
  144: { id: 144, abbr: "ATL", name: "Atlanta Braves", shortName: "Braves", league: "NL", division: "East", color: "#CE1141" },
  110: { id: 110, abbr: "BAL", name: "Baltimore Orioles", shortName: "Orioles", league: "AL", division: "East", color: "#DF4601" },
  111: { id: 111, abbr: "BOS", name: "Boston Red Sox", shortName: "Red Sox", league: "AL", division: "East", color: "#BD3039" },
  112: { id: 112, abbr: "CHC", name: "Chicago Cubs", shortName: "Cubs", league: "NL", division: "Central", color: "#0E3386" },
  145: { id: 145, abbr: "CWS", name: "Chicago White Sox", shortName: "White Sox", league: "AL", division: "Central", color: "#910039" },
  113: { id: 113, abbr: "CIN", name: "Cincinnati Reds", shortName: "Reds", league: "NL", division: "Central", color: "#C6011F" },
  114: { id: 114, abbr: "CLE", name: "Cleveland Guardians", shortName: "Guardians", league: "AL", division: "Central", color: "#E50022" },
  115: { id: 115, abbr: "COL", name: "Colorado Rockies", shortName: "Rockies", league: "NL", division: "West", color: "#7C60A8" },
  116: { id: 116, abbr: "DET", name: "Detroit Tigers", shortName: "Tigers", league: "AL", division: "Central", color: "#FA4616" },
  117: { id: 117, abbr: "HOU", name: "Houston Astros", shortName: "Astros", league: "AL", division: "West", color: "#EB6E1F" },
  118: { id: 118, abbr: "KC", name: "Kansas City Royals", shortName: "Royals", league: "AL", division: "Central", color: "#1A66B0" },
  108: { id: 108, abbr: "LAA", name: "Los Angeles Angels", shortName: "Angels", league: "AL", division: "West", color: "#BA0021" },
  119: { id: 119, abbr: "LAD", name: "Los Angeles Dodgers", shortName: "Dodgers", league: "NL", division: "West", color: "#3E7BBF" },
  146: { id: 146, abbr: "MIA", name: "Miami Marlins", shortName: "Marlins", league: "NL", division: "East", color: "#00A3E0" },
  158: { id: 158, abbr: "MIL", name: "Milwaukee Brewers", shortName: "Brewers", league: "NL", division: "Central", color: "#FFC52F" },
  142: { id: 142, abbr: "MIN", name: "Minnesota Twins", shortName: "Twins", league: "AL", division: "Central", color: "#4A90CD" },
  121: { id: 121, abbr: "NYM", name: "New York Mets", shortName: "Mets", league: "NL", division: "East", color: "#FF5910" },
  147: { id: 147, abbr: "NYY", name: "New York Yankees", shortName: "Yankees", league: "AL", division: "East", color: "#8C9AA5" },
  133: { id: 133, abbr: "ATH", name: "Athletics", shortName: "Athletics", league: "AL", division: "West", color: "#EFB21E" },
  143: { id: 143, abbr: "PHI", name: "Philadelphia Phillies", shortName: "Phillies", league: "NL", division: "East", color: "#E81828" },
  134: { id: 134, abbr: "PIT", name: "Pittsburgh Pirates", shortName: "Pirates", league: "NL", division: "Central", color: "#FDB827" },
  135: { id: 135, abbr: "SD", name: "San Diego Padres", shortName: "Padres", league: "NL", division: "West", color: "#FFC425" },
  136: { id: 136, abbr: "SEA", name: "Seattle Mariners", shortName: "Mariners", league: "AL", division: "West", color: "#00B388" },
  137: { id: 137, abbr: "SF", name: "San Francisco Giants", shortName: "Giants", league: "NL", division: "West", color: "#FD5A1E" },
  138: { id: 138, abbr: "STL", name: "St. Louis Cardinals", shortName: "Cardinals", league: "NL", division: "Central", color: "#C41E3A" },
  139: { id: 139, abbr: "TB", name: "Tampa Bay Rays", shortName: "Rays", league: "AL", division: "East", color: "#8FBCE6" },
  140: { id: 140, abbr: "TEX", name: "Texas Rangers", shortName: "Rangers", league: "AL", division: "West", color: "#5A9BD5" },
  141: { id: 141, abbr: "TOR", name: "Toronto Blue Jays", shortName: "Blue Jays", league: "AL", division: "East", color: "#418FDE" },
  120: { id: 120, abbr: "WSH", name: "Washington Nationals", shortName: "Nationals", league: "NL", division: "East", color: "#AB0003" },
};

export function teamMeta(id: number): TeamMeta {
  return (
    TEAMS[id] ?? {
      id,
      abbr: "???",
      name: `Team ${id}`,
      shortName: `Team ${id}`,
      league: "AL",
      division: "East",
      color: "#888888",
    }
  );
}
