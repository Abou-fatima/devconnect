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
import Forum from './pages/Forum';
import Question from './pages/Question';
import PoserQuestion from './pages/PoserQuestion';
import Classement from './pages/Classement';
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
        <Route path="forum" element={<Forum />} />
        <Route path="forum/poser" element={<ProtectedRoute><PoserQuestion /></ProtectedRoute>} />
        <Route path="forum/questions/:id" element={<Question />} />
        <Route path="classement" element={<Classement />} />
        <Route path="messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
        <Route path="messages/:canal" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
        <Route path="notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
        <Route path="*" element={<p className="py-10 text-center text-slate-500">404</p>} />
      </Route>
    </Routes>
  );
}
