-- One-off data fix for user joaquimcolacilli9@gmail.com:
-- a savings withdrawal of 280 was accidentally logged as ARS instead of USD
-- (because the withdraw form didn't expose a currency selector).
--
-- Target: change that single transaction's currency from ARS to USD so the
-- cumulative totals end up at ARS 0 / USD 846 instead of ARS -280 / USD 1126.
--
-- IMPORTANT: run this only once. Review the SELECT first to confirm it matches
-- exactly the row you expect.

-- 1. Verify the target row BEFORE updating:
select id, type, amount, currency, date, note
from transactions
where user_id = (select id from auth.users where email = 'joaquimcolacilli9@gmail.com')
  and type = 'savings'
  and amount = -280
  and currency = 'ARS'
  and note ilike 'Retiro de ahorros%';

-- 2. If the SELECT returned exactly one row, run the UPDATE:
update transactions
set currency = 'USD'
where user_id = (select id from auth.users where email = 'joaquimcolacilli9@gmail.com')
  and type = 'savings'
  and amount = -280
  and currency = 'ARS'
  and note ilike 'Retiro de ahorros%';
