import React from 'react'

export function Button({ children, loading, variant = 'primary', className = '', ...props }) {
  const base = 'flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-semibold text-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]'
  const variants = {
    primary: 'bg-brev-blue text-white hover:bg-brev-indigo',
    secondary: 'bg-brev-warm text-brev-dark hover:bg-brev-warm/70 border border-gray-200',
    danger: 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200',
    ghost: 'text-brev-blue hover:bg-brev-blue/5',
  }

  return (
    <button className={`${base} ${variants[variant]} ${className}`} disabled={loading || props.disabled} {...props}>
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : children}
    </button>
  )
}

export function IconButton({ icon, label, onClick, className = '' }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`p-2 rounded-xl hover:bg-gray-100 active:scale-95 transition-all ${className}`}
    >
      {icon}
    </button>
  )
}
