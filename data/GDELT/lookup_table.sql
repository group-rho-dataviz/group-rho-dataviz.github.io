CREATE OR REPLACE TABLE gdelt-dataviz-project-482718.gdelt_agg.domain_lookup AS
  SELECT 
    domain, 
    topcountry.countrycode AS MediaCountryCode
  FROM (
    SELECT 
      domain, 
      -- We take the strict Top 1 result from the array
      ARRAY_AGG(STRUCT(countrycode, cnt) ORDER BY cnt DESC LIMIT 1)[OFFSET(0)] as topcountry 
    FROM (
      SELECT 
        -- OFFICIAL GDELT REGEX: Extracts the clean country code
        REGEXP_EXTRACT(location, r'^[1-5]#.*?#(.*?)#') AS countrycode, 
        
        -- Clean the domain
        IFNULL(NET.REG_DOMAIN(DocumentIdentifier), 'unknown') AS domain, 
        
        -- Exact Count
        COUNT(1) AS cnt 
      FROM `gdelt-bq.gdeltv2.gkg_partitioned`, 
      -- OFFICIAL GDELT UNNEST: Explodes the list of locations
      UNNEST(SPLIT(V2Locations, ';')) AS location 
      
      WHERE 
        LOWER(DocumentIdentifier) LIKE '%http%'

        -- Optimization: Look at last 18 months (adjust as needed)
        --AND _PARTITIONDATE >= DATE_SUB(CURRENT_DATE(), INTERVAL 18 MONTH)
      
      GROUP BY countrycode, domain 
      HAVING cnt > 5 AND countrycode IS NOT NULL
    ) 
    GROUP BY domain
  )
