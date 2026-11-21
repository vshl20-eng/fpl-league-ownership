# FPL League Ownership

A Next.js application that calculates ownership of the players in one FPL team across a classic mini-league.

## What it does

1. Takes an FPL Team ID and Classic League ID.
2. Reads every page of the league standings (50 entries per page).
3. Fetches the selected gameweek's picks for every league member.
4. Counts the league teams owning each player in the entered team.
5. Calculates `ownership % = teams owning player * 100 / total teams in league`.

The app deliberately stops if any league member's picks cannot be fetched. It does not silently count a failed request as a team that does not own the player, which would make the percentages inaccurate.

## Run locally

Requirements: Node.js 20.9 or later.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Deploy free on Vercel

1. Create a GitHub repository and upload the contents of this folder.
2. Sign in at https://vercel.com/ and choose **Add New → Project**.
3. Import the GitHub repository. Vercel detects Next.js automatically.
4. Keep the default build settings and click **Deploy**.
5. Open the generated Vercel URL.

No API key, database, or environment variables are required.

## Notes and limitations

- Uses the public JSON API consumed by the official FPL website: `https://fantasy.premierleague.com/api/`.
- FPL does not publish a supported public API specification; endpoints and response formats can change.
- Uses the current gameweek (or next gameweek if the season is between gameweeks). If picks are not yet available for that gameweek, retry after the deadline.
- The app is intended for **classic leagues**. Head-to-head league IDs are not supported by the standings endpoint used here.
- Larger leagues require more API requests and can take longer. FPL may temporarily rate-limit requests.
- No user IDs or results are stored in a database. The entered IDs are sent to this app's server for the duration of the analysis.
- This is an independent fan-made project and is not affiliated with or endorsed by the Premier League.
