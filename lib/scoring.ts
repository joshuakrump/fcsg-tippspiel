/**
 * Punktesystem (Berechnung erfolgt in Supabase per Trigger, siehe
 * supabase/migrations/20261110120000_new_point_system.sql):
 *
 * - Richtiger Sieger bzw. Unentschieden: 3 Punkte
 * - zusätzlich richtige Tordifferenz:    +1
 * - zusätzlich exaktes Resultat:         +2
 * - falscher Sieger:                      0
 */
export const POINTS_CORRECT_WINNER = 3;
export const POINTS_GOAL_DIFFERENCE = 1;
export const POINTS_EXACT_BONUS = 2;

/** Punktzahl eines exakt richtigen Tipps (Maximum pro Spiel). */
export const EXACT_TIP_POINTS =
  POINTS_CORRECT_WINNER + POINTS_GOAL_DIFFERENCE + POINTS_EXACT_BONUS;
