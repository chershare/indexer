DROP TABLE IF EXISTS bookings;

CREATE TABLE bookings (
  local_id INTEGER, 
  resource_name VARCHAR(36), 
  booker_account_id TEXT, 
  start INTEGER, 
  end INTEGER, 
  price REAL, 
  FOREIGN KEY (resource_name) REFERENCES resources (name) 
);
