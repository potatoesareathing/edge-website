#!/usr/bin/env bash
# ============================================================================
# EDGE — SUPABASE SECURITY VERIFICATION
# ----------------------------------------------------------------------------
# Run this AFTER pasting your project URL and anon key into
#   js/content.js -> join.backend.supabase
#
#   bash scripts/verify-supabase.sh
#
# It reads the keys straight out of content.js, so there is nothing to paste
# twice and no chance of testing a different project than the site uses.
#
# It answers one question: can a stranger holding the key that is printed in
# your public source code read, change or delete your students' data?
#
# The INSERT must succeed. Everything else must be refused.
# ============================================================================

set -u
cd "$(dirname "$0")/.." || exit 1

C="js/content.js"
RED=$'\033[31m'; GRN=$'\033[32m'; YEL=$'\033[33m'; DIM=$'\033[2m'; OFF=$'\033[0m'; B=$'\033[1m'

TMP=$(mktemp -d 2>/dev/null || echo "${TMPDIR:-/tmp}/edge.$$")
mkdir -p "$TMP"
trap 'rm -rf "$TMP"' EXIT

pass=0; fail=0
ok()   { echo "  ${GRN}PASS${OFF}  $1"; pass=$((pass+1)); }
bad()  { echo "  ${RED}FAIL${OFF}  $1"; fail=$((fail+1)); }
note() { echo "        ${DIM}$1${OFF}"; }

# -- read the config ---------------------------------------------------------
URL=$(grep -A4 'supabase: {' "$C" | grep 'url:'      | sed 's/.*"\(.*\)".*/\1/')
KEY=$(grep -A4 'supabase: {' "$C" | grep 'anon_key:' | sed 's/.*"\(.*\)".*/\1/')
TBL=$(grep -A4 'supabase: {' "$C" | grep 'table:'    | sed 's/.*"\(.*\)".*/\1/')
TBL=${TBL:-registrations}

echo
echo "${B}EDGE — Supabase verification${OFF}"
echo "${DIM}────────────────────────────────────────────────────────${OFF}"

if [ -z "$URL" ] || [ -z "$KEY" ]; then
  echo "  ${RED}Not configured.${OFF}"
  echo
  echo "  js/content.js -> join.backend.supabase still has blank values."
  echo "  Paste your Project URL and anon public key there first."
  echo
  exit 1
fi

URL=${URL%/}                                   # tolerate a trailing slash
API="$URL/rest/v1/$TBL"
echo "  Project   $URL"
echo "  Table     $TBL"
echo "  Key       ${KEY:0:12}…${KEY: -6}  (${#KEY} chars)"
echo

H_KEY=(-H "apikey: $KEY" -H "Authorization: Bearer $KEY")
MARK="ZZ-RLS-TEST"

# -- 1. INSERT must succeed --------------------------------------------------
echo "${B}1. A student can register${OFF}"
BODY='{"path":"member","full_name":"RLS Test Row","register_number":"'"$MARK"'","branch":"Other","year":"1st Year","phone":"9876543210","email":"rls-test@example.com"}'
R=$(curl -s --connect-timeout 10 --max-time 30 -o "$TMP/ins" -w "%{http_code}" -X POST "$API" \
      "${H_KEY[@]}" -H "Content-Type: application/json" \
      -H "Prefer: return=minimal" -d "$BODY")
case "$R" in
  201|204) ok "insert accepted (HTTP $R)" ;;
  409)     ok "insert refused as duplicate (HTTP 409) — the test row is already there"
           note "that is fine; it means a previous run inserted it" ;;
  401|403) bad "insert REFUSED (HTTP $R) — registrations will not save"
           note "$(head -c 200 "$TMP/ins" 2>/dev/null)"
           note "the insert policy is missing. Re-run supabase-schema.sql." ;;
  404)     bad "table not found (HTTP 404)"
           note "did you run supabase-schema.sql in the SQL Editor?" ;;
  000)     bad "could not reach the project at all"
           note "check the Project URL is correct and you are online."
           note "it should look like https://abcdefghijkl.supabase.co" ;;
  *)       bad "unexpected response (HTTP $R)"
           note "$(head -c 200 "$TMP/ins" 2>/dev/null)" ;;
esac
echo

# -- 2. SELECT must be refused — THE IMPORTANT ONE ---------------------------
echo "${B}2. A stranger CANNOT read the data${OFF}   ${DIM}← the one that matters${OFF}"
R=$(curl -s --connect-timeout 10 --max-time 30 -o "$TMP/sel" -w "%{http_code}" "$API?select=*" "${H_KEY[@]}")
SEL=$(cat "$TMP/sel" 2>/dev/null)
if [ "$R" = "200" ] && [ "$SEL" = "[]" ]; then
  ok "select returned an empty list — row level security is protecting you"
elif [ "$R" = "401" ] || [ "$R" = "403" ]; then
  ok "select refused outright (HTTP $R)"
elif [ "$R" = "000" ]; then
  bad "could not reach the project — fix the URL first"
elif [ "$R" = "200" ]; then
  bad "${B}SELECT RETURNED DATA. YOUR REGISTRATIONS ARE PUBLIC.${OFF}"
  note "anyone can take the key from your page and download every student's"
  note "name, register number, phone number and email address."
  note "returned: $(head -c 160 "$TMP/sel" 2>/dev/null)"
  note ""
  note "FIX NOW — Supabase SQL Editor:"
  note "  alter table public.registrations enable row level security;"
  note "  drop policy if exists \"public can read\" on public.registrations;"
  note "then re-run supabase-schema.sql and test again."
else
  bad "unexpected response (HTTP $R): $(head -c 160 "$TMP/sel" 2>/dev/null)"
fi
echo

# -- 3. UPDATE must be refused ----------------------------------------------
echo "${B}3. A stranger cannot alter a submission${OFF}"
R=$(curl -s --connect-timeout 10 --max-time 30 -o "$TMP/upd" -w "%{http_code}" -X PATCH \
      "$API?register_number=eq.$MARK" "${H_KEY[@]}" \
      -H "Content-Type: application/json" -H "Prefer: return=minimal" \
      -d '{"full_name":"TAMPERED"}')
if [ "$R" = "401" ] || [ "$R" = "403" ] || [ "$R" = "404" ]; then
  ok "update refused (HTTP $R)"
elif [ "$R" = "204" ] || [ "$R" = "200" ]; then
  bad "UPDATE SUCCEEDED (HTTP $R) — anyone can rewrite your registrations"
  note "an update policy exists that should not. Remove it."
else
  bad "unexpected response (HTTP $R)"
fi
echo

# -- 4. DELETE must be refused ----------------------------------------------
echo "${B}4. A stranger cannot wipe your data${OFF}"
R=$(curl -s --connect-timeout 10 --max-time 30 -o "$TMP/del" -w "%{http_code}" -X DELETE \
      "$API?register_number=eq.$MARK" "${H_KEY[@]}" -H "Prefer: return=minimal")
if [ "$R" = "401" ] || [ "$R" = "403" ] || [ "$R" = "404" ]; then
  ok "delete refused (HTTP $R)"
elif [ "$R" = "204" ] || [ "$R" = "200" ]; then
  bad "DELETE SUCCEEDED (HTTP $R) — anyone can erase every registration"
  note "a delete policy exists that should not. Remove it."
else
  bad "unexpected response (HTTP $R)"
fi
echo

# -- verdict -----------------------------------------------------------------
echo "${DIM}────────────────────────────────────────────────────────${OFF}"
if [ "$fail" -eq 0 ]; then
  echo "  ${GRN}${B}All $pass checks passed.${OFF} Safe to collect real registrations."
  echo
  echo "  ${YEL}One last thing:${OFF} delete the test row named ${B}RLS Test Row${OFF}"
  echo "  (register number ${B}$MARK${OFF}) from the Supabase Table Editor."
  echo "  You cannot delete it from here — which is exactly the point."
else
  echo "  ${RED}${B}$fail check(s) failed.${OFF}  Do not collect real data until this is clean."
fi
echo
[ "$fail" -eq 0 ]
