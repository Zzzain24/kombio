export interface Profile {
  id: string
  display_name: string
  created_at: string
}

export interface Card {
  value: number // 0-14 (0 = joker/special)
  suit?: string // For visual variety
  id: string
}

export interface Game {
  id: string
  code: string
  host_id: string
  status: "lobby" | "playing" | "finished"
  current_round: number
  max_rounds: number
  current_turn_player_id: string | null
  deck: Card[]
  discard_pile: Card[]
  last_discarded_card: Card | null
  kombio_caller_id: string | null
  created_at: string
  updated_at: string
}

export interface GamePlayer {
  id: string
  game_id: string
  user_id: string
  player_order: number
  total_score: number
  current_hand: Card[]
  viewed_cards: string[] // Array of card IDs that have been viewed
  is_ready: boolean
  created_at: string
  profile?: Profile
}

export interface GameAction {
  id: string
  game_id: string
  player_id: string
  action_type: "draw" | "discard" | "swap" | "match" | "view" | "kombio"
  action_data: any
  created_at: string
}

export type CardAbility =
  | "look-own" // 7, 8
  | "look-opponent" // 9, 10
  | "blind-swap" // 11, 12
  | "look-swap" // 13
  | "double-look-swap" // 14

export interface AbilityAction {
  type: CardAbility
  cardValue: number
  targetCardIds?: string[]
  swapCardIds?: [string, string]
}
