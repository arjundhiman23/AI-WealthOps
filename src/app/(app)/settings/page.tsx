import { requireUser } from "@/server/auth";
import { ROLE_LABEL } from "@/lib/roles";
import { Badge, Card, Panel, PageHeader } from "@/components/ui/primitives";
import { initials } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <div className="space-y-5">
      <PageHeader title="Settings" description="Your demo profile and application preferences." />

      <Panel title="Profile">
        <div className="flex items-center gap-4">
          <span className="flex size-14 items-center justify-center rounded-full bg-brand text-lg font-semibold text-brand-foreground">
            {initials(user.name)}
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
            <Badge variant="brand" className="mt-1.5">{ROLE_LABEL[user.role]}</Badge>
          </div>
        </div>
      </Panel>

      <Panel title="About this prototype" description="What's real and what's simulated">
        <ul className="space-y-2 text-sm text-foreground">
          <li>• All client, portfolio and activity data is synthetic — generated for this demonstration.</li>
          <li>• Authentication is a persona picker with no passwords. Production uses SSO/OIDC, MFA and RBAC.</li>
          <li>• The AI Assistant and review briefs are deterministic templates over the seeded data, not a live model.</li>
          <li>• Document storage uses Amazon S3 when configured, and falls back to metadata-only tracking otherwise.</li>
          <li>• No workflow in this prototype executes an actual financial transaction.</li>
        </ul>
      </Panel>

      <Card className="p-4">
        <p className="text-xs text-muted-foreground">
          Theme preference (light / dark) is available from the icon in the top bar and is remembered on this
          device.
        </p>
      </Card>
    </div>
  );
}
