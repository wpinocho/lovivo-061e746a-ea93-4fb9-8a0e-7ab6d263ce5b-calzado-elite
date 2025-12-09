/**
 * EDITABLE UI COMPONENT - AuthDialog
 * TIPO B - El agente de IA puede editar libremente este componente
 */

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { useAuth } from '@/hooks/useAuth'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface AuthDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const AuthDialog = ({ open, onOpenChange }: AuthDialogProps) => {
  const { signUpWithOtp, verifyOtp, resendOtp } = useAuth()
  
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [email, setEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSendCode = async () => {
    if (!email) {
      toast.error('Please enter your email')
      return
    }

    setLoading(true)
    const { error } = await signUpWithOtp(email)
    setLoading(false)

    if (error) {
      const errorMsg = error.message || 'Unknown error'
      
      if (errorMsg.includes('Database error')) {
        toast.error('Server configuration error. Please contact support.')
      } else if (errorMsg.includes('Rate limit')) {
        toast.error('Too many attempts. Please try again later.')
      } else {
        toast.error('Error sending code: ' + errorMsg)
      }
      return
    }

    toast.success('Code sent to your email')
    setStep('otp')
  }

  const handleVerifyCode = async () => {
    if (otpCode.length !== 6) {
      toast.error('Please enter the 6-digit code')
      return
    }

    setLoading(true)
    const { error } = await verifyOtp(email, otpCode)
    setLoading(false)

    if (error) {
      const errorMsg = error.message || 'Unknown error'
      
      if (errorMsg.includes('Invalid') || errorMsg.includes('expired')) {
        toast.error('Invalid or expired code. Please request a new one.')
      } else {
        toast.error('Verification error: ' + errorMsg)
      }
      return
    }

    toast.success('Welcome!')
    onOpenChange(false)
    resetForm()
  }

  const handleResendCode = async () => {
    setLoading(true)
    const { error } = await resendOtp(email)
    setLoading(false)

    if (error) {
      toast.error('Error resending code')
      return
    }

    toast.success('Code resent')
  }

  const resetForm = () => {
    setStep('email')
    setEmail('')
    setOtpCode('')
  }

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open)
      if (!open) resetForm()
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 'email' ? 'Sign in' : 'Verify code'}
          </DialogTitle>
          <DialogDescription>
            {step === 'email' 
              ? 'Enter your email to receive a verification code'
              : 'Enter the 6-digit code we sent to your email'
            }
          </DialogDescription>
        </DialogHeader>

        {step === 'email' ? (
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                onKeyDown={(e) => e.key === 'Enter' && handleSendCode()}
              />
            </div>

            <Button 
              onClick={handleSendCode} 
              disabled={loading || !email}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send code'
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 pt-4">
            <div className="flex flex-col items-center space-y-4">
              <InputOTP
                maxLength={6}
                value={otpCode}
                onChange={setOtpCode}
                disabled={loading}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>

              <p className="text-sm text-muted-foreground text-center">
                Sent to: <span className="font-medium">{email}</span>
              </p>
            </div>

            <Button 
              onClick={handleVerifyCode} 
              disabled={loading || otpCode.length !== 6}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify code'
              )}
            </Button>

            <div className="flex items-center justify-between text-sm">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep('email')}
                disabled={loading}
              >
                Change email
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResendCode}
                disabled={loading}
              >
                Resend code
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
