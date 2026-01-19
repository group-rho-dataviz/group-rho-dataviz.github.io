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

-- === OCEANIA ===
WHEN (m.MentionSourceName LIKE '%.au' OR NET.HOST(m.MentionIdentifier) LIKE '%.au') 
     OR m.MentionSourceName LIKE '%abc.net.au%' OR m.MentionSourceName LIKE '%smh.com.au%' 
     OR m.MentionSourceName LIKE '%theaustralian%' OR m.MentionSourceName LIKE '%news.com.au%' THEN 'Australia'

WHEN (m.MentionSourceName LIKE '%.nz' OR NET.HOST(m.MentionIdentifier) LIKE '%.nz') 
     OR m.MentionSourceName LIKE '%nzherald%' OR m.MentionSourceName LIKE '%stuff.co.nz%' THEN 'New Zealand'

-- === SCANDINAVIA & NORDICS ===
WHEN (m.MentionSourceName LIKE '%.se' OR NET.HOST(m.MentionIdentifier) LIKE '%.se') 
     OR m.MentionSourceName LIKE '%svt.se%' OR m.MentionSourceName LIKE '%dn.se%' 
     OR m.MentionSourceName LIKE '%aftonbladet%' OR m.MentionSourceName LIKE '%thelocal.se%' THEN 'Sweden'

WHEN (m.MentionSourceName LIKE '%.no' OR NET.HOST(m.MentionIdentifier) LIKE '%.no') 
     OR m.MentionSourceName LIKE '%nrk.no%' OR m.MentionSourceName LIKE '%vg.no%' 
     OR m.MentionSourceName LIKE '%aftenposten%' THEN 'Norway'

WHEN (m.MentionSourceName LIKE '%.dk' OR NET.HOST(m.MentionIdentifier) LIKE '%.dk') 
     OR m.MentionSourceName LIKE '%dr.dk%' OR m.MentionSourceName LIKE '%politiken%' THEN 'Denmark'

WHEN (m.MentionSourceName LIKE '%.fi' OR NET.HOST(m.MentionIdentifier) LIKE '%.fi') 
     OR m.MentionSourceName LIKE '%yle.fi%' OR m.MentionSourceName LIKE '%helsinkitimes%' THEN 'Finland'

WHEN (m.MentionSourceName LIKE '%.is' OR NET.HOST(m.MentionIdentifier) LIKE '%.is') 
     OR m.MentionSourceName LIKE '%ruv.is%' OR m.MentionSourceName LIKE '%icelandreview%' THEN 'Iceland'

-- === ADDITIONAL EUROPE ===
WHEN (m.MentionSourceName LIKE '%.ch' OR NET.HOST(m.MentionIdentifier) LIKE '%.ch') 
     OR m.MentionSourceName LIKE '%swissinfo%' OR m.MentionSourceName LIKE '%nzz.ch%' 
     OR m.MentionSourceName LIKE '%blick.ch%' THEN 'Switzerland'

WHEN (m.MentionSourceName LIKE '%.at' OR NET.HOST(m.MentionIdentifier) LIKE '%.at') 
     OR m.MentionSourceName LIKE '%orf.at%' OR m.MentionSourceName LIKE '%derstandard.at%' THEN 'Austria'

WHEN (m.MentionSourceName LIKE '%.nl' OR NET.HOST(m.MentionIdentifier) LIKE '%.nl') 
     OR m.MentionSourceName LIKE '%nos.nl%' OR m.MentionSourceName LIKE '%dutchnews%' THEN 'Netherlands'

WHEN (m.MentionSourceName LIKE '%.be' OR NET.HOST(m.MentionIdentifier) LIKE '%.be') 
     OR m.MentionSourceName LIKE '%vrt.be%' OR m.MentionSourceName LIKE '%rtbf.be%' THEN 'Belgium'

WHEN (m.MentionSourceName LIKE '%.pt' OR NET.HOST(m.MentionIdentifier) LIKE '%.pt') 
     OR m.MentionSourceName LIKE '%rtp.pt%' OR m.MentionSourceName LIKE '%publico.pt%' THEN 'Portugal'

WHEN (m.MentionSourceName LIKE '%.pl' OR NET.HOST(m.MentionIdentifier) LIKE '%.pl') 
     OR m.MentionSourceName LIKE '%tvp.pl%' OR m.MentionSourceName LIKE '%polskieradio%' THEN 'Poland'

WHEN (m.MentionSourceName LIKE '%.cz' OR NET.HOST(m.MentionIdentifier) LIKE '%.cz') 
     OR m.MentionSourceName LIKE '%ceskatelevize%' OR m.MentionSourceName LIKE '%radio.cz%' THEN 'Czech Republic'

WHEN (m.MentionSourceName LIKE '%.ro' OR NET.HOST(m.MentionIdentifier) LIKE '%.ro') 
     OR m.MentionSourceName LIKE '%agerpres%' OR m.MentionSourceName LIKE '%romania-insider%' THEN 'Romania'

WHEN (m.MentionSourceName LIKE '%.hu' OR NET.HOST(m.MentionIdentifier) LIKE '%.hu') 
     OR m.MentionSourceName LIKE '%telex.hu%' OR m.MentionSourceName LIKE '%hvg.hu%' THEN 'Hungary'

WHEN (m.MentionSourceName LIKE '%.gr' OR NET.HOST(m.MentionIdentifier) LIKE '%.gr') 
     OR m.MentionSourceName LIKE '%ekathimerini%' OR m.MentionSourceName LIKE '%tovima%' THEN 'Greece'

WHEN (m.MentionSourceName LIKE '%.ie' OR NET.HOST(m.MentionIdentifier) LIKE '%.ie') 
     OR m.MentionSourceName LIKE '%rte.ie%' OR m.MentionSourceName LIKE '%irishtimes%' THEN 'Ireland'

WHEN (m.MentionSourceName LIKE '%.bg' OR NET.HOST(m.MentionIdentifier) LIKE '%.bg') 
     OR m.MentionSourceName LIKE '%bta.bg%' OR m.MentionSourceName LIKE '%novinite%' THEN 'Bulgaria'

WHEN (m.MentionSourceName LIKE '%.hr' OR NET.HOST(m.MentionIdentifier) LIKE '%.hr') 
     OR m.MentionSourceName LIKE '%hrt.hr%' THEN 'Croatia'

WHEN (m.MentionSourceName LIKE '%.rs' OR NET.HOST(m.MentionIdentifier) LIKE '%.rs') 
     OR m.MentionSourceName LIKE '%rts.rs%' OR m.MentionSourceName LIKE '%b92%' THEN 'Serbia'

WHEN (m.MentionSourceName LIKE '%.sk' OR NET.HOST(m.MentionIdentifier) LIKE '%.sk') 
     OR m.MentionSourceName LIKE '%tasr.sk%' THEN 'Slovakia'

-- === MIDDLE EAST (Additional) ===
WHEN (m.MentionSourceName LIKE '%.lb' OR NET.HOST(m.MentionIdentifier) LIKE '%.lb') 
     OR m.MentionSourceName LIKE '%dailystar.com.lb%' OR m.MentionSourceName LIKE '%naharnet%' THEN 'Lebanon'

WHEN (m.MentionSourceName LIKE '%.jo' OR NET.HOST(m.MentionIdentifier) LIKE '%.jo') 
     OR m.MentionSourceName LIKE '%jordantimes%' OR m.MentionSourceName LIKE '%petra.gov.jo%' THEN 'Jordan'

WHEN (m.MentionSourceName LIKE '%.kw' OR NET.HOST(m.MentionIdentifier) LIKE '%.kw') 
     OR m.MentionSourceName LIKE '%kuwaittimes%' OR m.MentionSourceName LIKE '%kuna.net%' THEN 'Kuwait'

WHEN (m.MentionSourceName LIKE '%.om' OR NET.HOST(m.MentionIdentifier) LIKE '%.om') 
     OR m.MentionSourceName LIKE '%timesofoman%' THEN 'Oman'

WHEN (m.MentionSourceName LIKE '%.bh' OR NET.HOST(m.MentionIdentifier) LIKE '%.bh') 
     OR m.MentionSourceName LIKE '%newsofbahrain%' THEN 'Bahrain'

WHEN (m.MentionSourceName LIKE '%.iq' OR NET.HOST(m.MentionIdentifier) LIKE '%.iq') 
     OR m.MentionSourceName LIKE '%iraqinews%' OR m.MentionSourceName LIKE '%rudaw%' THEN 'Iraq'

WHEN (m.MentionSourceName LIKE '%.sy' OR NET.HOST(m.MentionIdentifier) LIKE '%.sy') 
     OR m.MentionSourceName LIKE '%sana.sy%' THEN 'Syria'

WHEN (m.MentionSourceName LIKE '%.ye' OR NET.HOST(m.MentionIdentifier) LIKE '%.ye') 
     OR m.MentionSourceName LIKE '%yemenpress%' THEN 'Yemen'

-- === ASIA (Additional) ===
WHEN (m.MentionSourceName LIKE '%.th' OR NET.HOST(m.MentionIdentifier) LIKE '%.th') 
     OR m.MentionSourceName LIKE '%bangkokpost%' OR m.MentionSourceName LIKE '%nationthailand%' THEN 'Thailand'

WHEN (m.MentionSourceName LIKE '%.vn' OR NET.HOST(m.MentionIdentifier) LIKE '%.vn') 
     OR m.MentionSourceName LIKE '%vnexpress%' OR m.MentionSourceName LIKE '%vietnamnews%' THEN 'Vietnam'

WHEN (m.MentionSourceName LIKE '%.id' OR NET.HOST(m.MentionIdentifier) LIKE '%.id') 
     OR m.MentionSourceName LIKE '%thejakartapost%' OR m.MentionSourceName LIKE '%antaranews%' THEN 'Indonesia'

WHEN (m.MentionSourceName LIKE '%.my' OR NET.HOST(m.MentionIdentifier) LIKE '%.my') 
     OR m.MentionSourceName LIKE '%thestar.com.my%' OR m.MentionSourceName LIKE '%malaysiakini%' THEN 'Malaysia'

WHEN (m.MentionSourceName LIKE '%.sg' OR NET.HOST(m.MentionIdentifier) LIKE '%.sg') 
     OR m.MentionSourceName LIKE '%straitstimes%' OR m.MentionSourceName LIKE '%channelnewsasia%' THEN 'Singapore'

WHEN (m.MentionSourceName LIKE '%.ph' OR NET.HOST(m.MentionIdentifier) LIKE '%.ph') 
     OR m.MentionSourceName LIKE '%inquirer%' OR m.MentionSourceName LIKE '%rappler%' THEN 'Philippines'

WHEN (m.MentionSourceName LIKE '%.bd' OR NET.HOST(m.MentionIdentifier) LIKE '%.bd') 
     OR m.MentionSourceName LIKE '%dhakatribune%' OR m.MentionSourceName LIKE '%thedailystar%' THEN 'Bangladesh'

WHEN (m.MentionSourceName LIKE '%.mm' OR NET.HOST(m.MentionIdentifier) LIKE '%.mm') 
     OR m.MentionSourceName LIKE '%myanmartimes%' OR m.MentionSourceName LIKE '%irrawaddy%' THEN 'Myanmar'

WHEN (m.MentionSourceName LIKE '%.lk' OR NET.HOST(m.MentionIdentifier) LIKE '%.lk') 
     OR m.MentionSourceName LIKE '%dailymirror.lk%' THEN 'Sri Lanka'

WHEN (m.MentionSourceName LIKE '%.np' OR NET.HOST(m.MentionIdentifier) LIKE '%.np') 
     OR m.MentionSourceName LIKE '%kathmandupost%' THEN 'Nepal'

WHEN (m.MentionSourceName LIKE '%.af' OR NET.HOST(m.MentionIdentifier) LIKE '%.af') 
     OR m.MentionSourceName LIKE '%tolonews%' OR m.MentionSourceName LIKE '%pajhwok%' THEN 'Afghanistan'

WHEN (m.MentionSourceName LIKE '%.kz' OR NET.HOST(m.MentionIdentifier) LIKE '%.kz') 
     OR m.MentionSourceName LIKE '%kazinform%' THEN 'Kazakhstan'

WHEN (m.MentionSourceName LIKE '%.uz' OR NET.HOST(m.MentionIdentifier) LIKE '%.uz') 
     OR m.MentionSourceName LIKE '%uzdaily%' THEN 'Uzbekistan'

-- === AFRICA (Additional) ===
WHEN (m.MentionSourceName LIKE '%.ke' OR NET.HOST(m.MentionIdentifier) LIKE '%.ke') 
     OR m.MentionSourceName LIKE '%nation.co.ke%' OR m.MentionSourceName LIKE '%standardmedia%' THEN 'Kenya'

WHEN (m.MentionSourceName LIKE '%.et' OR NET.HOST(m.MentionIdentifier) LIKE '%.et') 
     OR m.MentionSourceName LIKE '%ena.et%' OR m.MentionSourceName LIKE '%addisstandard%' THEN 'Ethiopia'

WHEN (m.MentionSourceName LIKE '%.gh' OR NET.HOST(m.MentionIdentifier) LIKE '%.gh') 
     OR m.MentionSourceName LIKE '%myjoyonline%' OR m.MentionSourceName LIKE '%graphic.com.gh%' THEN 'Ghana'

WHEN (m.MentionSourceName LIKE '%.tz' OR NET.HOST(m.MentionIdentifier) LIKE '%.tz') 
     OR m.MentionSourceName LIKE '%thecitizen.co.tz%' THEN 'Tanzania'

WHEN (m.MentionSourceName LIKE '%.ug' OR NET.HOST(m.MentionIdentifier) LIKE '%.ug') 
     OR m.MentionSourceName LIKE '%monitor.co.ug%' THEN 'Uganda'

WHEN (m.MentionSourceName LIKE '%.dz' OR NET.HOST(m.MentionIdentifier) LIKE '%.dz') 
     OR m.MentionSourceName LIKE '%aps.dz%' OR m.MentionSourceName LIKE '%tsa-algerie%' THEN 'Algeria'

WHEN (m.MentionSourceName LIKE '%.ma' OR NET.HOST(m.MentionIdentifier) LIKE '%.ma') 
     OR m.MentionSourceName LIKE '%maroc.ma%' OR m.MentionSourceName LIKE '%hespress%' THEN 'Morocco'

WHEN (m.MentionSourceName LIKE '%.tn' OR NET.HOST(m.MentionIdentifier) LIKE '%.tn') 
     OR m.MentionSourceName LIKE '%tap.info.tn%' THEN 'Tunisia'

WHEN (m.MentionSourceName LIKE '%.zw' OR NET.HOST(m.MentionIdentifier) LIKE '%.zw') 
     OR m.MentionSourceName LIKE '%herald.co.zw%' THEN 'Zimbabwe'

WHEN (m.MentionSourceName LIKE '%.ly' OR NET.HOST(m.MentionIdentifier) LIKE '%.ly') 
     OR m.MentionSourceName LIKE '%libyaobserver%' THEN 'Libya'

WHEN (m.MentionSourceName LIKE '%.sn' OR NET.HOST(m.MentionIdentifier) LIKE '%.sn') 
     OR m.MentionSourceName LIKE '%aps.sn%' THEN 'Senegal'

-- === LATIN AMERICA (Additional) ===
WHEN (m.MentionSourceName LIKE '%.cl' OR NET.HOST(m.MentionIdentifier) LIKE '%.cl') 
     OR m.MentionSourceName LIKE '%emol.com%' OR m.MentionSourceName LIKE '%latercera%' THEN 'Chile'

WHEN (m.MentionSourceName LIKE '%.co' OR NET.HOST(m.MentionIdentifier) LIKE '%.co') 
     OR m.MentionSourceName LIKE '%eltiempo.com%' OR m.MentionSourceName LIKE '%elespectador%' THEN 'Colombia'

WHEN (m.MentionSourceName LIKE '%.ve' OR NET.HOST(m.MentionIdentifier) LIKE '%.ve') 
     OR m.MentionSourceName LIKE '%eluniversal.com%' OR m.MentionSourceName LIKE '%vtv.gob.ve%' THEN 'Venezuela'

WHEN (m.MentionSourceName LIKE '%.pe' OR NET.HOST(m.MentionIdentifier) LIKE '%.pe') 
     OR m.MentionSourceName LIKE '%elcomercio.pe%' OR m.MentionSourceName LIKE '%andina.pe%' THEN 'Peru'

WHEN (m.MentionSourceName LIKE '%.ec' OR NET.HOST(m.MentionIdentifier) LIKE '%.ec') 
     OR m.MentionSourceName LIKE '%elcomercio.com%' OR m.MentionSourceName LIKE '%.ec%' THEN 'Ecuador'

WHEN (m.MentionSourceName LIKE '%.uy' OR NET.HOST(m.MentionIdentifier) LIKE '%.uy') 
     OR m.MentionSourceName LIKE '%elpais.com.uy%' THEN 'Uruguay'

WHEN (m.MentionSourceName LIKE '%.bo' OR NET.HOST(m.MentionIdentifier) LIKE '%.bo') 
     OR m.MentionSourceName LIKE '%erbol.com.bo%' THEN 'Bolivia'

WHEN (m.MentionSourceName LIKE '%.py' OR NET.HOST(m.MentionIdentifier) LIKE '%.py') 
     OR m.MentionSourceName LIKE '%abc.com.py%' THEN 'Paraguay'

WHEN (m.MentionSourceName LIKE '%.cu' OR NET.HOST(m.MentionIdentifier) LIKE '%.cu') 
     OR m.MentionSourceName LIKE '%granma.cu%' OR m.MentionSourceName LIKE '%prensa-latina%' THEN 'Cuba'

-- === CARIBBEAN ===
WHEN (m.MentionSourceName LIKE '%.jm' OR NET.HOST(m.MentionIdentifier) LIKE '%.jm') 
     OR m.MentionSourceName LIKE '%jamaica-gleaner%' THEN 'Jamaica'

WHEN (m.MentionSourceName LIKE '%.tt' OR NET.HOST(m.MentionIdentifier) LIKE '%.tt') 
     OR m.MentionSourceName LIKE '%guardian.co.tt%' THEN 'Trinidad and Tobago'

-- === CENTRAL AMERICA ===
WHEN (m.MentionSourceName LIKE '%.cr' OR NET.HOST(m.MentionIdentifier) LIKE '%.cr') 
     OR m.MentionSourceName LIKE '%nacion.com%' THEN 'Costa Rica'

WHEN (m.MentionSourceName LIKE '%.pa' OR NET.HOST(m.MentionIdentifier) LIKE '%.pa') 
     OR m.MentionSourceName LIKE '%prensa.com%' THEN 'Panama'

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