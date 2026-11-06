BEGIN;
SET LOCAL lock_timeout = '10s';
DELETE FROM admin_bot_jobs;
DELETE FROM submission_logs;
DELETE FROM dynamic_flags;
DELETE FROM score_events;
DELETE FROM solves;
DO $$
DECLARE extra text := '';
BEGIN
  -- Older production schemas do not yet have the earned-bong counter.
  IF EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'users'::regclass
             AND attname = 'bongs_earned' AND NOT attisdropped) THEN
    extra := ', bongs_earned = 0';
  END IF;
  EXECUTE 'UPDATE users SET score = 0, bongs_total = 0, bongs_available = 0,
    global_rank = NULL, division_rank = NULL,
    last_solve_at = NULL, last_tiebreak_solve_at = NULL' || extra;
END $$;
UPDATE challenges SET solve_count = 0, score = 0;
COMMIT;
