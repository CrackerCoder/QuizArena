import { useLocation } from "wouter";
import { useEffect } from "react";

const NotFound = () => {
  const [location] = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location);
  }, [location]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-3">
        <h1 className="font-display text-6xl font-bold text-gradient-hero">404</h1>
        <p className="text-xl text-muted-foreground">This arena doesn't exist.</p>
        <a href="/" className="inline-block text-primary underline hover:text-primary-glow">
          Return to Quiz Arena
        </a>
      </div>
    </div>
  );
};

export default NotFound;
