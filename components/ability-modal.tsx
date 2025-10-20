"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { Card, GamePlayer } from "@/lib/types"
import GameCard from "@/components/game-card"
import PlayerHand from "@/components/player-hand"
import { getAbilityDescription } from "@/lib/game-logic"

interface AbilityModalProps {
  open: boolean
  onClose: () => void
  card: Card
  players: (GamePlayer & { profile: any })[]
  currentUserId: string
  onAbilityComplete: (data: any) => void
}

export default function AbilityModal({
  open,
  onClose,
  card,
  players,
  currentUserId,
  onAbilityComplete,
}: AbilityModalProps) {
  const [selectedCards, setSelectedCards] = useState<{ playerId: string; cardIndex: number }[]>([])
  const [revealedCards, setRevealedCards] = useState<{ playerId: string; cardIndex: number; card: Card }[]>([])
  const [selectionLocked, setSelectionLocked] = useState(false)

  const abilityType = card.value

  function handleCardSelect(playerId: string, cardIndex: number) {
    // For look abilities (7-10), just reveal the card
    if (abilityType >= 7 && abilityType <= 10) {
      if (selectionLocked) return
      const player = players.find((p) => p.user_id === playerId)
      if (player) {
        const selectedCard = player.current_hand[cardIndex]
        setRevealedCards([{ playerId, cardIndex, card: selectedCard }])
        // Lock further selection changes for look abilities
        setSelectionLocked(true)
      }
      return
    }

    // For swap abilities (11-14)
    const isAlreadySelected = selectedCards.some((s) => s.playerId === playerId && s.cardIndex === cardIndex)

    if (isAlreadySelected) {
      setSelectedCards(selectedCards.filter((s) => !(s.playerId === playerId && s.cardIndex === cardIndex)))
    } else {
      const maxSelections = abilityType === 13 ? 1 : 2
      if (selectedCards.length < maxSelections) {
        setSelectedCards([...selectedCards, { playerId, cardIndex }])

        // For look & swap abilities, reveal the card
        if (abilityType >= 13) {
          const player = players.find((p) => p.user_id === playerId)
          if (player) {
            const selectedCard = player.current_hand[cardIndex]
            setRevealedCards([...revealedCards, { playerId, cardIndex, card: selectedCard }])
          }
        }
      }
    }
  }

  function handleConfirm() {
    if (abilityType >= 7 && abilityType <= 10) {
      // Look abilities - just mark as viewed
      onAbilityComplete({ type: "view", cards: revealedCards })
    } else if (abilityType >= 11 && abilityType <= 14) {
      // Swap abilities
      if (selectedCards.length === 2) {
        onAbilityComplete({ type: "swap", cards: selectedCards })
      } else if (abilityType === 13 && selectedCards.length === 1) {
        // For 13, need to select second card to swap with
        return
      }
    }
    handleClose()
  }

  function handleSkip() {
    onAbilityComplete({ type: "skip" })
    handleClose()
  }

  function handleClose() {
    setSelectedCards([])
    setRevealedCards([])
    setSelectionLocked(false)
    onClose()
  }

  const canConfirm =
    (abilityType >= 7 && abilityType <= 10 && revealedCards.length > 0) ||
    (abilityType === 11 || abilityType === 12 ? selectedCards.length === 2 : false) ||
    (abilityType === 13 ? selectedCards.length === 2 : false) ||
    (abilityType === 14 ? selectedCards.length === 2 : false)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Use Card Ability</DialogTitle>
          <DialogDescription>{getAbilityDescription(card.value)}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Show the ability card */}
          <div className="flex justify-center">
            <GameCard card={card} revealed={true} />
          </div>

          {/* Show revealed cards */}
          {revealedCards.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold">Revealed Cards:</h3>
              <div className="flex gap-4 justify-center">
                {revealedCards.map((rc, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-2">
                    <GameCard card={rc.card} revealed={true} />
                    <span className="text-sm text-muted-foreground">
                      {players.find((p) => p.user_id === rc.playerId)?.profile?.display_name || "Player"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Player selection */}
          <div className="space-y-4">
            <h3 className="font-semibold">
              {abilityType >= 7 && abilityType <= 10
                ? "Select a card to view:"
                : `Select ${abilityType === 13 ? "2 cards to swap" : "2 cards to swap"}:`}
            </h3>
            <div className="grid gap-4">
              {players.map((player) => {
                const isOwnHand = player.user_id === currentUserId
                const canSelectFromThis =
                  (abilityType === 7 || abilityType === 8 ? isOwnHand : true) ||
                  (abilityType === 9 || abilityType === 10 ? !isOwnHand : true)

                if ((abilityType === 7 || abilityType === 8) && !isOwnHand) return null
                if ((abilityType === 9 || abilityType === 10) && isOwnHand) return null

                return (
                  <div key={player.id} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold">
                        {player.profile?.display_name?.[0] || "P"}
                      </div>
                      <span className="text-sm font-medium">{player.profile?.display_name || "Player"}</span>
                    </div>
                    <div>
                      <PlayerHand
                        cards={player.current_hand}
                        isOpponent={!isOwnHand}
                        onCardClick={canSelectFromThis && !selectionLocked ? (idx) => handleCardSelect(player.user_id, idx) : undefined}
                        compact
                        forceRevealIndices={player.current_hand.map((_, idx) => (
                          revealedCards.some((r) => r.playerId === player.user_id && r.cardIndex === idx) ? idx : -1
                        )).filter((v) => v !== -1)}
                        highlightIndices={player.current_hand.map((_, idx) => (
                          selectedCards.some((s) => s.playerId === player.user_id && s.cardIndex === idx) ? idx : -1
                        )).filter((v) => v !== -1)}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={handleSkip}>
              Skip Ability
            </Button>
            <Button onClick={handleConfirm} disabled={!canConfirm}>
              Confirm
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
