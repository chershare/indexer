DROP TABLE IF EXISTS resources;

CREATE TABLE resources (
  name VARCHAR(36) PRIMARY KEY,  /* [2] */
  title VARCHAR(256), 
  description TEXT, 
  contact_info TEXT, 

  pricing_model VARCHAR(20), 
  pricing_price_per_ms REAL, 
  pricing_price_fixed_base REAL, /* [1] */
  pricing_refund_buffer INTEGER
);

/* 
[1] let's use reals in the db such that we can make price calculations in the db and tradeoff accuracy for now - later we can use some db that supports bigints in some way 
[2] size of uuid with dashes 
*/
