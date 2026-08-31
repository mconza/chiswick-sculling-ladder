// js/toast.js - Toast notifications

export function showToast(msg, type) {
  var t = document.createElement('div');
  t.className = 'toast toast-' + (type || 'success');
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(function() { t.classList.add('toast-show'); });
  setTimeout(function() {
    t.classList.remove('toast-show');
    setTimeout(function() { t.remove(); }, 400);
  }, 2500);
}
