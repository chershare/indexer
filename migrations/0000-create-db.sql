DROP TABLE IF EXISTS resources;

CREATE TABLE resources (
  id TEXT PRIMARY KEY, 
  title TEXT, 
  description TEXT, 
  pricing TEXT, 
  price_per_ms TEXT /* stroing as text, because it's too big for BIGINT */
)


