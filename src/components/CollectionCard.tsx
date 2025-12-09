import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { type Collection } from '@/lib/supabase'

interface CollectionCardProps {
  collection: Collection
  onViewProducts: (collectionId: string) => void
}

export const CollectionCard = ({ collection, onViewProducts }: CollectionCardProps) => {
  return (
    <Card className="bg-card border-border overflow-hidden group hover:shadow-lg transition-shadow duration-300">
      <CardContent className="p-0">
        <div className="aspect-[4/3] bg-muted overflow-hidden relative">
          {collection.image ? (
            <img 
              src={collection.image} 
              alt={collection.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
              Sin imagen
            </div>
          )}
          
          {collection.featured && (
            <div className="absolute top-3 right-3">
              <span className="bg-accent text-accent-foreground text-xs px-3 py-1 rounded-sm font-medium">
                Destacado
              </span>
            </div>
          )}
        </div>
        
        <div className="p-5">
          <h3 className="text-foreground font-bold text-xl mb-2 line-clamp-1 group-hover:text-accent transition-colors">
            {collection.name}
          </h3>
          
          {collection.description && (
            <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
              {collection.description}
            </p>
          )}
          
          <Button 
            variant="outline" 
            className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            onClick={() => onViewProducts(collection.id)}
          >
            Ver Productos
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}