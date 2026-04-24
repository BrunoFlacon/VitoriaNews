-- Adicionar o Artesão de Bots ao menu de navegação
INSERT INTO public.system_settings ("key", "value", "group", "active", "order_index", "allowed_roles")
VALUES (
    'robot', 
    'Artesão de Bots', 
    'navigation', 
    true, 
    9, 
    '{"admin_master", "dev_master", "editor", "user"}'
)
ON CONFLICT (key) DO UPDATE SET 
    value = EXCLUDED.value,
    "group" = EXCLUDED.group,
    allowed_roles = EXCLUDED.allowed_roles;
