-- Migration 002: Seed default categories for existing + new users
-- Uses a function + trigger so every new user auto-gets default categories

CREATE OR REPLACE FUNCTION public.seed_default_categories(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.categories (user_id, name, icon, color, type) VALUES
    -- Gastos
    (p_user_id, 'Comida',           'utensils',      '#f59e0b', 'expense'),
    (p_user_id, 'Transporte',       'car',           '#3b82f6', 'expense'),
    (p_user_id, 'Vivienda',         'home',          '#8b5cf6', 'expense'),
    (p_user_id, 'Salud',            'heart-pulse',   '#ef4444', 'expense'),
    (p_user_id, 'Entretenimiento',  'tv',            '#ec4899', 'expense'),
    (p_user_id, 'Ropa',             'shirt',         '#f97316', 'expense'),
    (p_user_id, 'Educación',        'book-open',     '#06b6d4', 'expense'),
    (p_user_id, 'Servicios',        'zap',           '#84cc16', 'expense'),
    (p_user_id, 'Supermercado',     'shopping-cart', '#d97706', 'expense'),
    (p_user_id, 'Mascota',          'dog',           '#a78bfa', 'expense'),
    -- Ingresos
    (p_user_id, 'Sueldo',           'briefcase',     '#10b981', 'income'),
    (p_user_id, 'Freelance',        'laptop',        '#0ea5e9', 'income'),
    (p_user_id, 'Venta',            'package',       '#f59e0b', 'income'),
    (p_user_id, 'Regalo',           'gift',          '#ec4899', 'income'),
    -- Ahorros
    (p_user_id, 'Fondo emergencia', 'shield',        '#0ea5e9', 'savings'),
    (p_user_id, 'Vacaciones',       'plane',         '#f59e0b', 'savings'),
    (p_user_id, 'Meta personal',    'target',        '#10b981', 'savings'),
    -- Inversiones
    (p_user_id, 'Acciones',         'trending-up',   '#8b5cf6', 'investment'),
    (p_user_id, 'Cripto',           'bitcoin',       '#f97316', 'investment'),
    (p_user_id, 'Plazo fijo',       'landmark',      '#3b82f6', 'investment'),
    (p_user_id, 'Dólares',          'dollar-sign',   '#10b981', 'investment')
  ON CONFLICT DO NOTHING;
END;
$$;

-- Extend the existing handle_new_user trigger to also seed categories
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NULL)
  )
  ON CONFLICT (id) DO NOTHING;

  PERFORM public.seed_default_categories(NEW.id);

  RETURN NEW;
END;
$$;
