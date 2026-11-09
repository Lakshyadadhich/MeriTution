import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AppLayout from "./layouts/AppLayout.jsx";
import AttendancePage from "./pages/AttendancePage.jsx";
import BatchesPage from "./pages/BatchesPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import FeesPage from "./pages/FeesPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import MorePage from "./pages/MorePage.jsx";
import RecordPaymentPage from "./pages/RecordPaymentPage.jsx";
import ReportsPage from "./pages/ReportsPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import StudentFormPage from "./pages/StudentFormPage.jsx";
import StudentProfilePage from "./pages/StudentProfilePage.jsx";
import StudentsPage from "./pages/StudentsPage.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="/students" element={<StudentsPage />} />
        <Route path="/students/new" element={<StudentFormPage />} />
        <Route path="/students/:id" element={<StudentProfilePage />} />
        <Route path="/students/:id/edit" element={<StudentFormPage />} />
        <Route path="/batches" element={<BatchesPage />} />
        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="/fees" element={<FeesPage />} />
        <Route path="/payments/new" element={<RecordPaymentPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/more" element={<MorePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
