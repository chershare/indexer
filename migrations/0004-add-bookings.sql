DROP TABLE IF EXISTS bookings;

CREATE TABLE bookings (
  resource_name VARCHAR(36), 
  booker_account_id TEXT, 
  start INTEGER, 
  end INTEGER, 
  FOREIGN KEY (resource_name) REFERENCES resources (name) 
);
