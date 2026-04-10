-- Add alt_name field and extract bracketed content from existing full_names

ALTER TABLE people ADD COLUMN alt_name TEXT DEFAULT '';

-- Extract the text inside the first pair of brackets into alt_name,
-- then remove that "(…)" from full_name and tidy whitespace.
UPDATE people
SET
  alt_name = TRIM(
    SUBSTR(full_name,
           INSTR(full_name, '(') + 1,
           INSTR(full_name, ')') - INSTR(full_name, '(') - 1)
  ),
  full_name = TRIM(
    REPLACE(
      TRIM(SUBSTR(full_name, 1, INSTR(full_name, '(') - 1)
           || SUBSTR(full_name, INSTR(full_name, ')') + 1)),
      '  ', ' '
    )
  )
WHERE INSTR(full_name, '(') > 0
  AND INSTR(full_name, ')') > INSTR(full_name, '(');
