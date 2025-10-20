"use client"

import type { Card as CardType } from "@/lib/types"
import GameCard from "@/components/game-card"
import { cn } from "@/lib/utils"

interface PlayerHandProps {
  cards: CardType[]
  isOpponent: boolean
  onCardClick?: (index: number) => void
  viewedCards?: string[]
  compact?: boolean
  forceRevealIndices?: number[]
  highlightIndices?: number[]
}

export default function PlayerHand({ cards, isOpponent, onCardClick, viewedCards = [], compact, forceRevealIndices, highlightIndices }: PlayerHandProps) {
  return (
    <div className="grid grid-cols-2 gap-3 justify-items-center w-fit mx-auto">
      {cards.map((card, index) => {
        const hasBeenViewed = viewedCards.includes(card.id)
        const isForcedReveal = forceRevealIndices?.includes(index) ?? false
        const isHighlighted = highlightIndices?.includes(index) ?? false
        return (
          <div key={card.id} className="relative">
            <GameCard
              card={card}
              revealed={!isOpponent && hasBeenViewed || isForcedReveal}
              onClick={onCardClick ? () => onCardClick(index) : undefined}
              compact={compact}
              className={cn(
                onCardClick && "ring-2 ring-yellow-400",
                isHighlighted && "ring-2 ring-primary"
              )}
            />
            {!isOpponent && hasBeenViewed && (
              <div className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">
                ✓
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
