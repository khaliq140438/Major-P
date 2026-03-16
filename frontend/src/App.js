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

import './App.css';

function App() {
  return (
    <div className="app-container">
      <Routes>
        {/* Public routes */}
        <Route path="/"         element={<Home />} />
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Business routes */}
        <Route path="/dashboard"   element={<BusinessLayout><Dashboard /></BusinessLayout>} />
        <Route path="/profile"     element={<BusinessLayout><Profile /></BusinessLayout>} />
        <Route path="/profile/:userId" element={<BusinessLayout><Profile /></BusinessLayout>} />
        <Route path="/connections" element={<BusinessLayout><Connections /></BusinessLayout>} />
        <Route path="/search"      element={<BusinessLayout><Search /></BusinessLayout>} />
        <Route path="/messages"    element={<BusinessLayout><Messages /></BusinessLayout>} />
        <Route path="/analytics"   element={<BusinessLayout><Analytics /></BusinessLayout>} />

        {/* Admin routes */}
        <Route path="/admin"                    element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/dashboard"          element={<AdminLayout><AdminDashboard /></AdminLayout>} />
        <Route path="/admin/registrations"      element={<AdminLayout><AdminRegistrations /></AdminLayout>} />
        <Route path="/admin/users"              element={<AdminLayout><AdminUsers /></AdminLayout>} />

        {/* Catch-all — redirect unknown routes to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  );
}

export default App;