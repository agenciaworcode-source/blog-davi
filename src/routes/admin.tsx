import { createFileRoute, Outlet, useNavigate, Navigate, useLocation, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  LayoutDashboard, 
  Newspaper, 
  Users, 
  Settings, 
  LogOut,
  ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/admin')({
  component: AdminLayout,
})

function AdminLayout() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (!session && location.pathname !== '/admin/login') {
        navigate({ to: '/admin/login' })
      }
    })

    return () => subscription.unsubscribe()
  }, [navigate, location.pathname])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="font-medium animate-pulse">Carregando painel...</p>
        </div>
      </div>
    )
  }

  const isLoginPage = location.pathname === '/admin/login'
  
  if (!session && !isLoginPage) {
    return <Navigate to="/admin/login" />
  }

  if (isLoginPage) {
    return <Outlet />
  }

  const navItems = [
    { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { label: 'Posts e Notícias', href: '/admin/posts', icon: Newspaper },
    { label: 'Inscritos', href: '/admin/newsletter', icon: Users },
    { label: 'Configurações', href: '/admin/settings', icon: Settings },
  ]

  return (
    <div className="flex min-h-screen bg-muted/10">
      {/* Sidebar Lateral */}
      <aside className="w-64 border-r border-border bg-background p-6 flex flex-col shadow-sm">
        <div className="mb-10 px-2">
          <span className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold">LFM Economy</span>
          <h2 className="font-serif text-2xl font-semibold text-foreground">Admin</h2>
        </div>
        
        <nav className="space-y-1 text-sm flex-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center justify-between rounded-lg px-3 py-2.5 font-medium transition-all duration-200 group",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={cn("h-4 w-4", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary transition-colors")} />
                  {item.label}
                </div>
                {isActive && <ChevronRight className="h-3 w-3 opacity-50" />}
              </Link>
            )
          })}
        </nav>

        <div className="pt-6 border-t border-border mt-6">
          <button 
            onClick={() => supabase.auth.signOut()} 
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors group"
          >
            <LogOut className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            Encerrar Sessão
          </button>
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
