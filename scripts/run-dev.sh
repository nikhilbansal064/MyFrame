#!/usr/bin/env bash
# ==============================================================================
# My Story - Dev Server Automator Script
# ==============================================================================
set -euo pipefail

# Style variables
BOLD="\033[1m"
GREEN="\033[32m"
BLUE="\033[34m"
YELLOW="\033[33m"
RED="\033[31m"
RESET="\033[0m"

echo -e "${BOLD}${BLUE}🚀 Initiating 'My Story' Development Setup & Server...${RESET}\n"

# 1. Verify Node.js Installation
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Error: Node.js is not installed. Please install Node.js (v18+) to continue.${RESET}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js found: $(node -v)${RESET}"

# 2. Check and Install Dependencies
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠️ node_modules not found. Installing package dependencies...${RESET}"
    npm install
    echo -e "${GREEN}✓ Dependencies installed successfully.${RESET}"
else
    echo -e "${GREEN}✓ Dependency cache found (node_modules).${RESET}"
fi

# 3. Check and Setup Local Mock Environment
if [ ! -f ".env.local" ]; then
    echo -e "${YELLOW}⚠️ .env.local not found. Scaffolding development mock config...${RESET}"
    cat <<EOF > .env.local
# Scaffolding mock variables for Supabase Sandbox bypass
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvY2FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE1OTg4Njk0MDAsImV4cCI6MTkwNDQ0NTQwMH0.mockanonkey
NEXT_PUBLIC_SITE_URL=http://localhost:3000
EOF
    echo -e "${GREEN}✓ Created default .env.local with sandbox mock parameters.${RESET}"
else
    echo -e "${GREEN}✓ Found .env.local environment configurations.${RESET}"
fi

# 4. Clean Next Cache (optional cleanup for compilation safety)
if [ -d ".next" ] && [ "${1:-}" == "--clean" ]; then
    echo -e "${YELLOW}🧹 Cleaning Next.js build cache (.next)...${RESET}"
    rm -rf .next
    echo -e "${GREEN}✓ Next.js build cache purged.${RESET}"
fi

# 5. Starting next dev server
echo -e "\n${BOLD}${GREEN}🌐 Next.js Turbopack development server is booting...${RESET}"
echo -e "${BLUE}ℹ️ App Location: ${BOLD}http://localhost:3000${RESET}"
echo -e "${BLUE}ℹ️ Developer Bypass: Open dashboard and click 'Developer Bypass' to run fully offline without Supabase!${RESET}\n"

exec npm run dev
