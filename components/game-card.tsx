"use client"

import { Card } from "@/components/ui/card"
import type { Card as CardType } from "@/lib/types"
import { cn } from "@/lib/utils"

interface GameCardProps {
  card: CardType
  revealed?: boolean
  compact?: boolean
  onClick?: () => void
  className?: string
}

export default function GameCard({ card, revealed = false, compact = false, onClick, className }: GameCardProps) {
  const getCardColor = (suit?: string) => {
    if (suit === "hearts" || suit === "diamonds") return "text-red-600"
    return "text-gray-900"
  }

  const getSuitSymbol = (suit?: string) => {
    switch (suit) {
      case "hearts":
        return "♥"
      case "diamonds":
        return "♦"
      case "clubs":
        return "♣"
      case "spades":
        return "♠"
      default:
        return ""
    }
  }

  const getCardLabel = (value: number) => {
    if (value === 0) return "★"
    if (value === 11) return "J"
    if (value === 12) return "Q"
    if (value === 13) return "K"
    if (value === 14) return "A"
    return value.toString()
  }

  if (!revealed) {
    return (
      <Card
        className={cn(
          "flex items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg",
          compact ? "h-20 w-14" : "h-32 w-24",
          onClick && "cursor-pointer hover:scale-105 transition-transform",
          className,
        )}
        onClick={onClick}
      >
        <div className="text-2xl font-bold">K</div>
      </Card>
    )
  }

  return (
    <Card
      className={cn(
        "flex flex-col items-center justify-center bg-white shadow-lg",
        compact ? "h-20 w-14" : "h-32 w-24",
        onClick && "cursor-pointer hover:scale-105 transition-transform",
        className,
      )}
      onClick={onClick}
    >
      <div className={cn("text-3xl font-bold", getCardColor(card.suit))}>{getCardLabel(card.value)}</div>
      <div className={cn("text-2xl", getCardColor(card.suit))}>{getSuitSymbol(card.suit)}</div>
      {card.value >= 7 && (
        <div className="mt-1 text-xs text-gray-500 text-center px-1">
          {card.value === 7 || card.value === 8
            ? "Look Own"
            : card.value === 9 || card.value === 10
              ? "Look Opp"
              : card.value === 11 || card.value === 12
                ? "Blind Swap"
                : card.value === 13
                  ? "Look+Swap"
                  : "2x Look+Swap"}
        </div>
      )}
    </Card>
  )
}
