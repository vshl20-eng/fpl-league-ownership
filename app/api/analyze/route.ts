import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

const API = "https://fantasy.premierleague.com/api/";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; FPLLeagueOwnership/1.0)",
  "Accept": "application/json",
};

async function getJson(path: string) {
  const response = await fetch(`${API}${path}`, {
    headers: HEADERS,
    cache: "no-store",
    signal: AbortSignal.timeout(25000),
  });
  if (!response.ok) {
    const error = new Error(`FPL API returned ${response.status} for ${path}`);
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }
  return response.json();
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const output = new Array<R>(items.length);
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const index = next++;
      if (index >= items.length) return;
      output[index] = await worker(items[index]);
    }
  });
  await Promise.all(runners);
  return output;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const teamId = String(body.teamId ?? "").trim();
    const leagueId = String(body.leagueId ?? "").trim();

    if (!/^[1-9]\d{0,11}$/.test(teamId) || !/^[1-9]\d{0,11}$/.test(leagueId)) {
      return NextResponse.json({ error: "Enter valid numeric FPL Team ID and Classic League ID values." }, { status: 400 });
    }

    const [bootstrap, profile] = await Promise.all([
      getJson("bootstrap-static/"),
      getJson(`entry/${teamId}/`),
    ]);

    const currentEvent = bootstrap.events?.find((event: any) => event.is_current);
    const nextEvent = bootstrap.events?.find((event: any) => event.is_next);
    const event = currentEvent ?? nextEvent ?? bootstrap.events?.[bootstrap.events.length - 1];
    if (!event) throw new Error("Could not determine the current FPL gameweek.");

    // Read every page: FPL classic league standings return at most 50 entries per page.
    const firstPage = await getJson(`leagues-classic/${leagueId}/standings/`);
    const leagueName = firstPage.league?.name || `League ${leagueId}`;
    const members: any[] = [...(firstPage.standings?.results ?? [])];
    let page = 2;
    let hasNext = Boolean(firstPage.standings?.has_next);
    while (hasNext) {
      if (page > 200) throw new Error("This league has an unexpectedly large number of pages.");
      const pageData = await getJson(`leagues-classic/${leagueId}/standings/?page_standings=${page}`);
      members.push(...(pageData.standings?.results ?? []));
      hasNext = Boolean(pageData.standings?.has_next);
      page += 1;
    }

    const uniqueMembers = Array.from(new Map(members.map((member: any) => [member.entry, member])).values());
    if (!uniqueMembers.length) throw new Error("No teams were found in this classic league. Check the League ID and try again.");

    // Fetch picks for every league member. A failed team fetch aborts the calculation:
    // treating an unavailable squad as if it owned no players would produce false percentages.
    const memberPicks = await mapWithConcurrency(uniqueMembers, 8, async (member: any) => {
      const result = await getJson(`entry/${member.entry}/event/${event.id}/picks/`);
      return { entry: member.entry, picks: result.picks ?? [] };
    });

    const membersWithoutPicks = memberPicks.filter(item => !item.picks.length);
    if (membersWithoutPicks.length) {
      throw new Error(`${membersWithoutPicks.length} team(s) in this league have no picks available for Gameweek ${event.id}. Ownership cannot be calculated accurately yet. Try again after the gameweek deadline.`);
    }

    const targetInLeague = uniqueMembers.some((member: any) => Number(member.entry) === Number(teamId));
    let targetPicks: any[];
    if (targetInLeague) {
      targetPicks = memberPicks.find(item => Number(item.entry) === Number(teamId))?.picks ?? [];
    } else {
      const result = await getJson(`entry/${teamId}/event/${event.id}/picks/`);
      targetPicks = result.picks ?? [];
    }
    if (!targetPicks.length) {
      throw new Error(`No squad picks were available for your team in Gameweek ${event.id}. Try again after the gameweek deadline or check the Team ID.`);
    }

    const elements = new Map<number, any>((bootstrap.elements ?? []).map((player: any) => [player.id, player]));
    const clubs = new Map<number, string>((bootstrap.teams ?? []).map((club: any) => [club.id, club.name]));
    const positions = new Map<number, string>((bootstrap.element_types ?? []).map((position: any) => [position.id, position.singular_name_short]));

    const counts = new Map<number, number>();
    for (const manager of memberPicks) {
      const owned = new Set<number>(manager.picks.map((pick: any) => Number(pick.element)));
      for (const playerId of owned) counts.set(playerId, (counts.get(playerId) ?? 0) + 1);
    }

    const totalTeams = uniqueMembers.length;
    const players = targetPicks.map((pick: any) => {
      const player = elements.get(Number(pick.element));
      if (!player) return null;
      const ownershipCount = counts.get(Number(pick.element)) ?? 0;
      return {
        id: player.id,
        name: player.web_name,
        position: positions.get(player.element_type) ?? "—",
        club: clubs.get(player.team) ?? "",
        ownershipCount,
        ownershipPercent: (ownershipCount * 100) / totalTeams,
      };
    }).filter(Boolean);

    if (!players.length) throw new Error("Could not match your squad picks to the current FPL player list.");

    return NextResponse.json({
      leagueName,
      teamName: profile.name ?? `Team ${teamId}`,
      managerName: [profile.player_first_name, profile.player_last_name].filter(Boolean).join(" ") || "FPL manager",
      gameweek: event.id,
      gameweekName: event.name ?? `Gameweek ${event.id}`,
      totalTeams,
      checkedTeams: memberPicks.length,
      players,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("FPL analysis error:", error);
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    const status = (error as Error & { status?: number }).status;
    if (status === 404) {
      return NextResponse.json({ error: "FPL could not find the league, team, or gameweek picks. Double-check both IDs and try again after the gameweek deadline." }, { status: 404 });
    }
    if (status === 429 || status === 403) {
      return NextResponse.json({ error: "FPL is temporarily limiting or blocking requests. Please wait a minute and try again." }, { status: 503 });
    }
    if (message.includes("fetch failed") || message.includes("timed out") || message.includes("aborted")) {
      return NextResponse.json({ error: "The FPL service did not respond in time. Please try again shortly." }, { status: 504 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
