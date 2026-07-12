export interface RowProps {
  label: string;
  value: string;
  highlight?: boolean;
}

export function Row({ label, value, highlight }: RowProps) {
  return (
    <div
      className={`flex items-center justify-between rounded-md px-2.5 py-1.5 ${highlight ? "bg-primary/10 font-bold text-primary" : ""}`}
    >
      <span>{label}</span>
      <span dir="ltr">{value}</span>
    </div>
  );
}

export default Row;
