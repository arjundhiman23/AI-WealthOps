import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------- Card ---- */

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-xl border border-border bg-card shadow-card", className)} {...props} />;
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-start justify-between gap-3 px-5 pt-4 pb-3", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-sm font-semibold text-foreground", className)} {...props} />;
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-xs text-muted-foreground", className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 pb-5", className)} {...props} />;
}

/** Card with a standard header row — the workhorse wrapper for every section. */
export function Panel({
  title,
  description,
  action,
  icon,
  className,
  bodyClassName,
  children,
}: {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <Card className={className}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
          <div className="flex min-w-0 items-center gap-2.5">
            {icon && <span className="text-muted-foreground">{icon}</span>}
            <div className="min-w-0">
              {title && <h3 className="truncate text-sm font-semibold text-foreground">{title}</h3>}
              {description && <p className="truncate text-xs text-muted-foreground">{description}</p>}
            </div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </Card>
  );
}

/* --------------------------------------------------------------- Badge ---- */

export type BadgeVariant =
  | "default"
  | "brand"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "outline"
  | "muted"
  | "wine";

const badgeStyles: Record<BadgeVariant, string> = {
  default: "bg-muted text-foreground",
  brand: "bg-brand-muted text-brand-muted-foreground",
  success: "bg-success-muted text-success",
  warning: "bg-warning-muted text-warning",
  danger: "bg-danger-muted text-danger",
  info: "bg-info-muted text-info",
  muted: "bg-muted text-muted-foreground",
  outline: "border border-border text-muted-foreground",
  wine: "bg-[color-mix(in_srgb,var(--wine)_14%,transparent)] text-wine",
};

export function Badge({
  variant = "default",
  className,
  children,
  dot,
}: {
  variant?: BadgeVariant;
  className?: string;
  children: ReactNode;
  dot?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium",
        badgeStyles[variant],
        className,
      )}
    >
      {dot && <span className="size-1.5 rounded-full" style={{ background: dot }} />}
      {children}
    </span>
  );
}

/* -------------------------------------------------------------- Button ---- */

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "subtle";
export type ButtonSize = "sm" | "md" | "lg" | "icon" | "icon-sm";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-brand text-brand-foreground hover:bg-brand-hover shadow-sm",
  secondary: "bg-card border border-border text-foreground hover:bg-muted",
  outline: "border border-border text-foreground hover:bg-muted",
  ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
  danger: "bg-danger text-white hover:opacity-90",
  subtle: "bg-brand-muted text-brand-muted-foreground hover:bg-brand-muted/70",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-9 px-4 text-sm gap-2",
  lg: "h-11 px-5 text-sm gap-2",
  icon: "h-9 w-9 justify-center",
  "icon-sm": "h-8 w-8 justify-center",
};

const BUTTON_BASE =
  "inline-flex items-center rounded-lg font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50";

/** Class string for anchor elements that should look like buttons. */
export function buttonClasses(
  variant: ButtonVariant = "secondary",
  size: ButtonSize = "md",
  className?: string,
) {
  return cn(BUTTON_BASE, buttonVariants[variant], buttonSizes[size], className);
}

export function Button({
  variant = "secondary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button className={buttonClasses(variant, size, className)} {...props} />;
}

/* ------------------------------------------------------- Input / Select ---- */

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-9 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none transition placeholder:text-subtle-foreground focus:border-brand focus:ring-2 focus:ring-ring/30",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-subtle-foreground focus:border-brand focus:ring-2 focus:ring-ring/30",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-9 cursor-pointer rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-ring/30",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Label({ className, ...props }: HTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("mb-1.5 block text-xs font-medium text-muted-foreground", className)}
      {...props}
    />
  );
}

/* ------------------------------------------- Skeleton / Progress / misc ---- */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-shimmer rounded-md bg-muted", className)} />;
}

export function ProgressBar({
  value,
  max = 100,
  color,
  className,
  trackClassName,
}: {
  value: number;
  max?: number;
  color?: string;
  className?: string;
  trackClassName?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", trackClassName, className)}>
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, background: color ?? "var(--brand)" }}
      />
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
      {children}
    </kbd>
  );
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-border", className)} />;
}

/** Icon in a soft-tinted square chip — the recurring micro-pattern. */
export function IconChip({
  color = "var(--brand)",
  size = "md",
  children,
}: {
  color?: string;
  size?: "sm" | "md";
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg",
        size === "sm" ? "size-7" : "size-9",
      )}
      style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, color }}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------ PageHeader / Empty ------ */

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
      {icon && (
        <div className="flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          {icon}
        </div>
      )}
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description && <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({ title, description }: { title: string; description?: string }) {
  return (
    <Card className="p-6">
      <p className="text-sm font-semibold text-danger">{title}</p>
      {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
    </Card>
  );
}

/* --------------------------------------------------------------- Table ---- */

export function TableShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("scrollbar-thin overflow-x-auto", className)}>
      <table className="w-full min-w-[640px] border-collapse text-sm">{children}</table>
    </div>
  );
}

export function Th({ className, ...props }: HTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "border-b border-border px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function Td({ className, ...props }: HTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("border-b border-border px-4 py-3 align-middle", className)} {...props} />;
}
