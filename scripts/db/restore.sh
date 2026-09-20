#!/bin/bash
#
# Restore a BookOracle backup produced by scripts/db/backup.sh.
#
# Deliberately refuses to do anything destructive without an explicit --yes,
# and always snapshots the CURRENT database before replacing it.
#
# Usage:
#   ./scripts/db/restore.sh --list
#   ./scripts/db/restore.sh --verify <file>
#   ./scripts/db/restore.sh --yes <file>

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DATA_DIR="${BOOKORACLE_DATA_DIR:-$ROOT_DIR/../data/bookoracle}"
DB_FILE="$DATA_DIR/books.db"
BACKUP_DIR="${BOOKORACLE_BACKUP_DIR:-$ROOT_DIR/backups}"

usage() {
    sed -n '2,14p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
    exit 1
}

list_backups() {
    echo "Backups in $BACKUP_DIR:"
    if compgen -G "$BACKUP_DIR/books-*.db.gz" > /dev/null; then
        ls -lhtr "$BACKUP_DIR"/books-*.db.gz | awk '{print "  " $5 "\t" $6 " " $7 " " $8 "\t" $9}'
    else
        echo "  (none)"
    fi
}

verify_backup() {
    local file="$1"
    [ -f "$file" ] || { echo "ERROR: not found: $file" >&2; exit 1; }

    local tmp
    tmp="$(mktemp)"
    trap 'rm -f "$tmp"' RETURN

    gzip -dc "$file" > "$tmp" || { echo "ERROR: not a readable gzip file" >&2; exit 1; }
    [ -s "$tmp" ] || { echo "ERROR: decompressed backup is empty" >&2; exit 1; }

    local integrity tables users books
    # Capture sqlite's own error instead of letting `set -e` surface its exit
    # code (26 for "file is not a database"), so callers and cron see a single
    # predictable failure code with a readable reason.
    integrity="$(sqlite3 "$tmp" 'PRAGMA integrity_check;' 2>&1)" \
        || { echo "ERROR: not a readable SQLite database: $integrity" >&2; exit 1; }
    tables="$(sqlite3 "$tmp" "SELECT count(*) FROM sqlite_master WHERE type='table';" 2>/dev/null || echo '?')"
    users="$(sqlite3 "$tmp" 'SELECT count(*) FROM user;' 2>/dev/null || echo '?')"
    books="$(sqlite3 "$tmp" 'SELECT count(*) FROM book;' 2>/dev/null || echo '?')"

    echo "File:       $file"
    echo "Size:       $(du -h "$file" | cut -f1)"
    echo "integrity:  $integrity"
    echo "tables:     $tables"
    echo "users:      $users"
    echo "books:      $books"

    [ "$integrity" = "ok" ] || { echo "ERROR: integrity_check failed" >&2; exit 1; }
    echo "OK: backup is valid and contains $users user(s) and $books book(s)."
}

restore_backup() {
    local file="$1"

    [ -f "$file" ] || { echo "ERROR: not found: $file" >&2; exit 1; }
    [ -d "$DATA_DIR" ] || { echo "ERROR: data dir not found: $DATA_DIR" >&2; exit 1; }
    [ -w "$DATA_DIR" ] || {
        echo "ERROR: $DATA_DIR is not writable by $(id -un)." >&2
        echo "       Run this as the data directory's owner." >&2
        exit 1
    }

    verify_backup "$file"

    local stamp safety
    stamp="$(date +%Y%m%d-%H%M%S)"
    safety="$BACKUP_DIR/pre-restore-$stamp.db.gz"
    mkdir -p "$BACKUP_DIR"

    if [ -f "$DB_FILE" ]; then
        echo "Snapshotting the current database to $safety before replacing it..."
        sqlite3 "$DB_FILE" ".backup '$BACKUP_DIR/.pre-restore.tmp'"
        gzip -c "$BACKUP_DIR/.pre-restore.tmp" > "$safety"
        rm -f "$BACKUP_DIR/.pre-restore.tmp"
    fi

    local tmp
    tmp="$(mktemp)"
    gzip -dc "$file" > "$tmp"
    sqlite3 "$tmp" 'PRAGMA integrity_check;' | grep -qx ok || { rm -f "$tmp"; echo "ERROR: refusing to restore a corrupt backup" >&2; exit 1; }
    mv "$tmp" "$DB_FILE"

    echo "Restored $file -> $DB_FILE"
    [ -f "$safety" ] && echo "Previous database saved at $safety"
    echo "Restart the app to pick up the restored data: docker compose restart backend"
}

case "${1:-}" in
    --list)   list_backups ;;
    --verify) [ $# -ge 2 ] || usage; verify_backup "$2" ;;
    --yes)    [ $# -ge 2 ] || usage; restore_backup "$2" ;;
    *)        usage ;;
esac
