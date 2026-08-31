#!/usr/bin/env node
/**
 * Unit tests for the Chiswick Sculling Ladder ranking algorithm.
 * Run: node test_rankings.js
 *
 * Tests the shared js/rankings.js module used by the application.
 */

import { computeRankings, getComputedRank } from './js/rankings.js';

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

function runTest(scullers, myCaught, myManualRanks) {
  return computeRankings(scullers, myCaught || {}, myManualRanks || {});
}

// ═══════════════════════════════════════
// TESTS
// ═══════════════════════════════════════

console.log('\n=== Known Scenarios (3 people) ===\n');

console.log('Test 1: All No — last person excluded, only Simon improves');
(function() {
  var r = runTest(
    [sc(1,12,1,null), sc(2,13,2,'No'), sc(3,171,3,'No')],
    {}, {}
  );
  assertEqual(r[1], 12, 'ABA stays 12');
  assertEqual(r[2], 171, 'Simon → 171');
  assertEqual(r[3], 172, 'Inkeri bumped to 172');
})();

console.log('Test 2: Inkeri Yes — Simon pushed to boundary');
(function() {
  var r = runTest(
    [sc(1,12,1,null), sc(2,13,2,'No'), sc(3,171,3,'Yes')],
    {}, {}
  );
  assertEqual(r[1], 12, 'ABA stays 12');
  assertEqual(r[2], 171, 'Simon → 171');
  assertEqual(r[3], 172, 'Inkeri → 172');
})();

console.log('Test 3: Simon Yes — Inkeri fills bottom');
(function() {
  var r = runTest(
    [sc(1,12,1,null), sc(2,13,2,'Yes'), sc(3,171,3,'No')],
    {}, {}
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
    {}, {}
  );
  assertEqual(r[1], 10, 'A stays 10');
  assertEqual(r[2], 12, 'B → 12');
  assertEqual(r[3], 13, 'C → 13');
  assertEqual(r[4], 14, 'D → 14');
  assertEqual(r[5], 15, 'E bumped to 15');
})();

console.log('Test 5: All Yes — ranks unchanged');
(function() {
  var r = runTest(
    [sc(1,5,1,'Yes'), sc(2,6,2,'Yes'), sc(3,7,3,null)],
    {}, {}
  );
  assertEqual(r[1], 5, 'A stays 5');
  assertEqual(r[2], 6, 'B stays 6');
  assertEqual(r[3], 7, 'C stays 7');
})();

console.log('Test 6: All No — last excluded, only B improves');
(function() {
  var r = runTest(
    [sc(1,10,1,null), sc(2,11,2,'No'), sc(3,12,3,'No')],
    {}, {}
  );
  assertEqual(r[1], 10, 'A stays 10');
  assertEqual(r[2], 12, 'B → 12');
  assertEqual(r[3], 13, 'C bumped to 13');
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
  var r = runTest([sc(1,10,1,null)], {}, {});
  assertEqual(r[1], 10, 'Single starter keeps rank');
})();

console.log('Test 9: No starters');
(function() {
  var r = runTest(
    [sc(1,10,null,null), sc(2,11,null,null)],
    {}, {}
  );
  assertEqual(r[1], 10, 'A keeps rank');
  assertEqual(r[2], 11, 'B keeps rank');
})();

console.log('Test 10: PathFinder skipped in chain');
(function() {
  var r = runTest(
    [sc(1,1,1,'PathFind'), sc(2,10,2,'No'),
     sc(3,11,3,'No'), sc(4,12,4,null)],
    {}, {}
  );
  assertEqual(r[1], 1, 'PathFinder stays 1');
  assertEqual(r[2], 12, 'B → 12');
  assertEqual(r[3], 13, 'C → 13');
  assertEqual(r[4], 14, 'D → 14');
})();

console.log('Test 11: Two separate chains');
(function() {
  var r = runTest(
    [sc(1,10,1,null), sc(2,11,2,'No'), sc(3,12,3,'Yes'),
     sc(4,13,4,'No'), sc(5,14,5,'No')],
    {}, {}
  );
  assertEqual(r[1], 10, 'A stays 10');
  assertEqual(r[2], 12, 'B → 12');
  assertEqual(r[3], 13, 'C → 13');
  assertEqual(r[4], 14, 'D → 14');
  assertEqual(r[5], 15, 'E bumped to 15');
})();

console.log('Test 12: myManualRanks feeds into cascade');
(function() {
  var r = runTest(
    [sc(1,10,1,null), sc(2,11,2,'No'), sc(3,12,3,'No')],
    {}, { 3: 20 }
  );
  assertEqual(r[1], 10, 'A stays 10');
  assertEqual(r[2], 20, 'B → 20');
  assertEqual(r[3], 21, 'C → 21');
})();

console.log('\n=== Multi-Person Chains ===\n');

console.log('Test 13: Chain of 3 — last excluded');
(function() {
  var r = runTest(
    [sc(1,5,1,null), sc(2,6,2,'No'), sc(3,7,3,'No'), sc(4,8,4,'No')],
    {}, {}
  );
  assertEqual(r[1], 5, 'A stays 5');
  assertEqual(r[2], 8, 'B → 8');
  assertEqual(r[3], 9, 'C → 9');
  assertEqual(r[4], 10, 'D bumped to 10');
})();

console.log('Test 14: Single person chain at end — last person No is ignored');
(function() {
  var r = runTest(
    [sc(1,5,1,null), sc(2,6,2,'Yes'), sc(3,7,3,'No')],
    {}, {}
  );
  assertEqual(r[1], 5, 'A stays 5');
  assertEqual(r[2], 6, 'B stays 6');
  assertEqual(r[3], 7, 'C stays 7 (last person, No ignored)');
})();

console.log('Test 15: Chain bumps boundary person');
(function() {
  var r = runTest(
    [sc(1,5,1,null), sc(2,6,2,'No'), sc(3,7,3,null)],
    {}, {}
  );
  assertEqual(r[1], 5, 'A stays 5');
  assertEqual(r[2], 7, 'B → 7');
  assertEqual(r[3], 8, 'C → 8');
})();

console.log('\n=== Real Data: 16-Aug Ladder (10 starters) ===\n');

console.log('Test 16: Real 16-Aug ladder results');
(function() {
  var r = runTest(
    [
      sc(1,207,1,'No'),   sc(2,117,5,'No'),   sc(3,51,11,'No'),
      sc(4,49,12,'No'),   sc(5,50,13,'No'),   sc(6,53,15,'Yes'),
      sc(7,52,16,'No'),   sc(8,47,18,'Yes'),  sc(9,36,19,'No'),
      sc(10,35,20,'No'),
    ], {}, {}
  );
  assertEqual(r[1], 53, 'Inkeri → 53');
  assertEqual(r[2], 54, 'Jacqui → 54');
  assertEqual(r[3], 55, 'Caroline → 55');
  assertEqual(r[4], 56, 'Kirsty → 56');
  assertEqual(r[5], 57, 'Ainslie → 57');
  assertEqual(r[6], 58, 'Jonathan → 58');
  assertEqual(r[7], 47, 'Kathryn → 47');
  assertEqual(r[8], 48, 'Devlin → 48');
  assertEqual(r[9], 35, 'Guy → 35');
  assertEqual(r[10], 36, 'Daisy → 36');
})();

console.log('\n=== User Bug Scenario: 4 participants ===\n');

console.log('Test 17: User bug — 4 participants, last says No');
(function() {
  var r = runTest(
    [sc(1,207,1,'PathFind'), sc(2,207,2,'Yes'),
     sc(3,167,3,'No'), sc(4,160,4,'No')],
    {}, {}
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
    {}, {}
  );
  assertEqual(r[1], 207, 'PathFinder stays 207');
  assertEqual(r[2], 207, 'Rank207 stays 207');
  assertEqual(r[3], 160, 'Rank167 → 160');
  assertEqual(r[4], 161, 'Rank160 → 161');
})();

// ═══════════════════════════════════════
// RESULTS
// ═══════════════════════════════════════

console.log('\n═════════════════════════════════════');
console.log('Results: ' + passed + ' passed, ' + failed + ' failed');
console.log('═════════════════════════════════════\n');

if (failed > 0) process.exit(1);
else console.log('All tests passed!\n');
