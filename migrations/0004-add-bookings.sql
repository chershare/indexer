DROP TABLE IF EXISTS bookings;

CREATE TABLE bookings (
  resource_name VARCHAR(36) PRIMARY KEY,  /* [2] */
  begin INTEGER
  end INTEGER
  price_paid REAL
  cancelled BOOLEAN
);
