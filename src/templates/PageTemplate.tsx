import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * EDITABLE TEMPLATE - PageTemplate
 * 
 * Template base con slots editables para cualquier página.
 * El agente IA puede modificar layout, estilos, estructura completamente.
 */

interface PageTemplateProps {
  children: ReactNode
  header?: ReactNode
  sidebar?: ReactNode
  footer?: ReactNode
  className?: string
  contentClassName?: string
  layout?: 'default' | 'full-width' | 'sidebar-left' | 'sidebar-right' | 'centered'
}

export const PageTemplate = ({ 
  children, 
  header, 
  sidebar, 
  footer, 
  className,
  contentClassName,
  layout = 'default'
}: PageTemplateProps) => {
  const layoutClasses = {
    'default': 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
    'full-width': 'w-full',
    'sidebar-left': 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-4 gap-8',
    'sidebar-right': 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-4 gap-8',
    'centered': 'max-w-4xl mx-auto px-4 sm:px-6 lg:px-8'
  }

  const renderContent = () => {
    if (layout === 'sidebar-left') {
      return (
        <div className={layoutClasses[layout]}>
          {sidebar && (
            <aside className="lg:col-span-1">
              {sidebar}
            </aside>
          )}
          <main className={cn("lg:col-span-3", contentClassName)}>
            {children}
          </main>
        </div>
      )
    }

    if (layout === 'sidebar-right') {
      return (
        <div className={layoutClasses[layout]}>
          <main className={cn("lg:col-span-3", contentClassName)}>
            {children}
          </main>
          {sidebar && (
            <aside className="lg:col-span-1">
              {sidebar}
            </aside>
          )}
        </div>
      )
    }

    return (
      <div className={layoutClasses[layout]}>
        <main className={cn(contentClassName)}>
          {children}
        </main>
      </div>
    )
  }

  return (
    <div className={cn("min-h-screen bg-background", className)}>
      {header && (
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          {header}
        </header>
      )}
      
      <div className="flex-1 py-6">
        {renderContent()}
      </div>

      {footer && (
        <footer className="border-t bg-muted/30">
          {footer}
        </footer>
      )}
    </div>
  )
}