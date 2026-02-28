-- ============================================================
-- Communication Module Schema
-- Comments, mentions, photos, notifications
-- ============================================================

-- Komentare / chat na ukolu
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- @Zminky v komentarich
CREATE TABLE mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Fotky a media
CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  sheet_id UUID REFERENCES sheets(id) ON DELETE SET NULL,
  pin_x DOUBLE PRECISION,
  pin_y DOUBLE PRECISION,
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  type TEXT DEFAULT 'photo' CHECK (type IN ('photo', 'video', 'photo_360')),
  markup_data JSONB,
  caption TEXT,
  tags TEXT[],
  taken_at TIMESTAMPTZ,
  taken_by UUID REFERENCES auth.users(id),
  width INT,
  height INT,
  file_size BIGINT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Notifikace
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexy
CREATE INDEX idx_comments_task ON comments(task_id);
CREATE INDEX idx_comments_created ON comments(created_at);
CREATE INDEX idx_mentions_user ON mentions(user_id);
CREATE INDEX idx_photos_project ON photos(project_id);
CREATE INDEX idx_photos_task ON photos(task_id);
CREATE INDEX idx_photos_sheet ON photos(sheet_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, is_read);

-- RLS
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Comments
CREATE POLICY "Can view comments" ON comments
  FOR SELECT USING (
    task_id IN (
      SELECT id FROM tasks WHERE project_id IN (
        SELECT project_id FROM project_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Can create comments" ON comments
  FOR INSERT WITH CHECK (
    task_id IN (
      SELECT id FROM tasks WHERE project_id IN (
        SELECT project_id FROM project_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Can update own comments" ON comments
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Can delete own comments" ON comments
  FOR DELETE USING (user_id = auth.uid());

-- Mentions
CREATE POLICY "Can view mentions" ON mentions
  FOR SELECT USING (
    user_id = auth.uid()
    OR comment_id IN (
      SELECT id FROM comments WHERE task_id IN (
        SELECT id FROM tasks WHERE project_id IN (
          SELECT project_id FROM project_members WHERE user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Can create mentions" ON mentions
  FOR INSERT WITH CHECK (
    comment_id IN (
      SELECT id FROM comments WHERE task_id IN (
        SELECT id FROM tasks WHERE project_id IN (
          SELECT project_id FROM project_members WHERE user_id = auth.uid()
        )
      )
    )
  );

-- Photos
CREATE POLICY "Project members can view photos" ON photos
  FOR SELECT USING (
    project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Can create photos" ON photos
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Can update own photos" ON photos
  FOR UPDATE USING (taken_by = auth.uid());

CREATE POLICY "Admin can delete photos" ON photos
  FOR DELETE USING (
    taken_by = auth.uid()
    OR project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Notifications
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "System can create notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- Enable realtime for comments and notifications
ALTER PUBLICATION supabase_realtime ADD TABLE comments;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
