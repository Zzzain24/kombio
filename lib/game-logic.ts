import type { Card, GamePlayer } from "./types"

export function canUseAbility(cardValue: number): boolean {
  return cardValue >= 7 && cardValue <= 14
}

export function getAbilityDescription(cardValue: number): string {
  switch (cardValue) {
    case 7:
    case 8:
      return "Look at one of your own cards"
    case 9:
    case 10:
      return "Look at one opponent's card"
    case 11:
    case 12:
      return "Blind swap any two cards"
    case 13:
      return "Look at any card and swap it with another"
    case 14:
      return "Look at any two cards and swap them"
    default:
      return ""
  }
}

export function calculateHandScore(cards: Card[]): number {
  return cards.reduce((sum, card) => sum + card.value, 0)
}

export function checkSpecialScoring(cards: Card[]): number | null {
  // Both 14's = -15 points
  if (cards.length === 2 && cards.every((c) => c.value === 14)) {
    return -15
  }

  // One 14 + cards totaling exactly 25 = -10 points
  const has14 = cards.some((c) => c.value === 14)
  if (has14) {
    const total = calculateHandScore(cards)
    if (total === 25) {
      return -10
    }
  }

  return null
}

export function getNextPlayerId(players: GamePlayer[], currentPlayerId: string): string {
  const currentIndex = players.findIndex((p) => p.user_id === currentPlayerId)
  const nextIndex = (currentIndex + 1) % players.length
  return players[nextIndex].user_id
}

export function isCardMatch(card1: Card, card2: Card): boolean {
  return card1.value === card2.value
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export function createDeck(): Card[] {
  const deck: Card[] = []

  // Deck composition (total 70 cards):
  // -1, 0: 3 each
  // 1-12: 5 each
  // 13, 14: 2 each
  const counts: Record<number, number> = {}
  counts[-1] = 3
  counts[0] = 3
  for (let v = 1; v <= 12; v++) counts[v] = 5
  counts[13] = 2
  counts[14] = 2

  Object.entries(counts).forEach(([valueString, count]) => {
    const value = Number(valueString)
    for (let i = 0; i < count; i++) {
      deck.push({
        id: `${value}-${i}-${Math.random().toString(36).substring(7)}`,
        value,
      })
    }
  })

  return shuffleDeck(deck)
}

export function dealInitialHands(deck: Card[], playerCount: number): { hands: Card[][]; remainingDeck: Card[] } {
  const hands: Card[][] = []
  const deckCopy = [...deck]

  for (let i = 0; i < playerCount; i++) {
    hands.push(deckCopy.splice(0, 4))
  }

  return { hands, remainingDeck: deckCopy }
}
