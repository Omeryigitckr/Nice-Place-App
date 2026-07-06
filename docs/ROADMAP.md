# Nice Place — Launch Roadmap

Last updated: 2026-07-04

## Launch scope (first public release)

In scope:

- Map exploration, search, and filters
- Place detail (photos, info, creator profile)
- Like and Save
- Share place
- Navigate via **external maps app** (Apple Maps / Google Maps)
- Add Place + photo upload + admin approval flow
- Profiles (own + public)
- Settings (theme, map style, units, privacy, account)

## Explicitly out of scope for launch

| Feature | Decision |
| --- | --- |
| Place ratings | **Cancelled** — not for launch |
| Comments / reviews | **Cancelled** — not for launch |
| Community routes / trails | **Postponed** — after first public release |
| In-app turn-by-turn navigation | **Not for launch** — keep external maps |

## Navigation decision

**Current behavior:** Navigate opens the platform maps app with directions to the place.

**In-app navigation assessment:**

- Would need a directions API, route polylines, and ongoing location updates
- Adds database/schema and map-rendering complexity
- Higher maintenance and performance risk on mobile

**Decision:** Keep **external app navigation**. It is a single `Linking` call, no schema changes, and no impact on map performance. Revisit in-app navigation only if it can stay lightweight (e.g. a simple line without full routing) and does not hurt DB complexity or FPS.

## Post-launch candidates

1. Community routes (trail discovery, route cards)
2. Optional lightweight in-app path preview (only if low complexity)
3. Reporting tools (in-app report flow)
4. Richer notifications

## Notes

- Do not add ratings or comments without a new product decision.
- Do not wire Routes into the main tab bar before launch.
- Place detail actions remain: **Like**, **Save**, **Share**, **Navigate**.
