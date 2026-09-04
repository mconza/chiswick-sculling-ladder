#!/usr/bin/env node
/**
 * Unit tests for the Chiswick Sculling Ladder ranking algorithm.
 * Run: node test_rankings.js
 *
 * Tests the shared js/rankings.js module used by the application.
 */

import { computeRankings, getComputedRank, computeNextPositions } from './js/rankings.js';

var passed = 0;
var failed = 0;

function assertEqual(actual, expected, label) {
  if (actual === expected) {
    passed++;
  } else {
    failed++;
    console.log('  FAIL: ' + label + ' — expected ' + expected + ', got ' + actual);
  }
}

function sc(id, rank, lastStartPos, lastCaught) {
  return {
    id: id, name: 'S' + id, club: 'PTRC',
    rank: String(rank),
    lastStartPos: lastStartPos != null ? String(lastStartPos) : null,
    lastCaught: lastCaught || null,
    nextParticipating: null,
    nextStartPos: null,
  };
}

function runTest(scullers, myCaught) {
  return computeRankings(scullers, myCaught || {});
}

// ═══════════════════════════════════════
// TESTS
// ═══════════════════════════════════════

console.log('\n=== Known Scenarios (3 people) ===\n');

console.log('Test 1: Chain [Simon, Inkeri(last)] — fastest=13');
(function() {
  var r = runTest(
    [sc(1,12,1,null), sc(2,13,2,'No'), sc(3,171,3,'No')],
    {}
  );
  assertEqual(r[1], 12, 'ABA stays 12');
  assertEqual(r[2], 13, 'Simon stays 13 (fastest in chain)');
  assertEqual(r[3], 171, 'Inkeri stays 171 (chain must be strictly faster)');
})();

console.log('Test 2: Chain [Simon, Inkeri(Yes)] — fastest=13, no movement');
(function() {
  var r = runTest(
    [sc(1,12,1,null), sc(2,13,2,'No'), sc(3,171,3,'Yes')],
    {}
  );
  assertEqual(r[1], 12, 'ABA stays 12');
  assertEqual(r[2], 13, 'Simon stays 13 (fastest in chain)');
  assertEqual(r[3], 171, 'Inkeri stays 171 (chain must be strictly faster)');
})();

console.log('Test 3: Simon Yes — Inkeri fills bottom');
(function() {
  var r = runTest(
    [sc(1,12,1,null), sc(2,13,2,'Yes'), sc(3,171,3,'No')],
    {}
  );
  assertEqual(r[1], 12, 'ABA stays 12');
  assertEqual(r[2], 13, 'Simon stays 13 (caught by Inkeri)');
  assertEqual(r[3], 171, 'Inkeri stays 171 (last person, No ignored)');
})();

console.log('\n=== Chain Rule Tests ===\n');

console.log('Test 4: Chain stops at Yes, then new chain');
(function() {
  var r = runTest(
    [sc(1,10,1,null), sc(2,11,2,'No'), sc(3,12,3,'Yes'),
     sc(4,13,4,'No'), sc(5,14,5,'No')],
    {}
  );
  assertEqual(r[1], 10, 'A stays 10');
  assertEqual(r[2], 11, 'B stays 11 (fastest in chain)');
  assertEqual(r[3], 12, 'C stays 12 (boundary follows)');
  assertEqual(r[4], 13, 'D stays 13 (fastest in chain)');
  assertEqual(r[5], 14, 'E stays 14 (endpoint follows)');
})();

console.log('Test 5: All Yes — ranks unchanged');
(function() {
  var r = runTest(
    [sc(1,5,1,'Yes'), sc(2,6,2,'Yes'), sc(3,7,3,null)],
    {}
  );
  assertEqual(r[1], 5, 'A stays 5');
  assertEqual(r[2], 6, 'B stays 6');
  assertEqual(r[3], 7, 'C stays 7');
})();

console.log('Test 6: Chain [B, C(last)] — fastest=11, no movement');
(function() {
  var r = runTest(
    [sc(1,10,1,null), sc(2,11,2,'No'), sc(3,12,3,'No')],
    {}
  );
  assertEqual(r[1], 10, 'A stays 10');
  assertEqual(r[2], 11, 'B stays 11 (fastest in chain)');
  assertEqual(r[3], 12, 'C stays 12 (endpoint follows)');
})();

console.log('Test 7: myCaught overrides lastCaught');
(function() {
  var r = runTest(
    [sc(1,10,1,null), sc(2,11,2,'No'), sc(3,12,3,'No')],
    { 2: 'Yes' }, {}
  );
  assertEqual(r[1], 10, 'A stays 10');
  assertEqual(r[2], 11, 'B stays 11 (caught by myCaught)');
  assertEqual(r[3], 12, 'C stays 12 (last person, No ignored)');
})();

console.log('\n=== Edge Cases ===\n');

console.log('Test 8: Single starter');
(function() {
  var r = runTest([sc(1,10,1,null)]);
  assertEqual(r[1], 10, 'Single starter keeps rank');
})();

console.log('Test 9: No starters');
(function() {
  var r = runTest(
    [sc(1,10,null,null), sc(2,11,null,null)],
    {}
  );
  assertEqual(r[1], 10, 'A keeps rank');
  assertEqual(r[2], 11, 'B keeps rank');
})();

console.log('Test 10: PathFinder skipped, chain [B,C,D(last)] — no movement');
(function() {
  var r = runTest(
    [sc(1,1,1,'PathFind'), sc(2,10,2,'No'),
     sc(3,11,3,'No'), sc(4,12,4,null)],
    {}
  );
  assertEqual(r[1], 1, 'PathFinder stays 1');
  assertEqual(r[2], 10, 'B stays 10 (fastest in chain)');
  assertEqual(r[3], 11, 'C stays 11');
  assertEqual(r[4], 12, 'D stays 12 (endpoint follows)');
})();

console.log('Test 11: Two separate chains — no movement');
(function() {
  var r = runTest(
    [sc(1,10,1,null), sc(2,11,2,'No'), sc(3,12,3,'Yes'),
     sc(4,13,4,'No'), sc(5,14,5,'No')],
    {}
  );
  assertEqual(r[1], 10, 'A stays 10');
  assertEqual(r[2], 11, 'B stays 11 (fastest in chain)');
  assertEqual(r[3], 12, 'C stays 12 (boundary follows)');
  assertEqual(r[4], 13, 'D stays 13 (fastest in chain)');
  assertEqual(r[5], 14, 'E stays 14 (endpoint follows)');
})();

console.log('\n=== Multi-Person Chains ===\n');

console.log('Test 12: Chain of 3 [B,C,D(last)] — no movement');
(function() {
  var r = runTest(
    [sc(1,5,1,null), sc(2,6,2,'No'), sc(3,7,3,'No'), sc(4,8,4,'No')],
    {}
  );
  assertEqual(r[1], 5, 'A stays 5');
  assertEqual(r[2], 6, 'B stays 6 (fastest in chain)');
  assertEqual(r[3], 7, 'C stays 7');
  assertEqual(r[4], 8, 'D stays 8 (endpoint follows)');
})();

console.log('Test 14: Single person chain at end — last person No is ignored');
(function() {
  var r = runTest(
    [sc(1,5,1,null), sc(2,6,2,'Yes'), sc(3,7,3,'No')],
    {}
  );
  assertEqual(r[1], 5, 'A stays 5');
  assertEqual(r[2], 6, 'B stays 6');
  assertEqual(r[3], 7, 'C stays 7 (last person, No ignored)');
})();

console.log('Test 15: Chain [B, C(last)] — no movement');
(function() {
  var r = runTest(
    [sc(1,5,1,null), sc(2,6,2,'No'), sc(3,7,3,null)],
    {}
  );
  assertEqual(r[1], 5, 'A stays 5');
  assertEqual(r[2], 6, 'B stays 6 (fastest in chain)');
  assertEqual(r[3], 7, 'C stays 7 (endpoint follows)');
})();

console.log('\n=== Real Data: 16-Aug Ladder (10 starters) ===\n');

console.log('Test 16: Real 16-Aug ladder results — Chain 2 wins rank 49 over Chain 1');
(function() {
  var r = runTest(
    [
      sc(1,207,1,'No'),   sc(2,117,5,'No'),   sc(3,51,11,'No'),
      sc(4,49,12,'No'),   sc(5,50,13,'No'),   sc(6,53,15,'Yes'),
      sc(7,52,16,'No'),   sc(8,49,18,'Yes'),  sc(9,36,19,'No'),
      sc(10,35,20,'No'),
    ], {}
  );
  assertEqual(r[1], 51, 'Inkeri → 51');
  assertEqual(r[2], 52, 'Jacqui → 52');
  assertEqual(r[3], 53, 'Caroline → 53');
  assertEqual(r[4], 54, 'Kirsty → 54');
  assertEqual(r[5], 55, 'Ainslie → 55');
  assertEqual(r[6], 56, 'Jonathan → 56');
  assertEqual(r[7], 49, 'Kathryn → 49');
  assertEqual(r[8], 50, 'Devlin → 50');
  assertEqual(r[9], 35, 'Guy → 35');
  assertEqual(r[10], 36, 'Daisy → 36');
})();

console.log('\n=== User Bug Scenario: 4 participants ===\n');

console.log('Test 17: User bug — 4 participants, last says No');
(function() {
  var r = runTest(
    [sc(1,207,1,'PathFind'), sc(2,207,2,'Yes'),
     sc(3,167,3,'No'), sc(4,160,4,'No')],
    {}
  );
  assertEqual(r[1], 207, 'PathFinder stays 207');
  assertEqual(r[2], 207, 'Rank207 stays 207');
  assertEqual(r[3], 160, 'Rank167 → 160');
  assertEqual(r[4], 161, 'Rank160 → 161');
})();

console.log('Test 18: Same but last person not saying No');
(function() {
  var r = runTest(
    [sc(1,207,1,'PathFind'), sc(2,207,2,'Yes'),
     sc(3,167,3,'No'), sc(4,160,4,null)],
    {}
  );
  assertEqual(r[1], 207, 'PathFinder stays 207');
  assertEqual(r[2], 207, 'Rank207 stays 207');
  assertEqual(r[3], 160, 'Rank167 → 160');
  assertEqual(r[4], 161, 'Rank160 → 161');
})();

console.log('\n=== Manual Lineup Special Cases (rank order not respected) ===\n');

console.log('Test 19: Manual lineup — A,B not caught, C caught');
(function() {
  var r = runTest(
    [sc(1,10,1,'No'), sc(2,20,2,'No'), sc(3,5,3,'Yes'), sc(4,4,4,null)],
    {}
  );
  assertEqual(r[1], 5, 'A(10) → 5');
  assertEqual(r[2], 6, 'B(20) → 6');
  assertEqual(r[3], 7, 'C(5) → 7');
  assertEqual(r[4], 4, 'D(4) stays 4');
})();

console.log('Test 20: Manual lineup — A not caught (better than boundary), B,C caught');
(function() {
  var r = runTest(
    [sc(1,10,1,'No'), sc(2,20,2,'Yes'), sc(3,5,3,'Yes'), sc(4,4,4,null)],
    {}
  );
  assertEqual(r[1], 10, 'A(10) stays 10 — chain must be strictly faster');
  assertEqual(r[2], 20, 'B(20) stays 20 (chain does not move)');
  assertEqual(r[3], 5, 'C(5) stays 5 — already better');
  assertEqual(r[4], 4, 'D(4) stays 4');
})();

console.log('Test 21: Manual lineup — all caught, no chains, no movement');
(function() {
  var r = runTest(
    [sc(1,10,1,'Yes'), sc(2,20,2,'Yes'), sc(3,5,3,'Yes'), sc(4,4,4,null)],
    {}
  );
  assertEqual(r[1], 10, 'A(10) stays 10');
  assertEqual(r[2], 20, 'B(20) stays 20 (no chain, no movement)');
  assertEqual(r[3], 5, 'C(5) stays 5');
  assertEqual(r[4], 4, 'D(4) stays 4');
})();

console.log('\n=== Mixed Ranks — Chain After Yes ===\n');

console.log('Test 22: Mixed ranks — chain [A,B,C] with D(Yes) boundary, fastest=116');
(function() {
  var r = runTest(
    [sc(1,207,1,'No'), sc(2,116,2,'No'), sc(3,117,3,'No'), sc(4,205,4,'Yes')],
    {}
  );
  assertEqual(r[1], 116, 'A(207) → 116 (fastest in chain)');
  assertEqual(r[2], 117, 'B(116) → 117');
  assertEqual(r[3], 118, 'C(117) → 118');
  assertEqual(r[4], 119, 'D(205) → 119 (boundary follows)');
})();

console.log('\n=== Edge Case: Chain Guards ===\n');

console.log('Test 23: Chain must not move to a slower rank (all ranks already ordered)');
(function() {
  var r = runTest(
    [sc(1,10,1,'No'), sc(2,20,2,'No'), sc(3,30,3,null)],
    {}
  );
  assertEqual(r[1], 10, 'A stays at 10');
  assertEqual(r[2], 20, 'B stays at 20');
  assertEqual(r[3], 30, 'C stays at 30');
})();

console.log('Test 24: Competing chain must shift existing ladder occupants');
(function() {
  var r = runTest(
    [sc(1,52,1,'No'), sc(2,49,2,'Yes'), sc(3,50,3,null)],
    {}
  );
  assertEqual(r[1], 49, 'Kathryn → 49');
  assertEqual(r[2], 50, 'Devlin → 50');
  assertEqual(r[3], 51, 'Rank-50 occupant shifted to 51');
  var vals = [r[1], r[2], r[3]];
  var unique = new Set(vals);
  assertEqual(vals.length, unique.size, 'No duplicate ranks');
})();

console.log('Test 25: Two chains compete for same rank — later-starting chain wins');
(function() {
  var r = runTest(
    [sc(1,50,1,'No'), sc(2,49,2,'Yes'),
     sc(3,50,3,'No'), sc(4,49,4,null)],
    {}
  );
  assertEqual(r[1], 51, 'Chain1-A(50) → 51 (shifted by Chain2)');
  assertEqual(r[2], 52, 'Chain1-B(49) → 52 (boundary follows)');
  assertEqual(r[3], 49, 'Chain2-C(50) → 49 (later start wins)');
  assertEqual(r[4], 50, 'Chain2-D(49) → 50 (endpoint follows)');
  var vals = [r[1], r[2], r[3], r[4]];
  var unique = new Set(vals);
  assertEqual(vals.length, unique.size, 'No duplicate ranks');
})();

console.log('Test 26: Chain does not move when fastest rank equals first person rank');
(function() {
  var r = runTest(
    [sc(1,10,1,'No'), sc(2,20,2,'No'), sc(3,30,3,null)],
    {}
  );
  assertEqual(r[1], 10, 'A stays 10 (fastest = first rank)');
  assertEqual(r[2], 20, 'B stays 20');
  assertEqual(r[3], 30, 'C stays 30');
})();

console.log('Test 27: Chain shifts when fastest rank is strictly faster than first person');
(function() {
  var r = runTest(
    [sc(1,20,1,'No'), sc(2,10,2,'No'), sc(3,30,3,null)],
    {}
  );
  assertEqual(r[1], 10, 'A(20) → 10 (fastest rank)');
  assertEqual(r[2], 11, 'B(10) → 11');
  assertEqual(r[3], 12, 'C(30) → 12 (endpoint follows)');
})();

console.log('Test 28: Cascading displacement — chain shifts two existing ladder occupants');
(function() {
  var r = runTest(
    [sc(1,52,1,'No'), sc(2,49,2,'Yes'),
     sc(3,50,3,null), sc(4,51,4,null)],
    {}
  );
  assertEqual(r[1], 49, 'Kathryn → 49');
  assertEqual(r[2], 50, 'Devlin → 50');
  assertEqual(r[3], 51, 'Other(50) → 51 (shifted by chain)');
  assertEqual(r[4], 52, 'Other2(51) → 52 (cascaded shift)');
  var vals = [r[1], r[2], r[3], r[4]];
  var unique = new Set(vals);
  assertEqual(vals.length, unique.size, 'No duplicate ranks');
})();

console.log('Test 29: Non-chain duplicate — chain does not move, no shifting occurs');
(function() {
  var r = runTest(
    [sc(1,10,1,'No'), sc(2,20,2,'Yes'),
     sc(3,15,3,null), sc(4,15,4,null)],
    {}
  );
  assertEqual(r[1], 10, 'A stays 10 (chain does not move)');
  assertEqual(r[2], 20, 'B stays 20');
  assertEqual(r[3], 15, 'C stays 15');
  assertEqual(r[4], 15, 'D stays 15 (no chain claimed this rank)');
})();

console.log('Test 30: Chain shifts non-starters — real ladder scenario');
(function() {
  var r = runTest(
    [
      sc(1,52,1,'No'),    // Kathryn — starter
      sc(2,49,2,'Yes'),   // Devlin — starter
      sc(3,50,null,null), // Other — NOT a starter, rank 50 in ladder
      sc(4,51,null,null), // Other2 — NOT a starter, rank 51 in ladder
    ],
    {}
  );
  assertEqual(r[1], 49, 'Kathryn → 49');
  assertEqual(r[2], 50, 'Devlin → 50');
  assertEqual(r[3], 51, 'Other(50) → 51 (non-starter shifted)');
  assertEqual(r[4], 52, 'Other2(51) → 52 (non-starter cascaded)');
  var vals = [r[1], r[2], r[3], r[4]];
  var unique = new Set(vals);
  assertEqual(vals.length, unique.size, 'No duplicate ranks');
})();

console.log('Test 31: Chain shifts non-starters — four displaced');
(function() {
  var r = runTest(
    [
      sc(1,52,1,'No'),    // Kathryn — starter
      sc(2,49,2,'Yes'),   // Devlin — starter
      sc(3,50,null,null), // Other — NOT a starter, rank 50
      sc(4,51,null,null), // Other2 — NOT a starter, rank 51
      sc(5,48,null,null), // Other3 — NOT a starter, rank 48 (not affected)
    ],
    {}
  );
  assertEqual(r[1], 49, 'Kathryn → 49');
  assertEqual(r[2], 50, 'Devlin → 50');
  assertEqual(r[3], 51, 'Other(50) → 51 (shifted)');
  assertEqual(r[4], 52, 'Other2(51) → 52 (cascaded)');
  assertEqual(r[5], 48, 'Other3(48) stays 48 (not affected)');
  var vals = [r[1], r[2], r[3], r[4], r[5]];
  var unique = new Set(vals);
  assertEqual(vals.length, unique.size, 'No duplicate ranks');
})();

console.log('\n=== computeNextPositions Tests ===\n');

function scNext(id, rank, nextParticipating) {
  return {
    id: id, name: 'S' + id, club: 'PTRC',
    rank: String(rank),
    lastStartPos: null, lastCaught: null,
    nextParticipating: nextParticipating || null,
    nextStartPos: null,
  };
}

console.log('Test 19: Basic — 2 confirmed, rank-based order');
(function() {
  var pos = computeNextPositions(
    [scNext(1, 100, 'Yes'), scNext(2, 50, 'Yes')],
    {}
  );
  assertEqual(pos[1], 1, 'Higher rank (100) starts first = pos 1');
  assertEqual(pos[2], 2, 'Lower rank (50) starts second = pos 2');
})();

console.log('Test 20: PathFinder always position 1');
(function() {
  var pos = computeNextPositions(
    [scNext(1, 1, 'PathFind'), scNext(2, 100, 'Yes'), scNext(3, 50, 'Yes')],
    {}
  );
  assertEqual(pos[1], 1, 'PathFinder at pos 1');
  assertEqual(pos[2], 2, 'Rank 100 at pos 2');
  assertEqual(pos[3], 3, 'Rank 50 at pos 3');
})();

console.log('Test 21: Stale manual starts for non-participants ignored');
(function() {
  var pos = computeNextPositions(
    [scNext(1, 100, 'Yes'), scNext(2, 50, 'Yes'), scNext(3, 80, null)],
    { 3: 5 }
  );
  assertEqual(pos[1], 1, 'Rank 100 at pos 1');
  assertEqual(pos[2], 2, 'Rank 50 at pos 2');
  assertEqual(pos[3], undefined, 'Non-participant has no position');
})();

console.log('Test 22: Manual start overrides relative order');
(function() {
  var pos = computeNextPositions(
    [scNext(1, 100, 'Yes'), scNext(2, 50, 'Yes')],
    { 2: 1 }
  );
  assertEqual(pos[2], 1, 'Rank 50 manually first = pos 1');
  assertEqual(pos[1], 2, 'Rank 100 second = pos 2');
})();

console.log('Test 23: Positions always contiguous — no gaps');
(function() {
  var pos = computeNextPositions(
    [scNext(1, 100, 'Yes'), scNext(2, 50, 'Yes')],
    { 1: 99 }
  );
  var values = Object.values(pos).sort(function(a,b){return a-b;});
  assertEqual(values.length, 2, '2 positions assigned');
  assertEqual(values[0], 1, 'First position is 1');
  assertEqual(values[1], 2, 'Second position is 2');
})();

console.log('Test 24: Two PathFinders — second gets pos 2');
(function() {
  var pos = computeNextPositions(
    [scNext(1, 1, 'PathFind'), scNext(2, 2, 'PathFind'), scNext(3, 100, 'Yes')],
    {}
  );
  assertEqual(pos[1], 1, 'First PathFinder at pos 1');
  assertEqual(pos[2], 2, 'Second PathFinder at pos 2');
  assertEqual(pos[3], 3, 'Confirmed at pos 3');
})();

console.log('Test 25: Only PathFinders, no confirmed');
(function() {
  var pos = computeNextPositions(
    [scNext(1, 1, 'PathFind')],
    {}
  );
  assertEqual(pos[1], 1, 'PathFinder at pos 1');
})();

console.log('Test 26: Manual position=1 with PathFinder shifts to pos 2');
(function() {
  var pos = computeNextPositions(
    [scNext(1, 1, 'PathFind'), scNext(2, 100, 'Yes'), scNext(3, 50, 'Yes')],
    { 3: 1 }
  );
  assertEqual(pos[1], 1, 'PathFinder at pos 1');
  assertEqual(pos[3], 2, 'Manual pos 1 shifted to pos 2 (PathFinder occupies 1)');
  assertEqual(pos[2], 3, 'Rank 100 at pos 3');
})();

console.log('Test 27: User scenario — 2 participants, Aba gets correct position');
(function() {
  var pos = computeNextPositions(
    [scNext(6, 85, 'Yes'), scNext(7, 80, 'Yes')],
    {}
  );
  assertEqual(pos[6], 1, 'Sculler rank 85 (slower) at pos 1');
  assertEqual(pos[7], 2, 'Sculler rank 80 (faster) at pos 2');
})();

console.log('Test 28: User scenario — stale manual starts from non-participants do not affect positions');
(function() {
  var pos = computeNextPositions(
    [scNext(6, 85, 'Yes'), scNext(7, 80, 'Yes')],
    { 1: 4, 2: 5, 3: 2, 4: 3, 84: 1, 163: 6, 170: 1 }
  );
  assertEqual(pos[6], 1, 'Sculler rank 85 at pos 1');
  assertEqual(pos[7], 2, 'Sculler rank 80 at pos 2');
})();

console.log('Test 29: CRITICAL — 3 participants MUST get positions 1, 2, 3 (never gaps)');
(function() {
  var pos = computeNextPositions(
    [scNext(10, 85, 'Yes'), scNext(20, 80, 'Yes'), scNext(7, 75, 'Yes')],
    {}
  );
  var values = Object.values(pos).sort(function(a,b){return a-b;});
  assertEqual(values.length, 3, '3 positions assigned');
  assertEqual(values[0], 1, 'Positions start at 1');
  assertEqual(values[1], 2, 'Second is 2');
  assertEqual(values[2], 3, 'Third is 3 — never a gap like 1,2,4');
})();

console.log('Test 30: 3 participants + stale manualStarts → still 1, 2, 3');
(function() {
  var pos = computeNextPositions(
    [scNext(10, 85, 'Yes'), scNext(20, 80, 'Yes'), scNext(7, 75, 'Yes')],
    { 1: 4, 2: 5, 3: 2, 4: 3, 84: 1, 163: 6, 170: 1 }
  );
  var values = Object.values(pos).sort(function(a,b){return a-b;});
  assertEqual(values.length, 3, '3 positions assigned');
  assertEqual(values[0], 1, 'First is 1');
  assertEqual(values[1], 2, 'Second is 2');
  assertEqual(values[2], 3, 'Third is 3 — stale entries cannot cause gaps');
})();

console.log('Test 31: 3 participants + PathFinder → positions 1, 2, 3, 4');
(function() {
  var pos = computeNextPositions(
    [scNext(1, 1, 'PathFind'), scNext(10, 85, 'Yes'), scNext(20, 80, 'Yes'), scNext(7, 75, 'Yes')],
    {}
  );
  var values = Object.values(pos).sort(function(a,b){return a-b;});
  assertEqual(values.length, 4, '4 positions assigned');
  assertEqual(values[0], 1, 'First is 1');
  assertEqual(values[1], 2, 'Second is 2');
  assertEqual(values[2], 3, 'Third is 3');
  assertEqual(values[3], 4, 'Fourth is 4');
})();

console.log('Test 32: N participants → always positions 1 through N');
(function() {
  var scs = [];
  for (var i = 0; i < 10; i++) {
    scs.push(scNext(i + 1, 100 - i, 'Yes'));
  }
  var pos = computeNextPositions(scs, {});
  var values = Object.values(pos).sort(function(a,b){return a-b;});
  assertEqual(values.length, 10, '10 positions assigned');
  for (var j = 0; j < 10; j++) {
    assertEqual(values[j], j + 1, 'Position ' + (j+1) + ' is ' + (j+1));
  }
})();

console.log('\n=== Unranked Sculler Tests ===\n');

function scUnranked(id, lastStartPos, lastCaught) {
  return {
    id: id, name: 'U' + id, club: 'PTRC',
    rank: '0',
    lastStartPos: lastStartPos != null ? String(lastStartPos) : null,
    lastCaught: lastCaught || null,
    nextParticipating: null,
    nextStartPos: null,
  };
}

console.log('U1: Unranked + Yes → N/A, does not corrupt others');
(function() {
  var r = runTest(
    [sc(1,10,1,'No'), scUnranked(2,2,'Yes'), sc(3,20,3,'No')],
    {}
  );
  assertEqual(r[1], 10, 'A stays 10');
  assertEqual(r[2], 0, 'Unranked stays 0 (N/A)');
  assertEqual(r[3], 20, 'C stays 20');
})();

console.log('U2: Unranked + No → stays N/A, does not enter chain');
(function() {
  var r = runTest(
    [sc(1,10,1,'No'), scUnranked(2,2,'No'), sc(3,20,3,null)],
    {}
  );
  assertEqual(r[1], 10, 'A stays 10');
  assertEqual(r[2], 0, 'Unranked stays 0');
  assertEqual(r[3], 20, 'C stays 20 (endpoint)');
})();

console.log('U3: Unranked + not in lineup → N/A');
(function() {
  var r = runTest(
    [sc(1,10,1,'No'), scUnranked(2,null,null)],
    {}
  );
  assertEqual(r[1], 10, 'A stays 10');
  assertEqual(r[2], 0, 'Unranked not in lineup stays 0');
})();

console.log('U4: Unranked + Yes between two chains → invisible');
(function() {
  var r = runTest(
    [sc(1,10,1,'No'), sc(2,11,2,'Yes'),
     scUnranked(3,3,'Yes'),
     sc(4,12,4,'No'), sc(5,13,5,null)],
    {}
  );
  assertEqual(r[1], 10, 'A stays 10 (chain fastest)');
  assertEqual(r[2], 11, 'B stays 11 (boundary)');
  assertEqual(r[3], 0, 'Unranked stays 0');
  assertEqual(r[4], 12, 'D stays 12 (chain fastest)');
  assertEqual(r[5], 13, 'E stays 13 (endpoint)');
})();

console.log('U5: Multiple unranked+Yes → all invisible');
(function() {
  var r = runTest(
    [scUnranked(1,1,'Yes'), sc(2,10,2,'No'),
     scUnranked(3,3,'Yes'), sc(4,20,4,null)],
    {}
  );
  assertEqual(r[1], 0, 'Unranked1 stays 0');
  assertEqual(r[2], 10, 'B stays 10 (chain fastest)');
  assertEqual(r[3], 0, 'Unranked2 stays 0');
  assertEqual(r[4], 20, 'D stays 20');
})();

console.log('U6: Unranked+Yes as potential boundary → skipped, next ranked used');
(function() {
  var r = runTest(
    [sc(1,10,1,'No'), scUnranked(2,2,'Yes'), sc(3,20,3,'No')],
    {}
  );
  assertEqual(r[1], 10, 'A stays 10');
  assertEqual(r[2], 0, 'Unranked stays 0');
  assertEqual(r[3], 20, 'C stays 20 (was boundary, not unranked)');
})();

console.log('U7: Unranked between ranked — unranked stays 0, chain skips it');
(function() {
  var r = runTest(
    [sc(1,20,1,'No'), scUnranked(2,2,'No'), sc(3,10,3,'No'), sc(4,30,4,null)],
    {}
  );
  assertEqual(r[1], 10, 'A gets 10 (chain fastest)');
  assertEqual(r[2], 0, 'Unranked stays 0');
  assertEqual(r[3], 11, 'C gets 11');
  assertEqual(r[4], 12, 'D boundary follows');
})();

console.log('U8: Unranked with no ranked predecessor stays 0');
(function() {
  var r = runTest(
    [scUnranked(1,1,'No'), sc(2,10,2,'No'), sc(3,20,3,null)],
    {}
  );
  assertEqual(r[1], 0, 'Unranked with no ranked predecessor stays 0');
  assertEqual(r[2], 10, 'B stays 10');
  assertEqual(r[3], 20, 'C boundary stays 20');
})();

console.log('U9: Ranked No + unranked after → ranked keeps rank, unranked stays 0');
(function() {
  var r = runTest(
    [sc(1,50,1,'No'), scUnranked(2,2,null)],
    {}
  );
  assertEqual(r[1], 50, 'A stays 50');
  assertEqual(r[2], 0, 'B stays 0');
})();

console.log('U10: Ranked Yes + unranked after → ranked keeps rank, unranked stays 0');
(function() {
  var r = runTest(
    [sc(1,50,1,'No'), scUnranked(2,2,'Yes')],
    {}
  );
  assertEqual(r[1], 50, 'A stays 50');
  assertEqual(r[2], 0, 'B stays 0');
})();

console.log('\n=== Mandatory Admin Edit Tests ===\n');

console.log('M1: rank preserved after Last Session edit');
(function() {
  var scullers = [sc(1,206,1,'No'), sc(2,50,2,'No')];
  var r = runTest(scullers, {});
  assertEqual(scullers[0].rank, '206', 'input rank not modified');
  assertEqual(scullers[1].rank, '50', 'input rank not modified');
  assertEqual(typeof r[1], 'number', 'computedRank is a number');
  assertEqual(typeof r[2], 'number', 'computedRank is a number');
})();

console.log('M2: Position change → only ranking changes');
(function() {
  var r1 = runTest([sc(1,50,1,'No'), sc(2,40,2,'Yes'), sc(3,30,3,null)], {});
  assertEqual(r1[1], 40, 'Pos1: chain → 40');
  assertEqual(r1[2], 41, 'Pos2: boundary → 41');
  assertEqual(r1[3], 30, 'Pos3: stays 30');
  var r2 = runTest([sc(1,50,2,'No'), sc(2,40,1,'Yes'), sc(3,30,3,null)], {});
  assertEqual(r2[1], 30, 'Swapped: A chain → 30');
  assertEqual(r2[2], 40, 'Swapped: B stays 40');
  assertEqual(r2[3], 31, 'Swapped: C boundary → 31');
})();

console.log('M3: Removal → others recalculated correctly');
(function() {
  var r1 = runTest([sc(1,50,1,'No'), sc(2,40,2,'Yes'), sc(3,30,3,null)], {});
  assertEqual(r1[1], 40, 'Before: A→40');
  assertEqual(r1[2], 41, 'Before: B→41');
  assertEqual(r1[3], 30, 'Before: C stays 30');
  var r2 = runTest([sc(1,50,1,'No'), sc(3,30,2,null)], {});
  assertEqual(r2[1], 30, 'After removal: A recalculated → 30');
  assertEqual(r2[3], 31, 'After removal: C boundary → 31');
})();

console.log('M4: Add ranked sculler → consistent ranking');
(function() {
  var r = runTest([sc(1,50,1,'No'), sc(2,40,2,'Yes'), sc(3,30,3,null)], {});
  assertEqual(r[1], 40, 'Chain: A→40');
  assertEqual(r[2], 41, 'Boundary: B→41');
  assertEqual(r[3], 30, 'C stays 30');
})();

console.log('M5: Add unranked sculler → N/A, does not corrupt others');
(function() {
  var r = runTest(
    [sc(1,50,1,'No'), sc(2,40,2,'Yes'), scUnranked(99,3,'Yes'), sc(3,30,4,null)],
    {}
  );
  assertEqual(r[1], 40, 'Chain: A→40');
  assertEqual(r[2], 41, 'Boundary: B→41');
  assertEqual(r[99], 0, 'Unranked stays 0');
  assertEqual(r[3], 30, 'C stays 30 (unranked invisible)');
})();

console.log('M6: Persistence — reload returns same values');
(function() {
  var r1 = runTest([sc(1,50,1,'No'), sc(2,40,2,'Yes'), scUnranked(99,3,'Yes')], {});
  var r2 = runTest([sc(1,50,1,'No'), sc(2,40,2,'Yes'), scUnranked(99,3,'Yes')], {});
  assertEqual(r1[1], r2[1], 'Rank stable across reload');
  assertEqual(r1[2], r2[2], 'Rank stable across reload');
  assertEqual(r1[99], r2[99], 'Unranked stable across reload');
})();

console.log('M7: Two clients see same newRank');
(function() {
  var scullers = [sc(1,50,1,'No'), sc(2,40,2,'Yes'), scUnranked(99,3,'Yes')];
  var caught = {};
  var r1 = runTest(scullers, caught);
  var r2 = runTest(scullers, caught);
  assertEqual(r1[1], r2[1], 'Client1=Client2 for id1');
  assertEqual(r1[2], r2[2], 'Client1=Client2 for id2');
  assertEqual(r1[99], r2[99], 'Client1=Client2 for unranked');
})();

// ═══════════════════════════════════════
// RESULTS
// ═══════════════════════════════════════

console.log('\n═════════════════════════════════════');
console.log('Results: ' + passed + ' passed, ' + failed + ' failed');
console.log('═════════════════════════════════════\n');

if (failed > 0) process.exit(1);
else console.log('All tests passed!\n');
