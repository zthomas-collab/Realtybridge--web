ALTER TABLE public.reviews
 ADD COLUMN knowledge smallint,
 ADD COLUMN professionalism smallint,
 ADD COLUMN follow_through smallint,
 ADD COLUMN problem_solving smallint,
 ADD COLUMN team_player smallint;

CREATE OR REPLACE FUNCTION public.validate_review_scorecard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE score integer;
BEGIN
 IF TG_OP = 'INSERT' THEN
  FOREACH score IN ARRAY ARRAY[NEW.rating, NEW.communication, NEW.contract_accuracy, NEW.speed_to_close, NEW.market_knowledge, NEW.knowledge, NEW.professionalism, NEW.follow_through, NEW.problem_solving, NEW.team_player] LOOP
   IF score IS NULL OR score < 1 OR score > 5 THEN
    RAISE EXCEPTION 'Choose a 1–5 score for the overall rating and every review category';
   END IF;
  END LOOP;
 END IF;
 FOREACH score IN ARRAY ARRAY[NEW.knowledge, NEW.professionalism, NEW.follow_through, NEW.problem_solving, NEW.team_player] LOOP
  IF score IS NOT NULL AND (score < 1 OR score > 5) THEN
   RAISE EXCEPTION 'Review category scores must be between 1 and 5';
  END IF;
 END LOOP;
 RETURN NEW;
END;
$$;
CREATE TRIGGER validate_review_scorecard BEFORE INSERT OR UPDATE ON public.reviews
 FOR EACH ROW EXECUTE FUNCTION public.validate_review_scorecard();

CREATE OR REPLACE VIEW public.rating_summaries AS
 SELECT reviewee_id AS user_id, count(*)::integer AS review_count,
 round(avg(rating),2) AS avg_rating,
 round(avg(communication),2) AS avg_communication,
 round(avg(contract_accuracy),2) AS avg_contract_accuracy,
 round(avg(speed_to_close),2) AS avg_speed_to_close,
 round(avg(market_knowledge),2) AS avg_market_knowledge,
 round(avg(knowledge),2) AS avg_knowledge,
 round(avg(professionalism),2) AS avg_professionalism,
 round(avg(follow_through),2) AS avg_follow_through,
 round(avg(problem_solving),2) AS avg_problem_solving,
 round(avg(team_player),2) AS avg_team_player
 FROM public.reviews WHERE NOT hidden GROUP BY reviewee_id;
