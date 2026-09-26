import { ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react'

export default function SeverityBadge({ severity }) {
  const s = (severity || 'medium').toLowerCase()

  const config = {
    low: { cls: 'badge-low', icon: ShieldCheck, label: 'Low' },
    medium: { cls: 'badge-medium', icon: ShieldQuestion, label: 'Medium' },
    high: { cls: 'badge-high', icon: ShieldAlert, label: 'High' },
  }

  const { cls, icon: Icon, label } = config[s] || config.medium

  return (
    <span className={`badge ${cls}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  )
}
