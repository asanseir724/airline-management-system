import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import Requests from "@/pages/requests";
import RequestForm from "@/pages/request-form";
import SmsManagement from "@/pages/sms-management";
import TelegramIntegration from "@/pages/telegram-integration";
import Backup from "@/pages/backup";
import CustomerRequestForm from "@/pages/customer-request-form";
import SystemManagement from "@/pages/system-management";
import { ProtectedRoute } from "./lib/protected-route";
import { AuthProvider } from "./hooks/use-auth";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/requests" component={Requests} />
      <ProtectedRoute path="/request-form" component={RequestForm} />
      <ProtectedRoute path="/sms-management" component={SmsManagement} />
      <ProtectedRoute path="/telegram-integration" component={TelegramIntegration} />
      <ProtectedRoute path="/backup" component={Backup} />
      <ProtectedRoute path="/system-management" component={SystemManagement} />
      
      <Route path="/auth" component={AuthPage} />
      <Route path="/customer-request-form" component={CustomerRequestForm} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
