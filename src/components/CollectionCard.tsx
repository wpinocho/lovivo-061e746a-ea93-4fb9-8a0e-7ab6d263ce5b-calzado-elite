import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { type Collection } from '@/lib/supabase'

interface CollectionCardProps {
  collection: Collection
  onViewProducts: (collectionId: string) => void
}

export const CollectionCard = ({ collection, onViewProducts }: CollectionCardProps) => {
  return (
    <Card className="bg-white border border-gray-200 overflow-hidden">
      <CardContent className="p-0">
        <div className="aspect-[4/3] bg-gray-100 overflow-hidden">
          {collection.image ? (
            <img 
              src={collection.image} 
              alt={collection.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
              No image
            </div>
          )}
        </div>
        
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-black font-semibold text-lg line-clamp-1">
              {collection.name}
            </h3>
            {collection.featured && (
              <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded font-medium">
                Featured
              </span>
            )}
          </div>
          
          {collection.description && (
            <p className="text-gray-600 text-sm mb-3 line-clamp-2">
              {collection.description}
            </p>
          )}
          
          <Button 
            variant="outline" 
            className="w-full text-black border-gray-300 hover:bg-gray-50"
            onClick={() => onViewProducts(collection.id)}
          >
            View Products
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}