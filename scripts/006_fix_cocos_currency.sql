-- Fix COCOS CAPITAL portfolio currency from ARS to USD
-- Target user: joaquimcolacilli9@gmail.com

UPDATE portfolios
SET currency = 'USD'
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'joaquimcolacilli9@gmail.com'
)
AND name = 'COCOS CAPITAL'
AND currency = 'ARS';
