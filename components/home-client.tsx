"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Profile } from "@/lib/types"
import { Spade, LogOut, Check, Copy } from "lucide-react"

interface HomeClientProps {
  profile: Profile | null
}

export default function HomeClient({ profile }: HomeClientProps) {
  const [gameCode, setGameCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [createdGame, setCreatedGame] = useState<any>(null)
  const router = useRouter()
  const supabase = createClient()

  async function handleCreateGame() {
    setError("")
    setLoading(true)

    try {
      // Check if profile exists
      if (!profile?.id) {
        throw new Error("Profile not found. Please refresh the page and try again.")
      }

      // Generate a 6-character game code
      const code = Math.random().toString(36).substring(2, 8).toUpperCase()

      console.log("Creating game with:", { code, host_id: profile.id, status: "lobby" })

      const { data: game, error: gameError } = await supabase
        .from("games")
        .insert({
          code,
          host_id: profile.id,
          status: "lobby",
        })
        .select()
        .single()

      if (gameError) {
        console.error("Game creation error:", gameError)
        throw gameError
      }

      // Add host as first player
      const { error: playerError } = await supabase.from("game_players").insert({
        game_id: game.id,
        user_id: profile.id,
        player_order: 0,
      })

      if (playerError) {
        console.error("Player creation error:", playerError)
        throw playerError
      }

      console.log("Game created successfully:", game)
      
      // Show the created game info instead of redirecting
      setCreatedGame(game)
    } catch (err: any) {
      console.error("Game creation failed:", err)
      setError(err.message || "Failed to create game")
    } finally {
      setLoading(false)
    }
  }

  async function handleJoinGame() {
    setError("")
    setLoading(true)

    try {
      // Check if profile exists
      if (!profile?.id) {
        throw new Error("Profile not found. Please refresh the page and try again.")
      }

      console.log("Trying to join game with code:", gameCode.toUpperCase())
      console.log("User profile:", { id: profile.id, display_name: profile.display_name })
      
      // Find game by code
      const { data: game, error: gameError } = await supabase
        .from("games")
        .select("*")
        .eq("code", gameCode.toUpperCase())
        .eq("status", "lobby")
        .single()

      console.log("Game search result:", { game, gameError })

      if (gameError) {
        console.error("Game search error:", gameError)
        throw new Error("Game not found or already started")
      }

      // Check if already in game
      const { data: existingPlayer, error: existingPlayerError } = await supabase
        .from("game_players")
        .select("*")
        .eq("game_id", game.id)
        .eq("user_id", profile.id)
        .single()

      console.log("Existing player check:", { existingPlayer, existingPlayerError })

      if (existingPlayer) {
        console.log("User already in game, redirecting to lobby")
        router.push(`/lobby/${game.id}`)
        router.refresh()
        return
      }

      // Get current player count
      const { count, error: countError } = await supabase
        .from("game_players")
        .select("*", { count: "exact", head: true })
        .eq("game_id", game.id)

      console.log("Player count result:", { count, countError })

      if ((count || 0) >= 4) {
        throw new Error("Game is full (max 4 players)")
      }

      console.log("Adding player to game:", { game_id: game.id, user_id: profile.id, player_order: count || 0 })

      // Add player to game
      const { error: playerError } = await supabase.from("game_players").insert({
        game_id: game.id,
        user_id: profile.id,
        player_order: count || 0,
      })

      console.log("Player insertion result:", { playerError })

      if (playerError) {
        console.error("Player insertion error:", playerError)
        throw playerError
      }

      router.push(`/lobby/${game.id}`)
      router.refresh()
    } catch (err: any) {
      setError(err.message || "Failed to join game")
    } finally {
      setLoading(false)
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push("/auth/login")
    router.refresh()
  }

  // Function to copy game code
  async function copyGameCode() {
    if (createdGame?.code) {
      await navigator.clipboard.writeText(createdGame.code)
      // You could add a toast notification here
    }
  }

  // Function to go to lobby
  function goToLobby() {
    if (createdGame?.id) {
      router.push(`/lobby/${createdGame.id}`)
      router.refresh()
    }
  }

  // Function to create another game
  function createAnotherGame() {
    setCreatedGame(null)
    setError("")
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="mb-8 text-center">
        <div className="mb-4 flex items-center justify-center gap-3">
          <Spade className="h-12 w-12 text-indigo-600" />
          <h1 className="text-5xl font-bold text-indigo-900">KOMBIO</h1>
        </div>
        <p className="text-lg text-indigo-700">The Ultimate Card Matching Game</p>
      </div>

      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Welcome, {profile?.display_name}!</CardTitle>
              <CardDescription>
                {createdGame ? "Game created successfully!" : "Create or join a game to start playing"}
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {createdGame ? (
            // Show game created success UI
            <div className="space-y-6">
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mx-auto">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Game Created!</h3>
                  <p className="text-sm text-gray-600">Share this code with your friends</p>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-600 mb-2">Game Code</p>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-3xl font-bold text-indigo-600 tracking-wider">{createdGame.code}</span>
                  <Button variant="outline" size="sm" onClick={copyGameCode}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-3">
                <Button onClick={goToLobby} className="w-full" size="lg">
                  Go to Lobby
                </Button>
                <Button onClick={createAnotherGame} variant="outline" className="w-full">
                  Create Another Game
                </Button>
              </div>
            </div>
          ) : (
            // Show normal create/join UI
            <>
              <Tabs defaultValue="create" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="create">Create Game</TabsTrigger>
                  <TabsTrigger value="join">Join Game</TabsTrigger>
                </TabsList>
                <TabsContent value="create" className="space-y-4">
                  <p className="text-sm text-muted-foreground">Start a new game and invite your friends</p>
                  <Button onClick={handleCreateGame} disabled={loading} className="w-full" size="lg">
                    {loading ? "Creating..." : "Create New Game"}
                  </Button>
                </TabsContent>
                <TabsContent value="join" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="gameCode">Game Code</Label>
                    <Input
                      id="gameCode"
                      placeholder="Enter 6-character code"
                      value={gameCode}
                      onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                      maxLength={6}
                      disabled={loading}
                      className="uppercase"
                    />
                  </div>
                  <Button onClick={handleJoinGame} disabled={loading || gameCode.length !== 6} className="w-full" size="lg">
                    {loading ? "Joining..." : "Join Game"}
                  </Button>
                </TabsContent>
              </Tabs>
              {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
            </>
          )}
        </CardContent>
      </Card>

      <div className="mt-8 text-center">
        <Button variant="link" onClick={() => router.push("/rules")} className="text-indigo-600">
          View Game Rules
        </Button>
      </div>
    </div>
  )
}
