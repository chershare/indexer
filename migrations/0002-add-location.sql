/* 
[3] 3 dimensional coordinates for quick proximity lookups
*/

ALTER TABLE resources add COLUMN x REAL;
ALTER TABLE resources add COLUMN y REAL;
ALTER TABLE resources add COLUMN z REAL;

