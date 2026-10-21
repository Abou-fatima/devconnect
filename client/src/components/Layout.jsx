import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import useOnline from '../hooks/useOnline';
import LangSwitch from './LangSwitch';

const lien = ({ isActive }) => `px-3 py-2 rounded-lg text-sm font-medium ${isActive ? 'bg-white/20 text-white' : 'text-white/80 hover:text-white'}`;

export default function Layout() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const online = useOnline();
  const navigate = useNavigate();

  const sortir = () => { logout(); navigate('/'); };

  const items = [
    { to: '/forum', label: t('nav.forum'), icon: '💬' },
    { to: '/developpeurs', label: t('nav.devs'), icon: '👥' },
    { to: '/classement', label: t('nav.classement'), icon: '🏆' },
    user ? { to: '/profil', label: t('nav.profil'), icon: '👤' } : { to: '/connexion', label: t('nav.connexion'), icon: '🔑' }
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 bg-brand text-white shadow">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-3">
          <Link to="/" className="text-lg font-bold">&lt;/&gt; {t('app.nom')}</Link>
          <nav className="hidden items-center gap-1 md:flex">
            {items.map((i) => <NavLink key={i.to} to={i.to} className={lien}>{i.label}</NavLink>)}
            {user && <button onClick={sortir} className="px-3 py-2 text-sm text-white/80 hover:text-white">{t('nav.deconnexion')}</button>}
            {!user && <NavLink to="/inscription" className={lien}>{t('nav.inscription')}</NavLink>}
          </nav>
          <LangSwitch />
        </div>
        {!online && <div className="bg-accent px-4 py-1 text-center text-sm text-slate-900">{t('commun.hors_ligne')}</div>}
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-24 md:pb-6">
        <Outlet />
      </main>

      {/* Navigation basse, mobile uniquement (mobile-first) */}
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-slate-200 bg-white md:hidden">
        {items.map((i) => (
          <NavLink key={i.to} to={i.to} className={({ isActive }) => `flex flex-col items-center py-2 text-xs ${isActive ? 'text-brand font-semibold' : 'text-slate-500'}`}>
            <span className="text-lg" aria-hidden>{i.icon}</span>{i.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
