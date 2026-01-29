CREATE OR REPLACE TABLE gdelt-dataviz-project.gdelt_agg.weekly_media_conflict_reports AS

SELECT
  -- 1. TIME: Weekly Granularity
  DATE_TRUNC(
    DATE(PARSE_TIMESTAMP('%Y%m%d%H%M%S', CAST(m.MentionTimeDate AS STRING))), 
    WEEK(MONDAY)
  ) AS mention_week,

  -- 2. LOCATION: WHERE the conflict is happening
  e.ActionGeo_CountryCode AS conflict_country,

  -- 3. ACTORS: WHO is involved in the conflict
  IFNULL(e.Actor1CountryCode, 'UNK') AS actor1_country,
  IFNULL(e.Actor2CountryCode, 'UNK') AS actor2_country,
  -- If null keep it null
  -- e.Actor1CountryCode AS actor1_country,
  -- e.Actor2CountryCode AS actor2_country,

  -- 4. MEDIA SOURCE: WHERE the media is reporting from
  -- Uses the GDELT Lookup we created above
  IFNULL(dlc_lookup.MediaCountryCode, 'UNK') AS media_country,
  -- lookup.MediaCountryCode AS media_country,

  -- 5. METRICS (Aggregated)
  COUNT(*) AS mentions_count,
  COUNT(DISTINCT m.GLOBALEVENTID) AS distinct_events,
  COUNT(DISTINCT m.MentionSourceName) AS distinct_media_sources,

  -- 6. METRICS: CLASS PROFILE (Volume vs Diversity)
  -- Volume (Quanti Articoli)
  COUNT(CASE WHEN e.QuadClass = 3 THEN 1 END) AS verbal_conflict_mentions,
  COUNT(CASE WHEN e.QuadClass = 4 THEN 1 END) AS material_conflict_mentions,
  -- Diversity (Quanti Eventi Unici)
  COUNT(DISTINCT CASE WHEN e.QuadClass = 3 THEN m.GLOBALEVENTID END) AS verbal_conflict_unique_events,
  COUNT(DISTINCT CASE WHEN e.QuadClass = 4 THEN m.GLOBALEVENTID END) AS material_conflict_unique_events,

  -- 7. METRICS: ACTOR PROFILE (Chi partecipa?)
  -- Qui usiamo la logica "INVOLVES": Ci interessa se la categoria è presente nell'evento (o come attore 1 o come 2)
  
  -- STATE (Gov, Mil, Police, ecc)
  COUNT(CASE WHEN 
      e.Actor1Type1Code IN ('GOV', 'MIL', 'COP', 'JUD', 'LEG', 'SPY') OR 
      e.Actor2Type1Code IN ('GOV', 'MIL', 'COP', 'JUD', 'LEG', 'SPY') 
  THEN 1 END) AS state_mentions,
  
  COUNT(DISTINCT CASE WHEN 
      e.Actor1Type1Code IN ('GOV', 'MIL', 'COP', 'JUD', 'LEG', 'SPY') OR 
      e.Actor2Type1Code IN ('GOV', 'MIL', 'COP', 'JUD', 'LEG', 'SPY') 
  THEN m.GLOBALEVENTID END) AS state_unique_events,

  -- INSURGENTS (Rebels, Separatists, etc)
  COUNT(CASE WHEN 
      e.Actor1Type1Code IN ('REB', 'INS', 'SEP', 'OPP', 'CRM') OR 
      e.Actor2Type1Code IN ('REB', 'INS', 'SEP', 'OPP', 'CRM') 
  THEN 1 END) AS insurgents_mentions,

  COUNT(DISTINCT CASE WHEN 
      e.Actor1Type1Code IN ('REB', 'INS', 'SEP', 'OPP', 'CRM') OR 
      e.Actor2Type1Code IN ('REB', 'INS', 'SEP', 'OPP', 'CRM') 
  THEN m.GLOBALEVENTID END) AS insurgents_unique_events,

  -- CIVILIANS (The Victims usually)
  COUNT(CASE WHEN 
      e.Actor1Type1Code IN ('CVL', 'REF', 'ELI', 'BUS', 'EDU', 'LAB', 'MED', 'REL', 'AGR') OR 
      e.Actor2Type1Code IN ('CVL', 'REF', 'ELI', 'BUS', 'EDU', 'LAB', 'MED', 'REL', 'AGR') 
  THEN 1 END) AS civilians_mentions,

  COUNT(DISTINCT CASE WHEN 
      e.Actor1Type1Code IN ('CVL', 'REF', 'ELI', 'BUS', 'EDU', 'LAB', 'MED', 'REL', 'AGR') OR 
      e.Actor2Type1Code IN ('CVL', 'REF', 'ELI', 'BUS', 'EDU', 'LAB', 'MED', 'REL', 'AGR') 
  THEN m.GLOBALEVENTID END) AS civilians_unique_events,

  -- INTERNATIONALS (NGO, IGO)
  COUNT(CASE WHEN 
      e.Actor1Type1Code IN ('IGO', 'NGO', 'MNC') OR 
      e.Actor2Type1Code IN ('IGO', 'NGO', 'MNC') 
  THEN 1 END) AS international_mentions,

  COUNT(DISTINCT CASE WHEN 
      e.Actor1Type1Code IN ('IGO', 'NGO', 'MNC') OR 
      e.Actor2Type1Code IN ('IGO', 'NGO', 'MNC') 
  THEN m.GLOBALEVENTID END) AS international_unique_events,

  -- Sentiment Analysis
  AVG(m.MentionDocTone) AS avg_tone,
  STDDEV(m.MentionDocTone) AS stddev_tone,
  APPROX_QUANTILES(m.MentionDocTone, 2)[OFFSET(1)] AS median_tone,

  -- Impact (Weighted by mentions)
  AVG(e.GoldsteinScale) AS avg_impact,
  STDDEV(e.GoldsteinScale) AS stddev_impact,
  APPROX_QUANTILES(e.GoldsteinScale, 2)[OFFSET(1)] AS median_impact,

  -- Most mentioned article
  ARRAY_AGG(
    STRUCT(m.MentionIdentifier, e.NumMentions) 
    ORDER BY e.NumMentions DESC LIMIT 1
  )[OFFSET(0)].MentionIdentifier AS top_event_article_url,

  -- Most impactful article
  ARRAY_AGG(
    STRUCT(m.MentionIdentifier, e.GoldsteinScale) 
    ORDER BY e.GoldsteinScale ASC LIMIT 1
  )[OFFSET(0)].MentionIdentifier AS most_impactful_event_article_url  


FROM `gdelt-bq.gdeltv2.eventmentions_partitioned` m
JOIN `gdelt-bq.gdeltv2.events_partitioned` e
  ON m.GLOBALEVENTID = e.GLOBALEVENTID

-- JOIN LOOKUP
LEFT JOIN `gdelt-dataviz-project.gdelt_agg.lookup_table` dlc_lookup
  ON NET.REG_DOMAIN(m.MentionIdentifier) = dlc_lookup.Domain

WHERE
  -- COST SAFETY - RECOMMENDED: Focus on recent years
  m._PARTITIONTIME >= TIMESTAMP('2015-01-01')
  AND e._PARTITIONTIME >= TIMESTAMP('2015-01-01')
  
-- FILTRI ANTI-RUMORE
  AND e.QuadClass in (3,4)  -- Solo Material and Verbal Conflict (Fights, Assaults, Wars)

  -- Filtro Attori (Solo attori rilevanti, esclude privati cittadini)
  -- AND (
  --     e.Actor1Type1Code IN ('GOV', 'MIL', 'REB', 'INS', 'COP')
  --  OR e.Actor2Type1Code IN ('GOV', 'MIL', 'REB', 'INS', 'COP')
  -- )

  -- Filtro Geografico (Esclude eventi senza paese o generalisti)
  AND e.ActionGeo_CountryCode IS NOT NULL

GROUP BY 1, 2, 3, 4, 5
HAVING mentions_count > 5