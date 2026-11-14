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

assert_auth_json() {
  local name="$1" path="$2" expr="$3" expected="${4:-200}"
  local body status
  body="$(mktemp)"
  status="$(curl -sS -o "$body" -w '%{http_code}' "$API$path" -H "Authorization: Bearer $TOKEN" 2>/dev/null)"
  if [ "$status" = "$expected" ] && EXPR="$expr" node -e '
    const fs = require("node:fs");
    const d = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    const ok = Function("d", "return (" + process.env.EXPR + ");")(d);
    process.exit(ok ? 0 : 1);
  ' "$body"; then
    echo "PASS  $name  GET $path"
    PASS=$((PASS + 1))
  else
    echo "FAIL  $name  GET $path  (HTTP $status)"
    head -c 300 "$body" 2>/dev/null | tr '\n' ' '
    echo
    FAIL=$((FAIL + 1))
  fi
  rm -f "$body"
}

check_method_status() {
  local name="$1" method="$2" path="$3" expected="$4"
  shift 4
  local status
  status="$(curl -sS -o /dev/null -w '%{http_code}' -X "$method" "$API$path" "$@" 2>/dev/null)"
  if [ "$status" = "$expected" ]; then
    echo "PASS  $name  ${method} ${path} -> $status"
    PASS=$((PASS + 1))
  else
    echo "FAIL  $name  ${method} ${path} -> $status (expected $expected)"
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
echo "Phase 2 — auth and personal endpoints"

P2_TMP="$(mktemp -d)"
LOGIN_STATUS="$(curl -sS -D "$P2_TMP/headers" -c "$P2_TMP/cookies" -X POST "$API/auth/login" -H 'Content-Type: application/json' -d '{"email":"kwame@ubuntutales.local","password":"ubuntu-tales-dev"}' -o "$P2_TMP/login.json" -w '%{http_code}')"
if [ "$LOGIN_STATUS" = "200" ]; then
  echo "PASS  seeded login  POST /auth/login -> 200"
  PASS=$((PASS + 1))
else
  echo "FAIL  seeded login  POST /auth/login -> $LOGIN_STATUS"
  FAIL=$((FAIL + 1))
fi
if grep -qi 'HttpOnly' "$P2_TMP/headers" && grep -qi 'SameSite=Lax' "$P2_TMP/headers" && grep -qi 'Path=/api/v1/auth' "$P2_TMP/headers"; then
  echo "PASS  refresh cookie attributes (HttpOnly, SameSite=Lax, Path=/api/v1/auth)"
  PASS=$((PASS + 1))
else
  echo "FAIL  refresh cookie attributes"
  FAIL=$((FAIL + 1))
fi
TOKEN="$(node -e "process.stdout.write(require(process.argv[1]).accessToken)" "$P2_TMP/login.json" 2>/dev/null)"
if [ -n "$TOKEN" ]; then
  echo "PASS  login returns an access token"
  PASS=$((PASS + 1))
else
  echo "FAIL  login returns an access token"
  FAIL=$((FAIL + 1))
fi

assert_auth_json "current user" "/me" "d.email === 'kwame@ubuntutales.local' && typeof d.displayName === 'string' && d.stats && typeof d.stats.talesRead === 'number' && d.emailVerified === true"
assert_auth_json "account saved list" "/me/saved?limit=5" "Array.isArray(d.items) && typeof d.total === 'number'"
assert_auth_json "account progress list" "/me/progress?limit=5" "Array.isArray(d.items)"
STORY_ID="$(curl -sS "$API/stories?limit=1" | node -e 'let s="";process.stdin.on("data",c=>s+=c).on("end",()=>process.stdout.write(JSON.parse(s).items[0].id))')"
assert_json "public reaction summary" "/stories/${STORY_ID}/reactions/summary" "typeof d.storyId === 'string' && typeof d.total === 'number' && typeof d.counts.JOY === 'number'"

check_method_status "GET /me requires auth" GET "/me" 401
check_method_status "GET /me/saved requires auth" GET "/me/saved" 401
check_method_status "GET /me/progress requires auth" GET "/me/progress" 401
check_method_status "PUT /me/saved requires auth" PUT "/me/saved/${STORY_ID}" 401
check_method_status "PUT reactions requires auth" PUT "/stories/${STORY_ID}/reactions" 401 -H 'Content-Type: application/json' -d '{"type":"JOY"}'
check_method_status "logout-all requires auth" POST "/auth/logout-all" 401

check_method_status "refresh without CSRF header" POST "/auth/refresh" 403 -b "$P2_TMP/cookies"
check_method_status "refresh with CSRF header" POST "/auth/refresh" 200 -b "$P2_TMP/cookies" -H 'X-Requested-With: ubuntu-tales'

FORGOT_STATUS="$(curl -sS -o "$P2_TMP/forgot.json" -w '%{http_code}' -X POST "$API/auth/password/forgot" -H 'Content-Type: application/json' -d '{"email":"kwame@ubuntutales.local"}')"
if [ "$FORGOT_STATUS" = "202" ]; then
  echo "PASS  forgot password is 202"
  PASS=$((PASS + 1))
else
  echo "FAIL  forgot password is $FORGOT_STATUS"
  FAIL=$((FAIL + 1))
fi

check_method_status "logout" POST "/auth/logout" 200 -H "Authorization: Bearer $TOKEN"
rm -rf "$P2_TMP"

echo "--------------------------------------------------------------------"
echo "PASS=$PASS FAIL=$FAIL"
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
