import { NavLink } from 'react-router-dom'
import { Compass, NotebookPen, Scale, LibraryBig, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

const links = [
  { to: '/', label: 'Check-in', icon: NotebookPen, end: true },
  { to: '/decide', label: 'Decide', icon: Scale },
  { to: '/inspiration', label: 'Inspiration', icon: Sparkles },
  { to: '/foundations', label: 'Foundations', icon: LibraryBig },
]

function Items({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      {links.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          end={l.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
              isActive ? 'bg-sage-soft text-foreground' : 'text-muted-foreground hover:bg-muted',
            )
          }
        >
          <l.icon className="size-4 shrink-0" />
          {l.label}
        </NavLink>
      ))}
    </>
  )
}

export function Sidebar() {
  return (
    <aside className="hidden md:flex w-56 shrink-0 flex-col border-r bg-card/50 p-4">
      <div className="mb-6 flex items-center gap-2 px-2">
        <Compass className="size-5 text-sage" />
        <span className="text-base font-semibold tracking-tight">Compass</span>
      </div>
      <nav className="flex flex-col gap-1">
        <Items />
      </nav>
      <p className="mt-auto px-2 text-xs text-muted-foreground">Stay grounded.</p>
    </aside>
  )
}

export function MobileNav() {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 flex justify-around border-t bg-card/95 backdrop-blur px-1 py-1.5">
      {links.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          end={l.end}
          className={({ isActive }) =>
            cn('flex flex-col items-center gap-0.5 rounded-md px-1 py-1 text-[9px] font-medium', isActive ? 'text-sage' : 'text-muted-foreground')
          }
        >
          <l.icon className="size-5" />
          {l.label}
        </NavLink>
      ))}
    </nav>
  )
}
