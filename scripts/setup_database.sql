-- Kombio Card Game Database Setup
-- Run this script in your Supabase SQL Editor to set up the complete database

-- Create profiles table for user data
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create games table
CREATE TABLE IF NOT EXISTS public.games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'lobby', -- lobby, playing, finished
  current_round INTEGER DEFAULT 0,
  max_rounds INTEGER DEFAULT 5,
  current_turn_player_id UUID,
  deck JSONB DEFAULT '[]'::jsonb,
  discard_pile JSONB DEFAULT '[]'::jsonb,
  last_discarded_card JSONB,
  kombio_caller_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create game_players table
CREATE TABLE IF NOT EXISTS public.game_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_order INTEGER NOT NULL,
  total_score INTEGER DEFAULT 0,
  current_hand JSONB DEFAULT '[]'::jsonb,
  viewed_cards JSONB DEFAULT '[]'::jsonb, -- Track which cards player has viewed
  is_ready BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(game_id, user_id)
);

-- Create game_actions table for tracking game history
CREATE TABLE IF NOT EXISTS public.game_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- draw, discard, swap, match, view, kombio
  action_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Temporarily DISABLE Row Level Security to test
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.games DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_players DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_actions DISABLE ROW LEVEL SECURITY;

-- RLS is disabled for testing, so no policies needed
-- We'll re-enable RLS and add proper policies once we confirm the basic functionality works

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_games_code ON public.games(code);
CREATE INDEX IF NOT EXISTS idx_games_status ON public.games(status);
CREATE INDEX IF NOT EXISTS idx_game_players_game_id ON public.game_players(game_id);
CREATE INDEX IF NOT EXISTS idx_game_players_user_id ON public.game_players(user_id);
CREATE INDEX IF NOT EXISTS idx_game_actions_game_id ON public.game_actions(game_id);

-- Auto-create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'display_name', 'Player')
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN new;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger for auto-profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
