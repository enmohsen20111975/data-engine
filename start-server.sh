#!/bin/bash
# Keep-alive script for Data Factory

cd /home/z/my-project/mini-services/scraper-service

while true; do
    # Check if gunicorn is running
    if ! pgrep -f "gunicorn" > /dev/null; then
        echo "[$(date)] Starting gunicorn..."
        gunicorn --bind 0.0.0.0:3000 --workers 1 --threads 4 --timeout 120 index:app &
        sleep 3
    fi
    sleep 5
done
