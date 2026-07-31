import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('rounded-xl border bg-card p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]', className)}>{children}</div>
}

export function SectionTitle({ children, sub }: { children: ReactNode; sub?: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-lg font-semibold tracking-tight">{children}</h2>
      {sub && <p className="text-sm text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  )
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'soft'; loading?: boolean }
export function Button({ variant = 'primary', loading, className, children, disabled, ...rest }: BtnProps) {
  const styles = {
    primary: 'bg-sage text-white hover:opacity-90',
    soft: 'bg-sage-soft text-foreground hover:opacity-80',
    ghost: 'bg-transparent hover:bg-muted text-foreground',
  }[variant]
  return (
    <button
      className={cn('inline-flex items-center justify-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed', styles, className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  )
}

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium text-muted-foreground', className)}>{children}</span>
}

export function Spinner() {
  return <div className="flex items-center justify-center py-12 text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{children}</div>
}
