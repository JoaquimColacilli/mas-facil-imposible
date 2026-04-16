-- Add explicit type to portfolio_logs so we can distinguish
-- market yield, deposits from savings, and rescues without heuristics.

create type portfolio_log_type as enum ('yield', 'deposit', 'rescue');

alter table portfolio_logs
  add column if not exists type portfolio_log_type;

-- Backfill existing rows using the previous heuristic:
--   * absolute_change > 0 AND percentage_change > 8  -> deposit
--   * absolute_change < 0 AND percentage_change < -5 -> rescue
--   * everything else -> yield
update portfolio_logs
set type = case
  when absolute_change > 0 and percentage_change > 8  then 'deposit'::portfolio_log_type
  when absolute_change < 0 and percentage_change < -5 then 'rescue'::portfolio_log_type
  else 'yield'::portfolio_log_type
end
where type is null;

alter table portfolio_logs
  alter column type set not null,
  alter column type set default 'yield'::portfolio_log_type;
