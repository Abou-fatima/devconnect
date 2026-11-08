import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { PrivesProvider } from './context/PrivesContext';
import ProtectedRoute from './components/ProtectedRoute';
import PageChargement from './components/PageChargement';
import BarriereErreur from './components/BarriereErreur';
import Accueil from './pages/Accueil';
import Connexion from './pages/Connexion';
import Inscription from './pages/Inscription';
import AuthCallback from './pages/AuthCallback';

// Chargement à la demande : seules l'accueil, la connexion et l'inscription sont dans le premier fichier ; les autres pages
// ne sont téléchargées qu'au premier passage (premier affichage plus rapide, utile avec une connexion lente).
const Projets = lazy(() => import('./pages/Projets'));
const Mentorat = lazy(() => import('./pages/Mentorat'));
const Bienvenue = lazy(() => import('./pages/Bienvenue'));
const Projet = lazy(() => import('./pages/Projet'));
const ProjetForm = lazy(() => import('./pages/ProjetForm'));
const Profil = lazy(() => import('./pages/Profil'));
const ProfilEdit = lazy(() => import('./pages/ProfilEdit'));
const Recherche = lazy(() => import('./pages/Recherche'));
const Forum = lazy(() => import('./pages/Forum'));
const Question = lazy(() => import('./pages/Question'));
const PoserQuestion = lazy(() => import('./pages/PoserQuestion'));
const Classement = lazy(() => import('./pages/Classement'));
const Carte = lazy(() => import('./pages/Carte'));
const Messages = lazy(() => import('./pages/Messages'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Admin = lazy(() => import('./pages/Admin'));
const SalonInvitation = lazy(() => import('./pages/SalonInvitation'));
const NotFound = lazy(() => import('./pages/NotFound'));

const page = (element) => <BarriereErreur><Suspense fallback={<PageChargement />}>{element}</Suspense></BarriereErreur>;

export default function App() {
  return (
    <Routes>
      <Route element={<PrivesProvider><Layout /></PrivesProvider>}>
        <Route index element={<Accueil />} />
        <Route path="connexion" element={<Connexion />} />
        <Route path="inscription" element={<Inscription />} />
        <Route path="auth/callback" element={<AuthCallback />} />
        <Route path="developpeurs" element={page(<Recherche />)} />
        <Route path="developpeurs/:id" element={page(<Profil />)} />
        <Route path="profil" element={<ProtectedRoute>{page(<Profil />)}</ProtectedRoute>} />
        <Route path="profil/modifier" element={<ProtectedRoute>{page(<ProfilEdit />)}</ProtectedRoute>} />
        <Route path="forum" element={page(<Forum />)} />
        <Route path="forum/poser" element={<ProtectedRoute>{page(<PoserQuestion />)}</ProtectedRoute>} />
        <Route path="forum/questions/:id" element={page(<Question />)} />
        <Route path="projets" element={page(<Projets />)} />
        <Route path="projets/nouveau" element={<ProtectedRoute>{page(<ProjetForm />)}</ProtectedRoute>} />
        <Route path="projets/:id" element={page(<Projet />)} />
        <Route path="projets/:id/modifier" element={<ProtectedRoute>{page(<ProjetForm />)}</ProtectedRoute>} />
        <Route path="bienvenue" element={<ProtectedRoute>{page(<Bienvenue />)}</ProtectedRoute>} />
        <Route path="mentorat" element={page(<Mentorat />)} />
        <Route path="classement" element={page(<Classement />)} />
        <Route path="carte" element={page(<Carte />)} />
        <Route path="messages" element={<ProtectedRoute>{page(<Messages />)}</ProtectedRoute>} />
        <Route path="messages/:canal" element={<ProtectedRoute>{page(<Messages />)}</ProtectedRoute>} />
        <Route path="admin" element={<ProtectedRoute roles={['admin', 'moderateur']}>{page(<Admin />)}</ProtectedRoute>} />
        <Route path="salons/invitation/:code" element={<ProtectedRoute>{page(<SalonInvitation />)}</ProtectedRoute>} />
        <Route path="notifications" element={<ProtectedRoute>{page(<Notifications />)}</ProtectedRoute>} />
        <Route path="*" element={page(<NotFound />)} />
      </Route>
    </Routes>
  );
}
