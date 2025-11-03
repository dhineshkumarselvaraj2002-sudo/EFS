'use client'

import { useState, useEffect } from 'react'
import { signIn, useSession, getSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { toast as sonnerToast } from 'sonner'
import Link from 'next/link'
import { Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react'
import { SpinnerButton } from '@/components/ui/spinner-button'
import { useErrorToast } from '@/lib/utils/toast-helpers'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { showRetryError } = useErrorToast()

  // Redirect if already authenticated
  useEffect(() => {
    if (status === 'authenticated' && session) {
      router.push('/dashboard')
    }
  }, [session, status, router])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      })

      if (result?.error) {
        setError('Invalid credentials')
        showRetryError(
          'Login failed',
          'Invalid email or password. Please check your credentials and try again.',
          () => {
            // Retry by refocusing on the form
            const emailInput = document.getElementById('email')
            emailInput?.focus()
          }
        )
      } else if (result?.ok) {
        await getSession()
        sonnerToast.success('Login successful')
        router.push('/dashboard')
        router.refresh()
      }
    } catch (err) {
      setError('An error occurred during login')
      showRetryError(
        'Something went wrong',
        'An unexpected error occurred during login. Please try again.',
        () => {
          // User can retry by submitting the form again
        }
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    setError(null)
    try {
      await signIn('google', { callbackUrl: '/dashboard' })
    } catch (err) {
      setError('Failed to sign in with Google')
      showRetryError(
        'Google sign-in failed',
        'Unable to sign in with Google. Please check your configuration and try again.',
        handleGoogleSignIn
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn("min-h-screen flex bg-background", className)} {...props}>
      {/* Left side - Image and branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/70 to-primary/20 z-10"></div>
        <img
          src="/placeholder.svg"
          alt="Modern workspace"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="relative z-20 flex flex-col justify-center px-12 text-white">
          <div className="space-y-6">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl font-bold leading-tight">
                Welcome to Inventory System
              </h1>
              <p className="text-lg text-white/90 leading-relaxed">
                Manage your inventory efficiently with our comprehensive system.
              </p>
            </div>
            <div className="flex items-center gap-4 text-sm text-white/80">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-white/60 rounded-full"></div>
                <span>Secure & Reliable</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-white/60 rounded-full"></div>
                <span>24/7 Support</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-12">
        <div className="w-full max-w-md space-y-8">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="lg:hidden mx-auto w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-6">
              <Lock className="w-6 h-6 text-primary-foreground" />
            </div>
            <h2 className="text-3xl font-bold text-foreground">Sign in to your account</h2>
            <p className="text-muted-foreground">Enter your credentials to access your dashboard</p>
          </div>

          {/* Form */}
          <Card className="border-border bg-card shadow-lg">
            <CardContent className="p-8 space-y-6">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* Email field */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-card-foreground">
                    Email address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      className="pl-10 h-12 bg-input border-border focus:border-primary focus:ring-ring transition-all duration-200"
                      {...register('email')}
                      disabled={isLoading}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.email.message}
                    </p>
                  )}
                </div>

                {/* Password field */}
                <div className="space-y-2">
                  <div className="flex items-center">
                    <Label htmlFor="password" className="text-sm font-medium text-card-foreground">
                      Password
                    </Label>
                    <a
                      href="#"
                      className="ml-auto text-sm underline-offset-2 hover:underline text-muted-foreground"
                    >
                      Forgot your password?
                    </a>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      className="pl-10 pr-10 h-12 bg-input border-border focus:border-primary focus:ring-ring transition-all duration-200"
                      {...register('password')}
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-card-foreground transition-colors"
                      disabled={isLoading}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.password.message}
                    </p>
                  )}
                </div>

                {/* Error message */}
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Login Failed</AlertTitle>
                    <AlertDescription>
                      {error}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Sign in button */}
                <SpinnerButton
                  type="submit"
                  loading={isLoading}
                  loadingText="Signing in..."
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
                >
                  <div className="flex items-center gap-2">
                    Sign in
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </SpinnerButton>
              </form>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-card text-muted-foreground">Or continue with</span>
                </div>
              </div>

              {/* Google Sign In */}
              <Button
                onClick={handleGoogleSignIn}
                variant="outline"
                className="w-full h-12 border-border hover:bg-accent hover:text-accent-foreground transition-colors bg-card"
                disabled={isLoading}
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{' '}
                <Link href="/register" className="text-primary hover:underline font-medium">
                  Sign up
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
