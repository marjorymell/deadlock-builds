# Deadlock Build Lab

[![Live site](https://img.shields.io/badge/live-GitHub%20Pages-d6aa5c)](https://marjorymell.github.io/deadlock-builds/)
![JavaScript](https://img.shields.io/badge/javascript-vanilla-f7df1e)
![No build step](https://img.shields.io/badge/build-none-lightgrey)

Builds for **Deadlock** adapted to the enemy team in your current match, so you know **which items to swap in** instead of following the same build every game.

**[Open the live site →](https://marjorymell.github.io/deadlock-builds/)**

Hero and item stats come from [deadlock-api.com](https://deadlock-api.com), a free community API with millions of recent matches. Nothing is stored in the page: every lookup uses the latest data, so new patches, items and heroes show up on their own.

## Features

- **Items against this team.** Items that perform better than usual against the enemies in the match, with the reason (*good against Haze, Wraith*).
- **Base build.** The most bought items for your hero, by tier.
- **Avoid this match.** Common base-build items that do worse than usual against this team.
- **Matchups.** Your hero's win rate against each enemy and with each ally.
- **Mark as strong.** During the match, check the scoreboard (Tab) and mark the enemies with the most souls. They weigh 3× in the recommendations.
- **Match mode filter.** Normal (unranked) matches by default, or ranked, or both. In ranked you can also filter by rank to use only matches from players around your level.

## How it works

```
your hero + enemy heroes ──► item stats per enemy ──► compare to baseline ──► ranked items per tier
```

For each item, the page compares its win rate **against each enemy** with its win rate **in general** for your hero:

```
lift = (item win rate vs enemy − item win rate overall)
     − (average win rate vs enemy − average win rate overall)
```

The second term removes the effect of the matchup itself: if your hero already wins more against that enemy, every item looks better there, and that is not the item's merit. The lift is then shrunk by sample size (`n / (n + 250)`), so items with few matches can't top the list by luck, and averaged across enemies, with weight 3 for the ones marked as strong.

## Usage

1. Open the [live site](https://marjorymell.github.io/deadlock-builds/), or `index.html` in any browser.
2. Pick your hero. It is remembered for next time.
3. When the match starts, type the first letters of each enemy and press **Enter**.
4. Mid-match, use **Mark as strong** on the enemies who are ahead.

To run it locally there is nothing to install:

```bash
git clone git@github.com:marjorymell/deadlock-builds.git
cd deadlock-builds
# open index.html in your browser
```

## Project structure

```
index.html            page layout
assets/css/style.css  styles (dark theme, responsive down to phone width)
assets/js/app.js      hero picker, API calls, scoring and rendering
```

## Limitations

- **Heroes are picked by hand.** The game doesn't expose which match you are in. The *Find my match* button only finds matches listed in the in-game Watch tab (around the top 200), so most of the time you type the enemies yourself. Reading the match automatically would need an Overwolf app.
- **Correlation, not causation.** Stats cover the last 30 days of matches. Right after a big patch they still mix in the old version for a few days.
- **Differences are small.** Most items move win rate by 1–2 percentage points. Use the results as a guide, not a rule.
- **Allies only affect matchups.** The API has no item stats split by ally.

## Credits

- Data: [deadlock-api.com](https://deadlock-api.com)
- Unofficial project, not affiliated with Valve. Deadlock is a trademark of Valve Corporation.

## License

[MIT](LICENSE)
