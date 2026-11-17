CREATE OR REPLACE FUNCTION public.protect_review_columns()
RETURNS trigger LANGUAGE plpgsql SET search_path TO public AS $$
BEGIN
 IF current_user <> 'authenticated' OR public.is_admin() THEN RETURN NEW; END IF;
 IF NEW.hidden IS DISTINCT FROM OLD.hidden
 OR NEW.rating IS DISTINCT FROM OLD.rating
 OR NEW.body IS DISTINCT FROM OLD.body
 OR NEW.communication IS DISTINCT FROM OLD.communication
 OR NEW.contract_accuracy IS DISTINCT FROM OLD.contract_accuracy
 OR NEW.speed_to_close IS DISTINCT FROM OLD.speed_to_close
 OR NEW.market_knowledge IS DISTINCT FROM OLD.market_knowledge
 OR NEW.knowledge IS DISTINCT FROM OLD.knowledge
 OR NEW.professionalism IS DISTINCT FROM OLD.professionalism
 OR NEW.follow_through IS DISTINCT FROM OLD.follow_through
 OR NEW.problem_solving IS DISTINCT FROM OLD.problem_solving
 OR NEW.team_player IS DISTINCT FROM OLD.team_player THEN
  RAISE EXCEPTION 'Not allowed to modify this review';
 END IF;
 RETURN NEW;
END;
$$;