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
  const getCardColor = () => {
    return "text-gray-900"
  }

  const getCardLabel = (value: number) => {
    return value.toString()
  }

  if (!revealed) {
    return (
      <Card
        className={cn(
          "flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-900 text-white shadow-lg overflow-hidden",
          compact ? "h-16 w-12 py-2.5 px-1.5" : "h-24 w-[4.5rem] py-4 px-2",
          onClick && "cursor-pointer hover:scale-105 transition-transform",
          className,
        )}
        onClick={onClick}
      >
        <div className={cn(compact ? "text-sm" : "text-base", "font-bold leading-none")}>?</div>
      </Card>
    )
  }

  return (
    <Card
      className={cn(
        "flex flex-col items-center justify-center bg-white shadow-lg border border-slate-200 overflow-hidden",
        compact ? "h-16 w-12 py-2.5 px-1.5" : "h-24 w-[4.5rem] py-4 px-2",
        onClick && "cursor-pointer hover:scale-105 transition-transform",
        className,
      )}
      onClick={onClick}
    >
      <div className={cn(
        compact ? "text-sm" : "text-base",
        "font-bold leading-none",
        getCardColor()
      )}>{getCardLabel(card.value)}</div>
      {card.value >= 7 && (
        <div className={cn(
          "flex items-center justify-center",
          compact ? "text-[7px] -mt-0.5" : "text-[8px] -mt-1",
          "text-gray-500 leading-none w-full"
        )}>
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
