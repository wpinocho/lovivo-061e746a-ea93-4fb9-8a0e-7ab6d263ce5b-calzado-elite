import { useEffect, useState } from 'react'
import { supabase, type Blog } from '@/lib/supabase'
import { STORE_ID } from '@/lib/config'
import { useNavigate } from 'react-router-dom'
import { Calendar } from 'lucide-react'
import { EcommerceTemplate } from '@/templates/EcommerceTemplate'

const BlogPage = () => {
  const [blogs, setBlogs] = useState<Blog[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetchBlogs()
  }, [])

  const fetchBlogs = async () => {
    try {
      const { data, error } = await supabase
        .from('content')
        .select('*')
        .eq('status', 'published')
        .eq('store_id', STORE_ID)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching blogs:', error)
        return
      }
      
      setBlogs(data || [])
    } catch (error) {
      console.error('Error fetching blogs:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <EcommerceTemplate pageTitle="Blog" showCart={true}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-muted rounded-lg h-64 animate-pulse"></div>
            ))}
          </div>
        ) : blogs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {blogs.map((blog) => (
              <article 
                key={blog.id}
                className="bg-card rounded-lg border border-border overflow-hidden hover:shadow-md transition-shadow duration-300 cursor-pointer"
                onClick={() => navigate(`/blog/${blog.slug}`)}
              >
                {blog.featured_image && blog.featured_image.length > 0 && (
                  <div className="aspect-w-16 aspect-h-9 bg-muted">
                    <img 
                      src={blog.featured_image[0]} 
                      alt={blog.title}
                      className="w-full h-48 object-cover"
                    />
                  </div>
                )}
                <div className="p-6">
                  <div className="flex items-center text-sm text-muted-foreground mb-3">
                    <Calendar className="h-4 w-4 mr-2" />
                    {blog.created_at && formatDate(blog.created_at)}
                  </div>
                  <h2 className="text-xl font-semibold text-foreground mb-3 hover:text-foreground/80">
                    {blog.title}
                  </h2>
                  {blog.excerpt && (
                    <p className="text-muted-foreground text-sm line-clamp-3">
                      {blog.excerpt}
                    </p>
                  )}
                  <div className="mt-4">
                    <span className="text-primary hover:text-primary/80 text-sm font-medium">
                      Read more →
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No articles available at this time.</p>
          </div>
        )}
      </div>
    </EcommerceTemplate>
  )
}

export default BlogPage