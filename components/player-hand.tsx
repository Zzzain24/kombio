"use client"

import type { Card as CardType } from "@/lib/types"
import GameCard from "@/components/game-card"
import { cn } from "@/lib/utils"

interface PlayerHandProps {
  cards: CardType[]
  isOpponent: boolean
  onCardClick?: (index: number) => void
  viewedCards?: string[]
}

export default function PlayerHand({ cards, isOpponent, onCardClick, viewedCards = [] }: PlayerHandProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((card, index) => {
        const hasBeenViewed = viewedCards.includes(card.id)
        return (
          <div key={card.id} className="relative">
            <GameCard
              card={card}
              revealed={!isOpponent && hasBeenViewed}
              onClick={onCardClick ? () => onCardClick(index) : undefined}
              className={cn(onCardClick && "ring-2 ring-yellow-400 ring-offset-2")}
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
