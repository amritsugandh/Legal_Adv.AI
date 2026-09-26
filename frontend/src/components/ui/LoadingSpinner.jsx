import { motion } from 'framer-motion'

export default function LoadingSpinner({ size = 'md', text = 'Loading...' }) {
  const sizes = { sm: 'w-5 h-5', md: 'w-9 h-9', lg: 'w-14 h-14' }

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-14">
      <motion.div
        className={`${sizes[size]} rounded-full`}
        style={{
          border: '2px solid rgba(100, 120, 200, 0.12)',
          borderTopColor: 'var(--color-aurora-violet)',
          borderRightColor: 'var(--color-aurora-teal)',
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
      />
      {text && (
        <p className="text-sm text-[var(--color-text-muted)] font-mono">{text}</p>
      )}
    </div>
  )
}
