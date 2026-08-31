// js/rankings.js - Pure ranking business logic (no DOM)
// Shared by app.html, ranking.html, and test_rankings.js

export function computeRankings(scullers, myCaught, myManualRanks) {
  var computedRanks = {};
  scullers.forEach(function(s) {
    computedRanks[s.id] = (myManualRanks[s.id] !== undefined && myManualRanks[s.id] !== null) ? myManualRanks[s.id] : (s.rank ? parseInt(s.rank) : 0);
  });
  var starters = scullers.filter(function(s) { return s.lastStartPos != null; });
  if (starters.length === 0) return computedRanks;
  starters.sort(function(a, b) { return parseInt(a.lastStartPos) - parseInt(b.lastStartPos); });
  var minRank = Infinity;
  starters.forEach(function(s) {
    var r = getComputedRank(s, myManualRanks, computedRanks);
    if (r > 0 && r < minRank) minRank = r;
  });
  if (minRank === Infinity) return computedRanks;
  var originalRank = {};
  starters.forEach(function(s) {
    originalRank[s.id] = getComputedRank(s, myManualRanks, computedRanks);
  });
  var result = {};
  starters.forEach(function(s) {
    result[s.id] = originalRank[s.id];
  });
  var i = 0;
  while (i < starters.length) {
    var caught = myCaught[starters[i].id] !== undefined ? myCaught[starters[i].id] : starters[i].lastCaught;
    if (caught !== 'No' || i === starters.length - 1) {
      i++;
      continue;
    }
    var chainStart = i;
    while (i < starters.length) {
      caught = myCaught[starters[i].id] !== undefined ? myCaught[starters[i].id] : starters[i].lastCaught;
      if (caught !== 'No') break;
      i++;
    }
    var chainEnd = i - 1;
    if (chainEnd === starters.length - 1) chainEnd--;
    var chainLen = chainEnd - chainStart + 1;
    if (chainLen <= 0) continue;
    var boundaryRank;
    if (i < starters.length) {
      boundaryRank = originalRank[starters[i].id];
    } else if (chainEnd < starters.length - 1) {
      boundaryRank = originalRank[starters[chainEnd + 1].id];
    } else {
      boundaryRank = minRank - 1;
    }
    for (var j = 0; j < chainLen; j++) {
      result[starters[chainStart + j].id] = boundaryRank + j;
    }
    if (i < starters.length) {
      result[starters[i].id] = boundaryRank + chainLen;
    } else if (chainEnd < starters.length - 1) {
      result[starters[chainEnd + 1].id] = boundaryRank + chainLen;
    }
  }
  starters.forEach(function(s) {
    computedRanks[s.id] = result[s.id];
  });
  return computedRanks;
}

export function getComputedRank(s, myManualRanks, computedRanks) {
  if (myManualRanks[s.id] !== undefined && myManualRanks[s.id] !== null) return myManualRanks[s.id];
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
  var withManual = [];
  var withoutManual = [];
  confirmed.forEach(function(s) {
    if (myManualStarts[s.id] !== undefined) withManual.push(s);
    else withoutManual.push(s);
  });
  withoutManual.sort(function(a, b) {
    var ra = a.rank ? parseInt(a.rank) : 0;
    var rb = b.rank ? parseInt(b.rank) : 0;
    if (ra === 0 && rb !== 0) return -1;
    if (rb === 0 && ra !== 0) return 1;
    return rb - ra;
  });
  var map = {};
  pathfinders.forEach(function(s) { map[s.id] = 1; });
  withManual.forEach(function(s) {
    var manualPos = myManualStarts[s.id];
    if (manualPos === 1 && pathfinders.length > 0) manualPos = pathfinders.length + 1;
    map[s.id] = manualPos;
  });
  var nextSlot = pathfinders.length > 0 ? 2 : 1;
  for (var i = nextSlot; i <= confirmed.length + pathfinders.length; i++) {
    var occupied = false;
    for (var k in map) { if (map[k] === i) { occupied = true; break; } }
    if (!occupied) {
      while (withoutManual.length > 0) {
        var candidate = withoutManual.shift();
        if (myManualStarts[candidate.id] === undefined) {
          map[candidate.id] = i;
          break;
        }
      }
    }
  }
  withoutManual.forEach(function(s) {
    if (map[s.id] === undefined) {
      var maxPos = 0;
      for (var k in map) { if (map[k] > maxPos) maxPos = map[k]; }
      map[s.id] = maxPos + 1;
    }
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
