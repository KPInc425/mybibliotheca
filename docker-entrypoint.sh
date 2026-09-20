#!/bin/bash
set -e

echo "Starting BookOracle..."

# --- SECRET_KEY -------------------------------------------------------------
# Session cookies are signed with this. If it is missing or publicly known,
# anyone can forge a cookie for any account (including admins), so refuse to
# start rather than run insecurely. The app validates it again at import time.
if [ -z "$SECRET_KEY" ]; then
    echo "FATAL: SECRET_KEY is not set."
    echo "       Generate one with: python3 -c \"import secrets; print(secrets.token_urlsafe(32))\""
    echo "       then set SECRET_KEY in the environment (or in .env) and restart."
    exit 1
fi

# --- Data directory ---------------------------------------------------------
mkdir -p /app/data

# Only chown when we are actually root and the directory is not already owned
# by us. The previous unconditional `chown -R 1000:1000 /app/data` ran on every
# single start (walking the whole data dir, including the backup archives) and
# forcibly reassigned anything the host had set up. In production the bind mount
# is owned by a different host user, so this rewrote ownership on every boot.
if [ "$(id -u)" = "0" ]; then
    current_owner="$(stat -c '%u:%g' /app/data 2>/dev/null || echo '')"
    if [ "$current_owner" != "1000:1000" ]; then
        echo "Fixing ownership of /app/data ($current_owner -> 1000:1000)"
        chown 1000:1000 /app/data 2>/dev/null || true
    fi
fi

# --- Database bootstrap -----------------------------------------------------
# Schema creation, incremental migrations and the pre-migration backup run
# exactly ONCE here, before gunicorn starts. They used to run inside every
# worker's import of run:app, which made cold starts a race: the workers that
# lost it died with "table user already exists" and gunicorn shut the master
# down. Measured at the production worker count, 0 of 3 cold starts survived.
#
# A failure here is fatal on purpose: starting the app against a schema that
# failed to migrate is worse than not starting.
echo "Running database bootstrap (migrations + pre-migration backup)..."
python3 -m app.bootstrap

echo "Bootstrap complete, starting application..."
exec "$@"
