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
    var firstRank = computedRanks[chain.noPeople[0].id];
    return chain.fastestRank < firstRank;
  });

  chains.sort(function(a, b) { return b.startPos - a.startPos; });

  var chainRanks = {};

  chains.forEach(function(chain) {
    var chainLen = chain.noPeople.length + (chain.boundary ? 1 : 0);
    var startRank = chain.fastestRank;
    while (true) {
      var available = true;
      for (var k = 0; k < chainLen; k++) {
        if (chainRanks[startRank + k]) { available = false; break; }
      }
      if (available) break;
      startRank++;
    }

    var rank = startRank;
    chain.noPeople.forEach(function(s) {
      computedRanks[s.id] = rank;
      chainRanks[rank] = true;
      rank++;
    });
    if (chain.boundary) {
      computedRanks[chain.boundary.id] = rank;
      chainRanks[rank] = true;
      rank++;
    }
  });

  var occupied = {};
  Object.keys(chainRanks).forEach(function(r) { occupied[r] = true; });

  var nonChain = scullers.filter(function(s) {
    return !chains.some(function(c) {
      return c.noPeople.some(function(p) { return p.id === s.id; }) ||
             (c.boundary && c.boundary.id === s.id);
    });
  });

  nonChain.sort(function(a, b) {
    return computedRanks[a.id] - computedRanks[b.id];
  });

  nonChain.forEach(function(s) {
    var rank = computedRanks[s.id];
    if (occupied[rank]) {
      while (occupied[rank]) rank++;
      computedRanks[s.id] = rank;
      occupied[rank] = true;
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
