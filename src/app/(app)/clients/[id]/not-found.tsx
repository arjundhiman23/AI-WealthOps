import Link from "next/link";
import { Users } from "lucide-react";
import { Button, EmptyState } from "@/components/ui/primitives";

export default function ClientNotFound() {
  return (
    <EmptyState
      icon={<Users className="size-5" />}
      title="Client not found"
      description="This client does not exist in the demo dataset."
      action={
        <Link href="/clients">
          <Button variant="secondary" size="sm">Back to clients</Button>
        </Link>
      }
    />
  );
}
