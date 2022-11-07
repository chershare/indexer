DROP TABLE IF EXISTS resource_tags;
DROP TABLE IF EXISTS resource_images;

CREATE TABLE resource_tags (
  tag TEXT, 
  resource_name VARCHAR(36), 
  FOREIGN KEY (resource_name) REFERENCES resources (name) 
);

CREATE TABLE resource_images (
  resource_name VARCHAR(36), 
  image_url TEXT, 
  FOREIGN KEY (resource_name) REFERENCES resources (name) 
);


