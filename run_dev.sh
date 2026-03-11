#!/bin/sh
# Run the minimal frontend setup (Python's builtin webserver, direct WSGI server access to backend without nginx reverse proxy) for development purposes.
# Make sure to have the backend running before executing this script, and that you run the `run_backend_dev_minimal.sh` script for the backend to start it.

BACKEND_REPO_PATH=../o-timeusediary-backend

if [ ! -d "$BACKEND_REPO_PATH" ]; then
  echo "ERROR: Backend repository not found at '$BACKEND_REPO_PATH', please set the correct path in the script."
  exit 1
fi

# Copy the correct frontend config for direct backend access without nginx reverse proxy in place
FRONTEND_CONFIG_PATH="${BACKEND_REPO_PATH}/dev_tools/local_minimal/frontend_settings/tud_settings.dev-minimal.js"

if [ ! -f "$FRONTEND_CONFIG_PATH" ]; then
  echo "ERROR: Frontend config file not found at '$FRONTEND_CONFIG_PATH', please check the backend repository for the correct path."
  exit 1
fi

cp "$FRONTEND_CONFIG_PATH" src/settings/tud_settings.js || { echo "ERROR: Failed to copy frontend config file, please check the paths and permissions."; exit 1; }

echo "Starting minimal frontend development server on http://localhost:3000 with direct backend access..."

cd src/ && python3 -m http.server 3000

