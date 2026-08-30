#!/usr/bin/env node
/**
 * Unit tests for the Chiswick Sculling Ladder ranking algorithm.
 * Run: node test_rankings.js
 *
 * Algorithm behavior (from app.html):
 * - Starters sorted by lastStartPos ascending (slowest first, fastest last)
 * - Chain of consecutive 'No' from current position
 * - Chain assigns boundaryRank+0, boundaryRank+1, ...
 * - boundaryRank = originalRank of person AFTER chain (or minRank-1 if at end)
 * - Person AFTER chain gets bumped to boundaryRank + chainLen
 * - People with lastCaught=null/undefined/PathFind/Yes are skipped
 */

var passed = 0;
var failed = 0;
var tests = [];

function assertEqual(actual, expected, label) {
  if (actual === expected) {
    passed++;
  } else {
    failed++;
    console.log('  FAIL: ' + label + ' — expected ' + expected + ', got ' + actual);
  }
}

function assert(cond, label) {
  if (cond) passed++;
  else { failed++; console.log('  FAIL: ' + label); }
}

// ── Extracted algorithm from app.html ──

function createEngine(scullers, myCaught, myManualRanks) {
  var computedRanks = {};

  function getComputedRank(s) {
    if (myManualRanks[s.id] !== undefined && myManualRanks[s.id] !== null)
      return myManualRanks[s.id];
    if (computedRanks[s.id] !== undefined) return computedRanks[s.id];
    return s.rank ? parseInt(s.rank) : 0;
  }

  function computeRankings() {
    scullers.forEach(function(s) {
      computedRanks[s.id] = getComputedRank(s);
    });
    var starters = scullers.filter(function(s) {
      return s.lastStartPos != null;
    });
    if (starters.length === 0) return;
    starters.sort(function(a, b) {
      return parseInt(a.lastStartPos) - parseInt(b.lastStartPos);
    });
    var minRank = Infinity;
    starters.forEach(function(s) {
      var r = getComputedRank(s);
      if (r > 0 && r < minRank) minRank = r;
    });
    if (minRank === Infinity) return;
    var originalRank = {};
    starters.forEach(function(s) {
      originalRank[s.id] = getComputedRank(s);
    });
    var result = {};
    starters.forEach(function(s) {
      result[s.id] = originalRank[s.id];
    });
    var i = 0;
    while (i < starters.length) {
      var caught =
        myCaught[starters[i].id] !== undefined
          ? myCaught[starters[i].id]
          : starters[i].lastCaught;
      if (caught !== 'No') {
        i++;
        continue;
      }
      var chainStart = i;
      while (i < starters.length) {
        caught =
          myCaught[starters[i].id] !== undefined
            ? myCaught[starters[i].id]
            : starters[i].lastCaught;
        if (caught !== 'No') break;
        i++;
      }
      var chainEnd = i - 1;
      if (chainEnd === starters.length - 1 && chainEnd > chainStart) {
        chainEnd--;
      }
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
  }

  return { computeRankings: computeRankings, computedRanks: computedRanks };
}

function sc(id, rank, lastStartPos, lastCaught) {
  return {
    id: id, name: 'S' + id, club: 'PTRC',
    rank: String(rank),
    lastStartPos: lastStartPos != null ? String(lastStartPos) : null,
    lastCaught: lastCaught || null,
  };
}

// ═══════════════════════════════════════
// TESTS
// ═══════════════════════════════════════

console.log('\n=== Known Scenarios (3 people) ===\n');

// Scenario 1: All No (except last)
// ABA(12) pos1 last, Simon(13) pos2 No, Inkeri(171) pos3 No
// Inkeri is last with 'No' → excluded from chain (meaningless)
// Chain: Simon only → boundaryRank = originalRank[Inkeri] = 171
// result[Simon]=171, Inkeri bumped to 172
console.log('Test 1: All No — last person excluded, only Simon improves');
(function() {
  var eng = createEngine(
    [sc(1,12,1,null), sc(2,13,2,'No'), sc(3,171,3,'No')],
    {}, {}
  );
  eng.computeRankings();
  assertEqual(eng.computedRanks[1], 12, 'ABA stays 12');
  assertEqual(eng.computedRanks[2], 171, 'Simon → 171');
  assertEqual(eng.computedRanks[3], 172, 'Inkeri bumped to 172');
})();

// Scenario 2: Inkeri Yes
// ABA(12) pos1 last, Simon(13) pos2 No, Inkeri(171) pos3 Yes
// Chain: Simon (single) → boundaryRank = originalRank[Inkeri] = 171
// result[Simon]=171, result[Inkeri]=172
// ABA stays 12
console.log('Test 2: Inkeri Yes — Simon pushed to boundary');
(function() {
  var eng = createEngine(
    [sc(1,12,1,null), sc(2,13,2,'No'), sc(3,171,3,'Yes')],
    {}, {}
  );
  eng.computeRankings();
  assertEqual(eng.computedRanks[1], 12, 'ABA stays 12');
  assertEqual(eng.computedRanks[2], 171, 'Simon → 171');
  assertEqual(eng.computedRanks[3], 172, 'Inkeri → 172');
})();

// Scenario 3: Simon Yes
// ABA(12) pos1 last, Simon(13) pos2 Yes, Inkeri(171) pos3 No
// Chain: Inkeri (single) → boundaryRank = minRank-1 = 11
// result[Inkeri]=11
// ABA stays 12, Simon stays 13
console.log('Test 3: Simon Yes — Inkeri fills bottom');
(function() {
  var eng = createEngine(
    [sc(1,12,1,null), sc(2,13,2,'Yes'), sc(3,171,3,'No')],
    {}, {}
  );
  eng.computeRankings();
  assertEqual(eng.computedRanks[1], 12, 'ABA stays 12');
  assertEqual(eng.computedRanks[2], 13, 'Simon stays 13');
  assertEqual(eng.computedRanks[3], 11, 'Inkeri → 11');
})();

console.log('\n=== Chain Rule Tests ===\n');

// Chain stops at first Yes
// 5 people: A(10)pos1 last, B(11)pos2 No, C(12)pos3 Yes, D(13)pos4 No, E(14)pos5 No
// Chain 1: B → boundaryRank=originalRank[C]=12 → result[B]=12, result[C]=13
// E is last with No → excluded. Chain 2: D only → boundaryRank=originalRank[E]=14
// result[D]=14, E bumped to 15
console.log('Test 4: Chain stops at Yes, then new chain');
(function() {
  var eng = createEngine(
    [sc(1,10,1,null), sc(2,11,2,'No'), sc(3,12,3,'Yes'),
     sc(4,13,4,'No'), sc(5,14,5,'No')],
    {}, {}
  );
  eng.computeRankings();
  assertEqual(eng.computedRanks[1], 10, 'A stays 10');
  assertEqual(eng.computedRanks[2], 12, 'B → 12');
  assertEqual(eng.computedRanks[3], 13, 'C → 13');
  assertEqual(eng.computedRanks[4], 14, 'D → 14');
  assertEqual(eng.computedRanks[5], 15, 'E bumped to 15');
})();

// All Yes — nobody improves
console.log('Test 5: All Yes — ranks unchanged');
(function() {
  var eng = createEngine(
    [sc(1,5,1,'Yes'), sc(2,6,2,'Yes'), sc(3,7,3,null)],
    {}, {}
  );
  eng.computeRankings();
  assertEqual(eng.computedRanks[1], 5, 'A stays 5');
  assertEqual(eng.computedRanks[2], 6, 'B stays 6');
  assertEqual(eng.computedRanks[3], 7, 'C stays 7');
})();

// All No (except last)
// A(10)pos1 last, B(11)pos2 No, C(12)pos3 No
// C is last with No → excluded. Chain: B only
// boundaryRank = originalRank[C] = 12 → result[B]=12, C bumped to 13
console.log('Test 6: All No — last excluded, only B improves');
(function() {
  var eng = createEngine(
    [sc(1,10,1,null), sc(2,11,2,'No'), sc(3,12,3,'No')],
    {}, {}
  );
  eng.computeRankings();
  assertEqual(eng.computedRanks[1], 10, 'A stays 10');
  assertEqual(eng.computedRanks[2], 12, 'B → 12');
  assertEqual(eng.computedRanks[3], 13, 'C bumped to 13');
})();

// myCaught overrides lastCaught
// A(10)pos1 last, B(11)pos2 lastCaught=No but myCaught=Yes, C(12)pos3 No
// B is skipped (myCaught=Yes), Chain: C → boundaryRank=minRank-1=9 → result[C]=9
// B stays at 11 (nobody bumped because C is last in chain at end)
console.log('Test 7: myCaught overrides lastCaught');
(function() {
  var eng = createEngine(
    [sc(1,10,1,null), sc(2,11,2,'No'), sc(3,12,3,'No')],
    { 2: 'Yes' }, {}
  );
  eng.computeRankings();
  assertEqual(eng.computedRanks[1], 10, 'A stays 10');
  assertEqual(eng.computedRanks[2], 11, 'B stays 11 (skipped by myCaught)');
  assertEqual(eng.computedRanks[3], 9, 'C → 9');
})();

console.log('\n=== Edge Cases ===\n');

// Single starter
console.log('Test 8: Single starter');
(function() {
  var eng = createEngine([sc(1,10,1,null)], {}, {});
  eng.computeRankings();
  assertEqual(eng.computedRanks[1], 10, 'Single starter keeps rank');
})();

// No starters
console.log('Test 9: No starters');
(function() {
  var eng = createEngine(
    [sc(1,10,null,null), sc(2,11,null,null)],
    {}, {}
  );
  eng.computeRankings();
  assertEqual(eng.computedRanks[1], 10, 'A keeps rank');
  assertEqual(eng.computedRanks[2], 11, 'B keeps rank');
})();

// PathFinder — lastCaught='PathFind', not 'No', so skipped
// PF(1)pos1 PathFind, B(10)pos2 No, C(11)pos3 No, D(12)pos4 last
// Chain: B,C → boundaryRank=originalRank[D]=12 → result[B]=12, result[C]=13
// PF stays 1, D bumped to 14
console.log('Test 10: PathFinder skipped in chain');
(function() {
  var eng = createEngine(
    [sc(1,1,1,'PathFind'), sc(2,10,2,'No'),
     sc(3,11,3,'No'), sc(4,12,4,null)],
    {}, {}
  );
  eng.computeRankings();
  assertEqual(eng.computedRanks[1], 1, 'PathFinder stays 1');
  assertEqual(eng.computedRanks[2], 12, 'B → 12');
  assertEqual(eng.computedRanks[3], 13, 'C → 13');
  assertEqual(eng.computedRanks[4], 14, 'D → 14');
})();

// Two separate chains separated by Yes
// A(10)pos1 last, B(11)pos2 No, C(12)pos3 Yes, D(13)pos4 No, E(14)pos5 No
// E is last with No → excluded. Chain 1: B → boundaryRank=C=12 → result[B]=12, C=13
// Chain 2: D only → boundaryRank=originalRank[E]=14 → result[D]=14, E bumped to 15
console.log('Test 11: Two separate chains');
(function() {
  var eng = createEngine(
    [sc(1,10,1,null), sc(2,11,2,'No'), sc(3,12,3,'Yes'),
     sc(4,13,4,'No'), sc(5,14,5,'No')],
    {}, {}
  );
  eng.computeRankings();
  assertEqual(eng.computedRanks[1], 10, 'A stays 10');
  assertEqual(eng.computedRanks[2], 12, 'B → 12');
  assertEqual(eng.computedRanks[3], 13, 'C → 13');
  assertEqual(eng.computedRanks[4], 14, 'D → 14');
  assertEqual(eng.computedRanks[5], 15, 'E bumped to 15');
})();

// myManualRanks overrides rank
// C has manual rank 20. C is last with No → excluded.
// Chain: B only → boundaryRank = originalRank[C] = 20
// result[B] = 20, C bumped to 21
console.log('Test 12: myManualRanks feeds into cascade');
(function() {
  var eng = createEngine(
    [sc(1,10,1,null), sc(2,11,2,'No'), sc(3,12,3,'No')],
    {}, { 3: 20 }
  );
  eng.computeRankings();
  assertEqual(eng.computedRanks[1], 10, 'A stays 10');
  assertEqual(eng.computedRanks[2], 20, 'B → 20');
  assertEqual(eng.computedRanks[3], 21, 'C → 21');
})();

console.log('\n=== Multi-Person Chains ===\n');

// 4 people: A(5)pos1 last, B(6)pos2 No, C(7)pos3 No, D(8)pos4 No
// D is last with No → excluded. Chain: B,C
// boundaryRank = originalRank[D] = 8 → result[B]=8, result[C]=9, D bumped to 10
console.log('Test 13: Chain of 3 — last excluded');
(function() {
  var eng = createEngine(
    [sc(1,5,1,null), sc(2,6,2,'No'), sc(3,7,3,'No'), sc(4,8,4,'No')],
    {}, {}
  );
  eng.computeRankings();
  assertEqual(eng.computedRanks[1], 5, 'A stays 5');
  assertEqual(eng.computedRanks[2], 8, 'B → 8');
  assertEqual(eng.computedRanks[3], 9, 'C → 9');
  assertEqual(eng.computedRanks[4], 10, 'D bumped to 10');
})();

// Boundary person gets bumped by chain
// A(5)pos1 No, B(6)pos2 Yes, C(7)pos3 No
// i=0: A lastCaught=null → skip
// i=1: B caught=Yes → skip
// i=2: C caught=No → chainStart=2, i=3 → chainEnd=2, chainLen=1
//   boundaryRank=minRank-1=4 → result[C]=4
console.log('Test 14: Single person chain at end');
(function() {
  var eng = createEngine(
    [sc(1,5,1,null), sc(2,6,2,'Yes'), sc(3,7,3,'No')],
    {}, {}
  );
  eng.computeRankings();
  assertEqual(eng.computedRanks[1], 5, 'A stays 5');
  assertEqual(eng.computedRanks[2], 6, 'B stays 6');
  assertEqual(eng.computedRanks[3], 4, 'C → 4');
})();

// Chain bumps boundary: A(5)pos1 No, B(6)pos2 No, C(7)pos3 last
// i=0: A lastCaught=null → skip
// i=1: B caught=No → chainStart=1
//   i=2: C lastCaught=null → break → chainEnd=1, chainLen=1
//   boundaryRank=originalRank[C]=7
//   result[B]=7, result[C]=7+1=8
console.log('Test 15: Chain bumps boundary person');
(function() {
  var eng = createEngine(
    [sc(1,5,1,null), sc(2,6,2,'No'), sc(3,7,3,null)],
    {}, {}
  );
  eng.computeRankings();
  assertEqual(eng.computedRanks[1], 5, 'A stays 5');
  assertEqual(eng.computedRanks[2], 7, 'B → 7');
  assertEqual(eng.computedRanks[3], 8, 'C → 8');
})();

console.log('\n=== Real Data: 16-Aug Ladder (10 starters) ===\n');

console.log('Test 16: Real 16-Aug ladder results');
(function() {
  var eng = createEngine(
    [
      sc(1,207,1,'No'),   sc(2,117,5,'No'),   sc(3,51,11,'No'),
      sc(4,49,12,'No'),   sc(5,50,13,'No'),   sc(6,53,15,'Yes'),
      sc(7,52,16,'No'),   sc(8,47,18,'Yes'),  sc(9,36,19,'No'),
      sc(10,35,20,'No'),
    ], {}, {}
  );
  eng.computeRankings();

  // Sorted by lastStartPos: same order as input
  // minRank = min(207,117,51,49,50,53,52,47,36,35) = 35
  // originalRank: {1:207, 2:117, 3:51, 4:49, 5:50, 6:53, 7:52, 8:47, 9:36, 10:35}
  //
  // Cascade:
  // i=0: Inkeri No → chainStart=0
  //   i=1: Jacqui No → continue
  //   i=2: Caroline No → continue
  //   i=3: Kirsty No → continue
  //   i=4: Ainslie No → continue
  //   i=5: Jonathan Yes → break, chainEnd=4, chainLen=5
  //   boundaryRank = originalRank[Jonathan] = 53
  //   result[Inkeri]=53, Jacqui=54, Caroline=55, Kirsty=56, Ainslie=57
  //   result[Jonathan]=53+5=58
  //
  // i=6: Kathryn No → chainStart=6
  //   i=7: Devlin Yes → break, chainEnd=6, chainLen=1
  //   boundaryRank = originalRank[Devlin] = 47
  //   result[Kathryn]=47
  //   result[Devlin]=47+1=48
  //
  // i=8: Guy No → chainStart=8
  //   i=9: Daisy No → continue
  //   i=10: end, chainEnd=9, chainLen=2
  //   boundaryRank = minRank-1 = 34
  //   result[Guy]=34, result[Daisy]=35

  // Guy,Daisy chain — Daisy is last with No → excluded
  // Chain: Guy only → boundaryRank = originalRank[Daisy] = 35
  // result[Guy]=35, Daisy bumped to 36

  assertEqual(eng.computedRanks[1], 53, 'Inkeri → 53');
  assertEqual(eng.computedRanks[2], 54, 'Jacqui → 54');
  assertEqual(eng.computedRanks[3], 55, 'Caroline → 55');
  assertEqual(eng.computedRanks[4], 56, 'Kirsty → 56');
  assertEqual(eng.computedRanks[5], 57, 'Ainslie → 57');
  assertEqual(eng.computedRanks[6], 58, 'Jonathan → 58');
  assertEqual(eng.computedRanks[7], 47, 'Kathryn → 47');
  assertEqual(eng.computedRanks[8], 48, 'Devlin → 48');
  assertEqual(eng.computedRanks[9], 35, 'Guy → 35');
  assertEqual(eng.computedRanks[10], 36, 'Daisy → 36');
})();

// ═══════════════════════════════════════
// USER'S BUG SCENARIO
// ═══════════════════════════════════════

console.log('\n=== User Bug Scenario: 4 participants ===\n');

// PathFinder, Rank207(Yes), Rank167(No), Rank160(No, last)
// Rank160 is last → No is meaningless → excluded
// Chain: Rank167 only → boundaryRank = originalRank[Rank160] = 160
// result[167]=160, Rank160 bumped to 161
console.log('Test 17: User bug — 4 participants, last says No');
(function() {
  var eng = createEngine(
    [sc(1,207,1,'PathFind'), sc(2,207,2,'Yes'),
     sc(3,167,3,'No'), sc(4,160,4,'No')],
    {}, {}
  );
  eng.computeRankings();
  assertEqual(eng.computedRanks[1], 207, 'PathFinder stays 207');
  assertEqual(eng.computedRanks[2], 207, 'Rank207 stays 207');
  assertEqual(eng.computedRanks[3], 160, 'Rank167 → 160');
  assertEqual(eng.computedRanks[4], 161, 'Rank160 → 161');
})();

console.log('Test 18: Same but last person not saying No');
(function() {
  var eng = createEngine(
    [sc(1,207,1,'PathFind'), sc(2,207,2,'Yes'),
     sc(3,167,3,'No'), sc(4,160,4,null)],
    {}, {}
  );
  eng.computeRankings();
  assertEqual(eng.computedRanks[1], 207, 'PathFinder stays 207');
  assertEqual(eng.computedRanks[2], 207, 'Rank207 stays 207');
  assertEqual(eng.computedRanks[3], 160, 'Rank167 → 160');
  assertEqual(eng.computedRanks[4], 161, 'Rank160 → 161');
})();

// ═══════════════════════════════════════
// RESULTS
// ═══════════════════════════════════════

console.log('\n═════════════════════════════════════');
console.log('Results: ' + passed + ' passed, ' + failed + ' failed');
console.log('═════════════════════════════════════\n');

if (failed > 0) process.exit(1);
else console.log('All tests passed!\n');
