import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/primitives";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <Compass className="size-6" />
      </span>
      <div>
        <p className="text-sm font-semibold text-foreground">This page doesn't exist</p>
        <p className="mt-1 text-xs text-muted-foreground">Check the URL, or head back to the dashboard.</p>
      </div>
      <Link href="/dashboard">
        <Button variant="primary" size="sm">Go to dashboard</Button>
      </Link>
    </div>
  );
}
