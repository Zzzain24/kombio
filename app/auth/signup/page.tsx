"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function SignUpPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || window.location.origin,
          data: {
            display_name: displayName || "Player",
          },
        },
      })

      if (error) throw error

      router.push("/auth/check-email")
    } catch (err: any) {
      setError(err.message || "Failed to sign up")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 p-4">
      <Card className="w-full max-w-md shadow-xl bg-gray-800 border-gray-700 transition-all duration-300 hover:scale-[1.02] hover:border-blue-500 hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center text-white transition-transform duration-300 hover:scale-105">Join KOMBIO</CardTitle>
          <CardDescription className="text-center text-gray-300">Create your account to start playing</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName" className="text-white">Display Name</Label>
              <Input
                id="displayName"
                type="text"
                placeholder="Your name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                disabled={loading}
                className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 focus-visible:border-blue-500 focus-visible:ring-blue-500/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 focus-visible:border-blue-500 focus-visible:ring-blue-500/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                disabled={loading}
                className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 focus-visible:border-blue-500 focus-visible:ring-blue-500/50"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-center">
              <Button type="submit" className="w-auto px-8 bg-red-600 hover:bg-red-700 hover:shadow-[0_0_15px_rgba(220,38,38,0.5)] transition-all duration-300" disabled={loading}>
                {loading ? "Creating account..." : "Sign Up"}
              </Button>
            </div>
          </form>
          <div className="mt-4 text-center text-sm text-white">
            Already have an account?{" "}
            <Button
              variant="link"
              onClick={() => router.push("/auth/login")}
              className="text-red-500 hover:text-red-600 p-0 h-auto no-underline hover:no-underline"
            >
              Sign in
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
