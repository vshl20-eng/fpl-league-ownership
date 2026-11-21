"use client";

import { FormEvent, useMemo, useState } from "react";

type PlayerRow = {
  id: number;
  name: string;
  position: string;
  club: string;
  ownershipCount: number;
  ownershipPercent: number;
};
type Analysis = {
  leagueName: string;
  teamName: string;
  managerName: string;
  gameweek: number;
  gameweekName: string;
  totalTeams: number;
  players: PlayerRow[];
  checkedTeams: number;
  generatedAt: string;
};

export default function Home() {
  const [teamId, setTeamId] = useState("");
  const [leagueId, setLeagueId] = useState("");
  const [data, setData] = useState<Analysis | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState<"high" | "low" | "name">("low");

  const sortedPlayers = useMemo(() => {
    if (!data) return [];
    return [...data.players].sort((a, b) => {
      if (sort === "high") return b.ownershipPercent - a.ownershipPercent || a.name.localeCompare(b.name);
      if (sort === "name") return a.name.localeCompare(b.name);
      return a.ownershipPercent - b.ownershipPercent || a.name.localeCompare(b.name);
    });
  }, [data, sort]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setData(null);
    setLoading(true);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: teamId.trim(), leagueId: leagueId.trim() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not analyse this league.");
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="#"><span className="brand-mark">FPL</span><span>League Ownership</span></a>
        <span className="season-pill">MINI-LEAGUE ANALYSER</span>
      </header>

      <section className="hero">
        <div className="eyebrow"><span className="eyebrow-dot" /> YOUR LEAGUE. YOUR NUMBERS.</div>
        <h1>Find out who owns<br /><em>your</em> players.</h1>
        <p className="intro">See the percentage of teams in your mini-league that own each player in your squad. Spot the differentials hiding in plain sight.</p>
      </section>

      <section className="input-card" aria-label="Enter FPL details">
        <div className="card-heading">
          <div><span className="step">01</span><h2>Connect your FPL team</h2></div>
          <span className="api-note"><span className="live-dot" /> OFFICIAL FPL DATA</span>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="fields">
            <label className="field">
              <span>YOUR FPL TEAM ID</span>
              <input inputMode="numeric" pattern="[0-9]*" required min="1" placeholder="e.g. 123456" value={teamId} onChange={e => setTeamId(e.target.value)} />
              <small>Found in your team URL: /entry/<b>123456</b>/</small>
            </label>
            <label className="field">
              <span>CLASSIC LEAGUE ID</span>
              <input inputMode="numeric" pattern="[0-9]*" required min="1" placeholder="e.g. 987654" value={leagueId} onChange={e => setLeagueId(e.target.value)} />
              <small>Open your league and copy its ID from the URL.</small>
            </label>
          </div>
          <button className="submit" type="submit" disabled={loading}>
            {loading ? <><span className="spinner" /> Analysing league…</> : <>Analyse my squad <span aria-hidden="true">↗</span></>}
          </button>
          {loading && <p className="loading-hint">Fetching league members and checking each squad. Larger leagues can take a little longer.</p>}
        </form>
        {error && <div className="error" role="alert"><b>Unable to complete analysis</b><span>{error}</span></div>}
      </section>

      {data && (
        <section className="results" aria-live="polite">
          <div className="results-head">
            <div>
              <div className="eyebrow"><span className="eyebrow-dot" /> ANALYSIS COMPLETE · GAMEWEEK {data.gameweek}</div>
              <h2>{data.leagueName}</h2>
              <p className="team-subtitle">{data.teamName} <span>·</span> {data.managerName}</p>
            </div>
            <div className="league-total"><strong>{data.totalTeams}</strong><span>TEAMS IN LEAGUE</span></div>
          </div>
          <div className="summary-strip">
            <div><span>PLAYERS IN YOUR SQUAD</span><strong>{data.players.length}</strong></div>
            <div><span>TEAMS CHECKED</span><strong>{data.checkedTeams} / {data.totalTeams}</strong></div>
            <div><span>GAMEWEEK</span><strong>{data.gameweekName}</strong></div>
          </div>
          <div className="table-heading">
            <div><h3>Your squad ownership</h3><p>Share of league teams that own each player</p></div>
            <label className="sort-control">SORT BY
              <select value={sort} onChange={e => setSort(e.target.value as "high" | "low" | "name")}>
                <option value="low">Lowest ownership</option>
                <option value="high">Highest ownership</option>
                <option value="name">Player name</option>
              </select>
            </label>
          </div>
          <div className="player-list">
            <div className="list-labels"><span>PLAYER</span><span>LEAGUE OWNERSHIP</span></div>
            {sortedPlayers.map(player => (
              <div className="player-row" key={player.id}>
                <div className="player-info">
                  <span className={`position position-${player.position.toLowerCase()}`}>{player.position}</span>
                  <div><strong>{player.name}</strong><small>{player.club} <span>·</span> {player.ownershipCount} of {data.totalTeams} teams</small></div>
                </div>
                <div className="ownership">
                  <div className="ownership-value">{player.ownershipPercent.toFixed(1)}<span>%</span></div>
                  <div className="bar-track"><div className="bar-fill" style={{ width: `${Math.min(100, player.ownershipPercent)}%` }} /></div>
                </div>
              </div>
            ))}
          </div>
          <p className="footnote">Ownership is calculated from the squads returned by FPL for this gameweek. Last refreshed {new Date(data.generatedAt).toLocaleString()}.</p>
          <button className="reset" onClick={() => { setData(null); setError(""); }}>← Analyse another team</button>
        </section>
      )}

      <footer>
        <div className="footer-rule" />
        <div><span>FPL LEAGUE OWNERSHIP</span><span>Independent fan-made tool · Not affiliated with the Premier League</span></div>
      </footer>
    </main>
  );
}
