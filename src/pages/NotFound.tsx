import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { SearchX } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EcommerceTemplate } from "@/templates/EcommerceTemplate";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <EcommerceTemplate pageTitle="Página no encontrada - 404">
      <div className="container mx-auto px-4 py-16 min-h-[60vh] flex items-center justify-center">
        <Card className="max-w-2xl w-full text-center animate-fade-in">
          <CardHeader className="pb-4">
            <SearchX className="w-24 h-24 mx-auto text-muted-foreground mb-6" />
            <h1 className="text-6xl font-bold mb-4">404</h1>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-xl text-muted-foreground mb-2">
                La página que buscas no existe
              </p>
              <code className="text-sm bg-muted px-3 py-1 rounded">
                {location.pathname}
              </code>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button asChild size="lg">
                <Link to="/">Volver al inicio</Link>
              </Button>
              <Button variant="outline" asChild size="lg">
                <Link to="/#products">Ver productos</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </EcommerceTemplate>
  );
};

export default NotFound;
