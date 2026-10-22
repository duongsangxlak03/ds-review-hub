alter table public.blog_posts
  add column if not exists content_type text not null default 'buying_guide',
  add column if not exists source_url text,
  add column if not exists source_author text,
  add column if not exists source_platform text,
  add column if not exists source_published_at timestamptz,
  add column if not exists source_excerpt text,
  add column if not exists rights_status text not null default 'inspiration',
  add column if not exists source_image_url text,
  add column if not exists image_rights_status text not null default 'generated',
  add column if not exists originality_notes text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'blog_posts_content_type_check') then
    alter table public.blog_posts add constraint blog_posts_content_type_check
      check (content_type in ('insight', 'buying_guide', 'shopping_research', 'store_review'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'blog_posts_rights_status_check') then
    alter table public.blog_posts add constraint blog_posts_rights_status_check
      check (rights_status in ('inspiration', 'excerpt_with_attribution', 'licensed_reprint', 'owned'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'blog_posts_image_rights_status_check') then
    alter table public.blog_posts add constraint blog_posts_image_rights_status_check
      check (image_rights_status in ('generated', 'licensed', 'owned', 'source_embed', 'unknown'));
  end if;
end $$;

create index if not exists idx_blog_posts_content_type_published
  on public.blog_posts (content_type, is_published, published_at desc);

update public.blog_posts
set content_type = 'store_review'
where content_type = 'buying_guide'
  and (
    category ilike '%store review%'
    or slug ilike '%coupon%'
    or title ilike '%coupon%'
    or title ilike '%promo code%'
  );

alter table public.blog_posts alter column content_type set default 'insight';

comment on column public.blog_posts.rights_status is 'How source material may be used. Inspiration must be rewritten in original language and structure.';
comment on column public.blog_posts.image_rights_status is 'Evidence that the hero image may be republished; generated/owned/licensed are safe publishing defaults.';
