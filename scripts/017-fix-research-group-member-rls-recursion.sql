-- Fix infinite recursion in research_group_members RLS policies.
-- Old policies referenced research_group_members inside their own USING/WITH CHECK.

ALTER TABLE public.research_group_members ENABLE ROW LEVEL SECURITY;

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
    EXISTS (
      SELECT 1
      FROM public.research_groups rg
      WHERE rg.id = research_group_members.group_id
        AND rg.created_by = auth.uid()
    )
    OR (
      profile_id = auth.uid()
      AND member_role <> 'leader'
    )
  );
