CREATE OR REPLACE TABLE `gdelt-dataviz-project.gdelt_agg.weekly_conflict_media` AS

SELECT
  -- FIX: Parse the Integer (20240101120000) into a Date
  DATE_TRUNC(
    DATE(PARSE_TIMESTAMP('%Y%m%d%H%M%S', CAST(m.MentionTimeDate AS STRING))), 
    WEEK(MONDAY)
  ) AS week,
  
  -- The Conflict Location (Country Code)
  e.ActionGeo_CountryCode AS conflict_country,

  -- The Media Source Country (Inferred from domain)
  CASE
    WHEN m.MentionSourceName LIKE '%.fr' THEN 'France'
    WHEN m.MentionSourceName LIKE '%.it' THEN 'Italy'
    WHEN m.MentionSourceName LIKE '%.de' OR m.MentionSourceName LIKE '%.dw.com' THEN 'Germany'
    WHEN m.MentionSourceName LIKE '%.uk' OR m.MentionSourceName LIKE 'bbc.com' THEN 'UK'
    WHEN m.MentionSourceName LIKE '%.ru' THEN 'Russia'
    WHEN m.MentionSourceName LIKE '%.cn' OR m.MentionSourceName LIKE 'chinadaily.com.cn' THEN 'China'
    WHEN m.MentionSourceName LIKE '%.il' OR m.MentionSourceName LIKE 'jpost.com' THEN 'Israel'
    ELSE 'USA / International' 
  END AS media_country,

  -- Metrics
  COUNT(*) AS mentions_count,
  AVG(m.MentionDocTone) AS avg_tone,
  AVG(e.GoldsteinScale) AS avg_event_impact

FROM `gdelt-bq.gdeltv2.eventmentions_partitioned` m
JOIN `gdelt-bq.gdeltv2.events_partitioned` e
  ON m.GLOBALEVENTID = e.GLOBALEVENTID

WHERE
  -- COST SAFETY: Essential Partition Filter
  -- This limits the scan to data from 2015 onwards
  m._PARTITIONTIME >= TIMESTAMP('2015-02-18')
  AND e._PARTITIONTIME >= TIMESTAMP('2015-02-18')
  
  -- Filter for Conflict Events (Root Code 14=Protest, 19=Fight)
  AND e.EventRootCode IN ('14','19')

GROUP BY 1, 2, 3
ORDER BY 1 DESC