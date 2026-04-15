-- Pending invitations for research groups.

CREATE TABLE IF NOT EXISTS public.research_group_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.research_groups(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, email)
);

CREATE INDEX IF NOT EXISTS idx_research_group_invites_group_id ON public.research_group_invites(group_id);
CREATE INDEX IF NOT EXISTS idx_research_group_invites_email ON public.research_group_invites(email);

ALTER TABLE public.research_group_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS research_group_invites_select ON public.research_group_invites;
CREATE POLICY research_group_invites_select ON public.research_group_invites
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.research_groups rg
      WHERE rg.id = research_group_invites.group_id
        AND (rg.created_by = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM public.research_group_members gm
            WHERE gm.group_id = rg.id
              AND gm.profile_id = auth.uid()
          ))
    )
  );

DROP POLICY IF EXISTS research_group_invites_insert ON public.research_group_invites;
CREATE POLICY research_group_invites_insert ON public.research_group_invites
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.research_groups rg
      WHERE rg.id = research_group_invites.group_id
        AND EXISTS (
          SELECT 1
          FROM public.research_group_members gm
          WHERE gm.group_id = rg.id
            AND gm.profile_id = auth.uid()
            AND gm.member_role = 'leader'
        )
    )
  );

DROP POLICY IF EXISTS research_group_invites_delete ON public.research_group_invites;
CREATE POLICY research_group_invites_delete ON public.research_group_invites
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.research_groups rg
      WHERE rg.id = research_group_invites.group_id
        AND EXISTS (
          SELECT 1
          FROM public.research_group_members gm
          WHERE gm.group_id = rg.id
            AND gm.profile_id = auth.uid()
            AND gm.member_role = 'leader'
        )
    )
  );