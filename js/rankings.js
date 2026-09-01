// js/rankings.js - Pure ranking business logic (no DOM)
// Shared by app.html, ranking.html, and test_rankings.js

export function computeRankings(scullers, myCaught) {
  var computedRanks = {};

  scullers.forEach(function(s) {
    computedRanks[s.id] = s.rank ? parseInt(s.rank) : 0;
  });

  var starters = scullers.filter(function(s) {
    return s.lastStartPos != null;
  });

  if (starters.length === 0) return computedRanks;

  starters.sort(function(a, b) {
    return parseInt(a.lastStartPos) - parseInt(b.lastStartPos);
  });

  function getCaught(s) {
    return myCaught[s.id] !== undefined ? myCaught[s.id] : s.lastCaught;
  }

  var chains = [];
  var i = 0;
  while (i < starters.length) {
    var caught = getCaught(starters[i]);

    if (caught === 'No') {
      var noPeople = [];
      var boundary = null;

      while (i < starters.length && getCaught(starters[i]) === 'No') {
        noPeople.push(starters[i]);
        i++;
      }

      if (i < starters.length) {
        boundary = starters[i];
        i++;
      }

      var allRanks = noPeople.map(function(s) { return computedRanks[s.id]; });
      if (boundary) allRanks.push(computedRanks[boundary.id]);
      var fastestRank = Math.min.apply(null, allRanks);

      chains.push({
        noPeople: noPeople,
        boundary: boundary,
        fastestRank: fastestRank,
        totalLen: noPeople.length + (boundary ? 1 : 0),
        startPos: parseInt(noPeople[0].lastStartPos),
      });
    } else {
      i++;
    }
  }

  chains = chains.filter(function(chain) {
    var chainSize = chain.noPeople.length + (chain.boundary ? 1 : 0);
    if (chainSize < starters.length) return true;
    var allRanks = chain.noPeople.map(function(s) { return computedRanks[s.id]; });
    if (chain.boundary) allRanks.push(computedRanks[chain.boundary.id]);
    for (var k = 1; k < allRanks.length; k++) {
      if (allRanks[k] < allRanks[k - 1]) return true;
    }
    return false;
  });

  chains.sort(function(a, b) { return b.startPos - a.startPos; });

  var takenRanks = {};

  chains.forEach(function(chain) {
    var startRank = chain.fastestRank;
    while (takenRanks[startRank]) {
      startRank++;
    }

    var rank = startRank;
    chain.noPeople.forEach(function(s) {
      computedRanks[s.id] = rank;
      takenRanks[rank] = true;
      rank++;
    });
    if (chain.boundary) {
      computedRanks[chain.boundary.id] = rank;
      takenRanks[rank] = true;
      rank++;
    }
  });

  scullers.forEach(function(s) {
    if (computedRanks[s.id] > 0 && takenRanks[computedRanks[s.id]] &&
        !chains.some(function(c) {
          return c.noPeople.some(function(p) { return p.id === s.id; }) ||
                 (c.boundary && c.boundary.id === s.id);
        })) {
      var origRank = computedRanks[s.id];
      var newRank = origRank + 1;
      while (takenRanks[newRank]) newRank++;
      computedRanks[s.id] = newRank;
      takenRanks[newRank] = true;
    }
  });

  return computedRanks;
}

export function getComputedRank(s, computedRanks) {
  if (computedRanks && computedRanks[s.id] !== undefined) return computedRanks[s.id];
  return s.rank ? parseInt(s.rank) : 0;
}

export function computeNextPositions(scullers, myManualStarts) {
  var pathfinders = scullers.filter(function(s) {
    return s.nextParticipating === 'PathFind';
  });
  var confirmed = scullers.filter(function(s) {
    return s.nextParticipating === 'Yes';
  });
  var total = pathfinders.length + confirmed.length;
  if (total === 0) return {};

  var map = {};
  pathfinders.forEach(function(s, idx) { map[s.id] = idx + 1; });

  var manual = [];
  var natural = [];
  confirmed.forEach(function(s) {
    var mp = myManualStarts[s.id];
    if (mp != null && mp !== '' && !isNaN(mp) && parseInt(mp) > 0) {
      manual.push({ sc: s, pos: parseInt(mp) });
    } else {
      natural.push(s);
    }
  });

  natural.sort(function(a, b) {
    var ra = a.rank ? parseInt(a.rank) : 0;
    var rb = b.rank ? parseInt(b.rank) : 0;
    if (ra === 0 && rb !== 0) return -1;
    if (rb === 0 && ra !== 0) return 1;
    return rb - ra;
  });

  manual.sort(function(a, b) { return a.pos - b.pos; });

  var ordered = [];
  manual.forEach(function(e) { ordered.push(e.sc); });
  natural.forEach(function(s) { ordered.push(s); });

  var startNum = pathfinders.length + 1;
  ordered.forEach(function(s, idx) {
    map[s.id] = startNum + idx;
  });

  return map;
}

export function computeLastPositions(scullers, getComputedRankFn) {
  var starters = scullers.filter(function(s) { return s.lastStartPos != null; });
  starters.sort(function(a, b) { return getComputedRankFn(b) - getComputedRankFn(a); });
  var map = {};
  starters.forEach(function(s, i) { map[s.id] = i + 1; });
  return map;
}
