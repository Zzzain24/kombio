import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import GameClient from "@/components/game-client"

export default async function GamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Fetch game data
  const { data: game, error: gameError } = await supabase.from("games").select("*").eq("id", gameId).single()

  if (gameError || !game) {
    redirect("/")
  }

  // Fetch players (simplified query without join)
  const { data: players } = await supabase
    .from("game_players")
    .select("*")
    .eq("game_id", gameId)
    .order("player_order")

  // Fetch profiles for each player
  let playersWithProfiles = []
  if (players && players.length > 0) {
    for (const player of players) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", player.user_id)
        .single()
      
      playersWithProfiles.push({
        ...player,
        profile: profile
      })
    }
  }

  // Check if user is in this game
  const isPlayerInGame = players?.some((p) => p.user_id === user.id)
  if (!isPlayerInGame) {
    redirect("/")
  }

  return <GameClient game={game} players={playersWithProfiles || []} currentUserId={user.id} />
}
