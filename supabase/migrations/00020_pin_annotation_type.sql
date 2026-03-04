-- Add 'pin' to annotations type CHECK constraint
ALTER TABLE annotations DROP CONSTRAINT IF EXISTS annotations_type_check;
ALTER TABLE annotations ADD CONSTRAINT annotations_type_check
  CHECK (type IN ('line','rectangle','ellipse','cloud','arrow','text','highlighter','freehand','measurement','area','pin'));
