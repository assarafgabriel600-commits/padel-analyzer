import React from 'react'
import { Outlet, NavLink } from 'react-router-dom'

const tabs = [
  { to: '/accueil', icon: ClockIcon, label: 'Mes sujets' },
  { to: '/creer',   icon: WandIcon,  label: 'Créer' },
  { to: '/compte',  icon: UserIcon,  label: 'Compte' },
]

export default function Layout() {
  return (
    <div className="flex flex-col min-h-dvh">
      {/* Page content */}
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      {/* Bottom nav bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur border-t border-gray-100 z-50">
        <div className="max-w-lg mx-auto flex">
          {tabs.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors
                 ${isActive ? 'text-brev-blue' : 'text-gray-400 hover:text-gray-600'}`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon active={isActive} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}

function ClockIcon({ active }) {
  return (
    <svg className={`w-6 h-6 ${active ? 'fill-brev-blue' : 'fill-gray-400'}`} viewBox="0 0 24 24">
      <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm.5 10.79V7a.5.5 0 0 0-1 0v6a.5.5 0 0 0 .22.41l3.5 2.33a.5.5 0 0 0 .56-.83z"/>
    </svg>
  )
}

function WandIcon({ active }) {
  return (
    <svg className={`w-6 h-6 ${active ? 'stroke-brev-blue' : 'stroke-gray-400'}`} fill="none" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
    </svg>
  )
}

function UserIcon({ active }) {
  return (
    <svg className={`w-6 h-6 ${active ? 'fill-brev-blue' : 'fill-gray-400'}`} viewBox="0 0 24 24">
      <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clipRule="evenodd" />
    </svg>
  )
}
