DROP TABLE IF EXISTS resource_tags;
DROP TABLE IF EXISTS resource_images;

CREATE TABLE resource_tags (
  tag TEXT, 
  resource_id TEXT, 
  FOREIGN KEY (resource_id) REFERENCES resources (id) 
);

CREATE TABLE resource_images (
  resource_id TEXT, 
  image_url TEXT, 
  FOREIGN KEY (resource_id) REFERENCES resources (id) 
);


