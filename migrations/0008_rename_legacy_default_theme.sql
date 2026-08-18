UPDATE "themes"
SET
  "name" = 'Default',
  "description" = 'Default colors for new sites.',
  "renderer" = NULL
WHERE "name" = 'Custom SSR';
