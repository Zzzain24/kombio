import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import LobbyClient from "@/components/lobby-client"

export default async function LobbyPage({ params }: { params: Promise<{ gameId: string }> }) {
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

  console.log("Lobby page - Game fetch result:", { game, gameError })

  if (gameError || !game) {
    console.log("Lobby page - Game not found, redirecting to home")
    redirect("/")
  }

  // Fetch players (simplified query without join for debugging)
  const { data: players, error: playersError } = await supabase
    .from("game_players")
    .select("*")
    .eq("game_id", gameId)
    .order("player_order")

  console.log("Lobby page - Players fetch result:", { players, playersError })

  // If players exist, fetch their profiles separately
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
    console.log("Lobby page - Players with profiles:", playersWithProfiles)
  }

  // Check if user is in this game
  const isPlayerInGame = players?.some((p) => p.user_id === user.id)
  console.log("Lobby page - User check:", { userId: user.id, isPlayerInGame, players })
  
  if (!isPlayerInGame) {
    console.log("Lobby page - User not in game, redirecting to home")
    redirect("/")
  }

  return <LobbyClient game={game} players={playersWithProfiles || players || []} currentUserId={user.id} />
}
