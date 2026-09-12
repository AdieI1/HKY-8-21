import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * Higher-order component that guards routes based on authentication and user roles.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {string[]} [props.allowedRoles] - Optional list of allowed roles (e.g., ['admin', 'staff'])
 */
export function ProtectedRoute({ children, allowedRoles }) {
  const token = localStorage.getItem('auth_token');

  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    let authUser = {};
    try {
      authUser = JSON.parse(localStorage.getItem('auth_user') || '{}');
    } catch {
      authUser = {};
    }

    const roleName = (authUser?.role?.role_name || '').toLowerCase();
    const isAllowed = allowedRoles.some((r) => roleName.includes(r.toLowerCase()));

    if (!isAllowed) {
      // Non-admin attempting to access admin-only area -> redirect to dashboard
      const isAdmin = roleName.includes('admin');
      return <Navigate to={isAdmin ? '/overview' : '/dashboard'} replace />;
    }
  }

  return children;
}

/**
 * Route guard for public-only pages (such as Login).
 * If the user is already authenticated, redirects them to their appropriate dashboard.
 */
export function PublicRoute({ children }) {
  const token = localStorage.getItem('auth_token');

  if (token) {
    let authUser = {};
    try {
      authUser = JSON.parse(localStorage.getItem('auth_user') || '{}');
    } catch {
      authUser = {};
    }

    const roleName = (authUser?.role?.role_name || '').toLowerCase();
    return <Navigate to={roleName.includes('admin') ? '/overview' : '/dashboard'} replace />;
  }

  return children;
}

export default ProtectedRoute;
