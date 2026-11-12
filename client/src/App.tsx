import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import RouteMetadata from "./components/RouteMetadata";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Help from "./pages/Help";
import PublicNotices from "./pages/PublicNotices";

const Login = lazy(() => import("./pages/Login"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const Signup = lazy(() => import("./pages/Signup"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Member = lazy(() => import("./pages/Member"));
const MemberServices = lazy(() => import("./pages/MemberServices"));
const AdminPortal = lazy(() => import("./pages/AdminPortal"));
const AdminFinance = lazy(() => import("./pages/AdminFinance"));
const InviteManagement = lazy(() => import("./pages/InviteManagement"));

function Router() {
  return (
    <Suspense
      fallback={
        <div className="member-loading" role="status">
          <div className="member-loading-mark" />
          <p>화면을 불러오는 중…</p>
        </div>
      }
    >
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/help" component={Help} />
        <Route path="/notices" component={PublicNotices} />
        <Route path="/login" component={Login} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/signup" component={Signup} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/member" component={Member} />
        <Route path="/member/services" component={MemberServices} />
        <Route path="/admin" component={AdminPortal} />
        <Route path="/admin/finance" component={AdminFinance} />
        <Route path="/admin/invites" component={InviteManagement} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <RouteMetadata />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
