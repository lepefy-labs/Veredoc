interface BadgeProps {
  status: "PENDING" | "PROCESSING" | "AWAITING_CONFIRMATION" | "DONE" | "ERROR" | "DELETED";
  label?: string;
}

const statusConfig: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  PENDING: { bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400", label: "In attesa" },
  PROCESSING: { bg: "bg-yellow-100", text: "text-yellow-700", dot: "bg-yellow-500", label: "In analisi" },
  AWAITING_CONFIRMATION: { bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500", label: "Da confermare" },
  DONE: { bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500", label: "Completato" },
  ERROR: { bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500", label: "Errore" },
  DELETED: { bg: "bg-gray-100", text: "text-gray-400", dot: "bg-gray-300", label: "Eliminato" },
};

export default function Badge({ status, label }: BadgeProps) {
  const config = statusConfig[status] ?? statusConfig.PENDING;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {label ?? config.label}
    </span>
  );
}
