/**
 * EDITABLE UI COMPONENT - ProfileMenu
 * TIPO B - El agente de IA puede editar libremente este componente
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { AuthDialog } from '@/components/AuthDialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { User, LogOut, Package } from 'lucide-react'
import { toast } from 'sonner'

export const ProfileMenu = () => {
  const { user, signOut, loading } = useAuth()
  const navigate = useNavigate()
  const [showAuthDialog, setShowAuthDialog] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    toast.success('Signed out')
  }

  const handleMyOrders = () => {
    navigate('/my-orders')
  }

  if (loading) {
    return (
      <Button variant="ghost" size="icon" disabled>
        <User className="h-5 w-5" />
      </Button>
    )
  }

  if (!user) {
    return (
      <>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => setShowAuthDialog(true)}
          aria-label="Sign in"
        >
          <User className="h-5 w-5" />
        </Button>

        <AuthDialog 
          open={showAuthDialog} 
          onOpenChange={setShowAuthDialog}
        />
      </>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Profile menu">
          <User className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">My Account</p>
            <p className="text-xs text-muted-foreground truncate">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleMyOrders}>
          <Package className="mr-2 h-4 w-4" />
          My Orders
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
