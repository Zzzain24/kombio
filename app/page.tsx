import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import HomeClient from "@/components/home-client"

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Fetch user profile
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  // If profile doesn't exist, create it
  if (!profile) {
    console.log("Profile not found, creating profile for user:", user.id)
    const { error: insertError } = await supabase.from("profiles").insert({
      id: user.id,
      display_name: user.user_metadata?.display_name || "Player",
    })
    
    if (insertError) {
      console.error("Failed to create profile:", insertError)
      // If profile creation fails, redirect to signup
      redirect("/auth/signup")
    }
    
    // Refetch the profile
    const { data: newProfile, error: fetchError } = await supabase.from("profiles").select("*").eq("id", user.id).single()
    
    if (fetchError || !newProfile) {
      console.error("Failed to fetch new profile:", fetchError)
      redirect("/auth/signup")
    }
    
    console.log("Profile created successfully:", newProfile)
    return <HomeClient profile={newProfile} />
  }

  return <HomeClient profile={profile} />
}
