-- The prose around a published set: a minimal team report.
--
-- Its own column, deliberately not part of `document`. That string is at once
-- the storage format, the paste format, the board's dirty-check fingerprint and
-- the future extension's input; page furniture in there would mark every board
-- dirty on a wording change.
--
-- NULL means the page reads exactly as it did before reports existed:
-- description, then every matchup in document order. So nothing needs
-- migrating and an older post keeps working untouched.
--
-- Shape (see app/demo/report.ts, which is the authority):
--   { "before": { "<opposing team id>": "text above that matchup" },
--     "outro":  "text after the last matchup" }
alter table public.published_groups
  add column if not exists report jsonb;
