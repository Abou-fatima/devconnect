import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Accueil from './pages/Accueil';
import Connexion from './pages/Connexion';
import Inscription from './pages/Inscription';
import AuthCallback from './pages/AuthCallback';
import Profil from './pages/Profil';
import ProfilEdit from './pages/ProfilEdit';
import Recherche from './pages/Recherche';
import Bientot from './pages/Bientot';
import Messages from './pages/Messages';
import Notifications from './pages/Notifications';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Accueil />} />
        <Route path="connexion" element={<Connexion />} />
        <Route path="inscription" element={<Inscription />} />
        <Route path="auth/callback" element={<AuthCallback />} />
        <Route path="developpeurs" element={<Recherche />} />
        <Route path="developpeurs/:id" element={<Profil />} />
        <Route path="profil" element={<ProtectedRoute><Profil /></ProtectedRoute>} />
        <Route path="profil/modifier" element={<ProtectedRoute><ProfilEdit /></ProtectedRoute>} />
        {/* TODO Dev 2 (API) : brancher Forum, Question/:id, PoserQuestion, Classement */}
        <Route path="forum" element={<Bientot cle="forum" />} />
        <Route path="classement" element={<Bientot cle="classement" />} />
        <Route path="messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
        <Route path="messages/:canal" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
        <Route path="notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
        <Route path="*" element={<p className="py-10 text-center text-slate-500">404</p>} />
      </Route>
    </Routes>
  );
}
