import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { WalletProvider } from "@/context/WalletContext";
import FeedPage    from "@/pages/FeedPage";
import CreatePage  from "@/pages/CreatePage";
import DarePage    from "@/pages/DarePage";
import ProfilePage from "@/pages/ProfilePage";

function App() {
  return (
    <WalletProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/"           element={<FeedPage />} />
          <Route path="/create"     element={<CreatePage />} />
          <Route path="/dare/:id"   element={<DarePage />} />
          <Route path="/profile"    element={<ProfilePage />} />
          <Route path="*"           element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </WalletProvider>
  );
}

export default App;
