import { useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import useOnline from '../hooks/useOnline';
import LangSwitch from './LangSwitch';
import NotificationBell from './NotificationBell';
import NotificationToast from './NotificationToast';
import AideBouton from './AideBouton';
import AstucePage from './AstucePage';
import PiedDePage from './PiedDePage';
import { useNonLus, useSuiviNonLus } from '../hooks/useNonLus';
import { resynchroniserPush } from '../services/push';
import { usePrives } from '../context/PrivesContext';
import Icone from './Icone';

const lien = ({ isActive }) => `nav-lien whitespace-nowrap px-2.5 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? 'nav-actif bg-white/15 text-white' : 'text-white/80 hover:text-white'}`;

export default function Layout() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const online = useOnline();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  useSuiviNonLus();
  const userId = user?.id;
  useEffect(() => { if (userId) resynchroniserPush(); }, [userId]); // alertes push : cet appareil suit le compte connecté
  const { total: nonLusSalons } = useNonLus();
  const { total: nonLusPrives } = usePrives();
  const nonLus = nonLusSalons + nonLusPrives;
  const pastille = (to) => (to === '/messages' && nonLus > 0 ? <span className="ml-1 rounded-full bg-accent px-1.5 text-[11px] font-bold text-slate-900">{nonLus > 99 ? '99+' : nonLus}</span> : null);

  const sortir = () => { logout(); navigate('/'); };

  const items = [
    { to: '/forum', label: t('nav.forum'), icon: 'messages' },
    { to: '/developpeurs', label: t('nav.devs'), icon: 'groupe' },
    { to: '/projets', label: t('projets.nav'), icon: 'projet' },
    { to: '/mentorat', label: t('mentorat.nav'), icon: 'mentorat', desktopOnly: true },
    { to: '/classement', label: t('nav.classement'), icon: 'trophee' },
    { to: '/carte', label: t('carte.nav'), icon: 'groupe', desktopOnly: true },
    ...(user ? [{ to: '/messages', label: t('nav.messages'), icon: 'courrier' }] : []),
    ...(user && ['admin', 'moderateur'].includes(user.role) ? [{ to: '/admin', label: t('admin.nav'), icon: 'bouclier', desktopOnly: true }] : []),
    user ? { to: '/profil', label: t('nav.profil'), icon: 'utilisateur' } : { to: '/connexion', label: t('nav.connexion'), icon: 'cle' }
  ];
  const itemsBas = items.filter((i) => !i.desktopOnly);
  const sansPied = pathname.startsWith('/messages'); // la messagerie occupe tout l'écran : pas de pied de page

  return (
    <div className="flex min-h-screen flex-col">
      <div key={`b${pathname}`} className="barre-route" aria-hidden />
      <header className="en-tete sticky top-0 z-20 bg-brand text-white shadow">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-3">
          <Link to="/" className="shrink-0 whitespace-nowrap text-lg font-bold transition-transform duration-200 hover:scale-105">&lt;/&gt; {t('app.nom')}</Link>
          <nav className="hidden items-center gap-0.5 lg:flex">
            {items.map((i) => <NavLink key={i.to} to={i.to} className={lien}>{i.label}{pastille(i.to)}</NavLink>)}
            {user && <button onClick={sortir} className="whitespace-nowrap px-2.5 py-2 text-sm text-white/80 hover:text-white">{t('nav.deconnexion')}</button>}
            {!user && <NavLink to="/inscription" className={lien}>{t('nav.inscription')}</NavLink>}
          </nav>
          <div className="flex items-center gap-1">
            {user && <NotificationBell />}
            <LangSwitch />
            {/* Mobile et tablette : la navigation du haut est masquée, on garde connexion / déconnexion dans l'en-tête */}
            <div className="flex items-center lg:hidden">
              {user
                ? <button type="button" onClick={sortir} aria-label={t('nav.deconnexion')} title={t('nav.deconnexion')} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-white/90 hover:bg-white/10"><Icone nom="retour" className="rotate-180" /><span className="hidden sm:inline">{t('nav.deconnexion')}</span></button>
                : <><Link to="/connexion" className="rounded-lg px-2 py-1.5 text-sm font-medium text-white/90 hover:bg-white/10">{t('nav.connexion')}</Link><Link to="/inscription" className="ml-1 rounded-lg bg-accent px-2.5 py-1.5 text-sm font-semibold text-slate-900">{t('nav.inscription')}</Link></>}
            </div>
          </div>
        </div>
        {!online && <div className="bg-accent px-4 py-1 text-center text-sm text-slate-900">{t('commun.hors_ligne')}</div>}
      </header>

      <main className={`mx-auto w-full max-w-5xl flex-1 px-4 py-6 ${sansPied ? 'pb-24' : ''} lg:pb-6`}>
        <AstucePage />
        <div key={pathname.split('/').slice(0, 2).join('/')} className="page-enter"><Outlet /></div>
      </main>

      {!sansPied && <div className="pb-16 bg-brand lg:pb-0"><PiedDePage user={user} /></div>}

      {/* Navigation basse, mobile uniquement (mobile-first) */}
      <nav style={{ gridTemplateColumns: `repeat(${itemsBas.length}, minmax(0, 1fr))` }} className="fixed inset-x-0 bottom-0 z-20 grid border-t border-slate-200 bg-white lg:hidden">
        {itemsBas.map((i) => (
          <NavLink key={i.to} to={i.to} className={({ isActive }) => `flex flex-col items-center py-2 text-xs transition-colors ${isActive ? 'nav-bas-actif text-brand font-semibold' : 'text-slate-500'}`}>
            <span className="relative text-lg" aria-hidden><Icone nom={i.icon} />{nonLus > 0 && i.to === '/messages' && <span className="absolute -right-3 -top-1 rounded-full bg-accent px-1 text-[10px] font-bold leading-4 text-slate-900">{nonLus > 99 ? '99+' : nonLus}</span>}</span>{i.label}
          </NavLink>
        ))}
      </nav>
      <NotificationToast />
      <AideBouton />
    </div>
  );
}
