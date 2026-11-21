import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
const API = "https://fantasy.premierleague.com/api/";
const HEADERS = { "User-Agent": "Mozilla/5.0 (compatible; FPLLeagueOwnership/1.0)", Accept: "application/json" };

async function getJson(path: string) {
  const response = await fetch(`${API}${path}`, { headers: HEADERS, cache: "no-store", signal: AbortSignal.timeout(25000) });
  if (!response.ok) {
    const error = new Error(`FPL API returned ${response.status} for ${path}`);
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }
  return response.json();
}

export async function GET(request: NextRequest) {
  try {
    const leagueId = (request.nextUrl.searchParams.get("leagueId") ?? "").trim();
    if (!/^[1-9]\d{0,11}$/.test(leagueId)) {
      return NextResponse.json({ error: "Enter a valid numeric Classic League ID." }, { status: 400 });
    }

    const firstPage = await getJson(`leagues-classic/${leagueId}/standings/`);
    const teams = (firstPage.standings?.results ?? []).slice(0, 50).map((team: any) => ({
      teamId: team.entry,
      teamName: team.entry_name,
      managerName: team.player_name,
      rank: team.rank,
      points: team.total,
      gameweekPoints: team.event_total,
    }));

    let totalTeams = teams.length;
    let page = 2;
    let hasNext = Boolean(firstPage.standings?.has_next);
    while (hasNext) {
      if (page > 200) throw new Error("This league has an unexpectedly large number of pages.");
      const pageData = await getJson(`leagues-classic/${leagueId}/standings/?page_standings=${page}`);
      totalTeams += (pageData.standings?.results ?? []).length;
      hasNext = Boolean(pageData.standings?.has_next);
      page += 1;
    }

    return NextResponse.json({
      leagueId,
      leagueName: firstPage.league?.name || `League ${leagueId}`,
      totalTeams,
      teams,
      hasMoreThan50: totalTeams > teams.length,
    });
  } catch (error) {
    console.error("FPL league lookup error:", error);
    const status = (error as Error & { status?: number }).status;
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    if (status === 404) return NextResponse.json({ error: "FPL could not find this Classic League. Check the League ID." }, { status: 404 });
    if (status === 429 || status === 403) return NextResponse.json({ error: "FPL is temporarily limiting requests. Please wait a minute and try again." }, { status: 503 });
    if (message.includes("timed out") || message.includes("aborted") || message.includes("fetch failed")) return NextResponse.json({ error: "FPL did not respond in time. Please try again." }, { status: 504 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
