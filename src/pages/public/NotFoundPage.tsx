import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <section className="container flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <p className="font-mono text-sm text-solar-600">404</p>
      <h1 className="mt-3 text-3xl font-bold text-navy-900">This page isn’t generating.</h1>
      <p className="mt-2 text-muted-foreground">The page you’re looking for doesn’t exist or has moved.</p>
      <Button asChild className="mt-6" variant="solar"><Link to="/">Back to home</Link></Button>
    </section>
  );
}
