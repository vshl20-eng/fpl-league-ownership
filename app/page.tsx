"use client";

import { FormEvent, useMemo, useState } from "react";

type Team = { teamId: number; teamName: string; managerName: string; rank: number; points: number; gameweekPoints: number };
type PlayerRow = {
  id: number; name: string; position: string; club: string; ownershipCount: number;
  ownershipPercent: number; globalOwnershipPercent: number; totalPoints: number; exclusiveOwner: string | null;
};
type League = { leagueId: string; leagueName: string; totalTeams: number; teams: Team[]; hasMoreThan50: boolean };
type Analysis = {
  leagueName: string; teamName: string; managerName: string; rank: number; gameweek: number;
  gameweekName: string; totalTeams: number; checkedTeams: number; players: PlayerRow[];
  allPlayers: PlayerRow[]; generatedAt: string;
};
type SortMode = "ownership-low" | "ownership-high" | "points" | "name";

export default function Home() {
  const [leagueId, setLeagueId] = useState("");
  const [league, setLeague] = useState<League | null>(null);
  const [data, setData] = useState<Analysis | null>(null);
  const [error, setError] = useState("");
  const [loadingLeague, setLoadingLeague] = useState(false);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [sortSquad, setSortSquad] = useState<SortMode>("ownership-low");
  const [sortAll, setSortAll] = useState<SortMode>("ownership-high");
  const [searchTeam, setSearchTeam] = useState("");

  const filteredTeams = useMemo(() => {
    if (!league) return [];
    const query = searchTeam.toLowerCase().trim();
    return league.teams.filter(team => !query || team.teamName.toLowerCase().includes(query) || team.managerName.toLowerCase().includes(query));
  }, [league, searchTeam]);

  const sortedSquad = useMemo(() => sortPlayers(data?.players ?? [], sortSquad), [data, sortSquad]);
  const sortedAll = useMemo(() => sortPlayers(data?.allPlayers ?? [], sortAll), [data, sortAll]);

  async function handleLeagueSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setLeague(null); setData(null); setLoadingLeague(true);
    try {
      const response = await fetch(`/api/league?leagueId=${encodeURIComponent(leagueId.trim())}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load this league.");
      setLeague(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally { setLoadingLeague(false); }
  }

  async function selectTeam(team: Team) {
    if (!league) return;
    setError(""); setData(null); setLoadingTeam(true);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leagueId: league.leagueId, teamId: String(team.teamId) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not analyse this team.");
      setData(result);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally { setLoadingTeam(false); }
  }

  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="#"><span className="brand-mark">FPL</span><span>League Ownership</span></a>
        <span className="season-pill">MINI-LEAGUE ANALYSER</span>
      </header>

      <section className="hero">
        <div className="eyebrow"><span className="eyebrow-dot" /> YOUR LEAGUE. YOUR NUMBERS.</div>
        <h1>Know your league.<br /><em>Own</em> the numbers.</h1>
        <p className="intro">Explore every team's squad, compare league and global ownership, and find the differentials hiding in your mini-league.</p>
      </section>

      <section className="input-card" aria-label="Find your FPL league">
        <div className="card-heading">
          <div><span className="step">01</span><h2>Find your mini-league</h2></div>
          <span className="api-note"><span className="live-dot" /> FPL DATA</span>
        </div>
        <form onSubmit={handleLeagueSubmit}>
          <label className="field">
            <span>CLASSIC LEAGUE ID</span>
            <input inputMode="numeric" pattern="[0-9]*" required min="1" placeholder="e.g. 987654" value={leagueId} onChange={e => setLeagueId(e.target.value)} />
            <small>Copy the number from your FPL league standings URL.</small>
          </label>
          <button className="submit" type="submit" disabled={loadingLeague}>
            {loadingLeague ? <><span className="spinner" /> Finding league…</> : <>Find league teams <span aria-hidden="true">↗</span></>}
          </button>
          {loadingLeague && <p className="loading-hint">Loading league standings and counting all teams…</p>}
        </form>
        {error && <div className="error" role="alert"><b>Unable to complete request</b><span>{error}</span></div>}
      </section>

      {league && !data && (
        <section className="team-picker">
          <div className="results-head">
            <div><div className="eyebrow"><span className="eyebrow-dot" /> LEAGUE FOUND</div><h2>{league.leagueName}</h2><p className="team-subtitle">Select a team to analyse · {league.totalTeams} teams in league</p></div>
            <div className="league-total"><strong>{league.totalTeams}</strong><span>TEAMS</span></div>
          </div>
          <div className="table-heading"><div><h3>League table</h3><p>Showing the top {league.teams.length} teams by rank</p></div></div>
          <input className="team-search" aria-label="Search teams" placeholder="Search team or manager…" value={searchTeam} onChange={e => setSearchTeam(e.target.value)} />
          <div className="team-list">
            {filteredTeams.map(team => (
              <button className="team-row" key={team.teamId} onClick={() => selectTeam(team)} disabled={loadingTeam}>
                <span className="team-rank">{team.rank}</span>
                <span className="team-name"><strong>{team.teamName}</strong><small>{team.managerName}</small></span>
                <span className="team-points"><strong>{team.points.toLocaleString("en-IN")}</strong><small>pts</small></span>
                <span className="team-arrow">{loadingTeam ? "…" : "→"}</span>
              </button>
            ))}
            {!filteredTeams.length && <p className="empty-state">No teams match that search.</p>}
          </div>
          {league.hasMoreThan50 && <p className="footnote">Only the top 50 teams are shown here. Ownership calculations include all {league.totalTeams} teams in the league.</p>}
          {loadingTeam && <p className="loading-hint">Checking every squad in the league. This can take a little while for large leagues.</p>}
        </section>
      )}

      {data && (
        <section className="results" aria-live="polite">
          <button className="reset" onClick={() => { setData(null); setError(""); }}>← Back to league teams</button>
          <div className="results-head">
            <div><div className="eyebrow"><span className="eyebrow-dot" /> ANALYSIS COMPLETE · GAMEWEEK {data.gameweek}</div><h2>{data.teamName}</h2><p className="team-subtitle">{data.managerName} <span>·</span> League rank #{data.rank}</p></div>
            <div className="league-total"><strong>{data.totalTeams}</strong><span>TEAMS IN LEAGUE</span></div>
          </div>
          <div className="summary-strip">
            <div><span>PLAYERS IN SQUAD</span><strong>{data.players.length}</strong></div>
            <div><span>TEAMS CHECKED</span><strong>{data.checkedTeams} / {data.totalTeams}</strong></div>
            <div><span>GAMEWEEK</span><strong>{data.gameweekName}</strong></div>
          </div>

          <div className="table-heading"><div><h3>Selected team's squad</h3><p>League ownership compared with global FPL ownership</p></div><SortSelect value={sortSquad} onChange={setSortSquad} /></div>
          <div className="player-list">
            <div className="list-labels squad-labels"><span>PLAYER</span><span>LEAGUE / GLOBAL</span></div>
            {sortedSquad.map(player => <SquadPlayer key={player.id} player={player} totalTeams={data.totalTeams} />)}
          </div>

          <div className="all-players-section">
            <div className="table-heading"><div><h3>All players owned in this league</h3><p>{data.allPlayers.length} unique players across all {data.totalTeams} teams · Includes bench players</p></div><SortSelect value={sortAll} onChange={setSortAll} /></div>
            <div className="player-list all-player-list">
              <div className="list-labels all-labels"><span>PLAYER</span><span>LEAGUE OWNERSHIP</span><span>POINTS</span></div>
              {sortedAll.map(player => (
                <div className="player-row all-player-row" key={player.id}>
                  <div className="player-info"><span className={`position position-${player.position.toLowerCase()}`}>{player.position}</span><div><strong>{player.name}</strong><small>{player.club}{player.exclusiveOwner ? ` · Only owned by ${player.exclusiveOwner}` : ""}</small></div></div>
                  <div className="ownership"><div className="ownership-value">{player.ownershipPercent.toFixed(1)}<span>%</span></div><div className="bar-track"><div className="bar-fill" style={{ width: `${Math.min(100, player.ownershipPercent)}%` }} /></div></div>
                  <div className="points-cell">{player.totalPoints}</div>
                </div>
              ))}
            </div>
          </div>
          <p className="footnote">League ownership counts each team once per player and includes all squads in the league. Global ownership is FPL's selected_by_percent figure. Points are the player's season total. Last refreshed {new Date(data.generatedAt).toLocaleString()}.</p>
        </section>
      )}

      <footer><div className="footer-rule" /><div><span>FPL LEAGUE OWNERSHIP</span><span>Independent fan-made tool · Not affiliated with the Premier League</span></div></footer>
    </main>
  );
}

function sortPlayers(players: PlayerRow[], sort: SortMode) {
  return [...players].sort((a, b) => {
    if (sort === "ownership-low") return a.ownershipPercent - b.ownershipPercent || a.name.localeCompare(b.name);
    if (sort === "ownership-high") return b.ownershipPercent - a.ownershipPercent || a.name.localeCompare(b.name);
    if (sort === "points") return b.totalPoints - a.totalPoints || a.name.localeCompare(b.name);
    return a.name.localeCompare(b.name);
  });
}

function SortSelect({ value, onChange }: { value: SortMode; onChange: (value: SortMode) => void }) {
  return <label className="sort-control">SORT BY<select value={value} onChange={e => onChange(e.target.value as SortMode)}><option value="ownership-low">Lowest ownership</option><option value="ownership-high">Highest ownership</option><option value="points">Total points</option><option value="name">Player name</option></select></label>;
}

function SquadPlayer({ player, totalTeams }: { player: PlayerRow; totalTeams: number }) {
  return <div className="player-row squad-player-row">
    <div className="player-info"><span className={`position position-${player.position.toLowerCase()}`}>{player.position}</span><div><strong>{player.name}</strong><small>{player.club} · {player.ownershipCount} of {totalTeams} teams</small></div></div>
    <div className="dual-ownership">
      <div><strong>{player.ownershipPercent.toFixed(1)}%</strong><small>LEAGUE</small></div>
      <div><strong>{player.globalOwnershipPercent.toFixed(1)}%</strong><small>GLOBAL</small></div>
    </div>
  </div>;
}
