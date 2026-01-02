CREATE OR REPLACE TABLE gdelt-dataviz-project.gdelt_agg.weekly_media_conflict AS

SELECT
  -- 1. TIME: Weekly Granularity
  DATE_TRUNC(
    DATE(PARSE_TIMESTAMP('%Y%m%d%H%M%S', CAST(m.MentionTimeDate AS STRING))), 
    WEEK(MONDAY)
  ) AS mention_week,

  -- 2. LOCATION: Where the conflict is happening
  e.ActionGeo_CountryCode AS conflict_country,

-- 3. SOURCE: Who is reporting it (Robust Version)
  CASE
    -- === EUROPE ===
    WHEN (m.MentionSourceName LIKE '%.fr' OR NET.HOST(m.MentionIdentifier) LIKE '%.fr') 
         OR m.MentionSourceName LIKE '%lemonde%' OR m.MentionSourceName LIKE '%france24%' THEN 'France'
    
    WHEN (m.MentionSourceName LIKE '%.uk' OR NET.HOST(m.MentionIdentifier) LIKE '%.uk') 
         OR m.MentionSourceName LIKE '%bbc.%' OR m.MentionSourceName LIKE '%theguardian.%' OR m.MentionSourceName LIKE '%reuters.%' THEN 'UK'
    
    WHEN (m.MentionSourceName LIKE '%.de' OR NET.HOST(m.MentionIdentifier) LIKE '%.de') 
         OR m.MentionSourceName LIKE '%dw.com%' OR m.MentionSourceName LIKE '%spiegel%' THEN 'Germany'
    
    -- === ITALY ===
    WHEN (m.MentionSourceName LIKE '%.it' OR NET.HOST(m.MentionIdentifier) LIKE '%.it') 
         OR m.MentionSourceName LIKE '%repubblica.%' OR m.MentionSourceName LIKE '%corriere.%' OR m.MentionSourceName LIKE '%ansa.%' THEN 'Italy'
    
    WHEN (m.MentionSourceName LIKE '%.es' OR NET.HOST(m.MentionIdentifier) LIKE '%.es') 
         OR m.MentionSourceName LIKE '%elpais.%' THEN 'Spain'
    
    WHEN (m.MentionSourceName LIKE '%.ru' OR NET.HOST(m.MentionIdentifier) LIKE '%.ru') 
         OR m.MentionSourceName LIKE '%sputnik%' OR m.MentionSourceName LIKE '%rt.com%' OR m.MentionSourceName LIKE '%tass.%' THEN 'Russia'
    
    WHEN (m.MentionSourceName LIKE '%.ua' OR NET.HOST(m.MentionIdentifier) LIKE '%.ua') 
         OR m.MentionSourceName LIKE '%kyivindependent%' THEN 'Ukraine'

    -- === MIDDLE EAST ===
    WHEN (m.MentionSourceName LIKE '%.il' OR NET.HOST(m.MentionIdentifier) LIKE '%.il') 
         OR m.MentionSourceName LIKE '%jpost.com%' OR m.MentionSourceName LIKE '%haaretz%' THEN 'Israel'
    
    WHEN (m.MentionSourceName LIKE '%.tr' OR NET.HOST(m.MentionIdentifier) LIKE '%.tr') 
         OR m.MentionSourceName LIKE '%dailysabah%' OR m.MentionSourceName LIKE '%anadolu%' THEN 'Turkey'
    
    WHEN (m.MentionSourceName LIKE '%.qa' OR NET.HOST(m.MentionIdentifier) LIKE '%.qa') 
         OR m.MentionSourceName LIKE '%aljazeera%' THEN 'Qatar'
    
    WHEN (m.MentionSourceName LIKE '%.sa' OR NET.HOST(m.MentionIdentifier) LIKE '%.sa') 
         OR m.MentionSourceName LIKE '%arabnews%' OR m.MentionSourceName LIKE '%alarabiya%' THEN 'Saudi Arabia'
    
    WHEN (m.MentionSourceName LIKE '%.ir' OR NET.HOST(m.MentionIdentifier) LIKE '%.ir') 
         OR m.MentionSourceName LIKE '%presstv%' OR m.MentionSourceName LIKE '%tehrantimes%' THEN 'Iran'
    
    WHEN (m.MentionSourceName LIKE '%.ae' OR NET.HOST(m.MentionIdentifier) LIKE '%.ae') 
         OR m.MentionSourceName LIKE '%thenational.ae%' THEN 'UAE'

    -- === ASIA ===
    WHEN (m.MentionSourceName LIKE '%.cn' OR NET.HOST(m.MentionIdentifier) LIKE '%.cn') 
         OR m.MentionSourceName LIKE '%chinadaily%' OR m.MentionSourceName LIKE '%xinhuanet%' OR m.MentionSourceName LIKE '%globaltimes%' THEN 'China'
    
    WHEN (m.MentionSourceName LIKE '%.in' OR NET.HOST(m.MentionIdentifier) LIKE '%.in') 
         OR m.MentionSourceName LIKE '%timesofindia%' OR m.MentionSourceName LIKE '%hindustantimes%' THEN 'India'
    
    WHEN (m.MentionSourceName LIKE '%.jp' OR NET.HOST(m.MentionIdentifier) LIKE '%.jp') 
         OR m.MentionSourceName LIKE '%japantimes%' OR m.MentionSourceName LIKE '%asahi%' OR m.MentionSourceName LIKE '%kyodonews%' THEN 'Japan'
    
    WHEN (m.MentionSourceName LIKE '%.kr' OR NET.HOST(m.MentionIdentifier) LIKE '%.kr') 
         OR m.MentionSourceName LIKE '%yonhap%' OR m.MentionSourceName LIKE '%koreaherald%' THEN 'South Korea'
    
    WHEN (m.MentionSourceName LIKE '%.pk' OR NET.HOST(m.MentionIdentifier) LIKE '%.pk') 
         OR m.MentionSourceName LIKE '%dawn.com%' THEN 'Pakistan'

    -- === AMERICAS ===
    WHEN (m.MentionSourceName LIKE '%.br' OR NET.HOST(m.MentionIdentifier) LIKE '%.br') 
         OR m.MentionSourceName LIKE '%folha%' OR m.MentionSourceName LIKE '%globo%' THEN 'Brazil'
    
    WHEN (m.MentionSourceName LIKE '%.mx' OR NET.HOST(m.MentionIdentifier) LIKE '%.mx') THEN 'Mexico'
    WHEN (m.MentionSourceName LIKE '%.ar' OR NET.HOST(m.MentionIdentifier) LIKE '%.ar') THEN 'Argentina'
    WHEN (m.MentionSourceName LIKE '%.ca' OR NET.HOST(m.MentionIdentifier) LIKE '%.ca') OR m.MentionSourceName LIKE '%cbc.ca%' THEN 'Canada'
    WHEN m.MentionSourceName LIKE '%telesurtv%' THEN 'LatAm (Left-Wing Block)'

    -- === AFRICA ===
    WHEN (m.MentionSourceName LIKE '%.za' OR NET.HOST(m.MentionIdentifier) LIKE '%.za') 
         OR m.MentionSourceName LIKE '%iol.co.za%' OR m.MentionSourceName LIKE '%dailymaverick%' THEN 'South Africa'
    WHEN (m.MentionSourceName LIKE '%.ng' OR NET.HOST(m.MentionIdentifier) LIKE '%.ng') 
         OR m.MentionSourceName LIKE '%punchng%' THEN 'Nigeria'
    WHEN (m.MentionSourceName LIKE '%.eg' OR NET.HOST(m.MentionIdentifier) LIKE '%.eg') 
         OR m.MentionSourceName LIKE '%ahram%' THEN 'Egypt'
    WHEN m.MentionSourceName LIKE '%allafrica%' THEN 'Pan-Africa'

    -- === USA (Qui il dominio .com è ambiguo, quindi ci affidiamo alla lista o al .us) ===
    WHEN (m.MentionSourceName LIKE '%.us' OR NET.HOST(m.MentionIdentifier) LIKE '%.us')
      OR m.MentionSourceName IN (
          'cnn.com', 'nytimes.com', 'washingtonpost.com', 'foxnews.com', 
          'usatoday.com', 'wsj.com', 'cnbc.com', 'npr.org', 'apnews.com', 
          'politico.com', 'huffpost.com', 'breitbart.com', 'nbcnews.com', 
          'cbsnews.com', 'abcnews.go.com', 'bloomberg.com', 'latimes.com'
      ) 
      -- Aggiungiamo un check anche sull'URL per i grossi player se il SourceName fallisce
      OR NET.HOST(m.MentionIdentifier) IN ('www.cnn.com', 'www.nytimes.com', 'www.washingtonpost.com', 'www.foxnews.com') 
      THEN 'USA'

    -- EVERYTHING ELSE
    ELSE 'Other' 
  END AS media_country,

  -- 4. METRICS (Aggregated)
  COUNT(*) AS mentions_count,
  COUNT(DISTINCT m.GLOBALEVENTID) AS distinct_events,  

  -- 5. METRICS: CLASS PROFILE (Volume vs Diversity)
  -- Volume (Quanti Articoli)
  COUNT(CASE WHEN e.QuadClass = 3 THEN 1 END) AS verbal_conflict_mentions,
  COUNT(CASE WHEN e.QuadClass = 4 THEN 1 END) AS material_conflict_mentions,
  -- Diversity (Quanti Eventi Unici)
  COUNT(DISTINCT CASE WHEN e.QuadClass = 3 THEN m.GLOBALEVENTID END) AS verbal_conflict_unique_events,
  COUNT(DISTINCT CASE WHEN e.QuadClass = 4 THEN m.GLOBALEVENTID END) AS material_conflict_unique_events,

  -- 6. METRICS: ACTOR PROFILE (Chi partecipa?)
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

  -- Impact
  AVG(e.GoldsteinScale) AS avg_impact,
  STDDEV(e.GoldsteinScale) AS stddev_impact,
  APPROX_QUANTILES(e.GoldsteinScale, 2)[OFFSET(1)] AS median_impact,

  -- Most mentioned article
  ARRAY_AGG(
    STRUCT(e.SOURCEURL, e.GoldsteinScale, e.NumMentions) 
    ORDER BY e.NumMentions DESC LIMIT 1
  )[OFFSET(0)].SOURCEURL AS top_article_url  

FROM `gdelt-bq.gdeltv2.eventmentions_partitioned` m
JOIN `gdelt-bq.gdeltv2.events_partitioned` e
  ON m.GLOBALEVENTID = e.GLOBALEVENTID

WHERE
  -- COST SAFETY - RECOMMENDED: Focus on recent years
  m._PARTITIONTIME >= TIMESTAMP('2015-01-01')  -- Changed to more recent
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
  AND e.ActionGeo_FeatureID IS NOT NULL -- Garantisce che sia un luogo fisico riconosciuto  -- Optional: Filter out events with no location

GROUP BY 1, 2, 3
HAVING mentions_count > 5