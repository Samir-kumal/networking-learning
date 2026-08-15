interface NetworkingTableProps {
  className?: string;
  children: React.ReactNode;
}

export default function NetworkingTable({ className = "", children }: NetworkingTableProps) {
  return <div className={className ? `networking-table ${className}` : "networking-table"}>{children}</div>;
}
