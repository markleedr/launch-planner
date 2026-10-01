-- Custom project covers are private. The app serves them with short-lived
-- signed URLs, the same way profile images work. Built-in covers stay in
-- public/hero-placeholders and are not in this bucket.

update storage.buckets
set public = false
where id = 'project-heroes';

drop policy if exists "project_heroes_public_read" on storage.objects;
