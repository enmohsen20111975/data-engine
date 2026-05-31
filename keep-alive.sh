#!/bin/bash
# Keep-alive script for dev server
while true; do
    # Check if server is running
    if ! pgrep -f "next dev" > /dev/null; then
        echo "[$(date)] Server died, restarting..."
        cd /home/z/my-project
        bun --bun next dev -p 3000 &
        sleep 5
    fi
    sleep 10
done
