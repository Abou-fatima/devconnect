import { Link } from 'react-router-dom';
import Avatar from './Avatar';

export default function DevCard({ u }) {
  return (
    <Link to={`/developpeurs/${u.id}`} className="card flex items-start gap-3 transition hover:shadow-md">
      <Avatar user={u} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="truncate font-semibold">{u.pseudo}</h3>
          <span className="shrink-0 text-sm text-slate-500">⭐ {u.reputation ?? 0}</span>
        </div>
        <p className="text-sm text-slate-500">{[u.ville, u.pays].filter(Boolean).join(', ')}</p>
        <div className="mt-2 flex flex-wrap gap-1">
          {(u.stacks || []).slice(0, 5).map((s) => <span key={s} className="rounded bg-slate-100 px-2 py-0.5 text-xs">{s}</span>)}
        </div>
      </div>
    </Link>
  );
}
