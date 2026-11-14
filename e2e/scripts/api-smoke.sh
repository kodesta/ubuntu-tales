#!/usr/bin/env bash
#
# Phase 1 API contract smoke — curl against the running API (:4100) + JSON-shape assertions.
#
# Usage (from the repo root, API running + seeded):
#   bash e2e/scripts/api-smoke.sh
#   API_URL=http://localhost:4100/api/v1 bash e2e/scripts/api-smoke.sh
#
# Exits non-zero when any assertion fails.

set -uo pipefail

API="${API_URL:-http://localhost:4100/api/v1}"
PASS=0
FAIL=0

assert_json() {
  local name="$1" path="$2" expr="$3" expected="${4:-200}"
  local body status
  body="$(mktemp)"
  status="$(curl -sS -o "$body" -w '%{http_code}' "$API$path" 2>/dev/null)"
  if [ "$status" = "$expected" ] && EXPR="$expr" node -e '
    const fs = require("node:fs");
    const d = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    const ok = Function("d", "return (" + process.env.EXPR + ");")(d);
    process.exit(ok ? 0 : 1);
  ' "$body"; then
    echo "PASS  $name  GET $path"
    PASS=$((PASS + 1))
  else
    echo "FAIL  $name  GET $path  (HTTP $status, expected $expected)"
    head -c 300 "$body" 2>/dev/null | tr '\n' ' '
    echo
    FAIL=$((FAIL + 1))
  fi
  rm -f "$body"
}

check_status() {
  local name="$1" path="$2" expected="$3"
  local status
  status="$(curl -sS -o /dev/null -w '%{http_code}' "$API$path" 2>/dev/null)"
  if [ "$status" = "$expected" ]; then
    echo "PASS  $name  GET ${path} -> $status"
    PASS=$((PASS + 1))
  else
    echo "FAIL  $name  GET ${path} -> $status (expected $expected)"
    FAIL=$((FAIL + 1))
  fi
}

echo "Ubuntu Tales API smoke — $API"
echo "--------------------------------------------------------------------"

check_status "health live" "/health/live" 200
assert_json "health ready (database up)" "/health/ready" "d.status === 'ok' && d.checks.database === 'up'"

assert_json "home payload" "/home" "typeof d.storyOfTheDay.slug === 'string' && Array.isArray(d.latest) && d.latest.length >= 1 && Array.isArray(d.categories) && d.categories.length === 5 && Array.isArray(d.wisdomNotes) && d.wisdomNotes.length === 5"
assert_json "home personalises by tribe" "/home?tribe=zulu" "d.yourTribe && d.yourTribe.tribe.slug === 'zulu' && d.yourTribe.stories.length >= 1"

assert_json "tribes list" "/tribes" "Array.isArray(d) && d.length === 16 && d.every(t => typeof t.slug === 'string' && typeof t.name === 'string' && typeof t.publishedStoryCount === 'number' && typeof t.accentColor === 'string')"
assert_json "tribe detail" "/tribes/zulu" "d.slug === 'zulu' && d.publishedStoryCount === 2 && Array.isArray(d.latestStories) && d.latestStories.length === 2"
assert_json "categories" "/categories" "Array.isArray(d) && d.length === 5 && d.every(c => typeof c.slug === 'string' && typeof c.badge === 'string')"

assert_json "stories paginated" "/stories?limit=3" "Array.isArray(d.items) && d.items.length === 3 && typeof d.nextCursor === 'string' && d.items.every(s => typeof s.slug === 'string' && s.tribe && s.category && s.cover && typeof s.readTimeMinutes === 'number')"
assert_json "stories category filter" "/stories?category=animal&limit=100" "d.items.length === 3 && d.items.every(s => s.category.slug === 'animal')"
assert_json "story detail" "/stories/unogwaja-and-the-lions-well" "d.slug === 'unogwaja-and-the-lions-well' && d.body.version >= 1 && Array.isArray(d.body.paragraphs) && d.body.paragraphs.length > 0 && d.body.paragraphs[0].sentences.length > 0 && d.narrator && d.tribe.slug === 'zulu'"
assert_json "story detail 404 shape" "/stories/not-a-tale" "d.status === 404 && d.code === 'NOT_FOUND' && d.instance === '/api/v1/stories/not-a-tale'" 404
assert_json "search suggestions" "/stories/search-suggestions?q=zulu" "Array.isArray(d) && d.length > 0 && d.some(s => s.type === 'tribe' && s.slug === 'zulu')"
assert_json "story of the day" "/stories/story-of-the-day" "typeof d.slug === 'string' && typeof d.title === 'string'"
assert_json "recommendations" "/stories/unogwaja-and-the-lions-well/recommendations" "Array.isArray(d) && d.length > 0 && d.every(s => s.slug !== 'unogwaja-and-the-lions-well')"

assert_json "library stories page 1" "/library/stories?limit=12" "d.items.length === 12 && typeof d.nextCursor === 'string'"
CURSOR="$(curl -sS "$API/library/stories?limit=12" | node -e 'let s="";process.stdin.on("data",c=>s+=c).on("end",()=>process.stdout.write(encodeURIComponent(JSON.parse(s).nextCursor)))')"
assert_json "library stories page 2" "/library/stories?limit=12&cursor=${CURSOR}" "d.items.length === 6 && d.nextCursor === null"
assert_json "library audio (empty in Phase 1)" "/library/audio?limit=12" "Array.isArray(d.items) && d.items.length === 0"

assert_json "voices list" "/authors?limit=100" "Array.isArray(d.items) && d.items.length === 7 && d.items.every(a => typeof a.slug === 'string' && typeof a.publishedStoryCount === 'number')"
assert_json "author detail" "/authors/adewale-okunola" "d.slug === 'adewale-okunola' && Array.isArray(d.stories) && d.stories.length === 3"

assert_json "public config" "/config" "d.lowStoryThreshold === 5 && Array.isArray(d.reactions) && d.reactions.length === 5"

echo "--------------------------------------------------------------------"
echo "PASS=$PASS FAIL=$FAIL"
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
