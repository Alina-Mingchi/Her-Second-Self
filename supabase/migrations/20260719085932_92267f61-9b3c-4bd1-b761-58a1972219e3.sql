
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('participant','researcher','admin','clinician');
CREATE TYPE public.data_type AS ENUM ('symptoms','hormones','voice','food','wearable','lab','brain_signal');
CREATE TYPE public.symptom_kind AS ENUM ('migraine','fatigue','brain_fog','mood','cramps','sleep','anxiety','hot_flash','headache','nausea','other');
CREATE TYPE public.hormone_kind AS ENUM ('lh','fsh','estradiol','progesterone','testosterone','cortisol','basal_temp','other');
CREATE TYPE public.hormone_method AS ENUM ('self_test','lab','wearable');
CREATE TYPE public.cycle_phase AS ENUM ('menstrual','follicular','ovulatory','luteal','unknown');
CREATE TYPE public.wearable_source AS ENUM ('apple_health','fitbit','oura','garmin','whoop','csv','manual');
CREATE TYPE public.wearable_metric AS ENUM ('sleep_min','deep_sleep_min','rem_sleep_min','hrv','resting_hr','steps','stress','spo2','skin_temp');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  pseudonym TEXT NOT NULL UNIQUE DEFAULT ('P-' || substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
  birth_year INT,
  locale TEXT DEFAULT 'en',
  onboarded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- ============ PROFILES policies ============
CREATE POLICY "read own profile" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'researcher') OR public.has_role(auth.uid(),'clinician'));
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "insert own profile" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- ============ STUDIES ============
CREATE TABLE public.studies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.studies TO authenticated;
GRANT ALL ON public.studies TO service_role;
ALTER TABLE public.studies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage studies" ON public.studies FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "researchers read studies" ON public.studies FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'researcher') OR public.has_role(auth.uid(),'clinician') OR public.has_role(auth.uid(),'admin'));

-- ============ STUDY PARTICIPANTS ============
CREATE TABLE public.study_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES public.studies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_in_study TEXT NOT NULL DEFAULT 'participant',
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (study_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_participants TO authenticated;
GRANT ALL ON public.study_participants TO service_role;
ALTER TABLE public.study_participants ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_participant_access(_actor UUID, _subject UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    _actor = _subject
    OR public.has_role(_actor,'admin')
    OR (
      (public.has_role(_actor,'researcher') OR public.has_role(_actor,'clinician'))
      AND EXISTS (
        SELECT 1
        FROM public.study_participants sp_actor
        JOIN public.study_participants sp_subject
          ON sp_actor.study_id = sp_subject.study_id
        WHERE sp_actor.user_id = _actor
          AND sp_subject.user_id = _subject
          AND sp_actor.role_in_study IN ('researcher','clinician','admin')
      )
    );
$$;

CREATE POLICY "admins manage sp" ON public.study_participants FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "members read sp" ON public.study_participants FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'researcher') OR public.has_role(auth.uid(),'clinician') OR public.has_role(auth.uid(),'admin'));

-- ============ CONSENT TEMPLATES ============
CREATE TABLE public.consent_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_type public.data_type NOT NULL,
  version INT NOT NULL,
  title TEXT NOT NULL,
  body_markdown TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (data_type, version)
);
GRANT SELECT ON public.consent_templates TO authenticated;
GRANT ALL ON public.consent_templates TO service_role;
ALTER TABLE public.consent_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone auth reads templates" ON public.consent_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins write templates" ON public.consent_templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.consent_templates (data_type, version, title, body_markdown) VALUES
  ('symptoms', 1, 'Symptom & cycle logging', 'You agree to log symptoms, cycle information, and hormone self-tests. Data is stored with a pseudonymous ID and used for research. You can revoke consent at any time.'),
  ('hormones', 1, 'Hormone data', 'You agree to log hormone measurements (self-test strips, basal temperature, or lab). Data is pseudonymized.'),
  ('voice', 1, 'Voice memos', 'You agree to record voice memos that will be transcribed by AI to extract mentioned symptoms. Audio is stored privately and can be deleted at any time.'),
  ('food', 1, 'Food photos', 'You agree to upload photos of your food. AI will identify foods and estimate nutrition. Photos are stored privately.'),
  ('wearable', 1, 'Wearable data', 'You agree to import data from wearable devices (Apple Health, Fitbit, Oura, Garmin) including sleep, heart rate, HRV, and steps.'),
  ('lab', 1, 'Lab results', 'You agree to enter or upload lab panel results for research use.'),
  ('brain_signal', 1, 'Brain signals', 'You agree to upload EEG or other brain signal recordings. Raw signals are stored privately with your pseudonymous ID.');

-- ============ CONSENTS ============
CREATE TABLE public.consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data_type public.data_type NOT NULL,
  template_version INT NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  UNIQUE (user_id, data_type)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consents TO authenticated;
GRANT ALL ON public.consents TO service_role;
ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own consents" ON public.consents FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "admins read consents" ON public.consents FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.has_active_consent(_user_id UUID, _data_type public.data_type)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.consents WHERE user_id = _user_id AND data_type = _data_type AND revoked_at IS NULL);
$$;

-- ============ DAILY LOGS ============
CREATE TABLE public.daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  cycle_day INT,
  cycle_phase public.cycle_phase,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, log_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_logs TO authenticated;
GRANT ALL ON public.daily_logs TO service_role;
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own daily logs" ON public.daily_logs FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "researchers read daily logs" ON public.daily_logs FOR SELECT TO authenticated
  USING (public.has_participant_access(auth.uid(), user_id));

-- ============ SYMPTOM ENTRIES ============
CREATE TABLE public.symptom_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_log_id UUID REFERENCES public.daily_logs(id) ON DELETE CASCADE,
  symptom public.symptom_kind NOT NULL,
  severity INT NOT NULL CHECK (severity BETWEEN 0 AND 10),
  free_text TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.symptom_entries TO authenticated;
GRANT ALL ON public.symptom_entries TO service_role;
ALTER TABLE public.symptom_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own symptoms" ON public.symptom_entries FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "researchers read symptoms" ON public.symptom_entries FOR SELECT TO authenticated
  USING (public.has_participant_access(auth.uid(), user_id));

-- ============ HORMONE ENTRIES ============
CREATE TABLE public.hormone_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_log_id UUID REFERENCES public.daily_logs(id) ON DELETE SET NULL,
  hormone public.hormone_kind NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  method public.hormone_method NOT NULL DEFAULT 'self_test',
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hormone_entries TO authenticated;
GRANT ALL ON public.hormone_entries TO service_role;
ALTER TABLE public.hormone_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own hormones" ON public.hormone_entries FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "researchers read hormones" ON public.hormone_entries FOR SELECT TO authenticated
  USING (public.has_participant_access(auth.uid(), user_id));

-- ============ VOICE MEMOS ============
CREATE TABLE public.voice_memos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  duration_s INT,
  transcript TEXT,
  extracted_symptoms JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.voice_memos TO authenticated;
GRANT ALL ON public.voice_memos TO service_role;
ALTER TABLE public.voice_memos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own voice" ON public.voice_memos FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "researchers read voice" ON public.voice_memos FOR SELECT TO authenticated
  USING (public.has_participant_access(auth.uid(), user_id));

-- ============ FOOD PHOTOS ============
CREATE TABLE public.food_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  ai_items JSONB,
  total_kcal NUMERIC,
  total_protein_g NUMERIC,
  total_carbs_g NUMERIC,
  total_fat_g NUMERIC,
  meal_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.food_photos TO authenticated;
GRANT ALL ON public.food_photos TO service_role;
ALTER TABLE public.food_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own food" ON public.food_photos FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "researchers read food" ON public.food_photos FOR SELECT TO authenticated
  USING (public.has_participant_access(auth.uid(), user_id));

-- ============ WEARABLE SAMPLES ============
CREATE TABLE public.wearable_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source public.wearable_source NOT NULL,
  metric public.wearable_metric NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT,
  recorded_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.wearable_samples (user_id, recorded_at DESC);
CREATE INDEX ON public.wearable_samples (user_id, metric, recorded_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wearable_samples TO authenticated;
GRANT ALL ON public.wearable_samples TO service_role;
ALTER TABLE public.wearable_samples ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own wearable" ON public.wearable_samples FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "researchers read wearable" ON public.wearable_samples FOR SELECT TO authenticated
  USING (public.has_participant_access(auth.uid(), user_id));

-- ============ LAB RESULTS ============
CREATE TABLE public.lab_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  panel TEXT,
  analyte TEXT NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_results TO authenticated;
GRANT ALL ON public.lab_results TO service_role;
ALTER TABLE public.lab_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own labs" ON public.lab_results FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "researchers read labs" ON public.lab_results FOR SELECT TO authenticated
  USING (public.has_participant_access(auth.uid(), user_id));

-- ============ BRAIN SIGNALS ============
CREATE TABLE public.brain_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  format TEXT NOT NULL,
  duration_s NUMERIC,
  channels INT,
  sample_rate NUMERIC,
  notes TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brain_signals TO authenticated;
GRANT ALL ON public.brain_signals TO service_role;
ALTER TABLE public.brain_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own brain" ON public.brain_signals FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "researchers read brain" ON public.brain_signals FOR SELECT TO authenticated
  USING (public.has_participant_access(auth.uid(), user_id));

-- ============ AUDIT LOG ============
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  subject_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read audit" ON public.audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "authenticated write audit self" ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (actor_user_id = auth.uid());

-- ============ AUTO-CREATE PROFILE + PARTICIPANT ROLE ON SIGNUP ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)))
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'participant')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_daily_logs_updated BEFORE UPDATE ON public.daily_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
