import { Routes, Route, Navigate } from 'react-router-dom';

// Auth pages
import Home     from './pages/Home';
import Login    from './pages/Login';
import Register from './pages/Register';

// Business pages
import Dashboard   from './pages/Dashboard';
import Profile     from './pages/Profile';
import Connections from './pages/Connections';
import Search      from './pages/Search';
import Messages    from './pages/Messages';
import Analytics   from './pages/Analytics';

// Admin pages
import AdminDashboard     from './pages/AdminDashboard';
import AdminUsers         from './pages/AdminUsers';
import AdminRegistrations from './pages/AdminRegistrations';

// Layouts
import BusinessLayout from './components/BusinessLayout';
import AdminLayout    from './components/AdminLayout';

// Route guards
import { PrivateRoute, AdminRoute, BusinessRoute } from './PrivateRoute';

import './App.css';

function App() {
  return (
    <div className="app-container">
      <Routes>

        {/* Public routes — no login needed */}
        <Route path="/"         element={<Home />} />
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Business routes — must be logged in as business */}
        <Route path="/dashboard" element={
          <BusinessRoute>
            <BusinessLayout><Dashboard /></BusinessLayout>
          </BusinessRoute>
        } />

        <Route path="/profile" element={
          <BusinessRoute>
            <BusinessLayout><Profile /></BusinessLayout>
          </BusinessRoute>
        } />

        <Route path="/profile/:userId" element={
          <PrivateRoute>
            <BusinessLayout><Profile /></BusinessLayout>
          </PrivateRoute>
        } />

        <Route path="/connections" element={
          <BusinessRoute>
            <BusinessLayout><Connections /></BusinessLayout>
          </BusinessRoute>
        } />

        <Route path="/search" element={
          <BusinessRoute>
            <BusinessLayout><Search /></BusinessLayout>
          </BusinessRoute>
        } />

        <Route path="/messages" element={
          <BusinessRoute>
            <BusinessLayout><Messages /></BusinessLayout>
          </BusinessRoute>
        } />

        <Route path="/analytics" element={
          <BusinessRoute>
            <BusinessLayout><Analytics /></BusinessLayout>
          </BusinessRoute>
        } />

        {/* Admin routes — must be logged in as admin */}
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

        <Route path="/admin/dashboard" element={
          <AdminRoute>
            <AdminLayout><AdminDashboard /></AdminLayout>
          </AdminRoute>
        } />

        <Route path="/admin/registrations" element={
          <AdminRoute>
            <AdminLayout><AdminRegistrations /></AdminLayout>
          </AdminRoute>
        } />

        <Route path="/admin/users" element={
          <AdminRoute>
            <AdminLayout><AdminUsers /></AdminLayout>
          </AdminRoute>
        } />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/login" replace />} />

      </Routes>
    </div>
  );
}

export default App;