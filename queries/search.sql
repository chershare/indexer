SELECT 
  * 
FROM
  ( 
    SELECT 
      * 
    from 
      resources as r, 
      resource_images as i
    where 
      r.name == i.resource_name AND
      i.position == 0
  ) as b, 
  (
    SELECT 
      resource_name, GROUP_CONCAT(tag)
    FROM 
      resource_tags
    GROUP BY
      resource_name
  ) as t
WHERE
  b.resource_name == t.resource_name
;
  
