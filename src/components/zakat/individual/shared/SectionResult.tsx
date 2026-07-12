export interface SectionResultProps {
  label: string;
  value: number;
  eligible?: boolean;
  format: (n: number) => string;
}

export function SectionResult({ label, value, eligible = true, format }: SectionResultProps) {
  return (
    <div
      className={`flex items-center justify-between rounded-lg border px-4 py-3 ${eligible && value > 0 ? "border-primary/30 bg-primary/5" : "border-border bg-muted/40"}`}
    >
      <span className="text-sm font-medium">{label}</span>
      <span
        className={`font-bold ${eligible && value > 0 ? "text-primary" : "text-muted-foreground"}`}
      >
        {format(value)}
      </span>
    </div>
  );
}

export default SectionResult;
