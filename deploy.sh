#!/bin/bash
set -e

# Ensure directories are restored on any exit (error or success)
cleanup() {
  [ -d src/app/_api_excluded ] && mv src/app/_api_excluded src/app/api
  [ -d src/app/_admin_excluded ] && mv src/app/_admin_excluded src/app/admin
}
trap cleanup EXIT

echo "Preparing static export..."

# Move API routes and admin out of the build
mv src/app/api src/app/_api_excluded
mv src/app/admin src/app/_admin_excluded

# Clean previous builds
rm -rf out .next

# Build static site
STATIC_EXPORT=1 npx next build

echo ""
echo "Deploying to Vercel..."

# Deploy the out/ directory directly as static
vercel deploy out/ --prod

echo ""
echo "Done! Your site is live."
