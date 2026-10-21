-- Kortex : mémoire de l'abonnement Stripe dans les profils.
-- À coller une seule fois dans Supabase > SQL Editor, puis cliquer sur « Run ».
-- (schema.sql a déjà été exécuté avant : ce fichier le complète.)
-- Basé sur la doc officielle Supabase (api-keys, row-level-security)
-- et Stripe (objet Subscription, champ status).

-- 1. Trois nouvelles informations par client.
--    Elles restent vides tant que le client n'a pas payé.
alter table public.profiles
  add column stripe_customer_id text unique,
  add column stripe_subscription_id text unique,
  add column subscription_status text;

-- 2. Seuls les états que Stripe peut envoyer sont acceptés.
alter table public.profiles
  add constraint profiles_subscription_status_check
  check (subscription_status in (
    'incomplete', 'incomplete_expired', 'trialing', 'active',
    'past_due', 'canceled', 'unpaid', 'paused'
  ));

-- Rien à changer pour la sécurité :
-- - le client garde seulement le droit de LIRE sa ligne (il ne peut pas se mettre « active ») ;
-- - le webhook Stripe écrira avec la clé secrète Supabase (rôle service_role),
--   qui a déjà les droits sur cette table (voir schema.sql).
