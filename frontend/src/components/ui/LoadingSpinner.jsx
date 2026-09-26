import { motion } from 'framer-motion'

export default function LoadingSpinner({ size = 'md', text = 'Loading...' }) {
  const sizes = { sm: 'w-6 h-6', md: 'w-10 h-10', lg: 'w-14 h-14' }

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <motion.div
        className={`${sizes[size]} rounded-full`}
        style={{
          border: '2.5px solid var(--th-border-subtle)',
          borderTopColor: 'var(--color-aurora-violet)',
          borderRightColor: 'var(--color-aurora-teal)',
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 0.85, repeat: Infinity, ease: 'linear' }}
      />
      {text && (
        <p
          className="text-sm font-mono"
          style={{ color: 'var(--th-text-muted)' }}
        >
          {text}
        </p>
      )}
    </div>
  )
}
