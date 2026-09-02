#!/usr/bin/env python3
"""Test that server-side compute_rankings() matches JS computeRankings().
Uses exact same test data as test_rankings.js."""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from server import compute_rankings

passed = 0
failed = 0

def sc(id, rank, lastStartPos, lastCaught):
    return {
        "id": id, "name": f"S{id}", "club": "PTRC",
        "rank": str(rank),
        "lastStartPos": str(lastStartPos) if lastStartPos is not None else None,
        "lastCaught": lastCaught,
    }

def check(label, actual, expected):
    global passed, failed
    if actual == expected:
        passed += 1
    else:
        failed += 1
        print(f"  FAIL: {label} — expected {expected}, got {actual}")

# Test 1: Chain [Simon(13), Inkeri(171)] — fastest=13, no movement (guard)
print("Test 1: Chain [Simon, Inkeri(last)] — fastest=13")
r = compute_rankings(
    [sc(1,12,1,None), sc(2,13,2,"No"), sc(3,171,3,"No")],
    {}
)
check("ABA stays 12", r[1], 12)
check("Simon stays 13", r[2], 13)
check("Inkeri stays 171", r[3], 171)

# Test 7: myCaught overrides lastCaught
print("Test 7: myCaught overrides lastCaught")
r = compute_rankings(
    [sc(1,10,1,None), sc(2,11,2,"Yes"), sc(3,12,3,"No"), sc(4,13,4,"Yes"), sc(5,14,5,"Yes")],
    {"2": "No"}
)
check("A stays 10", r[1], 10)
check("B(11)→11", r[2], 11)
check("C(12)→12", r[3], 12)
check("D(13)→13", r[4], 13)
check("E(14)→14", r[5], 14)

# Test 26: Chain does not move when fastest = first rank
print("Test 26: Chain does not move when fastest = first rank")
r = compute_rankings(
    [sc(1,10,1,"No"), sc(2,20,2,"No"), sc(3,30,3,None)],
    {}
)
check("A stays 10", r[1], 10)
check("B stays 20", r[2], 20)
check("C stays 30", r[3], 30)

# Test 27: Chain shifts when fastest < first rank
print("Test 27: Chain shifts when fastest < first rank")
r = compute_rankings(
    [sc(1,20,1,"No"), sc(2,10,2,"No"), sc(3,30,3,None)],
    {}
)
check("A(20)→10", r[1], 10)
check("B(10)→11", r[2], 11)
check("C(30)→12", r[3], 12)

# Test 28: Cascading displacement
print("Test 28: Cascading displacement")
r = compute_rankings(
    [sc(1,52,1,"No"), sc(2,49,2,"Yes"),
     sc(3,50,3,None), sc(4,51,4,None)],
    {}
)
check("Kathryn→49", r[1], 49)
check("Devlin→50", r[2], 50)
check("Other(50)→51", r[3], 51)
check("Other2(51)→52", r[4], 52)

# Test 30: Chain shifts non-starters
print("Test 30: Chain shifts non-starters")
r = compute_rankings(
    [sc(1,52,1,"No"), sc(2,49,2,"Yes"),
     sc(3,50,None,None), sc(4,51,None,None)],
    {}
)
check("Kathryn→49", r[1], 49)
check("Devlin→50", r[2], 50)
check("Other(50)→51", r[3], 51)
check("Other2(51)→52", r[4], 52)

# Test 31: Chain shifts non-starters — four displaced
print("Test 31: Chain shifts non-starters — four displaced")
r = compute_rankings(
    [sc(1,52,1,"No"), sc(2,49,2,"Yes"),
     sc(3,50,None,None), sc(4,51,None,None), sc(5,48,None,None)],
    {}
)
check("Kathryn→49", r[1], 49)
check("Devlin→50", r[2], 50)
check("Other(50)→51", r[3], 51)
check("Other2(51)→52", r[4], 52)
check("Other3(48) stays 48", r[5], 48)

# No starters
print("Test: No starters")
r = compute_rankings(
    [sc(1,10,None,None), sc(2,20,None,None)],
    {}
)
check("A stays 10", r[1], 10)
check("B stays 20", r[2], 20)

# Empty ranks
print("Test: Empty ranks")
r = compute_rankings(
    [sc(1,0,1,"No"), sc(2,0,2,"No")],
    {}
)
check("A stays 0", r[1], 0)
check("B stays 0", r[2], 0)

print(f"\n=== Results: {passed} passed, {failed} failed ===")
if failed:
    sys.exit(1)
