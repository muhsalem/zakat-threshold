CREATE TABLE public.country_price_updates (
 country text NOT NULL,
 local_date date NOT NULL,
 local_hour smallint NOT NULL CHECK (local_hour IN (11,23)),
 time_zone text NOT NULL,
 slot_at timestamptz NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (country, local_date, local_hour)
);
GRANT ALL ON public.country_price_updates TO service_role;
ALTER TABLE public.country_price_updates ENABLE ROW LEVEL SECURITY;
CREATE INDEX country_price_updates_slot_at ON public.country_price_updates(slot_at DESC);
