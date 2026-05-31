#!/bin/bash
set -e

echo "Preparing static export..."

# Temporarily move API routes and admin out of the build
mv src/app/api src/app/_api_excluded
mv src/app/admin src/app/_admin_excluded

# Build using vercel build (generates .vercel/output)
vercel build

# Restore API routes and admin
mv src/app/_api_excluded src/app/api
mv src/app/_admin_excluded src/app/admin

echo ""
echo "Deploying to Vercel..."

# Deploy the prebuilt output
vercel deploy --prebuilt

echo ""
echo "Done! Your site is live."
