import { motion } from 'framer-motion'
import { FileX } from 'lucide-react'

export default function EmptyState({ icon: Icon = FileX, title, description, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-24 text-center"
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
        style={{
          background: 'var(--th-icon-box-bg)',
          border: '1px solid var(--th-icon-box-bd)',
          boxShadow: '0 0 24px rgba(108,92,231,0.1)',
        }}
      >
        <Icon className="w-7 h-7" style={{ color: 'var(--color-aurora-purple)' }} />
      </div>
      <h3
        className="text-lg font-bold mb-2.5"
        style={{ color: 'var(--th-text-primary)' }}
      >
        {title}
      </h3>
      {description && (
        <p
          className="text-sm max-w-md leading-relaxed"
          style={{ color: 'var(--th-text-muted)' }}
        >
          {description}
        </p>
      )}
      {children && <div className="mt-6">{children}</div>}
    </motion.div>
  )
}
