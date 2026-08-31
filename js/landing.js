// js/landing.js - Entry point for index.html

import { loadScullers, getConfig, postConfig } from './api.js';
import { parseLadderDate, formatDate } from './ui.js';

var scullers = [];
var nextLadder = {};
var lastLadder = {};

function updateHomeDate() {
  var banner = document.querySelector('.next-banner');
  if (!banner) return;
  banner.querySelector('strong').textContent = nextLadder.date;
  banner.querySelector('p').innerHTML =
    '<strong>' + nextLadder.date + '</strong> at ' + nextLadder.time +
    ' — ' + nextLadder.start + ' to ' + nextLadder.finish;
}

function updateHeaderButtons() {
  var headerBtn = document.getElementById('headerBtn');
  var bottomBtn = document.getElementById('bottomBtn');
  var loggedIn = localStorage.getItem('csl_auth') === 'true';
  if (loggedIn) {
    headerBtn.innerHTML = '<a href="./app.html" class="btn btn-primary">Go to Ladder</a>';
    if (bottomBtn) bottomBtn.innerHTML = '<a href="./app.html" class="bottom-link">Go to Ladder</a>';
  } else {
    headerBtn.innerHTML = '<a href="#login" class="btn btn-primary" id="loginTrigger">Log In</a>';
    if (bottomBtn) bottomBtn.innerHTML = '<a href="#login" class="bottom-link" id="loginTriggerBottom">Log In to participate</a>';
  }
}

function showLogin() {
  document.getElementById('landingPage').style.display = 'none';
  document.getElementById('loginPage').style.display = '';
}

function showLanding() {
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('landingPage').style.display = '';
}

function renderScullerList(query) {
  var list = document.getElementById('scullerList');
  var q = (query || '').toLowerCase().trim();
  if (!q) { list.innerHTML = ''; return; }
  var matches = scullers.filter(function(s) {
    return s.name.toLowerCase().indexOf(q) >= 0 || s.club.toLowerCase().indexOf(q) >= 0;
  }).slice(0, 20);
  if (matches.length === 0) {
    list.innerHTML = '<div class="sculler-option" style="padding:0.8rem;color:var(--text-light);font-size:0.85rem;">No results found</div>';
    return;
  }
  list.innerHTML = matches.map(function(s) {
    return '<div class="sculler-option" data-id="' + s.id + '" style="padding:0.6rem 0.8rem;cursor:pointer;border-bottom:1px solid var(--border);font-size:0.9rem;">' +
      s.name + ' <span style="color:var(--text-light);font-size:0.8rem;">' + s.club + '</span></div>';
  }).join('');
  list.querySelectorAll('.sculler-option').forEach(function(el) {
    el.addEventListener('click', function() {
      var id = parseInt(this.dataset.id);
      selectSculler(id);
    });
  });
}

function selectSculler(id) {
  localStorage.setItem('csl_role', 'user');
  localStorage.setItem('csl_user_id', id);
  localStorage.setItem('csl_auth', 'true');
  window.location.href = './app.html';
}

function autoAdvanceLadder() {
  var ladderDate = parseLadderDate(nextLadder.date);
  if (!ladderDate) return;
  var now = new Date();
  var ladderDateTime = new Date(ladderDate);
  var parts = nextLadder.time.split(':');
  ladderDateTime.setHours(parseInt(parts[0]), parseInt(parts[1]), 0, 0);
  if (now > ladderDateTime) {
    lastLadder = { date: nextLadder.date, time: nextLadder.time, start: nextLadder.start };
    var newDate = new Date(ladderDate);
    newDate.setDate(newDate.getDate() + 14);
    nextLadder.date = formatDate(newDate);
    postConfig({ nextLadder: nextLadder, lastLadder: lastLadder });
    updateHomeDate();
  }
}

// Init
document.addEventListener('DOMContentLoaded', function() {
  var isLoggedIn = localStorage.getItem('csl_auth') === 'true';

  loadScullers().then(function(data) {
    scullers = data;
    return getConfig();
  }).then(function(data) {
    if (data.nextLadder) nextLadder = data.nextLadder;
    if (data.lastLadder) lastLadder = data.lastLadder;
    updateHomeDate();
    autoAdvanceLadder();
    updateHeaderButtons();
  }).catch(function() {
    updateHeaderButtons();
  });

  // Login triggers
  document.querySelectorAll('#loginTrigger, #loginTriggerBottom').forEach(function(el) {
    el.addEventListener('click', function(e) {
      e.preventDefault();
      showLogin();
    });
  });

  var backLink = document.querySelector('.back-link');
  if (backLink) {
    backLink.addEventListener('click', function(e) {
      e.preventDefault();
      showLanding();
    });
  }

  var loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
      e.preventDefault();
      var pw = document.getElementById('password').value.trim();
      if (pw === 'admin') {
        localStorage.setItem('csl_role', 'admin');
        localStorage.setItem('csl_auth', 'true');
        window.location.href = './app.html';
      } else if (pw === 'ladder') {
        loginForm.style.display = 'none';
        document.getElementById('scullerSelect').style.display = '';
        document.getElementById('scullerSearch').focus();
      } else {
        document.getElementById('errorMsg').classList.add('show');
        document.getElementById('password').value = '';
      }
    });
  }

  var scullerSearch = document.getElementById('scullerSearch');
  if (scullerSearch) {
    scullerSearch.addEventListener('input', function() {
      renderScullerList(this.value);
    });
  }
});
