// js/ranking-page.js - Entry point for ranking.html
// Reads ranks directly from scullers.json (single source of truth)

import { loadScullers } from './api.js';
import { escHtml } from './ui.js';

var scullers = [];
var currentSort = 'rank';
var ranked = [];
var unranked = [];

function getDisplayRank(s) {
  return (s.newRank !== undefined && s.newRank !== null && s.newRank !== '')
    ? parseInt(s.newRank)
    : (s.rank ? parseInt(s.rank) : 0);
}

function init() {
  ranked = scullers.filter(function(s) {
    var r = getDisplayRank(s);
    return r > 0;
  }).sort(function(a, b) {
    return getDisplayRank(a) - getDisplayRank(b);
  });

  unranked = scullers.filter(function(s) {
    var r = getDisplayRank(s);
    return r <= 0;
  });

  document.getElementById('rankInfo').textContent =
    ranked.length + ' ranked scullers — ' + unranked.length + ' unranked';

  renderPodium();
  renderList(ranked);
  renderUnranked();
}

function renderPodium() {
  var podium = document.getElementById('podium');
  if (ranked.length < 3) { podium.innerHTML = ''; return; }
  var top3 = ranked.slice(0, 3);
  var html = '<div class="podium">';
  [1, 0, 2].forEach(function(idx) {
    var s = top3[idx];
    if (!s) return;
    html += '<div class="pod-slot pod-' + (idx + 1) + '">' +
      '<div class="pod-name">' + escHtml(s.name) + '</div>' +
      '<div class="pod-club">' + escHtml(s.club) + '</div>' +
      '<div class="pod-rank">#' + getDisplayRank(s) + '</div>' +
      '<div class="pod-base">' + (idx + 1) + '</div>' +
      '</div>';
  });
  html += '</div>';
  podium.innerHTML = html;
}

function renderList(list) {
  var el = document.getElementById('rankedList');
  if (!list || list.length === 0) {
    el.innerHTML = '<div class="rank-row" style="justify-content:center;color:var(--text-light);">No results</div>';
    return;
  }
  el.innerHTML = list.map(function(s) {
    return '<div class="rank-row">' +
      '<span class="rank-num">#' + getDisplayRank(s) + '</span>' +
      '<span class="rank-name">' + escHtml(s.name) + '</span>' +
      '<span class="rank-club">' + escHtml(s.club) + '</span>' +
      '</div>';
  }).join('');
}

function renderUnranked() {
  var title = document.getElementById('unrankedTitle');
  var list = document.getElementById('unrankedList');
  if (unranked.length === 0) {
    title.style.display = 'none';
    list.style.display = 'none';
    return;
  }
  title.style.display = '';
  list.style.display = '';
  title.textContent = 'Not yet ranked (' + unranked.length + ')';
  list.innerHTML = unranked.map(function(s) {
    return '<div class="rank-row not-ranked">' +
      '<span class="rank-name">' + escHtml(s.name) + '</span>' +
      '<span class="rank-club">' + escHtml(s.club) + '</span>' +
      '</div>';
  }).join('');
}

function sortBy(key) {
  currentSort = key;
  if (key === 'name') {
    ranked.sort(function(a, b) { return a.name.localeCompare(b.name); });
  } else if (key === 'club') {
    ranked.sort(function(a, b) { return a.club.localeCompare(b.club); });
  } else {
    ranked.sort(function(a, b) {
      return getDisplayRank(a) - getDisplayRank(b);
    });
  }
  renderList(ranked);
}

function initEventListeners() {
  document.getElementById('rankSearch').addEventListener('input', function() {
    var q = this.value.toLowerCase().trim();
    var filtered = q ? ranked.filter(function(s) {
      return s.name.toLowerCase().indexOf(q) >= 0 || s.club.toLowerCase().indexOf(q) >= 0;
    }) : ranked;
    renderList(filtered);
  });

  document.getElementById('sortRank').addEventListener('click', function() { sortBy('rank'); });
  document.getElementById('sortName').addEventListener('click', function() { sortBy('name'); });
  document.getElementById('sortClub').addEventListener('click', function() { sortBy('club'); });
}

// Init - just load scullers, ranks are already in scullers.json
loadScullers().then(function(data) {
  scullers = data;
  init();
  initEventListeners();
}).catch(function() {
  init();
  initEventListeners();
});
