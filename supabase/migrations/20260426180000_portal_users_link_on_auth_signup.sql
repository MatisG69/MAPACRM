/*
  Portal users — liaison automatique auth.users ⇄ portal_users
  -------------------------------------------------------------
  Contexte : depuis avril 2026, l'admin n'attribue plus de mot de passe ;
  il invite le client par email (Supabase magic link). Le client définit
  lui-même son mot de passe à l'activation.

  Pour que la ligne `portal_users` créée lors de l'invitation se rattache à
  l'utilisateur Supabase Auth créé/confirmé ensuite, ce trigger recherche
  une ligne `portal_users` orpheline (auth_user_id IS NULL) ayant le même
  email et la lie automatiquement.

  Le trigger est `SECURITY DEFINER` car il opère sur `public.portal_users`
  depuis le contexte du service auth (rôle interne) en contournant RLS.
*/

CREATE OR REPLACE FUNCTION public.link_portal_user_to_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.portal_users
  SET auth_user_id = NEW.id
  WHERE LOWER(email) = LOWER(NEW.email)
    AND auth_user_id IS NULL;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.link_portal_user_to_auth_user() FROM PUBLIC;

DROP TRIGGER IF EXISTS portal_users_link_on_auth_insert ON auth.users;
CREATE TRIGGER portal_users_link_on_auth_insert
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.link_portal_user_to_auth_user();

DROP TRIGGER IF EXISTS portal_users_link_on_auth_email_update ON auth.users;
CREATE TRIGGER portal_users_link_on_auth_email_update
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  WHEN (OLD.email IS DISTINCT FROM NEW.email)
  EXECUTE FUNCTION public.link_portal_user_to_auth_user();

/* Backfill : lier les éventuelles lignes existantes orphelines avec des auth.users déjà présents */
UPDATE public.portal_users pu
SET auth_user_id = au.id
FROM auth.users au
WHERE pu.auth_user_id IS NULL
  AND LOWER(pu.email) = LOWER(au.email);
