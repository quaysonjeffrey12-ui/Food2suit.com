insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('dish-images', 'dish-images', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = 10485760, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

create policy "Public dish image viewing"
on storage.objects for select
to public
using (bucket_id = 'dish-images');

create policy "Administrators upload dish images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'dish-images' and exists (select 1 from public.staff where staff.user_id = auth.uid() and staff.is_admin = true));

create policy "Administrators update dish images"
on storage.objects for update
to authenticated
using (bucket_id = 'dish-images' and exists (select 1 from public.staff where staff.user_id = auth.uid() and staff.is_admin = true));

create policy "Administrators delete dish images"
on storage.objects for delete
to authenticated
using (bucket_id = 'dish-images' and exists (select 1 from public.staff where staff.user_id = auth.uid() and staff.is_admin = true));
