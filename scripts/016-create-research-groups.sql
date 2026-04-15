-- Research groups and memberships (leader/member model)

CREATE TABLE IF NOT EXISTS public.research_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.research_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.research_groups(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  member_role TEXT NOT NULL CHECK (member_role IN ('leader', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_research_groups_created_by ON public.research_groups(created_by);
CREATE INDEX IF NOT EXISTS idx_research_group_members_group_id ON public.research_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_research_group_members_profile_id ON public.research_group_members(profile_id);

-- Enforce one leader per group.
CREATE UNIQUE INDEX IF NOT EXISTS idx_research_group_one_leader
  ON public.research_group_members(group_id)
  WHERE member_role = 'leader';

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS research_groups_updated_at ON public.research_groups;
CREATE TRIGGER research_groups_updated_at
  BEFORE UPDATE ON public.research_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.research_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS research_groups_select ON public.research_groups;
CREATE POLICY research_groups_select ON public.research_groups
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.research_group_members gm
      WHERE gm.group_id = research_groups.id
        AND gm.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS research_groups_insert ON public.research_groups;
CREATE POLICY research_groups_insert ON public.research_groups
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS research_groups_update ON public.research_groups;
CREATE POLICY research_groups_update ON public.research_groups
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.research_group_members gm
      WHERE gm.group_id = research_groups.id
        AND gm.profile_id = auth.uid()
        AND gm.member_role = 'leader'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.research_group_members gm
      WHERE gm.group_id = research_groups.id
        AND gm.profile_id = auth.uid()
        AND gm.member_role = 'leader'
    )
  );

DROP POLICY IF EXISTS research_groups_delete ON public.research_groups;
CREATE POLICY research_groups_delete ON public.research_groups
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.research_group_members gm
      WHERE gm.group_id = research_groups.id
        AND gm.profile_id = auth.uid()
        AND gm.member_role = 'leader'
    )
  );

DROP POLICY IF EXISTS research_group_members_select ON public.research_group_members;
CREATE POLICY research_group_members_select ON public.research_group_members
  FOR SELECT
  TO authenticated
  USING (
    profile_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.research_groups rg
      WHERE rg.id = research_group_members.group_id
        AND rg.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS research_group_members_insert ON public.research_group_members;
CREATE POLICY research_group_members_insert ON public.research_group_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- creator can insert their own leader row during group creation
    profile_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.research_groups rg
      WHERE rg.id = research_group_members.group_id
        AND rg.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS research_group_members_update ON public.research_group_members;
CREATE POLICY research_group_members_update ON public.research_group_members
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.research_groups rg
      WHERE rg.id = research_group_members.group_id
        AND rg.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.research_groups rg
      WHERE rg.id = research_group_members.group_id
        AND rg.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS research_group_members_delete ON public.research_group_members;
CREATE POLICY research_group_members_delete ON public.research_group_members
  FOR DELETE
  TO authenticated
  USING (
    -- leader can manage membership
    EXISTS (
      SELECT 1
      FROM public.research_groups rg
      WHERE rg.id = research_group_members.group_id
        AND rg.created_by = auth.uid()
    )
    OR (
      -- non-leaders can leave group themselves
      profile_id = auth.uid()
      AND member_role <> 'leader'
    )
  );
