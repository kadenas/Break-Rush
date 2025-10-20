#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TIMESTAMP="$(date +%Y%m%d%H%M%S)"
RELEASE_BASE="/var/www/break_rush"
RELEASE_DIR="$RELEASE_BASE/releases/$TIMESTAMP"
CURRENT_LINK="$RELEASE_BASE/current"

cd "$ROOT_DIR"

echo "Installing dependencies..."
npm ci

echo "Building production bundle..."
npm run build

echo "Preparing release at $RELEASE_DIR"
mkdir -p "$RELEASE_DIR"
rsync -a --delete "dist/" "$RELEASE_DIR/"

find "$RELEASE_DIR" -type d -exec chmod 755 {} +
find "$RELEASE_DIR" -type f -exec chmod 644 {} +
chown -R www-data:www-data "$RELEASE_DIR"

ln -sfn "$RELEASE_DIR" "$CURRENT_LINK.tmp"
mv -T "$CURRENT_LINK.tmp" "$CURRENT_LINK"

echo "Validating nginx configuration..."
nginx -t

echo "Reloading nginx..."
systemctl reload nginx

echo "Deployment complete: $TIMESTAMP"
