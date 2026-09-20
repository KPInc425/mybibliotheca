#!/bin/bash
#
# BookOracle database backup.
#
# Verified by running it: it either leaves a non-empty, integrity-checked
# snapshot in BACKUP_DIR or it exits non-zero. There is no path where it
# "succeeds" while writing nothing.
#
# Context for why this looks the way it does:
#   * The previous crontab entry pointed at ../scripts/backup_bookoracle.sh,
#     which does not exist (the file lives at ../scripts/bookoracle/), so cron
#     failed with exit 127 nightly and nobody noticed.
#   * The data directory is owned by kpinc:kpinc while the app and cron run as
#     steam, so any attempt to write alongside the database gets EACCES. All
#     writes therefore go to BACKUP_DIR, which is created and owned here.
#   * A plain `cp` of a live SQLite file can capture a torn page. `sqlite3 .backup`
#     takes a consistent snapshot and this script then runs integrity_check.
#
# Usage:  ./scripts/db/backup.sh
# Env:    BOOKORACLE_DATA_DIR, BOOKORACLE_BACKUP_DIR, BOOKORACLE_RETAIN_DAYS

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

DATA_DIR="${BOOKORACLE_DATA_DIR:-$ROOT_DIR/../data/bookoracle}"
DB_FILE="$DATA_DIR/books.db"
BACKUP_DIR="${BOOKORACLE_BACKUP_DIR:-$ROOT_DIR/backups}"
RETAIN_DAYS="${BOOKORACLE_RETAIN_DAYS:-14}"
LOG_FILE="${BOOKORACLE_BACKUP_LOG:-$BACKUP_DIR/backup.log}"

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
OUTPUT_FILE="$BACKUP_DIR/books-$TIMESTAMP.db.gz"

fail() {
    echo "ERROR: $*" >&2
    # Leave a breadcrumb in the log as well; cron output goes nowhere useful.
    if [ -d "$(dirname "$LOG_FILE")" ]; then
        echo "$(date '+%Y-%m-%d %H:%M:%S') FAILED: $*" >> "$LOG_FILE" || true
    fi
    exit 1
}

mkdir -p "$BACKUP_DIR"

# --- Source checks ----------------------------------------------------------
# Readable is enough: we never write into DATA_DIR (see header).
[ -d "$DATA_DIR" ] || fail "data directory not found: $DATA_DIR"
[ -f "$DB_FILE" ]  || fail "database file not found: $DB_FILE"
[ -r "$DB_FILE" ]  || fail "database file not readable by $(id -un): $DB_FILE"

# sqlite3 needs to create journal/WAL sidecars next to the source for .backup,
# which we cannot do in a read-only directory. Warn clearly instead of dying
# with a cryptic "unable to open database file" later.
if [ ! -w "$DATA_DIR" ]; then
    echo "NOTE: $DATA_DIR is not writable by $(id -un);"
    echo "      using sqlite3's read-only URI mode (immutable=1)."
    SOURCE_URI="file:$DB_FILE?mode=ro&immutable=1"
else
    SOURCE_URI="$DB_FILE"
fi

# --- Snapshot, verify, compress --------------------------------------------
TMP_FILE="$BACKUP_DIR/.books-$TIMESTAMP.tmp"
trap 'rm -f "$TMP_FILE"' EXIT

echo "Backing up $DB_FILE -> $OUTPUT_FILE"

sqlite3 "$SOURCE_URI" ".backup '$TMP_FILE'" \
    || fail "sqlite3 .backup failed"

[ -s "$TMP_FILE" ] || fail "snapshot is empty"

INTEGRITY="$(sqlite3 "$TMP_FILE" 'PRAGMA integrity_check;' 2>&1)" \
    || fail "integrity_check could not run on the snapshot"
[ "$INTEGRITY" = "ok" ] || fail "integrity_check failed: $INTEGRITY"

# Prove the snapshot actually contains the app's data, not just a valid header.
TABLES="$(sqlite3 "$TMP_FILE" "SELECT count(*) FROM sqlite_master WHERE type='table';")"
[ "$TABLES" -ge 5 ] || fail "snapshot has only $TABLES tables; refusing to keep it"

gzip -c "$TMP_FILE" > "$OUTPUT_FILE" || fail "gzip failed"
rm -f "$TMP_FILE"

[ -s "$OUTPUT_FILE" ] || fail "compressed backup is empty: $OUTPUT_FILE"

SIZE="$(du -h "$OUTPUT_FILE" | cut -f1)"

# --- Prune ------------------------------------------------------------------
PRUNED="$(find "$BACKUP_DIR" -maxdepth 1 -name 'books-*.db.gz' -mtime +"$RETAIN_DAYS" -print -delete | wc -l)"

echo "$(date '+%Y-%m-%d %H:%M:%S') OK $OUTPUT_FILE ($SIZE, $TABLES tables), pruned $PRUNED older than ${RETAIN_DAYS}d" | tee -a "$LOG_FILE"

# Keep a stable pointer to the newest good backup.
ln -sfn "$OUTPUT_FILE" "$BACKUP_DIR/latest.db.gz" 2>/dev/null || true

echo "Backup complete: $OUTPUT_FILE ($SIZE)"
