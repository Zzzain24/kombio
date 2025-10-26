import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail } from "lucide-react"
import Link from "next/link"

export default function CheckEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 p-4">
      <Card className="w-full max-w-md shadow-xl bg-gray-800 border-gray-700 transition-all duration-300 hover:scale-[1.02] hover:border-blue-500 hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
            <Mail className="h-6 w-6 text-red-500" />
          </div>
          <CardTitle className="text-2xl font-bold transition-transform duration-300 hover:scale-105">Check your email</CardTitle>
          <CardDescription>We've sent you a confirmation link to verify your account</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Click the link in the email to complete your registration and start playing KOMBIO.
          </p>
          <Link href="/auth/login" className="text-sm text-red-500 hover:text-blue-500 hover:underline">
            Back to login
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
