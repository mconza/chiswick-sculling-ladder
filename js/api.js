// js/api.js - All HTTP calls (no DOM, no state)

export function getVotes() {
  return fetch('/api/votes').then(function(r) { return r.json(); });
}

export function postVotes(payload) {
  return fetch('/api/votes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).catch(function() {});
}

export function getConfig() {
  return fetch('/api/config').then(function(r) { return r.json(); });
}

export function postConfig(payload) {
  return fetch('/api/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).catch(function() {});
}

export function getHistory() {
  return fetch('/api/history').then(function(r) { return r.json(); });
}

export function getHistoryDate(date) {
  return fetch('/api/history/' + date).then(function(r) { return r.json(); });
}

export function saveHistory(snapshot) {
  return fetch('/api/history/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(snapshot)
  }).then(function(r) { return r.json(); });
}

export function postRequest(payload) {
  return fetch('/api/requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).then(function(r) { return r.json(); });
}

export function deleteRequest(id) {
  return fetch('/api/requests/' + id, { method: 'DELETE' }).catch(function() {});
}

export function loadScullers() {
  return fetch('./data/scullers.json').then(function(r) { return r.json(); });
}

export function saveScullers(scullers) {
  return fetch('/api/scullers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(scullers)
  }).then(function(r) { return r.json(); }).catch(function() {});
}
