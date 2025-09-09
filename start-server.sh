#!/bin/bash
cd /home/yjw/ai-
while true; do
  node server.js
  echo "Server crashed, restarting in 2 seconds..."
  sleep 2
done
