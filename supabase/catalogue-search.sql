-- Look a catalogue team up by the id VGCPastes gives it in the sheet.
--
-- `source_team_id` has been on the table since the first ingest ("e.g. MB712")
-- and was never queried, so it had no index. The codes run MB1–MB712 and
-- MC1–MC583 today; the prefix is the regulation's shorthand.
create index if not exists community_teams_source_id
  on public.community_teams (source_team_id);
