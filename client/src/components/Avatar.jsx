export default function Avatar({ user, size = 48 }) {
  const photo = user?.profil?.photo;
  const style = { width: size, height: size };
  if (photo) return <img src={photo} alt="" style={style} className="shrink-0 rounded-full object-cover" loading="lazy" />;
  return (
    <div style={style} className="flex shrink-0 items-center justify-center rounded-full bg-brand text-lg font-bold text-white">
      {(user?.pseudo || '?').slice(0, 1).toUpperCase()}
    </div>
  );
}
