"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { GamePlayer } from "@/lib/types"
import { Trophy, Crown } from "lucide-react"
import { calculateHandScore, checkSpecialScoring } from "@/lib/game-logic"

interface RoundEndModalProps {
  open: boolean
  players: (GamePlayer & { profile: any; roundScore: number })[]
  kombioCallerId: string | null
  currentRound: number
  maxRounds: number
  onNextRound: () => void
  onEndGame: () => void
}

export default function RoundEndModal({
  open,
  players,
  kombioCallerId,
  currentRound,
  maxRounds,
  onNextRound,
  onEndGame,
}: RoundEndModalProps) {
  const kombioCaller = players.find((p) => p.user_id === kombioCallerId)
  const lowestScore = Math.min(...players.map((p) => p.roundScore))
  const kombioCallerScore = kombioCaller?.roundScore ?? Number.POSITIVE_INFINITY
  const kombioSuccess = kombioCallerId && kombioCallerScore <= lowestScore

  const sortedPlayers = [...players].sort((a, b) => a.total_score - b.total_score)
  const isLastRound = currentRound >= maxRounds

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Round {currentRound} Complete!</DialogTitle>
          <DialogDescription>
            {isLastRound ? "Final scores are in!" : `${maxRounds - currentRound} rounds remaining`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* KOMBIO Result */}
          {kombioCallerId && (
            <div
              className={`rounded-lg border-2 p-4 ${kombioSuccess ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">KOMBIO Called by {kombioCaller?.profile?.display_name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {kombioSuccess ? "Success! Lowest score achieved" : "Failed! Someone tied or beat the caller"}
                  </p>
                </div>
                <Badge variant={kombioSuccess ? "default" : "destructive"} className="text-lg px-4 py-2">
                  {kombioSuccess ? "+0" : "+15"}
                </Badge>
              </div>
            </div>
          )}

          {/* Round Scores */}
          <div className="space-y-3">
            <h3 className="font-semibold">Round Scores:</h3>
            <div className="space-y-2">
              {players.map((player) => {
                const isKombioCaller = player.user_id === kombioCallerId
                const hasLowestScore = player.roundScore === lowestScore && !isKombioCaller
                const specialScore = checkSpecialScoring(player.current_hand)

                return (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between rounded-lg border p-3 ${
                      isKombioCaller && !kombioSuccess ? "bg-red-50" : hasLowestScore ? "bg-yellow-50" : "bg-card"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                        {player.profile?.display_name?.[0] || "P"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{player.profile?.display_name || "Player"}</span>
                          {isKombioCaller && <Badge variant="secondary">KOMBIO Caller</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Hand: {calculateHandScore(player.current_hand)}
                          {specialScore && ` (Special: ${specialScore})`}
                          {isKombioCaller && !kombioSuccess && " +15 penalty"}
                          {hasLowestScore && kombioCallerId && " +10 penalty"}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{player.roundScore}</div>
                      <div className="text-xs text-muted-foreground">Total: {player.total_score}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Overall Standings */}
          {isLastRound && (
            <div className="space-y-3">
              <h3 className="font-semibold">Final Standings:</h3>
              <div className="space-y-2">
                {sortedPlayers.map((player, index) => (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between rounded-lg border p-3 ${
                      index === 0 ? "bg-yellow-50 border-yellow-500" : "bg-card"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                        {index + 1}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{player.profile?.display_name || "Player"}</span>
                        {index === 0 && <Crown className="h-5 w-5 text-yellow-500" />}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">{player.total_score}</span>
                      {index === 0 && <Trophy className="h-6 w-6 text-yellow-500" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            {isLastRound ? (
              <Button onClick={onEndGame} size="lg" className="w-full">
                Return to Home
              </Button>
            ) : (
              <Button onClick={onNextRound} size="lg" className="w-full">
                Start Next Round
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
