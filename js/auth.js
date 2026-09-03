// js/auth.js - Authentication and user identity

export function checkAuth() {
  if (localStorage.getItem('csl_auth') !== 'true') {
    window.location.href = './index.html';
    return false;
  }
  return true;
}

export function isAdmin() {
  return localStorage.getItem('csl_role') === 'admin';
}

export function getUserId() {
  var id = localStorage.getItem('csl_user_id');
  return id ? parseInt(id) : null;
}

export function getMe(scullers) {
  var userId = getUserId();
  if (userId == null) return null;
  return scullers.find(function(s) { return s.id === userId; }) || null;
}

export function logout() {
  localStorage.removeItem('csl_auth');
  localStorage.removeItem('csl_role');
  localStorage.removeItem('csl_user_id');
  localStorage.removeItem('csl_user_name');
  localStorage.removeItem('csl_user_club');
  window.location.href = './index.html';
}
