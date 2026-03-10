import { LucideIcon } from 'lucide-react';

interface SummaryCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  valueColor?: string;
}

const SummaryCard = ({ label, value, icon: Icon, iconBg, iconColor, valueColor }: SummaryCardProps) => (
  <div className="card-cor p-5 flex items-center gap-4">
    <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: iconBg }}>
      <Icon size={20} style={{ color: iconColor }} />
    </div>
    <div>
      <p className="label-uppercase text-[11px] mb-1">{label}</p>
      <p className="text-2xl font-bold" style={valueColor ? { color: valueColor } : undefined}>{value}</p>
    </div>
  </div>
);

export default SummaryCard;
