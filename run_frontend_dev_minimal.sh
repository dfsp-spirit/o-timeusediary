#!/bin/sh
# Run the minimal frontend setup (Python's builtin webserver, direct WSGI server access to backend without nginx reverse proxy) for development purposes.
# Make sure to have the backend running before executing this script, and that you run the `run_backend_dev_minimal.sh` script for the backend to start it.


if [ ! -d "src" ]; then
  echo "ERROR: 'src' directory not found, please ensure you are running this script from the frontend repository root."
  exit 1
fi

BACKEND_REPO_PATH="../o-timeusediary-backend"

if [ ! -d "$BACKEND_REPO_PATH" ]; then
  echo "WARNING: Backend repository not found at '$BACKEND_REPO_PATH', please set the correct path in the script to automatically copy the proper frontend config file for use with this script from the backend repository."
  echo "WARNING: Continuing without copying the frontend config file, assuming the correct one is already in place, or that you are not interested in running the backend..."
  echo "Starting minimal frontend development server on http://localhost:3000, access to backend may not work without the correct frontend config file in place..."
else
  # backend dir known, copy the correct frontend config for direct backend access without nginx reverse proxy in place
  FRONTEND_CONFIG_PATH="${BACKEND_REPO_PATH}/dev_tools/local_minimal/frontend_settings/tud_settings.dev-minimal.js"

  if [ ! -f "$FRONTEND_CONFIG_PATH" ]; then
    echo "ERROR: Frontend config file not found at '$FRONTEND_CONFIG_PATH', please check the backend repository for the correct path."
    exit 1
  fi

  FRONTEND_TARGET_PATH="src/settings"

  if [ ! -d "$FRONTEND_TARGET_PATH" ]; then
    echo "ERROR: Frontend target directory '$FRONTEND_TARGET_PATH' does not exist, please ensure you are running this script from the frontend repo root."
    exit 1
  fi

  cp "$FRONTEND_CONFIG_PATH" "${FRONTEND_TARGET_PATH}/tud_settings.js" || { echo "ERROR: Failed to copy frontend config file, please check the paths and permissions."; exit 1; }
  echo "Starting minimal frontend development server on http://localhost:3000 with direct backend access..."

fi

cd src/ && python3 -m http.server 3000

