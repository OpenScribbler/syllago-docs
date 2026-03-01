#!/bin/bash
set -euo pipefail

# D2 Installation Script for GitHub Actions
# Installs D2 with checksum verification for supply chain security.

D2_VERSION="v0.7.1"
D2_CHECKSUM="eb172adf59f38d1e5a70ab177591356754ffaf9bebb84e0ca8b767dfb421dad7"
D2_INSTALL_PATH="/usr/local/bin/d2"

# Check if D2 already exists (from cache)
if [ -f "${D2_INSTALL_PATH}" ]; then
    chmod +x "${D2_INSTALL_PATH}"
    d2 --version
    echo "D2 found in cache, ready."
    exit 0
fi

echo "Installing D2 ${D2_VERSION}..."

curl -fsSL "https://github.com/terrastruct/d2/releases/download/${D2_VERSION}/d2-${D2_VERSION}-linux-amd64.tar.gz" -o d2.tar.gz

echo "${D2_CHECKSUM} d2.tar.gz" | sha256sum -c -

tar -xzf d2.tar.gz
mv "d2-${D2_VERSION}/bin/d2" "${D2_INSTALL_PATH}"
chmod +x "${D2_INSTALL_PATH}"

rm -rf d2.tar.gz "d2-${D2_VERSION}"

d2 --version
echo "D2 installed successfully."
