import { createRoot } from "react-dom/client";
import { useEffect } from "react";
import { usePathname } from "./shims";
import { AppProvider } from "@/lib/store";
import { ConfirmProvider, ToastProvider } from "@/components/ui";
import { AppShell } from "@/components/shell/AppShell";
import Home from "@/app/page";
import LoginPage from "@/app/connexion/page";
import SignupPage from "@/app/inscription/page";
import { PlanningView } from "@/components/planning/PlanningView";
import TeamPage from "@/app/(app)/equipe/page";
import NeedsPage from "@/app/(app)/besoins/page";
import TemplatesPage from "@/app/(app)/modeles/page";
import SharePage from "@/app/(app)/partage/page";
import SettingsPage from "@/app/(app)/reglages/page";
import { PublicPlanning } from "@/components/PublicPlanning";
import { SetupWizard } from "@/components/setup/SetupWizard";
import { EmployeePage } from "@/components/team/EmployeePage";
import { NavTracker } from "@/components/NavTracker";

const APP: Record<string, () => React.ReactNode> = {
  "/planning": () => <PlanningView />,
  "/equipe": () => <TeamPage />,
  "/besoins": () => <NeedsPage />,
  "/modeles": () => <TemplatesPage />,
  "/partage": () => <SharePage />,
  "/reglages": () => <SettingsPage />,
};

function Router() {
  const path = usePathname();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [path]);
  if (path === "/connexion") return <LoginPage />;
  if (path === "/inscription") return <SignupPage />;
  if (path === "/configuration") return <SetupWizard />;
  if (path.startsWith("/p/")) return <PublicPlanning token="demo" />;
  const fiche = path.match(/^\/equipe\/(.+)$/);
  if (fiche) return <AppShell><EmployeePage id={fiche[1]} /></AppShell>;
  if (APP[path]) return <AppShell>{APP[path]()}</AppShell>;
  return <Home />;
}

createRoot(document.getElementById("root")!).render(
  <AppProvider>
    <ToastProvider>
      <ConfirmProvider>
      <NavTracker />
      <Router />
      </ConfirmProvider>
    </ToastProvider>
  </AppProvider>,
);
