begin;
-- Only the server credential used by the terminal provisioning command may call this.
-- A public signup cannot supply app_metadata or grant itself a privileged role.
create function public.terminal_provision_admin(p_user_id uuid,p_provisioning_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_metadata jsonb; v_created timestamptz;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Server credentials are required'; end if;
 select raw_app_meta_data,created_at into v_metadata,v_created from auth.users where id=p_user_id for update;
 if not found or v_metadata->>'admin_provisioning_id' is distinct from p_provisioning_id::text or v_created < now()-interval '15 minutes' then raise exception 'Invalid or expired terminal provisioning request'; end if;
 update user_roles set role='ADMIN' where user_id=p_user_id and role='CUSTOMER';
 if not found then raise exception 'A newly created customer account is required'; end if;
 update auth.users set raw_app_meta_data=(coalesce(raw_app_meta_data,'{}'::jsonb)-'admin_provisioning_id')||jsonb_build_object('admin_provisioned_via_terminal',true) where id=p_user_id;
 insert into admin_activity_logs(admin_id,action,entity_id,details) values(p_user_id,'terminal_admin_created',p_user_id::text,jsonb_build_object('source','terminal'));
end $$;
revoke all on function public.terminal_provision_admin(uuid,uuid) from public,anon,authenticated;
grant usage on schema public to service_role;
grant select on public.user_roles,public.profiles to service_role;
grant execute on function public.terminal_provision_admin(uuid,uuid) to service_role;

-- The student directory does not expose staff accounts or their email addresses.
create function public.list_students() returns setof public.profiles
language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
 if not is_admin() then raise exception 'Administrator access is required'; end if;
 return query select p.* from profiles p join user_roles r on r.user_id=p.id where r.role='CUSTOMER' order by p.full_name,p.id;
end $$;
revoke all on function public.list_students() from public,anon,authenticated;
grant execute on function public.list_students() to authenticated;
commit;
