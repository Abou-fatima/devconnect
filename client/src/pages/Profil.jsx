import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getUser } from '../services/users';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import { canalPrive } from '../lib/canaux';

// /profil → mon profil ; /developpeurs/:id → profil public
export default function Profil() {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const { user: moi } = useAuth();
  const [autre, setAutre] = useState(null);
  const [etat, setEtat] = useState(id ? 'chargement' : 'ok');

  useEffect(() => {
    if (!id) return;
    setEtat('chargement');
    getUser(id).then((d) => { setAutre(d.utilisateur || d); setEtat('ok'); }).catch(() => setEtat('introuvable'));
  }, [id]);

  const u = id ? autre : moi;
  if (etat === 'chargement') return <p className="text-slate-500">{t('commun.chargement')}</p>;
  if (etat === 'introuvable' || !u) return <p className="erreur">{t('profil.introuvable')}</p>;

  const estMoi = moi && u.id === moi.id;
  const canalMessage = moi && !estMoi ? canalPrive(moi.id, u.id) : null;
  // Sécurité : seuls les liens http(s) sont cliquables (jamais 'javascript:')
  const sur = (url) => (/^https?:\/\//i.test(url || '') ? url : '');
  const liens = Object.fromEntries(Object.entries(u.profil?.liens || {}).map(([k, v]) => [k, k === 'whatsapp' ? v : sur(v)]));
  const date = u.created_at ? new Date(u.created_at).toLocaleDateString(i18n.language) : '';

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="card flex items-center gap-4">
        <Avatar user={u} size={72} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-bold">{u.pseudo}</h1>
          <p className="text-sm text-slate-500">{[u.ville, u.pays].filter(Boolean).join(', ')}</p>
          {u.profil?.niveau && <span className="mt-1 inline-block rounded bg-brand/10 px-2 py-0.5 text-xs text-brand">{t(`profil.niveaux.${u.profil.niveau}`)}</span>}
        </div>
        <div className="text-right text-sm"><div className="text-xl font-bold">⭐ {u.reputation ?? 0}</div><div className="text-slate-500">{t('profil.reputation')}</div></div>
      </div>

      {u.profil?.bio && <div className="card"><p className="whitespace-pre-line">{u.profil.bio}</p></div>}

      {(u.stacks?.length > 0 || u.objectifs?.length > 0) && (
        <div className="card space-y-3">
          {u.stacks?.length > 0 && <div className="flex flex-wrap gap-1">{u.stacks.map((s) => <span key={s} className="rounded bg-slate-100 px-2 py-0.5 text-sm">{s}</span>)}</div>}
          {u.objectifs?.length > 0 && <div><div className="label">{t('profil.objectifs')}</div><div className="flex flex-wrap gap-1">{u.objectifs.map((o) => <span key={o} className="rounded bg-accent/20 px-2 py-0.5 text-sm">{t(`profil.objectifs_liste.${o}`)}</span>)}</div></div>}
        </div>
      )}

      {u.badges?.length > 0 && <div className="card"><div className="label">{t('profil.badges')}</div><div className="flex flex-wrap gap-2">{u.badges.map((b, i) => <span key={i} className="rounded-full bg-slate-100 px-3 py-1 text-sm">🏅 {typeof b === 'string' ? b : b.nom || b.code}</span>)}</div></div>}

      {Object.values(liens).some(Boolean) && (
        <div className="card"><div className="label">{t('profil.liens')}</div>
          <ul className="space-y-1 text-sm">
            {liens.github && <li><a className="text-brand-light underline" href={liens.github} target="_blank" rel="noopener noreferrer">GitHub</a></li>}
            {liens.linkedin && <li><a className="text-brand-light underline" href={liens.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a></li>}
            {liens.site && <li><a className="text-brand-light underline" href={liens.site} target="_blank" rel="noopener noreferrer">{t('profil.site')}</a></li>}
            {liens.whatsapp && <li><a className="text-brand-light underline" href={`https://wa.me/${liens.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">WhatsApp</a></li>}
          </ul>
        </div>
      )}

      <p className="text-center text-xs text-slate-400">{t('profil.membre_depuis', { date })}</p>
      {canalMessage && <div className="text-center"><Link to={`/messages/${encodeURIComponent(canalMessage)}`} className="btn">{t('chat.ecrire_a', { pseudo: u.pseudo })}</Link></div>}
      {estMoi && <div className="text-center"><Link to="/profil/modifier" className="btn">{t('profil.modifier')}</Link></div>}
    </div>
  );
}
