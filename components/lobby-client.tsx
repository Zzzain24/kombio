"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Game, GamePlayer } from "@/lib/types"
import { Copy, Check, Users, Crown } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface LobbyClientProps {
  game: Game
  players: (GamePlayer & { profile: any })[]
  currentUserId: string
}

export default function LobbyClient({ game: initialGame, players: initialPlayers, currentUserId }: LobbyClientProps) {
  const [game, setGame] = useState(initialGame)
  const [players, setPlayers] = useState(initialPlayers)
  const [copied, setCopied] = useState(false)
  const [maxRounds, setMaxRounds] = useState(initialGame.max_rounds)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const isHost = game.host_id === currentUserId

  useEffect(() => {
    // Subscribe to game updates
    const gameChannel = supabase
      .channel(`game:${game.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "games", filter: `id=eq.${game.id}` },
        (payload) => {
          console.log("Lobby - Game update received:", payload)
          setGame(payload.new as Game)
          // If game started, redirect to game board
          if (payload.new.status === "playing") {
            router.push(`/game/${game.id}`)
            router.refresh()
          }
        },
      )
      .subscribe((status) => {
        console.log("Lobby - Game channel status:", status)
      })

    // Subscribe to player updates
    const playersChannel = supabase
      .channel(`players:${game.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_players", filter: `game_id=eq.${game.id}` },
        async () => {
          // Refetch players (using the same simplified query as the lobby page)
          const { data } = await supabase
            .from("game_players")
            .select("*")
            .eq("game_id", game.id)
            .order("player_order")

          if (data) {
            // Fetch profiles for each player
            const playersWithProfiles = []
            for (const player of data) {
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
            setPlayers(playersWithProfiles)
          }
        },
      )
      .subscribe()

    // Polling as backup - check game status and players every 2 seconds
    const pollInterval = setInterval(async () => {
      // Check game status
      const { data: latestGame } = await supabase
        .from("games")
        .select("status")
        .eq("id", game.id)
        .single()
      
      if (latestGame && latestGame.status !== game.status) {
        console.log("Lobby - Polling detected game status change:", latestGame.status)
        // Refetch full game data
        const { data: fullGame } = await supabase
          .from("games")
          .select("*")
          .eq("id", game.id)
          .single()
        
        if (fullGame) {
          setGame(fullGame as Game)
          
          // Redirect if game started
          if (fullGame.status === "playing") {
            router.push(`/game/${game.id}`)
            router.refresh()
          }
        }
      }

      // Check for player updates as backup
      const { data: latestPlayers } = await supabase
        .from("game_players")
        .select("*")
        .eq("game_id", game.id)
        .order("player_order")

      if (latestPlayers) {
        const playersWithProfiles = []
        for (const player of latestPlayers) {
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
        
        // Only update if player count changed to avoid unnecessary re-renders
        if (playersWithProfiles.length !== players.length) {
          console.log("Lobby - Polling detected player count change")
          setPlayers(playersWithProfiles)
        }
      }
}, 2000) // Poll every 2 seconds as backup

    return () => {
      gameChannel.unsubscribe()
      playersChannel.unsubscribe()
      clearInterval(pollInterval)
    }
  }, [game.id, game.status, router, supabase, players.length])

  async function copyGameCode() {
    await navigator.clipboard.writeText(game.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleStartGame() {
    if (!isHost || players.length < 2) return

    console.log("Starting game with players:", players)
    setLoading(true)
    try {
      // Initialize deck (standard 52 cards + 2 jokers, values 0-14)
      const deck = []
      const suits = ["hearts", "diamonds", "clubs", "spades"]

      // Add cards 0-14 for each suit (0 = joker/special)
      for (let value = 0; value <= 14; value++) {
        for (const suit of suits) {
          deck.push({
            id: `${suit}-${value}-${Math.random()}`,
            value,
            suit,
          })
        }
      }

      console.log("Created deck with", deck.length, "cards")

      // Shuffle deck
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[deck[i], deck[j]] = [deck[j], deck[i]]
      }

      // Deal 4 cards to each player
      const updatedPlayers = []
      for (let i = 0; i < players.length; i++) {
        const hand = deck.splice(0, 4)
        updatedPlayers.push({
          id: players[i].id,
          hand,
        })
      }

      console.log("Dealing cards to players:", updatedPlayers)

      // Update game status and deck
      const gameUpdateResult = await supabase
        .from("games")
        .update({
          status: "playing",
          current_round: 1,
          deck: deck,
          discard_pile: [],
          current_turn_player_id: players[0].user_id,
        })
        .eq("id", game.id)

      console.log("Game update result:", gameUpdateResult)

      // Update each player's hand
      for (const player of updatedPlayers) {
        const playerUpdateResult = await supabase.from("game_players").update({ current_hand: player.hand }).eq("id", player.id)
        console.log("Player hand update result:", { playerId: player.id, result: playerUpdateResult })
      }

      console.log("Game started successfully!")
      
      // Update local state and redirect immediately
      setGame(prev => ({ ...prev, status: "playing" }))
      
      // Redirect host to game
      router.push(`/game/${game.id}`)
      router.refresh()
    } catch (err) {
      console.error("Failed to start game:", err)
    } finally {
      setLoading(false)
    }
  }

  async function handleLeaveGame() {
    try {
      await supabase.from("game_players").delete().eq("game_id", game.id).eq("user_id", currentUserId)
      router.push("/")
      router.refresh()
    } catch (err) {
      console.error("Failed to leave game:", err)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex items-center justify-center">
          <h1 className="text-4xl font-bold text-white transition-transform duration-300 hover:scale-110">
            Lobby
          </h1>
        </div>

        <Card className="shadow-xl bg-gray-800 border-gray-700 transition-all duration-300 hover:scale-[1.02] hover:border-blue-500 hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl text-white">Game Lobby</CardTitle>
                <CardDescription className="text-gray-300">
                  {game.status === "playing" ? "Game in progress!" : "Waiting for players to join..."}
                </CardDescription>
              </div>
              <Button variant="outline" onClick={copyGameCode} className="gap-2 border-gray-700 bg-gray-700 text-gray-300 hover:bg-blue-600 hover:border-blue-500 hover:text-white hover:scale-110 hover:shadow-[0_0_10px_rgba(59,130,246,0.3)] transition-all duration-300">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {game.code}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Players List */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-white">
                <Users className="h-4 w-4" />
                Players ({players.length}/4)
              </div>
              <div className="grid gap-2">
                {players.map((player) => (
                  <div key={player.id} className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-700 p-3 hover:bg-gray-600 hover:border-blue-500 hover:shadow-[0_0_10px_rgba(59,130,246,0.2)] transition-all duration-300">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/20 font-semibold text-red-500">
                        {player.profile?.display_name?.[0] || "P"}
                      </div>
                      <span className="font-medium text-white">{player.profile?.display_name || "Player"}</span>
                    </div>
                    {player.user_id === game.host_id && (
                      <Badge variant="secondary" className="gap-1 bg-yellow-500/20 text-yellow-500 border-yellow-500/50">
                        <Crown className="h-3 w-3" />
                        Host
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Game Settings (Host Only) */}
            {isHost && (
              <div className="space-y-3 rounded-lg border border-gray-700 bg-gray-700 p-4">
                <h3 className="font-semibold text-white">Game Settings</h3>
                <div className="space-y-2">
                  <Label htmlFor="maxRounds" className="text-gray-300">Number of Rounds</Label>
                  <Input
                    id="maxRounds"
                    type="number"
                    min={1}
                    max={10}
                    value={maxRounds}
                    onChange={async (e) => {
                      const value = Number.parseInt(e.target.value) || 1
                      const clampedValue = Math.max(1, Math.min(10, value))
                      setMaxRounds(clampedValue)
                      try {
                        await supabase.from("games").update({ max_rounds: clampedValue }).eq("id", game.id)
                      } catch (err) {
                        console.error("Failed to update settings:", err)
                      }
                    }}
                    className="w-24 bg-gray-700 border-gray-600 text-white focus-visible:border-blue-500 focus-visible:ring-blue-500/50"
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 justify-center">
              {isHost ? (
                <Button onClick={handleStartGame} disabled={loading || players.length < 2} className="w-auto px-8 bg-blue-600 hover:bg-blue-700 hover:scale-105 hover:shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all duration-300" size="lg">
                  {loading ? "Starting..." : players.length < 2 ? "Need 2+ Players" : "Start Game"}
                </Button>
              ) : (
                <div className="flex-1 rounded-lg border border-gray-700 bg-gray-700 p-4 text-center text-sm text-gray-300 flex items-center justify-center">
                  Waiting for host to start the game...
                </div>
              )}
              <Button onClick={handleLeaveGame} variant="outline" className={`w-auto px-8 bg-red-600 border-red-500 text-white hover:bg-red-700 hover:text-white hover:border-red-600 hover:scale-105 hover:shadow-[0_0_15px_rgba(220,38,38,0.5)] transition-all duration-300 ${!isHost ? 'h-auto py-4' : ''}`} size="lg">
                Leave
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
