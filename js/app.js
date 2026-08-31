// js/app.js - Entry point for app.html

import { loadScullers, getVotes, postVotes, getConfig, postConfig, getHistory, getHistoryDate, saveHistory, postRequest, deleteRequest } from './api.js';
import { checkAuth, isAdmin as authIsAdmin, getUserId, getMe, logout } from './auth.js';
import { computeRankings, getComputedRank, computeNextPositions, computeLastPositions } from './rankings.js';
import { showToast } from './toast.js';
import { openModal, closeModal, saveModal, updateLadderInfo } from './modal.js';
import { escHtml, parseLadderDate, formatDate, ladderDateToInput, inputToLadderDate, getLadderDate } from './ui.js';

// Auth guard
if (!checkAuth()) throw new Error('Not authenticated');

// State
var isAdmin = authIsAdmin();
var currentUserId = getUserId();
var scullers = [];
var nextLadder = {};
var lastLadder = {};
var myCaught = {};
var myManualRanks = {};
var myManualStarts = {};
var computedRanks = {};
var currentSort = 'nextStartPos';
var currentDir = 1;
var skipSort = false;
var activeTab = 'next';
var historyData = null;
var myRequests = [];
var me = null;

// Core functions
function computeRankingsLocal() {
  computedRanks = computeRankings(scullers, myCaught, myManualRanks);
}

function getComputedRankLocal(s) {
  return getComputedRank(s, myManualRanks, computedRanks);
}

function getVal(s, key) {
  if (key === 'name') return (s.name + ' ' + s.club).toLowerCase();
  if (key === 'rank') { var r = getComputedRankLocal(s); return r || 9999; }
  if (key === 'newRank') { var r = computedRanks[s.id]; return r || 9999; }
  if (key === 'lastStartPos') {
    return s.lastStartPos ? parseInt(s.lastStartPos) : 9999;
  }
  if (key === 'lastCaught') {
    var c = myCaught[s.id] !== undefined ? myCaught[s.id] : s.lastCaught;
    if (c === 'Yes' || c === 'PathFind') return 0;
    if (c === 'No') return 1;
    return 2;
  }
  if (key === 'nextParticipating') {
    var p = s.nextParticipating;
    if (p === 'Yes') return 0;
    if (p === 'No') return 1;
    return 2;
  }
  if (key === 'nextStartPos') {
    var p = s.nextParticipating;
    if (p !== 'Yes' && p !== 'PathFind') return 9999;
    var nextPositions = computeNextPositions(scullers, myManualStarts);
    return nextPositions[s.id] || 9999;
  }
  return 0;
}

function updateUserCard() {
  if (!me) return;
  var caughtVal = myCaught[me.id] !== undefined ? myCaught[me.id] : me.lastCaught;
  document.getElementById('ucName').textContent = me.name;
  document.getElementById('ucClub').textContent = me.club;
  document.getElementById('ucRank').textContent = me.nextParticipating === 'Yes' && me.nextStartPos ? '#' + me.nextStartPos : (getComputedRankLocal(me) || 'n/a');
  var hasRaced = me.lastStartPos != null;
  document.getElementById('ucCaughtAction').style.display = hasRaced ? '' : 'none';
  if (hasRaced) {
    document.getElementById('ucCaughtActionLabel').textContent = 'Caught (' + lastLadder.date + ')?';
    var caughtByEl = document.getElementById('ucCaughtBy');
    var hasExplicitChoice = myCaught[me.id] !== undefined;
    if (caughtVal === 'Yes') {
      var myPos = parseInt(me.lastStartPos);
      var participants = scullers.filter(function(s) { return s.lastStartPos != null; });
      var catcher = participants.find(function(s) { return parseInt(s.lastStartPos) === myPos + 1; });
      caughtByEl.textContent = catcher ? 'by ' + catcher.name : '';
    } else if (caughtVal === 'No') {
      var myPos = parseInt(me.lastStartPos);
      var participants = scullers.filter(function(s) { return s.lastStartPos != null; });
      var behind = participants.find(function(s) { return parseInt(s.lastStartPos) === myPos + 1; });
      caughtByEl.textContent = behind ? behind.name + ' didn\'t catch you' : 'Not caught';
    } else if (caughtVal === 'PathFind') {
      caughtByEl.textContent = 'PathFind';
    } else if (hasExplicitChoice && caughtVal !== me.lastCaught) {
      caughtByEl.textContent = 'Last to start';
    } else {
      caughtByEl.textContent = me.lastCaught === 'No' ? 'Not caught' : '';
    }
  }
  document.getElementById('ucNextActionLabel').textContent = 'Participate on ' + nextLadder.date + '?';
  document.querySelectorAll('#userCard .btn-table[data-uc]').forEach(function(btn) {
    var ucType = btn.dataset.uc;
    var val = btn.dataset.val;
    var current = ucType === 'caught' ? caughtVal : me.nextParticipating;
    var isActive = current === val || (val === '' && (current === undefined || current === null));
    if (val === 'Yes') btn.className = 'btn-table ' + (isActive ? 'btn-yes' : 'btn-yes-dim');
    else if (val === 'No') btn.className = 'btn-table ' + (isActive ? 'btn-no' : 'btn-no-dim');
    else if (val === 'PathFind') btn.className = 'btn-table ' + (isActive ? 'btn-path' : 'btn-yes-dim');
    else btn.className = 'btn-table ' + (isActive ? 'btn-no' : 'btn-no-dim');
  });
  var ucSelect = document.querySelector('#userCard .inline-select[data-uc="confirmed"]');
  if (ucSelect) {
    ucSelect.value = me.nextParticipating || '';
    ucSelect.className = 'inline-select';
    if (me.nextParticipating === 'Yes') ucSelect.classList.add('val-yes');
    else if (me.nextParticipating === 'No') ucSelect.classList.add('val-no');
    else if (me.nextParticipating === 'PathFind') ucSelect.classList.add('val-pf');
  }
  var reqAction = document.getElementById('ucRequestAction');
  if (reqAction) reqAction.style.display = me.nextParticipating === 'Yes' ? '' : 'none';
}

function checkAutoSave() {
  if (activeTab !== 'next') return;
  var starters = scullers.filter(function(s) { return s.lastStartPos != null; });
  if (starters.length === 0) return;
  var participants = starters.slice(0, -1);
  var allVoted = participants.every(function(s) {
    var cv = myCaught[s.id];
    return cv === 'Yes' || cv === 'No' || cv === 'PathFind';
  });
  if (!allVoted) return;
  autoSaveSession();
}

function autoSaveSession() {
  var dateStr = getLadderDate(nextLadder);
  var snapshot = {
    date: dateStr,
    ladderInfo: nextLadder,
    scullers: scullers.map(function(s) {
      return {
        id: s.id,
        name: s.name,
        club: s.club,
        rank: s.rank,
        startPos: s.lastStartPos || null,
        caught: myCaught[s.id] !== undefined ? myCaught[s.id] : s.lastCaught,
        newRank: getComputedRankLocal(s) || null,
        newStartPos: null
      };
    })
  };
  var nextPos = computeNextPositions(scullers, myManualStarts);
  snapshot.scullers.forEach(function(s) {
    s.newStartPos = nextPos[s.id] || null;
  });
  saveHistory(snapshot).catch(function() {});
}

function checkAndAdvanceLadder() {
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
    var nextPos = computeNextPositions(scullers, myManualStarts);
    scullers.forEach(function(s) {
      if (s.nextParticipating === 'Yes') {
        s.lastStartPos = nextPos[s.id] ? String(nextPos[s.id]) : null;
        s.lastCaught = myCaught[s.id] !== undefined ? myCaught[s.id] : null;
      } else if (s.nextParticipating === 'PathFind') {
        s.lastStartPos = '1';
        s.lastCaught = 'PathFind';
      } else {
        s.lastStartPos = null;
        s.lastCaught = null;
      }
      s.nextParticipating = null;
      s.nextStartPos = null;
    });
    myCaught = {};
    var lastSessionData = {};
    scullers.forEach(function(s) {
      lastSessionData[s.id] = { lastStartPos: s.lastStartPos, lastCaught: s.lastCaught };
    });
    computeRankingsLocal();
    renderTable();
    updateUserCard();
    updateLadderInfo(nextLadder);
    postConfig({ nextLadder: nextLadder, lastLadder: lastLadder });
    postVotes({ participation: {}, clearParticipation: true, caught: {}, manualRanks: {}, manualStarts: {}, lastSession: lastSessionData });
  }
}

function renderTable() {
  if (activeTab === 'history') {
    renderHistoryTable();
    return;
  }
  var lastLadderLabel = 'Last Session<br>' + lastLadder.date + '<br><small>(' + lastLadder.time + ', ' + lastLadder.start + ')</small>';
  var nextLadderLabel = 'Next Session<br>' + nextLadder.date + '<br><small>(' + nextLadder.time + ', ' + nextLadder.start + ')</small>';
  document.getElementById('tableHead').innerHTML =
    isAdmin ?
    '<tr>' +
    '<th class="col-group-header sortable" data-sort="name" rowspan="2">Sculler</th>' +
    '<th class="col-group-header col-next-header" colspan="2">' + nextLadderLabel + '</th>' +
    '<th class="col-separator" rowspan="2"></th>' +
    '<th class="col-group-header col-prev-header" colspan="4">' + lastLadderLabel + ' <button class="btn btn-xs btn-accent" id="saveSessionBtn" style="display:none;margin-left:0.5rem;vertical-align:middle;padding:0.15rem 0.45rem;font-size:0.6rem;line-height:1;border-radius:3px;" title="Save current Last Session results to history">Save Results</button></th>' +
    '</tr>' +
    '<tr>' +
    '<th class="sortable col-next" data-sort="nextParticipating">' +
    '<span class="th-label">In?</span>' +
    '</th>' +
    '<th class="sortable col-next" data-sort="nextStartPos">' +
    '<span class="th-label">Start Pos</span>' +
    '</th>' +
    '<th class="col-rank">' +
    '<span class="th-label">Caught?</span>' +
    '</th>' +
    '<th class="sortable col-rank" data-sort="lastStartPos">' +
    '<span class="th-label">Start</span>' +
    '</th>' +
    '<th class="sortable col-rank" data-sort="rank">' +
    '<span class="th-label">Rank</span>' +
    '</th>' +
    '<th class="sortable col-next" data-sort="newRank">' +
    '<span class="th-label">New Rank</span>' +
    '</th>' +
    '</tr>'
    :
    '<tr>' +
    '<th class="sortable col-name" data-sort="name">Sculler</th>' +
    '<th class="sortable col-next" data-sort="nextStartPos">' +
    '<span class="th-label">Start Pos</span>' +
    '</th>' +
    '<th class="sortable col-rank" data-sort="rank">' +
    '<span class="th-label">Rank</span>' +
    '</th>' +
    '</tr>';
  document.querySelectorAll('#tableHead .sortable').forEach(function(th) {
    th.addEventListener('click', function() {
      var sortKey = this.dataset.sort;
      if (currentSort === sortKey) { currentDir *= -1; }
      else { currentSort = sortKey; currentDir = 1; }
      renderTable();
    });
  });
  var q = document.getElementById('searchInput').value.toLowerCase().trim();
  var list = isAdmin ? scullers.slice() : scullers.filter(function(s) {
    return s.nextParticipating === 'Yes' || s.nextParticipating === 'PathFind';
  });
  if (q) {
    list = list.filter(function(s) {
      return s.name.toLowerCase().indexOf(q) !== -1 ||
      s.club.toLowerCase().indexOf(q) !== -1;
    });
  }
  var nextPositions = computeNextPositions(scullers, myManualStarts);
  if (!skipSort) {
    list = list.slice().sort(function(a, b) {
      var va = getVal(a, currentSort);
      var vb = getVal(b, currentSort);
      if (va < vb) return -1 * currentDir;
      if (va > vb) return 1 * currentDir;
      return 0;
    });
  }
  document.getElementById('searchCount').textContent =
    list.length + ' of ' + (isAdmin ? list.length : scullers.length) + ' scullers';
  var rows = list.map(function(s) {
    var participatingVal = s.nextParticipating;
    var caughtVal = myCaught[s.id] !== undefined ? myCaught[s.id] : null;
    var startPos = nextPositions[s.id] || null;
    var btnYesCls = participatingVal === 'Yes' ? 'btn-yes' : 'btn-yes-dim';
    var btnNoCls = participatingVal === 'No' ? 'btn-no' : 'btn-no-dim';
    var isMyRow = isAdmin || s.id === currentUserId;
    var confirmBtns;
    if (isMyRow) {
      var selectedVal = participatingVal !== null && participatingVal !== undefined ? participatingVal : '';
      var selectClass = 'inline-select';
      if (selectedVal === 'Yes') selectClass += ' val-yes';
      else if (selectedVal === 'No') selectClass += ' val-no';
      else if (selectedVal === 'PathFind') selectClass += ' val-pf';
      confirmBtns = '<select class="' + selectClass + '" data-type="participation" data-id="' + s.id + '">' +
      '<option value=""' + (selectedVal === '' ? ' selected' : '') + '>-</option>' +
      '<option value="Yes"' + (selectedVal === 'Yes' ? ' selected' : '') + '>Yes</option>' +
      '<option value="No"' + (selectedVal === 'No' ? ' selected' : '') + '>No</option>' +
      '<option value="PathFind"' + (selectedVal === 'PathFind' ? ' selected' : '') + '>PathFind</option>' +
      '</select>';
    } else {
      confirmBtns = '<span class="muted">' + (participatingVal || '-') + '</span>';
    }
    var caughtBtns = '';
    if (isAdmin) {
      var caughtSelectVal = caughtVal !== null && caughtVal !== undefined ? caughtVal : '';
      var caughtSelectClass = 'inline-select';
      if (caughtSelectVal === 'Yes') caughtSelectClass += ' val-yes';
      else if (caughtSelectVal === 'No') caughtSelectClass += ' val-no';
      else if (caughtSelectVal === 'PathFind') caughtSelectClass += ' val-pf';
      caughtBtns = '<select class="' + caughtSelectClass + '" data-type="caught" data-id="' + s.id + '">' +
      '<option value=""' + (caughtSelectVal === '' ? ' selected' : '') + '>-</option>' +
      '<option value="Yes"' + (caughtSelectVal === 'Yes' ? ' selected' : '') + '>Yes</option>' +
      '<option value="No"' + (caughtSelectVal === 'No' ? ' selected' : '') + '>No</option>' +
      '<option value="PathFind"' + (caughtSelectVal === 'PathFind' ? ' selected' : '') + '>PathFind</option>' +
      '</select>';
    }
    var startingRank = (myManualRanks[s.id] !== undefined && myManualRanks[s.id] !== null) ? myManualRanks[s.id] : (s.rank ? parseInt(s.rank) : null);
    var newRank = computedRanks[s.id] || null;
    var diff = '';
    if (startingRank && newRank) {
      var d = startingRank - newRank;
      if (d > 0) diff = '<span style="color:var(--success);font-weight:700;">▲' + d + '</span>';
      else if (d < 0) diff = '<span style="color:var(--danger);font-weight:700;">▼' + Math.abs(d) + '</span>';
      else diff = '<span style="color:var(--text-light);">—</span>';
    }
    return '<tr' + (isMyRow ? ' class="my-row"' : '') + '>' +
    '<td class="col-name"><span class="sculler-name">' + escHtml(s.name) + '</span> <span class="sculler-club-tag">' + escHtml(s.club) + '</span></td>' +
    (isAdmin ? '<td class="col-next"><div class="btn-group btn-group-3">' + confirmBtns + '</div></td>' : '') +
    '<td class="col-next pos-cell">' + (isAdmin ? '<span class="editable-cell" data-field="startPos" data-id="' + s.id + '">' + (startPos || '<span class="muted">-</span>') + '</span>' : (startPos || '<span class="muted">-</span>')) + '</td>' +
    (isAdmin ? '<td class="col-separator"></td>' : '') +
    (isAdmin ? '<td class="col-rank">' + caughtBtns + '</td>' : '') +
    (isAdmin ? '<td class="col-rank">' + (s.lastStartPos || '<span class="muted">-</span>') + '</td>' : '') +
    '<td class="col-rank">' + (isAdmin ? '<span class="editable-cell" data-field="rank" data-id="' + s.id + '">' : '') + (startingRank || '<span class="muted">n/a</span>') + ' ' + diff + (isAdmin ? '</span>' : '') + '</td>' +
    (isAdmin ? '<td class="col-next">' + (newRank || '<span class="muted">-</span>') + '</td>' : '') +
    '</tr>';
  }).join('');
  document.getElementById('tableBody').innerHTML = rows || '<tr><td colspan="' + (isAdmin ? 8 : 3) + '" class="empty-state">No scullers found</td></tr>';

  // Attach table event listeners
  document.querySelectorAll('.btn-table[data-type="participation"]').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      var id = parseInt(this.dataset.id);
      var val = this.dataset.val;
      var sc = scullers.find(function(s) { return s.id === id; });
      if (!sc) return;
      var current = sc.nextParticipating;
      if (val === '') {
        sc.nextParticipating = null;
        val = null;
      } else if (val) {
        if (current === val) { sc.nextParticipating = null; val = null; }
        else { sc.nextParticipating = val; }
      } else {
        var next;
        if (current === undefined || current === null || current === '???') next = 'Yes';
        else if (current === 'Yes') next = 'No';
        else next = undefined;
        sc.nextParticipating = next || null;
        val = sc.nextParticipating;
      }
      postVotes({ participation: {} }).then(function() {
        var p = {}; p[id] = val;
        postVotes({ participation: p });
      });
      var row = this.closest('tr');
      if (row) {
        row.style.transition = 'background 0.4s';
        row.style.background = 'rgba(99, 102, 241, 0.15)';
        setTimeout(function() { row.style.background = ''; }, 400);
      }
      computeRankingsLocal();
      renderTable();
      checkAutoSave();
    });
  });

  document.querySelectorAll('.inline-select[data-type="caught"]').forEach(function(sel) {
    sel.addEventListener('change', function() {
      var id = parseInt(this.dataset.id);
      var val = this.value || null;
      var store = myCaught;
      if (val === '' || val === null) { delete store[id]; val = null; }
      else { store[id] = val; }
      localStorage.setItem('csl_caught', JSON.stringify(store));
      var payload = { caught: {} };
      payload.caught[id] = val;
      postVotes(payload);
      var row = this.closest('tr');
      if (row) {
        row.style.transition = 'background 0.4s';
        row.style.background = 'rgba(99, 102, 241, 0.15)';
        setTimeout(function() { row.style.background = ''; }, 400);
      }
      computeRankingsLocal();
      renderTable();
      checkAutoSave();
    });
  });

  document.querySelectorAll('.inline-select[data-type="participation"]').forEach(function(sel) {
    sel.addEventListener('change', function() {
      var id = parseInt(this.dataset.id);
      var val = this.value || null;
      var sc = scullers.find(function(s) { return s.id === id; });
      if (!sc) return;
      sc.nextParticipating = val;
      postVotes({ participation: {} }).then(function() {
        var p = {}; p[id] = val;
        postVotes({ participation: p });
      });
      computeRankingsLocal();
      renderTable();
      checkAutoSave();
    });
  });

  if (isAdmin) {
    document.querySelectorAll('.editable-cell').forEach(function(cell) {
      cell.addEventListener('click', function(e) {
        e.stopPropagation();
        var field = this.dataset.field;
        var id = parseInt(this.dataset.id);
        var s = scullers.find(function(s) { return s.id === id; });
        var currentVal = '';
        if (field === 'rank') currentVal = getComputedRankLocal(s);
        else currentVal = myManualStarts[id] || '';
        var orig = this;
        var input = document.createElement('input');
        input.type = 'number';
        input.min = '0';
        input.value = currentVal || '';
        input.className = 'inline-edit-input';
        input.style.width = '50px';
        orig.textContent = '';
        orig.appendChild(input);
        input.focus();
        input.select();
        function save() {
          var val = parseInt(input.value);
          if (isNaN(val) || val < 0) { renderTable(); return; }
          if (field === 'rank') {
            var oldRank = getComputedRankLocal(s);
            if (oldRank !== val) {
              var shift = val < oldRank ? 1 : -1;
              var lo = Math.min(oldRank, val);
              var hi = Math.max(oldRank, val);
              scullers.forEach(function(sc) {
                if (sc.id === id) return;
                var r = getComputedRankLocal(sc);
                if (r >= lo && r <= hi) {
                  var newR = r + shift;
                  myManualRanks[sc.id] = newR;
                }
              });
            }
            myManualRanks[id] = val;
            localStorage.setItem('csl_manualRanks', JSON.stringify(myManualRanks));
            var payload = { manualRanks: {} };
            for (var k in myManualRanks) { payload.manualRanks[k] = myManualRanks[k]; }
            postVotes(payload);
          } else {
            var curPositions = computeNextPositions(scullers, myManualStarts);
            var oldStart = curPositions[id] || null;
            if (oldStart !== null && oldStart !== val) {
              var shift2 = val < oldStart ? 1 : -1;
              var lo2 = Math.min(oldStart, val);
              var hi2 = Math.max(oldStart, val);
              scullers.forEach(function(sc) {
                if (sc.id === id) return;
                var cur = curPositions[sc.id];
                if (cur != null && cur >= lo2 && cur <= hi2) {
                  var newCur = cur + shift2;
                  myManualStarts[sc.id] = newCur;
                }
              });
            }
            myManualStarts[id] = val;
            localStorage.setItem('csl_manualStarts', JSON.stringify(myManualStarts));
            var payload = { manualStarts: {} };
            for (var k in myManualStarts) { payload.manualStarts[k] = myManualStarts[k]; }
            postVotes(payload);
          }
          computeRankingsLocal();
          if (field === 'startPos') {
            currentSort = 'nextStartPos';
            currentDir = 1;
          }
          renderTable();
        }
        input.addEventListener('keydown', function(ev) {
          if (ev.key === 'Enter') { ev.preventDefault(); save(); }
          if (ev.key === 'Escape') { renderTable(); }
        });
        input.addEventListener('blur', function() { save(); });
      });
    });
    var btn = document.getElementById('saveSessionBtn');
    if (btn) btn.style.display = (isAdmin && activeTab === 'next') ? '' : 'none';
  }
}

function renderHistoryTable() {
  document.getElementById('tableHead').innerHTML =
  '<tr>' +
  '<th class="sortable col-name" data-sort="name">Name</th>' +
  '<th class="sortable col-last" data-sort="startPos">' +
  '<span class="th-label">Start Pos</span>' +
  '</th>' +
  '<th class="sortable col-last" data-sort="caught">' +
  '<span class="th-label">Caught?</span>' +
  '</th>' +
  '<th class="sortable col-rank" data-sort="rank">' +
  '<span class="th-label">Starting Rank</span>' +
  '<span class="th-sub">Before race</span>' +
  '</th>' +
  '<th class="sortable col-next" data-sort="newRank">' +
  '<span class="th-label">New Rank</span>' +
  '<span class="th-sub">After race</span>' +
  '</th>' +
  '</tr>';
  document.querySelectorAll('#tableHead .sortable').forEach(function(th) {
    th.addEventListener('click', function() {
      var sortKey = this.dataset.sort;
      if (currentSort === sortKey) { currentDir *= -1; }
      else { currentSort = sortKey; currentDir = 1; }
      renderHistoryTable();
    });
  });
  if (!historyData || !historyData.scullers) {
    document.getElementById('tableBody').innerHTML =
    '<tr><td colspan="5" class="empty-state">Seleziona una sessione per visualizzare i risultati</td></tr>';
    document.getElementById('searchCount').textContent = '0 scullers';
    return;
  }
  var q = document.getElementById('searchInput').value.toLowerCase().trim();
  var list = historyData.scullers.filter(function(s) { return s.startPos != null; });
  if (q) {
    list = list.filter(function(s) {
      return s.name.toLowerCase().indexOf(q) !== -1 ||
      s.club.toLowerCase().indexOf(q) !== -1;
    });
  }
  list = list.slice().sort(function(a, b) {
    var av = parseInt(a.startPos) || 9999;
    var bv = parseInt(b.startPos) || 9999;
    if (av < bv) return -1 * currentDir;
    if (av > bv) return 1 * currentDir;
    return 0;
  });
  var total = historyData.scullers.filter(function(s) { return s.startPos != null; }).length;
  document.getElementById('searchCount').textContent =
  list.length + ' of ' + total + ' participants';
  var rows = list.map(function(s) {
    var caughtIcon = '';
    if (s.caught === 'Yes') caughtIcon = '<span class="btn-table btn-yes" style="cursor:default;">✓ Yes</span>';
    else if (s.caught === 'No') caughtIcon = '<span class="btn-table btn-no" style="cursor:default;">✗ No</span>';
    else caughtIcon = '<span class="muted">-</span>';
    var diff = '';
    if (s.rank && s.newRank) {
      var d = parseInt(s.rank) - parseInt(s.newRank);
      if (d > 0) diff = '<span style="color:var(--success);font-weight:700;">▲' + d + '</span>';
      else if (d < 0) diff = '<span style="color:var(--danger);font-weight:700;">▼' + Math.abs(d) + '</span>';
      else diff = '<span style="color:var(--text-light);">—</span>';
    }
    return '<tr>' +
    '<td class="col-name"><span class="sculler-name">' + escHtml(s.name) + '</span> <span class="sculler-club-tag">' + escHtml(s.club) + '</span></td>' +
    '<td class="col-last">' + (s.startPos || '<span class="muted">-</span>') + '</td>' +
    '<td class="col-last">' + caughtIcon + '</td>' +
    '<td class="col-rank">' + (s.rank || '<span class="muted">n/a</span>') + ' ' + diff + '</td>' +
    '<td class="col-next">' + (s.newRank || '<span class="muted">-</span>') + '</td>' +
    '</tr>';
  }).join('');
  document.getElementById('tableBody').innerHTML = rows || '<tr><td colspan="5" class="empty-state">No participants found</td></tr>';
}

function loadRequests() {
  getVotes().then(function(data) {
    myRequests = (data.requests || []).filter(function(r) { return r.status === 'pending'; });
    renderRequests();
  }).catch(function() {});
}

function renderRequests() {
  if (!isAdmin) return;
  var container = document.getElementById('adminRequests');
  var list = document.getElementById('adminRequestsList');
  if (myRequests.length === 0) {
    container.style.display = 'none';
    return;
  }
  container.style.display = '';
  list.innerHTML = myRequests.map(function(r) {
    var dirLabel = r.position === 'before' ? 'before' : 'after';
    return '<div style="display:flex;align-items:center;gap:0.5rem;padding:0.4rem 0;border-bottom:1px solid var(--border);font-size:0.85rem;">' +
    '<span style="font-weight:600;">' + escHtml(r.scullerName) + '</span>' +
    '<span style="color:var(--text-light);">(' + escHtml(r.scullerClub) + ')</span>' +
    '<span>' + dirLabel + ' <strong>' + escHtml(r.refScullerName) + '</strong></span>' +
    '<span style="flex:1;"></span>' +
    '<button class="btn-table btn-yes" data-req-action="apply" data-req-id="' + r.id + '" data-req-rid="' + r.refScullerId + '" data-req-dir="' + r.position + '" data-req-sid="' + r.scullerId + '" style="font-size:0.7rem;padding:0.2rem 0.5rem;">Apply</button>' +
    '<button class="btn-table btn-no-dim" data-req-action="dismiss" data-req-id="' + r.id + '" style="font-size:0.7rem;padding:0.2rem 0.5rem;">X</button>' +
    '</div>';
  }).join('');
  list.querySelectorAll('[data-req-action]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var action = this.dataset.reqAction;
      var reqId = parseInt(this.dataset.reqId);
      if (action === 'apply') {
        var refSid = parseInt(this.dataset.reqRid);
        var dir = this.dataset.reqDir;
        var sid = parseInt(this.dataset.reqSid);
        var refSc = scullers.find(function(s) { return s.id === refSid; });
        if (refSc) {
          var refPos = myManualStarts[refSid] || (refSc.nextStartPos ? parseInt(refSc.nextStartPos) : null);
          if (refPos != null) {
            var newPos = dir === 'before' ? refPos : refPos + 1;
            myManualStarts[sid] = newPos;
            localStorage.setItem('csl_manualStarts', JSON.stringify(myManualStarts));
            var payload = { manualStarts: {} };
            payload.manualStarts[sid] = newPos;
            postVotes(payload);
          }
        }
      }
      deleteRequest(reqId);
      myRequests = myRequests.filter(function(r) { return r.id !== reqId; });
      renderRequests();
      computeRankingsLocal();
      renderTable();
    });
  });
}

function loadHistoryDates() {
  getHistory().then(function(data) {
    var sel = document.getElementById('historyDate');
    sel.innerHTML = '<option value="">-- seleziona data --</option>';
    var dates = data.dates || [];
    dates.forEach(function(d) {
      var opt = document.createElement('option');
      opt.value = d;
      opt.textContent = d;
      sel.appendChild(opt);
    });
    if (dates.length > 0) {
      sel.value = dates[0];
      sel.dispatchEvent(new Event('change'));
    }
  }).catch(function() {});
}

function initEventListeners() {
  document.getElementById('searchInput').addEventListener('input', function() {
    renderTable();
  });

  document.getElementById('logoutBtn').addEventListener('click', function() {
    logout();
  });

  if (isAdmin) {
    document.getElementById('editLadderBtn').style.display = '';
    document.getElementById('editLadderBtn').addEventListener('click', function() {
      openModal(nextLadder);
    });
  }

  document.getElementById('modalCancel').addEventListener('click', function() {
    closeModal();
  });

  document.getElementById('modalSave').addEventListener('click', function() {
    saveModal(nextLadder, lastLadder);
    updateLadderInfo(nextLadder);
    computeRankingsLocal();
    renderTable();
    updateUserCard();
  });

  document.getElementById('ladderModal').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
  });

  document.addEventListener('click', function(e) {
    if (e.target.id === 'saveSessionBtn' || e.target.closest('#saveSessionBtn')) {
      var dateStr = getLadderDate(nextLadder);
      var snapshot = {
        date: dateStr,
        ladderInfo: nextLadder,
        scullers: scullers.map(function(s) {
          return {
            id: s.id,
            name: s.name,
            club: s.club,
            rank: s.rank,
            startPos: s.lastStartPos || null,
            caught: myCaught[s.id] !== undefined ? myCaught[s.id] : s.lastCaught,
            newRank: getComputedRankLocal(s) || null,
            newStartPos: null
          };
        })
      };
      var nextPos = computeNextPositions(scullers, myManualStarts);
      snapshot.scullers.forEach(function(s) {
        s.newStartPos = nextPos[s.id] || null;
      });
      saveHistory(snapshot).then(function(data) {
        if (data.ok) showToast('Session saved: ' + dateStr);
        else showToast('Error: ' + (data.error || 'unknown'), 'error');
      }).catch(function() { showToast('Network error', 'error'); });
    }
  });

  // User card buttons
  if (!isAdmin && me) {
    document.querySelectorAll('#userCard .btn-table[data-uc]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var ucType = this.dataset.uc;
        var val = this.dataset.val;
        if (ucType === 'confirmed') {
          var current = me.nextParticipating;
          if (current === val) { me.nextParticipating = null; val = null; }
          else { me.nextParticipating = val; }
          postVotes({ participation: {} }).then(function() {
            var p = {}; p[currentUserId] = val;
            postVotes({ participation: p });
          });
        } else {
          var store = myCaught;
          var current = store[currentUserId];
          if (val === '') {
            if (current === null) { delete store[currentUserId]; val = null; }
            else { store[currentUserId] = null; val = null; }
          } else if (current === val) {
            delete store[currentUserId];
            val = null;
          } else {
            store[currentUserId] = val;
          }
          localStorage.setItem('csl_caught', JSON.stringify(store));
          var payload = { caught: {} };
          payload.caught[currentUserId] = val;
          postVotes(payload);
        }
        updateUserCard();
        computeRankingsLocal();
        renderTable();
        checkAutoSave();
      });
    });

    var ucConfirmedSelect = document.querySelector('#userCard .inline-select[data-uc="confirmed"]');
    if (ucConfirmedSelect) {
      ucConfirmedSelect.addEventListener('change', function() {
        var val = this.value || null;
        me.nextParticipating = val;
        postVotes({ participation: {} }).then(function() {
          var p = {}; p[currentUserId] = val;
          postVotes({ participation: p });
        });
        computeRankingsLocal();
        var nextPos = computeNextPositions(scullers, myManualStarts);
        me.nextStartPos = nextPos[me.id] || null;
        updateUserCard();
        renderTable();
        checkAutoSave();
      });
    }
  }

  // Position request
  if (!isAdmin) {
    var selectedRefSculler = null;
    var selectedDir = 'before';
    document.getElementById('requestDirToggle').addEventListener('click', function(e) {
      var btn = e.target.closest('[data-dir]');
      if (!btn) return;
      selectedDir = btn.dataset.dir;
      this.querySelectorAll('.toggle-btn').forEach(function(b) {
        b.classList.toggle('active', b.dataset.dir === selectedDir);
        b.style.background = b.dataset.dir === selectedDir ? 'var(--accent)' : 'var(--bg-card)';
        b.style.color = b.dataset.dir === selectedDir ? '#fff' : 'var(--text)';
      });
    });
    document.getElementById('requestPosBtn').addEventListener('click', function() {
      document.getElementById('requestPosForm').style.display = '';
      document.getElementById('requestPosSearch').focus();
    });
    document.getElementById('requestPosCancel').addEventListener('click', function() {
      document.getElementById('requestPosForm').style.display = 'none';
      document.getElementById('requestPosSearch').value = '';
      document.getElementById('requestPosResults').style.display = 'none';
      selectedRefSculler = null;
    });
    document.getElementById('requestPosSearch').addEventListener('input', function() {
      var q = this.value.toLowerCase().trim();
      var results = document.getElementById('requestPosResults');
      if (q.length < 1) { results.style.display = 'none'; return; }
      var matches = scullers.filter(function(s) {
        return s.id !== currentUserId && (s.name.toLowerCase().indexOf(q) >= 0 || s.club.toLowerCase().indexOf(q) >= 0);
      }).slice(0, 8);
      if (matches.length === 0) { results.style.display = 'none'; return; }
      results.style.display = '';
      results.innerHTML = matches.map(function(s) {
        return '<div class="request-result" data-rid="' + s.id + '" style="padding:0.3rem 0.5rem;cursor:pointer;border-bottom:1px solid var(--border);">' + escHtml(s.name) + ' <span style="color:var(--text-light);font-size:0.75rem;">' + escHtml(s.club) + '</span></div>';
      }).join('');
      results.querySelectorAll('.request-result').forEach(function(el) {
        el.addEventListener('click', function() {
          var sid = parseInt(this.dataset.rid);
          selectedRefSculler = scullers.find(function(s) { return s.id === sid; });
          document.getElementById('requestPosSearch').value = selectedRefSculler.name;
          results.style.display = 'none';
        });
      });
    });
    document.getElementById('requestPosSubmit').addEventListener('click', function() {
      if (!selectedRefSculler) return;
      var dir = selectedDir;
      var payload = {
        scullerId: currentUserId,
        scullerName: me.name,
        scullerClub: me.club,
        refScullerId: selectedRefSculler.id,
        refScullerName: selectedRefSculler.name,
        position: dir,
        timestamp: new Date().toISOString()
      };
      postRequest(payload).then(function(data) {
        if (data.ok) {
          document.getElementById('requestPosForm').style.display = 'none';
          document.getElementById('requestPosSearch').value = '';
          document.getElementById('requestPosResults').style.display = 'none';
          selectedRefSculler = null;
          showToast('Request sent!');
        } else {
          showToast('Error: ' + (data.error || 'unknown'), 'error');
        }
      }).catch(function() { showToast('Network error', 'error'); });
    });
  }

  // Tabs
  document.querySelectorAll('.tab-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var tab = this.dataset.tab;
      activeTab = tab;
      document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
      this.classList.add('active');
      if (tab === 'next') {
        document.getElementById('userCard').style.display = isAdmin ? 'none' : '';
        document.getElementById('nextLadderInfo').textContent = nextLadder.date + ' at ' + nextLadder.time;
        document.getElementById('topbarLeft').querySelector('.th-icon').textContent = '\u23F3';
        document.getElementById('historyDate').style.display = 'none';
        currentSort = 'nextStartPos';
        currentDir = 1;
        renderTable();
      } else {
        document.getElementById('nextLadderInfo').textContent = 'Ladder Precedente';
        document.getElementById('topbarLeft').querySelector('.th-icon').textContent = '\uD83D\uDCC4';
        document.getElementById('historyDate').style.display = '';
        currentSort = 'startPos';
        currentDir = 1;
        loadHistoryDates();
      }
    });
  });

  document.getElementById('historyDate').addEventListener('change', function() {
    var date = this.value;
    if (!date) {
      historyData = null;
      renderTable();
      document.getElementById('nextLadderInfo').textContent = 'Ladder Precedente';
      return;
    }
    getHistoryDate(date).then(function(data) {
      historyData = data;
      document.getElementById('nextLadderInfo').textContent = 'Ladder ' + date;
      currentSort = 'startPos';
      currentDir = 1;
      renderTable();
    }).catch(function() {});
  });
}

// Init
function initApp() {
  updateLadderInfo(nextLadder);

  me = isAdmin ? null : getMe(scullers);
  if (me) {
    document.getElementById('userBadge').textContent = me.name + ' (' + me.club + ')';
    document.getElementById('userCard').style.display = '';
    updateUserCard();
    var inCol = document.querySelector('th[data-sort="nextParticipating"]');
    if (inCol) inCol.style.display = 'none';
  }

  initEventListeners();

  computeRankingsLocal();
  renderTable();
  checkAndAdvanceLadder();
  if (isAdmin) loadRequests();
}

// Start
loadScullers().then(function(data) {
  scullers = data;
  return getVotes();
}).then(function(data) {
  myCaught = data.caught || {};
  var participation = data.participation || {};
  myManualRanks = data.manualRanks || {};
  myManualStarts = data.manualStarts || {};
  var lastSession = data.lastSession || {};
  scullers.forEach(function(s) {
    s.nextParticipating = null;
    s.nextStartPos = null;
  });
  scullers.forEach(function(s) {
    if (participation[s.id] !== undefined) s.nextParticipating = participation[s.id];
  });
  scullers.forEach(function(s) {
    if (lastSession[s.id]) {
      s.lastStartPos = lastSession[s.id].lastStartPos;
      s.lastCaught = lastSession[s.id].lastCaught;
    }
  });
  return getConfig();
}).then(function(data) {
  if (data.nextLadder) nextLadder = data.nextLadder;
  if (data.lastLadder) lastLadder = data.lastLadder;
  initApp();
}).catch(function() {
  initApp();
});
