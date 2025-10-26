"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { Game, GamePlayer, Card as CardType } from "@/lib/types"
import { Crown, Eye, Shuffle, ArrowLeft, Zap } from "lucide-react"
import GameCard from "@/components/game-card"
import PlayerHand from "@/components/player-hand"
import AbilityModal from "@/components/ability-modal"
import RoundEndModal from "@/components/round-end-modal"
import {
  canUseAbility,
  getNextPlayerId,
  isCardMatch,
  calculateHandScore,
  checkSpecialScoring,
  createDeck,
  dealInitialHands,
} from "@/lib/game-logic"
import { toast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"

interface GameClientProps {
  game: Game
  players: (GamePlayer & { profile: any })[]
  currentUserId: string
}

export default function GameClient({ game: initialGame, players: initialPlayers, currentUserId }: GameClientProps) {
  const [game, setGame] = useState(initialGame)
  const [players, setPlayers] = useState(initialPlayers)
  const [drawnCard, setDrawnCard] = useState<CardType | null>(null)
  const [showAbilityModal, setShowAbilityModal] = useState(false)
  const [showRoundEndModal, setShowRoundEndModal] = useState(false)
  const [roundScores, setRoundScores] = useState<(GamePlayer & { profile: any; roundScore: number })[]>([])
  const [matchingMode, setMatchingMode] = useState(false)
  // Initial peek state for bottom two cards at the start of each round
  const [peekActive, setPeekActive] = useState(false)
  const [peekAllowed, setPeekAllowed] = useState(false)
  const [peekRevealedIndices, setPeekRevealedIndices] = useState<number[]>([])
  const [peekCountdown, setPeekCountdown] = useState<number>(0)
  const [lastPeekRound, setLastPeekRound] = useState<number | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const currentPlayer = players.find((p) => p.user_id === currentUserId)
  const isMyTurn = game.current_turn_player_id === currentUserId
  const currentTurnPlayer = players.find((p) => p.user_id === game.current_turn_player_id)
  const isKombioLocked = !!(game.kombio_caller_id && game.kombio_caller_id !== currentUserId && players.length > 2)

  useEffect(() => {
    // Subscribe to game updates
    const gameChannel = supabase
      .channel(`game:${game.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "games", filter: `id=eq.${game.id}` },
        (payload) => {
          console.log("Game state updated:", payload)
          const newGame = payload.new as Game
          setGame(newGame)

          // Check if game finished
          if (newGame.status === "finished") {
            router.push("/")
            router.refresh()
          }
        },
      )
      .subscribe()

    // Subscribe to player updates
    const playersChannel = supabase
      .channel(`players:${game.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_players", filter: `game_id=eq.${game.id}` },
        async (payload) => {
          console.log("Player state updated:", payload)
          // Refetch players (using the same simplified query pattern)
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
            console.log("Updated players:", playersWithProfiles)
            setPlayers(playersWithProfiles)
            
            // If a player left during the game, redirect everyone to home
            if (payload.eventType === "DELETE" && game.status === "playing" && data.length < players.length) {
              console.log("Player left during game, redirecting to home")
              router.push("/")
              router.refresh()
            }
          }
        },
      )
      .subscribe()

    // Polling as backup - check for updates every 2 seconds
    const pollInterval = setInterval(async () => {
      const { data: latestGame } = await supabase
        .from("games")
        .select("*")
        .eq("id", game.id)
        .single()
      
      if (latestGame && JSON.stringify(latestGame) !== JSON.stringify(game)) {
        console.log("Game - Polling detected game change")
        setGame(latestGame as Game)
      }

      // Also check for player updates
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
        
        if (JSON.stringify(playersWithProfiles) !== JSON.stringify(players)) {
          console.log("Game - Polling detected players change")
          setPlayers(playersWithProfiles)
          
          // If player count decreased during gameplay, redirect to home
          if (latestPlayers.length < players.length && game.status === "playing") {
            console.log("Player left during game (polling detected), redirecting to home")
            router.push("/")
            router.refresh()
          }
        }
      }
    }, 2000)

    return () => {
      gameChannel.unsubscribe()
      playersChannel.unsubscribe()
      clearInterval(pollInterval)
    }
  }, [game, game.id, players, router, supabase])

  useEffect(() => {
    if (game.kombio_caller_id && game.current_turn_player_id === game.kombio_caller_id) {
      // Round is over - all players have had their final turn
      handleRoundEnd()
    }
  }, [game.kombio_caller_id, game.current_turn_player_id])

  // Allow a one-time peek per round for the current user (timer starts on first click)
  useEffect(() => {
    // Only for the local user and only once per round
    if (!currentPlayer) return
    if (lastPeekRound === game.current_round) return

    // Enable peek for this round; timer will start on first bottom-card click
    setPeekAllowed(true)
    setPeekActive(false)
    setPeekRevealedIndices([])
    setPeekCountdown(0)
    setLastPeekRound(game.current_round)
  }, [game.current_round, currentPlayer, lastPeekRound])

  // Manage active countdown while peeking
  useEffect(() => {
    if (!peekActive) return
    const interval = setInterval(() => {
      setPeekCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          // End peek: hide cards and disallow further peeks this round
          setPeekActive(false)
          setPeekAllowed(false)
          setPeekRevealedIndices([])
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [peekActive])

  async function handleDrawFromDeck() {
    if (!isMyTurn || drawnCard || isKombioLocked) return

    try {
      const deck = [...game.deck]
      const card = deck.pop()

      if (!card) return

      setDrawnCard(card)

      await supabase.from("games").update({ deck }).eq("id", game.id)
    } catch (err) {
      console.error("Failed to draw card:", err)
    }
  }

  async function handleDrawFromDiscard() {
    if (!isMyTurn || drawnCard || !game.last_discarded_card || isKombioLocked) return

    try {
      const card = game.last_discarded_card
      setDrawnCard(card)

      const discardPile = [...game.discard_pile]
      discardPile.pop()

      await supabase.from("games").update({ discard_pile: discardPile, last_discarded_card: null }).eq("id", game.id)
    } catch (err) {
      console.error("Failed to draw from discard:", err)
    }
  }

  async function handleSwapCard(handCardIndex: number) {
    if (!drawnCard || !currentPlayer) return

    try {
      const hand = [...currentPlayer.current_hand]
      const swappedCard = hand[handCardIndex]
      hand[handCardIndex] = drawnCard

      const discardPile = [...game.discard_pile, swappedCard]

      await supabase.from("game_players").update({ current_hand: hand }).eq("id", currentPlayer.id)

      const nextPlayerId = getNextPlayerId(players, currentUserId)

      await supabase
        .from("games")
        .update({
          discard_pile: discardPile,
          last_discarded_card: swappedCard,
          current_turn_player_id: nextPlayerId,
        })
        .eq("id", game.id)

      setDrawnCard(null)
    } catch (err) {
      console.error("Failed to swap card:", err)
    }
  }

  async function handleDiscardDrawnCard() {
    if (!drawnCard) return

    if (canUseAbility(drawnCard.value)) {
      setShowAbilityModal(true)
    } else {
      await finishDiscard()
    }
  }

  async function finishDiscard() {
    if (!drawnCard) return

    try {
      const discardPile = [...game.discard_pile, drawnCard]
      const nextPlayerId = getNextPlayerId(players, currentUserId)

      await supabase
        .from("games")
        .update({
          discard_pile: discardPile,
          last_discarded_card: drawnCard,
          current_turn_player_id: nextPlayerId,
        })
        .eq("id", game.id)

      setDrawnCard(null)
    } catch (err) {
      console.error("Failed to discard card:", err)
    }
  }

  async function handleAbilityComplete(data: any) {
    if (data.type === "view" && currentPlayer) {
      // Do not persist reveals for own cards; they should remain face down after peeking
      // This intentionally avoids updating viewed_cards for self views
      // If in future we support persisting opponent reveals, handle that separately
    } else if (data.type === "swap") {
      const [card1, card2] = data.cards
      const player1 = players.find((p) => p.user_id === card1.playerId)
      const player2 = players.find((p) => p.user_id === card2.playerId)

      if (player1 && player2) {
        const hand1 = [...player1.current_hand]
        const hand2 = [...player2.current_hand]

        const temp = hand1[card1.cardIndex]
        hand1[card1.cardIndex] = hand2[card2.cardIndex]
        hand2[card2.cardIndex] = temp

        await supabase.from("game_players").update({ current_hand: hand1 }).eq("id", player1.id)

        if (player1.id !== player2.id) {
          await supabase.from("game_players").update({ current_hand: hand2 }).eq("id", player2.id)
        }
      }
    }

    await finishDiscard()
  }

  async function handleAttemptMatch(targetPlayerId: string, cardIndex: number) {
    if (!game.last_discarded_card || !currentPlayer) return

    try {
      const targetPlayer = players.find((p) => p.user_id === targetPlayerId)
      if (!targetPlayer) return

      const targetCard = targetPlayer.current_hand[cardIndex]
      const isMatch = isCardMatch(targetCard, game.last_discarded_card)

      if (isMatch) {
        const discardPile = [...game.discard_pile, targetCard]
        const targetHand = [...targetPlayer.current_hand]
        targetHand.splice(cardIndex, 1)

        await supabase.from("game_players").update({ current_hand: targetHand }).eq("id", targetPlayer.id)

        await supabase
          .from("games")
          .update({
            discard_pile: discardPile,
            last_discarded_card: targetCard,
          })
          .eq("id", game.id)

        toast({
          title: "Match successful!",
          description: "Card matched and removed",
        })

        // Check if player has no cards left - auto KOMBIO
        if (targetHand.length === 0 && !game.kombio_caller_id) {
          await handleCallKombio()
        }
      } else {
        const deck = [...game.deck]
        const penaltyCard = deck.pop()

        if (penaltyCard) {
          const targetHand = [...targetPlayer.current_hand, penaltyCard]
          await supabase.from("game_players").update({ current_hand: targetHand }).eq("id", targetPlayer.id)
          await supabase.from("games").update({ deck }).eq("id", game.id)
        }

        toast({
          title: "Match failed!",
          description: "Penalty card added",
          variant: "destructive",
        })
      }
    } catch (err) {
      console.error("Failed to attempt match:", err)
    }

    setMatchingMode(false)
  }

  async function handleCallKombio() {
    if (isKombioLocked) return

    try {
      await supabase
        .from("games")
        .update({
          kombio_caller_id: currentUserId,
        })
        .eq("id", game.id)

      const nextPlayerId = getNextPlayerId(players, currentUserId)
      await supabase.from("games").update({ current_turn_player_id: nextPlayerId }).eq("id", game.id)

      toast({
        title: "KOMBIO Called!",
        description: "All players get one more turn",
      })
    } catch (err) {
      console.error("Failed to call KOMBIO:", err)
    }
  }

  async function handleRoundEnd() {
    try {
      const scoredPlayers = players.map((player) => {
        const specialScore = checkSpecialScoring(player.current_hand)
        let roundScore = specialScore ?? calculateHandScore(player.current_hand)

        // Apply KOMBIO penalties
        if (game.kombio_caller_id) {
          const kombioCaller = players.find((p) => p.user_id === game.kombio_caller_id)
          const kombioCallerScore =
            checkSpecialScoring(kombioCaller?.current_hand || []) ??
            calculateHandScore(kombioCaller?.current_hand || [])
          const lowestScore = Math.min(
            ...players.map((p) => checkSpecialScoring(p.current_hand) ?? calculateHandScore(p.current_hand)),
          )

          if (player.user_id === game.kombio_caller_id) {
            // Caller gets +15 if they didn't have lowest score
            if (kombioCallerScore > lowestScore) {
              roundScore += 15
            }
          } else {
            // Others get +10 if caller had lowest score
            if (kombioCallerScore <= lowestScore) {
              roundScore += 10
            }
          }
        }

        return {
          ...player,
          roundScore,
        }
      })

      setRoundScores(scoredPlayers)
      setShowRoundEndModal(true)

      // Update total scores
      for (const player of scoredPlayers) {
        await supabase
          .from("game_players")
          .update({ total_score: player.total_score + player.roundScore })
          .eq("id", player.id)
      }
    } catch (err) {
      console.error("Failed to end round:", err)
    }
  }

  async function handleNextRound() {
    try {
      const deck = createDeck()
      const { hands, remainingDeck } = dealInitialHands(deck, players.length)

      // Update game state
      await supabase
        .from("games")
        .update({
          current_round: game.current_round + 1,
          deck: remainingDeck,
          discard_pile: [],
          last_discarded_card: null,
          kombio_caller_id: null,
          current_turn_player_id: players[0].user_id,
        })
        .eq("id", game.id)

      // Deal new hands
      for (let i = 0; i < players.length; i++) {
        await supabase
          .from("game_players")
          .update({
            current_hand: hands[i],
            viewed_cards: [],
          })
          .eq("id", players[i].id)
      }

      setShowRoundEndModal(false)
    } catch (err) {
      console.error("Failed to start next round:", err)
    }
  }

  async function handleEndGame() {
    try {
      await supabase.from("games").update({ status: "finished" }).eq("id", game.id)
      router.push("/")
      router.refresh()
    } catch (err) {
      console.error("Failed to end game:", err)
    }
  }

  async function handleLeaveGame() {
    try {
      // Remove current player from the game
      await supabase.from("game_players").delete().eq("game_id", game.id).eq("user_id", currentUserId)
      // Redirect to home
      router.push("/")
      router.refresh()
    } catch (err) {
      console.error("Failed to leave game:", err)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-emerald-900 via-teal-800 to-cyan-900 p-4">
      <Toaster />
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <Button variant="ghost" onClick={handleLeaveGame} className="gap-2 text-white hover:bg-white/10">
          <ArrowLeft className="h-4 w-4" />
          Leave Game
        </Button>
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="text-base px-4 py-2">
            Round {game.current_round}/{game.max_rounds}
          </Badge>
          <Badge variant="secondary" className="text-base px-4 py-2">
            {game.code}
          </Badge>
          {game.kombio_caller_id && (
            <Badge variant="destructive" className="text-base px-4 py-2">
              KOMBIO!
            </Badge>
          )}
        </div>
      </div>

      {/* Main Game Area */}
      <div className="flex flex-1 items-center justify-center relative">
        {/* Left Side Players (3rd player) */}
        <div className="absolute left-1/3 flex flex-col gap-6">
          {players
            .filter((p) => p.user_id !== currentUserId)
            .slice(1, 2)
            .map((player) => (
              <div key={player.id} className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm font-semibold text-white">
                    {player.profile?.display_name?.[0] || "P"}
                  </div>
                  <span className="text-sm font-medium text-white">{player.profile?.display_name || "Player"}</span>
                  {player.user_id === game.host_id && <Crown className="h-4 w-4 text-yellow-400" />}
                  {player.user_id === game.current_turn_player_id && (
                    <Badge variant="secondary" className="text-xs">
                      Turn
                    </Badge>
                  )}
                </div>
                <PlayerHand
                  cards={player.current_hand}
                  isOpponent={player.user_id !== currentUserId}
                  onCardClick={(idx) => {
                    if (matchingMode) return handleAttemptMatch(player.user_id, idx)
                    // Allow peeking at own cards for all players
                    if (player.user_id === currentUserId) {
                      const bottomIndices = [2, 3].filter((i) => i < player.current_hand.length)
                      if (peekAllowed && bottomIndices.includes(idx)) {
                        setPeekRevealedIndices((prev) => (prev.includes(idx) ? prev : [...prev, idx]))
                        if (!peekActive) {
                          setPeekActive(true)
                          setPeekCountdown(10)
                        }
                      }
                    }
                  }}
                  viewedCards={player.viewed_cards}
                  forceRevealIndices={player.user_id === currentUserId ? peekRevealedIndices : undefined}
                />
                <div className="text-xs text-white/70">Score: {player.total_score}</div>
              </div>
            ))}
        </div>

        {/* Center Area - Deck/Discard Centered */}
        <div className="flex flex-col items-center gap-8">
          {/* Top Opponent Hand (2nd player) */}
          {players.filter((p) => p.user_id !== currentUserId).slice(0, 1).map((player) => (
            <div key={player.id} className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm font-semibold text-white">
                  {player.profile?.display_name?.[0] || "P"}
                </div>
                <span className="text-sm font-medium text-white">{player.profile?.display_name || "Player"}</span>
                {player.user_id === game.host_id && <Crown className="h-4 w-4 text-yellow-400" />}
                {player.user_id === game.current_turn_player_id && (
                  <Badge variant="secondary" className="text-xs">
                    Turn
                  </Badge>
                )}
              </div>
              <PlayerHand
                cards={player.current_hand}
                isOpponent={true}
                onCardClick={matchingMode ? (idx) => handleAttemptMatch(player.user_id, idx) : undefined}
              />
              <div className="text-xs text-white/70">Score: {player.total_score}</div>
            </div>
          ))}

          {/* Center Area - Deck and Discard */}
          <div className="flex items-center gap-8">
            <div className="flex flex-col items-center gap-2">
              <Button
                onClick={handleDrawFromDeck}
                disabled={!isMyTurn || !!drawnCard || game.deck.length === 0 || isKombioLocked}
                className="h-32 w-24 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
              >
                <div className="flex flex-col items-center gap-1">
                  <Shuffle className="h-6 w-6" />
                  <span className="text-xs">Draw</span>
                  <span className="text-xs">({game.deck.length})</span>
                </div>
              </Button>
              <span className="text-xs text-white/70">Deck</span>
            </div>

            {drawnCard && (
              <div className="flex flex-col items-center gap-2">
                <GameCard card={drawnCard} revealed={true} />
                <div className="flex gap-2">
                  <Button onClick={handleDiscardDrawnCard} variant="secondary" size="sm">
                    {canUseAbility(drawnCard.value) ? (
                      <>
                        <Zap className="h-3 w-3 mr-1" />
                        Use Ability
                      </>
                    ) : (
                      "Discard"
                    )}
                  </Button>
                </div>
              </div>
            )}

            <div className="flex flex-col items-center gap-2">
              <Button
                onClick={handleDrawFromDiscard}
                disabled={!isMyTurn || !!drawnCard || !game.last_discarded_card || isKombioLocked}
                className="h-32 w-24 rounded-xl bg-gray-700 hover:bg-gray-600 disabled:opacity-50"
              >
                {game.last_discarded_card ? (
                  <GameCard card={game.last_discarded_card} revealed={true} compact />
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <Eye className="h-6 w-6" />
                    <span className="text-xs">Empty</span>
                  </div>
                )}
              </Button>
              <span className="text-xs text-white/70">Discard ({game.discard_pile.length})</span>
              {game.last_discarded_card && !drawnCard && (
                <Button
                  onClick={() => setMatchingMode(!matchingMode)}
                  variant={matchingMode ? "destructive" : "secondary"}
                  size="sm"
                >
                  {matchingMode ? "Cancel Match" : "Try Match"}
                </Button>
              )}
            </div>
          </div>

          {/* Current Player Hand */}
          {currentPlayer && (
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 font-semibold text-white">
                  {currentPlayer.profile?.display_name?.[0] || "P"}
                </div>
                <span className="font-medium text-white">{currentPlayer.profile?.display_name || "You"}</span>
                {isMyTurn && (
                  <Badge variant="default" className="bg-green-500">
                    Your Turn
                  </Badge>
                )}
              </div>
              <PlayerHand
                cards={currentPlayer.current_hand}
                isOpponent={false}
                onCardClick={(idx) => {
                  // During peek window, allow clicking only bottom two cards to reveal temporarily
                  const bottomIndices = [2, 3].filter((i) => i < currentPlayer.current_hand.length)
                  if (peekAllowed && bottomIndices.includes(idx)) {
                    // Start countdown on first click
                    setPeekRevealedIndices((prev) => (prev.includes(idx) ? prev : [...prev, idx]))
                    if (!peekActive) {
                      setPeekActive(true)
                      setPeekCountdown(10)
                    }
                    return
                  }
                  if (drawnCard) return handleSwapCard(idx)
                  if (matchingMode) return handleAttemptMatch(currentUserId, idx)
                }}
                viewedCards={currentPlayer.viewed_cards}
                forceRevealIndices={peekRevealedIndices}
                compact={false}
              />
              {peekActive && (
                <div className="text-xs text-white/90">Hiding in {peekCountdown}s</div>
              )}
              <div className="flex items-center gap-4">
                <div className="text-sm text-white/90">Score: {currentPlayer.total_score}</div>
                {isMyTurn && !isKombioLocked && !game.kombio_caller_id && (
                  <Button onClick={handleCallKombio} variant="outline" size="sm" className="gap-2 bg-transparent">
                    <Zap className="h-4 w-4" />
                    Call KOMBIO
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Side Players (4th player) */}
        <div className="absolute right-1/3 flex flex-col gap-6">
          {players
            .filter((p) => p.user_id !== currentUserId)
            .slice(2)
            .map((player) => (
              <div key={player.id} className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm font-semibold text-white">
                    {player.profile?.display_name?.[0] || "P"}
                  </div>
                  <span className="text-sm font-medium text-white">{player.profile?.display_name || "Player"}</span>
                  {player.user_id === game.host_id && <Crown className="h-4 w-4 text-yellow-400" />}
                  {player.user_id === game.current_turn_player_id && (
                    <Badge variant="secondary" className="text-xs">
                      Turn
                    </Badge>
                  )}
                </div>
                <PlayerHand
                  cards={player.current_hand}
                  isOpponent={player.user_id !== currentUserId}
                  onCardClick={(idx) => {
                    if (matchingMode) return handleAttemptMatch(player.user_id, idx)
                    // Allow peeking at own cards for all players
                    if (player.user_id === currentUserId) {
                      const bottomIndices = [2, 3].filter((i) => i < player.current_hand.length)
                      if (peekAllowed && bottomIndices.includes(idx)) {
                        setPeekRevealedIndices((prev) => (prev.includes(idx) ? prev : [...prev, idx]))
                        if (!peekActive) {
                          setPeekActive(true)
                          setPeekCountdown(10)
                        }
                      }
                    }
                  }}
                  viewedCards={player.viewed_cards}
                  forceRevealIndices={player.user_id === currentUserId ? peekRevealedIndices : undefined}
                />
                <div className="text-xs text-white/70">Score: {player.total_score}</div>
              </div>
            ))}
        </div>
      </div>

      {!isMyTurn && currentTurnPlayer && (
        <div className="rounded-lg bg-white/10 px-6 py-3 text-center text-white backdrop-blur-sm">
          Waiting for {currentTurnPlayer.profile?.display_name || "player"}'s turn...
        </div>
      )}

      {matchingMode && (
        <div className="rounded-lg bg-yellow-500/20 border-2 border-yellow-500 px-6 py-3 text-center text-white backdrop-blur-sm">
          Click a card to attempt a match with the last discarded card!
        </div>
      )}

      {drawnCard && (
        <AbilityModal
          open={showAbilityModal}
          onClose={() => setShowAbilityModal(false)}
          card={drawnCard}
          players={players}
          currentUserId={currentUserId}
          onAbilityComplete={handleAbilityComplete}
        />
      )}

      <RoundEndModal
        open={showRoundEndModal}
        players={roundScores}
        kombioCallerId={game.kombio_caller_id}
        currentRound={game.current_round}
        maxRounds={game.max_rounds}
        onNextRound={handleNextRound}
        onEndGame={handleEndGame}
      />
    </div>
  )
}
