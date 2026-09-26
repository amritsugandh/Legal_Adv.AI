import { motion } from 'framer-motion'
import { FileX } from 'lucide-react'

export default function EmptyState({ icon: Icon = FileX, title, description, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div
        className="w-14 h-14 rounded-xl flex items-center justify-center mb-4"
        style={{
          background: 'linear-gradient(135deg, rgba(108, 92, 231, 0.1), rgba(0, 206, 201, 0.06))',
          border: '1px solid rgba(108, 92, 231, 0.2)',
        }}
      >
        <Icon className="w-6 h-6 text-[var(--color-text-muted)]" />
      </div>
      <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-[var(--color-text-muted)] max-w-md mb-6 leading-relaxed">{description}</p>
      )}
      {children}
    </motion.div>
  )
}
