import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Community from "./pages/Community";
import CalendarPage from "./pages/Calendar";
import Sessions from "./pages/Sessions";
import Program from "./pages/Program";
import Progression from "./pages/Progression";
import Health from "./pages/Health";
import InBody from "./pages/InBody";
import Coaches from "./pages/Coaches";
import Clubs from "./pages/Clubs";
import Meetings from "./pages/Meetings";
import Profile from "./pages/Profile";
import ConseillerSpace from "./pages/ConseillerSpace";
import CoachSpace from "./pages/CoachSpace";
import Certification from "./pages/Certification";
import Roadmap from "./pages/Roadmap";
import AdminUsers from "./pages/AdminUsers";
import { useAuth } from "./context/AuthContext";

function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "MEMBRE") return <Navigate to="/tableau-de-bord" replace />;
  if (user.role === "CONSEILLER") return <Navigate to="/espace-conseiller" replace />;
  if (user.role === "ENTRAINEUR") return <Navigate to="/espace-coach" replace />;
  return <Navigate to="/roadmap" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Layout />}>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/communaute" element={<Community />} />
        <Route path="/tableau-de-bord" element={<Dashboard />} />
        <Route path="/calendrier" element={<CalendarPage />} />
        <Route path="/seances" element={<Sessions />} />
        <Route path="/programme" element={<Program />} />
        <Route path="/progression" element={<Progression />} />
        <Route path="/sante" element={<Health />} />
        <Route path="/inbody" element={<InBody />} />
        <Route path="/coachs" element={<Coaches />} />
        <Route path="/clubs" element={<Clubs />} />
        <Route path="/reunions" element={<Meetings />} />
        <Route path="/profil" element={<Profile />} />
        <Route path="/espace-conseiller" element={<ConseillerSpace />} />
        <Route path="/espace-coach" element={<CoachSpace />} />
        <Route path="/certification" element={<Certification />} />
        <Route path="/roadmap" element={<Roadmap />} />
        <Route path="/admin/utilisateurs" element={<AdminUsers />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
