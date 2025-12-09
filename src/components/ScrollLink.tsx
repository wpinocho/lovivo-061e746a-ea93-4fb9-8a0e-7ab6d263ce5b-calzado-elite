import { Link, useLocation } from 'react-router-dom'
import { MouseEvent } from 'react'

interface ScrollLinkProps {
  to: string
  children: React.ReactNode
  className?: string
}

export const ScrollLink = ({ to, children, className }: ScrollLinkProps) => {
  const location = useLocation()
  
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // Extract base path and hash
    const [path, hash] = to.split('#')
    const targetPath = path || '/'
    
    // If we're already on the same page, manually scroll
    if (location.pathname === targetPath && hash) {
      e.preventDefault()
      const element = document.getElementById(hash)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
        // Update hash in URL without navigation
        window.history.pushState(null, '', `#${hash}`)
      }
    }
    // If coming from another page, React Router will navigate and
    // the browser will automatically scroll to the hash
  }
  
  return (
    <Link to={to} onClick={handleClick} className={className}>
      {children}
    </Link>
  )
}
