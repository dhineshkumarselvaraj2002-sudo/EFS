import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { LoginForm } from "@/components/login-form"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>
}) {
  const session = await getServerSession(authOptions)
  
  // If user is already authenticated, redirect to dashboard
  if (session) {
    redirect('/dashboard')
  }

  const errorMessages: Record<string, string> = {
    OAuthSignin: 'Error occurred during OAuth sign-in. Please check your Google OAuth configuration.',
    OAuthCallback: 'Error occurred in the OAuth callback. Please try again.',
    OAuthCreateAccount: 'Could not create OAuth account. Please try again.',
    EmailCreateAccount: 'Could not create email account. Please try again.',
    Callback: 'Error in callback. Please try again.',
    OAuthAccountNotLinked: 'To confirm your identity, sign in with the same account you used originally.',
    EmailSignin: 'Check your email for the sign-in link.',
    CredentialsSignin: 'Invalid credentials. Please check your email and password.',
    SessionRequired: 'Please sign in to access this page.',
    Default: 'An unexpected error occurred. Please try again.',
  }

  const params = await searchParams
  const error = params?.error
  const errorMessage = error ? errorMessages[error] || errorMessages.Default : null

  return (
    <>
      {errorMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Authentication Error</AlertTitle>
            <AlertDescription>
              {errorMessage}
            </AlertDescription>
          </Alert>
        </div>
      )}
      <LoginForm />
    </>
  )
}
