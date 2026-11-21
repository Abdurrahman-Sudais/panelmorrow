import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { AppLayout } from "@/components/layout/AppLayout";
import { RequireAuth } from "@/context/AuthContext";
import HomePage from "@/pages/public/HomePage";

const FeaturesPage = lazy(() => import("@/pages/public/FeaturesPage"));
const SolutionsPage = lazy(() => import("@/pages/public/SolutionsPage"));
const HowItWorksPage = lazy(() => import("@/pages/public/HowItWorksPage"));
const PricingPage = lazy(() => import("@/pages/public/PricingPage"));
const AboutPage = lazy(() => import("@/pages/public/AboutPage"));
const ContactPage = lazy(() => import("@/pages/public/ContactPage"));
const NotFoundPage = lazy(() => import("@/pages/public/NotFoundPage"));
const LoginPage = lazy(() => import("@/pages/auth/LoginPage"));
const RegisterPage = lazy(() => import("@/pages/auth/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("@/pages/auth/ForgotPasswordPage"));

const DashboardPage = lazy(() => import("@/pages/app/DashboardPage"));
const SitesPage = lazy(() => import("@/pages/app/SitesPage"));
const SiteFormPage = lazy(() => import("@/pages/app/SiteFormPage"));
const SiteDetailPage = lazy(() => import("@/pages/app/SiteDetailPage"));
const PerformancePage = lazy(() => import("@/pages/app/PerformancePage"));
const AnomaliesPage = lazy(() => import("@/pages/app/AnomaliesPage"));
const MaintenancePage = lazy(() => import("@/pages/app/MaintenancePage"));
const VerificationPage = lazy(() => import("@/pages/app/VerificationPage"));
const ReportsPage = lazy(() => import("@/pages/app/ReportsPage"));
const DataImportsPage = lazy(() => import("@/pages/app/DataImportsPage"));
const SettingsPage = lazy(() => import("@/pages/app/SettingsPage"));

function Loading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-solar-500 border-t-transparent" />
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<HomePage />} />
          <Route path="features" element={<FeaturesPage />} />
          <Route path="solutions" element={<SolutionsPage />} />
          <Route path="how-it-works" element={<HowItWorksPage />} />
          <Route path="pricing" element={<PricingPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="contact" element={<ContactPage />} />
        </Route>
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route
          path="app"
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Suspense fallback={<Loading />}><DashboardPage /></Suspense>} />
          <Route path="sites" element={<Suspense fallback={<Loading />}><SitesPage /></Suspense>} />
          <Route path="sites/new" element={<Suspense fallback={<Loading />}><SiteFormPage /></Suspense>} />
          <Route path="sites/:id/edit" element={<Suspense fallback={<Loading />}><SiteFormPage /></Suspense>} />
          <Route path="sites/:id" element={<Suspense fallback={<Loading />}><SiteDetailPage /></Suspense>} />
          <Route path="performance" element={<Suspense fallback={<Loading />}><PerformancePage /></Suspense>} />
          <Route path="anomalies" element={<Suspense fallback={<Loading />}><AnomaliesPage /></Suspense>} />
          <Route path="maintenance" element={<Suspense fallback={<Loading />}><MaintenancePage /></Suspense>} />
          <Route path="verification" element={<Suspense fallback={<Loading />}><VerificationPage /></Suspense>} />
          <Route path="reports" element={<Suspense fallback={<Loading />}><ReportsPage /></Suspense>} />
          <Route path="data" element={<Suspense fallback={<Loading />}><DataImportsPage /></Suspense>} />
          <Route path="settings" element={<Suspense fallback={<Loading />}><SettingsPage /></Suspense>} />
        </Route>
        <Route element={<PublicLayout />}>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
