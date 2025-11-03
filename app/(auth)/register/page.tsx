import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { SignupForm } from "@/components/signup-form"

export default async function RegisterPage() {
  const session = await getServerSession(authOptions)
  
  // If user is already authenticated, redirect to dashboard
  if (session) {
    redirect('/dashboard')
  }

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        <SignupForm />
      </div>
    </div>
  )
}
