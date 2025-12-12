#!/bin/sh
set -e

# Usage: run from repo `deploy` directory or adjust paths below
SERVICE_NAME=groupie.service
SRC_DIR="$(cd "$(dirname "$0")" && pwd)"
SRC_PATH="$SRC_DIR/$SERVICE_NAME"
DEST_PATH="/etc/systemd/system/$SERVICE_NAME"

if [ ! -f "$SRC_PATH" ]; then
  echo "Cannot find $SRC_PATH"
  exit 1
fi

echo "Copying $SRC_PATH to $DEST_PATH (requires sudo)"
sudo cp "$SRC_PATH" "$DEST_PATH"
sudo systemctl daemon-reload
sudo systemctl enable --now "$SERVICE_NAME"
echo "Service $SERVICE_NAME enabled and started. Check status with: sudo systemctl status $SERVICE_NAME"
