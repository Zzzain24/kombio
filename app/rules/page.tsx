import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function RulesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="mx-auto max-w-4xl space-y-6 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-bold text-indigo-900">KOMBIO Rules</h1>
          <Link href="/">
            <Button variant="outline" className="gap-2 bg-transparent">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Get the lowest score by viewing, swapping and matching cards. A game consists of multiple rounds, each
              player adds their score each round.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="list-disc list-inside space-y-2">
              <li>Deal four cards, face down, to each player in a 2x2 grid</li>
              <li>At the beginning of each round, players can view their bottom two cards once</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gameplay</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              On your turn, draw a card from the deck or discard pile. You can either exchange it with a card from your
              hand or discard it directly to use its ability (if it has one).
            </p>
            <div className="space-y-2">
              <h4 className="font-semibold">Card Abilities (7-14):</h4>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>
                  <strong>7, 8:</strong> Look at one of your own cards
                </li>
                <li>
                  <strong>9, 10:</strong> Look at one opponent's card
                </li>
                <li>
                  <strong>11, 12:</strong> Blind swap any two cards
                </li>
                <li>
                  <strong>13:</strong> Look at any card and swap it with another
                </li>
                <li>
                  <strong>14:</strong> Look at any two cards and swap them
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Matching</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              At any time, you can attempt to match the last discarded card with a card from your hand or an opponent's
              hand. A successful match removes the card from play.
            </p>
            <p className="text-sm text-muted-foreground">
              Incorrect matches result in a penalty card being added to your hand.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Calling KOMBIO</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Instead of taking a turn, you can call "KOMBIO" to end the round. All other players get one more turn
              before scoring.
            </p>
            <p className="text-sm text-muted-foreground">
              Reducing your hand to zero cards automatically calls KOMBIO.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Scoring</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>After the last turn, players reveal their cards and add up the values.</p>
            <div className="space-y-2">
              <h4 className="font-semibold">KOMBIO Scoring:</h4>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>If the KOMBIO caller has the lowest score, they get their hand score</li>
                <li>Everyone else adds +10 points to their hand scores</li>
                <li>If someone ties or beats the caller, the caller adds +15 points</li>
                <li>Everyone else gets their hand scores</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">Special Scoring:</h4>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Both 14's and nothing else: -15 points</li>
                <li>One 14 and cards totaling exactly 25: -10 points</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Winning</CardTitle>
          </CardHeader>
          <CardContent>
            <p>After all rounds are complete, the player with the lowest cumulative score wins!</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
