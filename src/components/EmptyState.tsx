import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Inbox, RotateCcw, Search } from "lucide-react";

type Props = {
  title: string;
  description?: string;
  icon?: "inbox" | "search" | "alert";
  action?: { label: string; onClick: () => void };
};

export function EmptyState({ title, description, icon = "inbox", action }: Props) {
  const Icon = icon === "alert" ? AlertCircle : icon === "search" ? Search : Inbox;
  return (
    <Card className="p-8 text-center bg-muted/30">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-background border">
        <Icon className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
      </div>
      <h3 className="mt-4 font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">{description}</p>
      )}
      {action && (
        <Button className="mt-4" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </Card>
  );
}

export function ErrorState({
  title = "حدث خطأ غير متوقّع",
  description = "تعذّر تحميل هذا القسم. يمكنك المحاولة مرة أخرى.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <Card className="p-6 border-destructive/40 bg-destructive/5">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
          {onRetry && (
            <Button size="sm" variant="outline" className="mt-3" onClick={onRetry}>
              <RotateCcw className="ms-1 h-4 w-4" /> إعادة المحاولة
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
