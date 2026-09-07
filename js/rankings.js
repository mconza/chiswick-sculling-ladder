// js/rankings.js - Pure ranking business logic (no DOM)
// Shared by app.html, ranking.html, and test_rankings.js

export function computeRankings(scullers, myCaught) {
  var computedRanks = {};

  scullers.forEach(function(s) {
    var r = s.rank ? parseInt(s.rank) : 0;
    computedRanks[s.id] = (isNaN(r) || r === 0) ? 0 : r;
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

  function isRanked(s) {
    return s.rank && parseInt(s.rank) > 0;
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

      if (noPeople.length === 0) continue;

      var allRanks = noPeople.map(function(s) { return computedRanks[s.id]; });
      if (boundary) allRanks.push(computedRanks[boundary.id]);
      var realRanks = allRanks.filter(function(r) { return r > 0; });
      if (realRanks.length === 0) continue;
      var fastestRank = Math.min.apply(null, realRanks);

      chains.push({
        noPeople: noPeople,
        boundary: boundary,
        // An unranked sculler who was caught stops the preceding chain, but
        // remains unranked and must not consume a rank in that chain.
        boundaryGetsRank: boundary && isRanked(boundary),
        fastestRank: fastestRank,
        totalLen: noPeople.length + (boundary && isRanked(boundary) ? 1 : 0),
        startPos: parseInt(noPeople[0].lastStartPos),
      });
    } else {
      i++;
    }
  }

  chains.sort(function(a, b) { return b.startPos - a.startPos; });

  var chainRanks = {};

  chains.forEach(function(chain) {
    var firstRealRank = 0;
    for (var j = 0; j < chain.noPeople.length; j++) {
      var r = computedRanks[chain.noPeople[j].id];
      if (r > 0) { firstRealRank = r; break; }
    }
    if (firstRealRank === 0 && chain.boundary) {
      firstRealRank = computedRanks[chain.boundary.id];
    }

    if (firstRealRank === 0) return;

    var hasUnrankedNo = chain.noPeople.some(function(s) {
      return computedRanks[s.id] === 0 && getCaught(s) === 'No';
    });
    var firstNoIsUnranked = computedRanks[chain.noPeople[0].id] === 0;

    // If the chain starts with an unranked "No", its first real rank is
    // further down the chain. Allocate from that rank, never from 0 + 1.
    if (chain.fastestRank < firstRealRank || firstNoIsUnranked) {
      var chainLen = chain.noPeople.length + (chain.boundaryGetsRank ? 1 : 0);
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
      if (chain.boundaryGetsRank) {
        computedRanks[chain.boundary.id] = rank;
        chainRanks[rank] = true;
        rank++;
      }
    } else if (hasUnrankedNo) {
      var lastRankedRank = 0;
      chain.noPeople.forEach(function(p) {
        var r = computedRanks[p.id];
        if (r > 0 && r > lastRankedRank) lastRankedRank = r;
      });
      var nextRank = lastRankedRank + 1;
      while (chainRanks[nextRank]) nextRank++;
      chain.noPeople.forEach(function(s) {
        if (computedRanks[s.id] === 0 && getCaught(s) === 'No') {
          computedRanks[s.id] = nextRank;
          chainRanks[nextRank] = true;
          nextRank++;
          while (chainRanks[nextRank]) nextRank++;
        }
      });
    }
  });

  var occupied = {};
  Object.keys(chainRanks).forEach(function(r) { occupied[r] = true; });

  var chainIds = {};
  chains.forEach(function(c) {
    c.noPeople.forEach(function(p) { chainIds[p.id] = true; });
    if (c.boundary) chainIds[c.boundary.id] = true;
  });

  var nonChain = scullers.filter(function(s) {
    return !chainIds[s.id];
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
    var ra = (a.newRank !== undefined && a.newRank !== null && a.newRank !== '') ? parseInt(a.newRank) : (a.rank ? parseInt(a.rank) : 0);
    var rb = (b.newRank !== undefined && b.newRank !== null && b.newRank !== '') ? parseInt(b.newRank) : (b.rank ? parseInt(b.rank) : 0);
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
