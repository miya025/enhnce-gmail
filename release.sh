#!/bin/bash

# Configuration
EXTENSION_NAME="enhance-gmail"
# Extract version from manifest.json
VERSION=$(grep '"version":' manifest.json | cut -d '"' -f 4)
ZIP_NAME="${EXTENSION_NAME}-v${VERSION}.zip"

# Create a clean zip file
echo "Creating ${ZIP_NAME}..."

# Remove existing zip if it exists
if [ -f "${ZIP_NAME}" ]; then
    rm "${ZIP_NAME}"
fi

# Zip the content, excluding unnecessary files
# -x excludes files associated with git, mac system files, and this script itself
zip -r "${ZIP_NAME}" . -x "*.git*" -x ".gitignore" -x "*.DS_Store" -x "release.sh" -x "CLAUDE.md" -x ".vscode/*" -x ".idea/*"

echo "----------------------------------------"
if [ -f "${ZIP_NAME}" ]; then
    echo "✅ Success! Created ${ZIP_NAME}"
    echo "Upload this file to the Chrome Web Store Developer Dashboard."
    echo "https://chrome.google.com/webstore/dev/dashboard"
else
    echo "❌ Error: Failed to create zip file."
fi
