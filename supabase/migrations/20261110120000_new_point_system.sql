-- Neues Punktesystem (am 10.11.2026 in Supabase ausgeführt)
--   Richtiger Sieger bzw. Unentschieden: 3
--   + richtige Tordifferenz:            +1
--   + exaktes Resultat:                 +2
--   Falscher Sieger:                     0
-- Maximum pro Spiel: 6
-- Der bestehende Trigger calculate_points_after_match ruft diese Funktion auf.

-- 1. Sicherung der bisherigen Punkte
create table if not exists public.tips_points_backup_20261110 as
select id as tip_id, match_id, user_id, points, now() as backed_up_at
from public.tips;

alter table public.tips_points_backup_20261110 enable row level security;
revoke all on table public.tips_points_backup_20261110 from anon, authenticated;

-- 2. Neue Formel
create or replace function public.calculate_tip_points(
  p_fcsg_tip integer,
  p_opponent_tip integer,
  p_fcsg_score integer,
  p_opponent_score integer,
  p_is_home boolean
)
returns integer
language plpgsql
set search_path to ''
as $function$
begin
  if p_fcsg_tip is null or p_opponent_tip is null
     or p_fcsg_score is null or p_opponent_score is null then
    return 0;
  end if;

  -- Falscher Sieger bzw. Unentschieden: keine Punkte
  if sign(p_fcsg_tip - p_opponent_tip) <> sign(p_fcsg_score - p_opponent_score) then
    return 0;
  end if;

  return 3
    + case when p_fcsg_tip - p_opponent_tip = p_fcsg_score - p_opponent_score then 1 else 0 end
    + case when p_fcsg_tip = p_fcsg_score and p_opponent_tip = p_opponent_score then 2 else 0 end;
end;
$function$;

-- 3. Rückwirkende Neuberechnung aller abgeschlossenen Spiele
update public.tips t
set points = public.calculate_tip_points(t.fcsg_tip, t.opponent_tip, m.fcsg_score, m.opponent_score, m.is_home)
from public.matches m
where m.id = t.match_id
  and m.finished = true
  and m.fcsg_score is not null
  and m.opponent_score is not null;
