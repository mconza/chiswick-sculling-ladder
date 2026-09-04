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

  function isRanked(s) {
    return s.rank && parseInt(s.rank) > 0;
  }

  starters = starters.filter(function(s) {
    return !( !isRanked(s) && getCaught(s) === 'Yes' );
  });

  if (starters.length === 0) return computedRanks;

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
        fastestRank: fastestRank,
        totalLen: noPeople.length + (boundary ? 1 : 0),
        startPos: parseInt(noPeople[0].lastStartPos),
      });
    } else {
      i++;
    }
  }

  var allChains = chains.map(function(c) {
    return {
      noPeople: c.noPeople.slice(),
      boundary: c.boundary,
      fastestRank: c.fastestRank,
      totalLen: c.totalLen,
      startPos: c.startPos,
    };
  });

  chains = chains.filter(function(chain) {
    var firstRealRank = 0;
    for (var j = 0; j < chain.noPeople.length; j++) {
      var r = computedRanks[chain.noPeople[j].id];
      if (r > 0) { firstRealRank = r; break; }
    }
    if (firstRealRank === 0 && chain.boundary) {
      firstRealRank = computedRanks[chain.boundary.id];
    }
    return firstRealRank > 0 && chain.fastestRank < firstRealRank;
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

  allChains.forEach(function(chain) {
    if (chains.indexOf(chain) !== -1) return;

    var unrankedInChain = chain.noPeople.filter(function(s) {
      return computedRanks[s.id] === 0;
    });
    if (unrankedInChain.length === 0) return;

    var usedRanks = {};
    scullers.forEach(function(s) {
      var r = computedRanks[s.id];
      if (r > 0) usedRanks[r] = true;
    });

    unrankedInChain.forEach(function(s, idx) {
      var prevRank = 0;
      for (var p = idx - 1; p >= 0; p--) {
        var pr = computedRanks[unrankedInChain[p].id];
        if (pr > 0) { prevRank = pr; break; }
      }
      if (prevRank === 0) {
        for (var j = 0; j < chain.noPeople.length; j++) {
          if (chain.noPeople[j].id === s.id) break;
          var nr = computedRanks[chain.noPeople[j].id];
          if (nr > 0) prevRank = nr;
        }
      }
      var nextRank = prevRank + 1;
      while (usedRanks[nextRank]) nextRank++;
      computedRanks[s.id] = nextRank;
      usedRanks[nextRank] = true;
    });
  });

  var fallbackUnranked = starters.filter(function(s) {
    return computedRanks[s.id] === 0;
  });
  if (fallbackUnranked.length > 0) {
    var usedRanks = {};
    scullers.forEach(function(s) {
      var r = computedRanks[s.id];
      if (r > 0) usedRanks[r] = true;
    });
    var nextRank = 1;
    fallbackUnranked.forEach(function(s) {
      while (usedRanks[nextRank]) nextRank++;
      computedRanks[s.id] = nextRank;
      usedRanks[nextRank] = true;
      nextRank++;
    });
  }

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
