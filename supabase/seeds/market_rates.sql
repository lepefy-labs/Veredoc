-- Offerte luce aggiornate con monthlyFee (CCV mensile)
-- CCV = Corrispettivo di Commercializzazione e Vendita (quota fissa annua / 12)
-- Dati di riferimento: giugno 2026

INSERT INTO "MarketRate" ("id", "category", "provider", "planName", "priceValue", "priceUnit", "monthlyFee", "url", "scrapedAt")
VALUES

-- Magis Energia — MIA LUCE FIX WEB — CCV 96 €/anno → 8 €/mese
(gen_random_uuid(), 'luce', 'Magis Energia', 'MIA LUCE FIX WEB', 0.1027, '€/kWh', 8.00,
 'https://www.magisenergia.it', NOW()),

-- Edison — Web Luce — CCV stimato ~10 €/mese
(gen_random_uuid(), 'luce', 'Edison', 'Web Luce', 0.1310, '€/kWh', 10.00,
 'https://www.edison.it/it/per-la-casa/luce-e-gas', NOW()),

-- Sorgenia — Next Energy Sunlight — CCV ~8 €/mese
(gen_random_uuid(), 'luce', 'Sorgenia', 'Next Energy Sunlight Luce', 0.1195, '€/kWh', 8.00,
 'https://www.sorgenia.it/offerte-luce', NOW()),

-- Octopus Energy — Flex Luce — CCV stimato ~8 €/mese
(gen_random_uuid(), 'luce', 'Octopus Energy', 'Flex Luce', 0.1210, '€/kWh', 8.00,
 'https://octopusenergy.it/offerte-luce', NOW()),

-- Dolomiti Energia — CCV stimato ~9 €/mese
(gen_random_uuid(), 'luce', 'Dolomiti Energia', 'Luce Fissa Casa', 0.1150, '€/kWh', 9.00,
 'https://www.dolomiti-energia.it', NOW()),

-- ENGIE — CCV stimato ~10 €/mese
(gen_random_uuid(), 'luce', 'ENGIE', 'Energia PuntoFisso 12M', 0.1180, '€/kWh', 10.00,
 'https://www.engie.it/casa/offerte-luce-gas/', NOW()),

-- Eni Plenitude — Trend Casa Luce Plus — ZERO quota fissa
(gen_random_uuid(), 'luce', 'Eni Plenitude', 'Trend Casa Luce Plus', 0.1415, '€/kWh', 0.00,
 'https://www.plenitude.com/it/offerte-casa', NOW()),

-- Alperia — Free Welcome — ZERO quota fissa (CCV = 0)
(gen_random_uuid(), 'luce', 'Alperia', 'Free Welcome Luce', 0.1305, '€/kWh', 0.00,
 'https://www.alperia.eu', NOW()),

-- A2A Energia — Smart Casa+ — CCV stimato ~8 €/mese
(gen_random_uuid(), 'luce', 'A2A Energia', 'Smart Casa+', 0.1220, '€/kWh', 8.00,
 'https://www.a2aenergia.eu/offerte-luce-gas', NOW()),

-- Illumia — SicurInsieme Luce — CCV stimato ~8 €/mese
(gen_random_uuid(), 'luce', 'Illumia', 'SicurInsieme Luce', 0.1345, '€/kWh', 8.00,
 'https://www.illumia.it/luce-e-gas', NOW()),

-- Enel Energia — offerta attuale di riferimento — CCV 144 €/anno → 12 €/mese
(gen_random_uuid(), 'luce', 'Enel Energia', 'Luce Fissa Web 24M', 0.1740, '€/kWh', 12.00,
 'https://www.enel.it/it-it', NOW()),

-- ARERA tutela vulnerabili — CCV non applicabile
(gen_random_uuid(), 'luce', 'ARERA', 'Tutela Vulnerabili Q2 2026', 0.1350, '€/kWh', NULL,
 'https://www.arera.it/prezzi-e-tariffe', NOW())

ON CONFLICT ("provider", "planName")
DO UPDATE SET
  "priceValue"  = EXCLUDED."priceValue",
  "monthlyFee"  = EXCLUDED."monthlyFee",
  "priceUnit"   = EXCLUDED."priceUnit",
  "url"         = EXCLUDED."url",
  "scrapedAt"   = NOW();
