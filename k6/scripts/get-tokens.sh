#!/bin/bash
# Helper script to get authentication tokens for k6 testing
# This script helps you obtain access tokens needed for authenticated endpoints

set -e

BASE_URL="${BASE_URL:-http://localhost:8080}"
BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BOLD}=== URL Minifier - k6 Authentication Helper ===${NC}\n"

echo -e "This script will help you obtain authentication tokens for k6 testing.\n"

echo -e "${YELLOW}Note:${NC} The URL Minifier uses Google OAuth 2.0 for authentication."
echo -e "Authentication requires a browser-based OAuth flow.\n"

# Check if the server is running
echo -e "${BOLD}Step 1: Checking if server is running...${NC}"
if ! curl -s -f "${BASE_URL}/healthz" > /dev/null 2>&1; then
    echo -e "${RED}Error: Server is not running at ${BASE_URL}${NC}"
    echo -e "Please start the server first:"
    echo -e "  ${GREEN}devbox run up${NC}"
    echo -e "or"
    echo -e "  ${GREEN}go run ./cmd/api/main.go${NC}\n"
    exit 1
fi
echo -e "${GREEN}✓ Server is running${NC}\n"

# Display authentication options
echo -e "${BOLD}Step 2: Choose authentication method${NC}\n"

echo -e "${YELLOW}Option 1: Browser OAuth Flow (Recommended)${NC}"
echo -e "  1. Open ${GREEN}${BASE_URL}/auth/${NC} in your browser"
echo -e "  2. Complete the Google OAuth flow"
echo -e "  3. Extract the tokens from the response/cookies\n"

echo -e "${YELLOW}Option 2: Manual Token Input${NC}"
echo -e "  If you already have tokens, enter them below.\n"

echo -e "${YELLOW}Option 3: Generate Test Token (Development Only)${NC}"
echo -e "  Note: This requires direct database access or API modifications.\n"

# Prompt user for choice
read -p "Enter your choice (1/2/3) or 'q' to quit: " choice

case $choice in
    1)
        echo -e "\n${BOLD}Opening browser for OAuth flow...${NC}"
        echo -e "URL: ${GREEN}${BASE_URL}/auth/${NC}\n"
        
        # Try to open browser (works on most systems)
        if command -v xdg-open > /dev/null; then
            xdg-open "${BASE_URL}/auth/" 2>/dev/null || true
        elif command -v open > /dev/null; then
            open "${BASE_URL}/auth/" 2>/dev/null || true
        else
            echo -e "${YELLOW}Could not open browser automatically.${NC}"
            echo -e "Please manually visit: ${BASE_URL}/auth/\n"
        fi
        
        echo -e "${BOLD}After completing OAuth:${NC}"
        echo -e "The application will redirect you to the callback URL."
        echo -e "Check the response or browser developer tools for tokens.\n"
        
        echo -e "${BOLD}Paste your tokens below:${NC}"
        read -p "Access Token: " access_token
        read -p "Refresh Token (optional): " refresh_token
        
        if [ -n "$access_token" ]; then
            echo -e "\n${GREEN}✓ Tokens received${NC}\n"
        else
            echo -e "\n${RED}Error: Access token is required${NC}"
            exit 1
        fi
        ;;
    
    2)
        echo -e "\n${BOLD}Enter your tokens:${NC}"
        read -p "Access Token: " access_token
        read -p "Refresh Token (optional): " refresh_token
        
        if [ -n "$access_token" ]; then
            echo -e "\n${GREEN}✓ Tokens received${NC}\n"
        else
            echo -e "\n${RED}Error: Access token is required${NC}"
            exit 1
        fi
        ;;
    
    3)
        echo -e "\n${RED}Warning: Test token generation requires code modifications.${NC}"
        echo -e "This is not implemented in this helper script.\n"
        echo -e "You'll need to either:"
        echo -e "  - Add a development-only endpoint to generate test tokens"
        echo -e "  - Use the OAuth flow (Option 1)"
        echo -e "  - Manually create PASETO tokens using your secret key\n"
        exit 1
        ;;
    
    q|Q)
        echo -e "\nExiting..."
        exit 0
        ;;
    
    *)
        echo -e "\n${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

# Validate token format (basic check for PASETO v2.local tokens)
if [[ ! $access_token =~ ^v2\.local\. ]]; then
    echo -e "${YELLOW}Warning: Access token doesn't appear to be a PASETO v2.local token${NC}"
    read -p "Continue anyway? (y/n): " continue
    if [[ ! $continue =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Test the token
echo -e "\n${BOLD}Step 3: Testing access token...${NC}"
response=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $access_token" "${BASE_URL}/auth/me")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✓ Token is valid!${NC}"
    email=$(echo "$body" | grep -o '"email":"[^"]*"' | cut -d'"' -f4)
    if [ -n "$email" ]; then
        echo -e "  Authenticated as: ${GREEN}$email${NC}\n"
    fi
else
    echo -e "${RED}✗ Token validation failed (HTTP $http_code)${NC}"
    echo -e "Response: $body\n"
    exit 1
fi

# Save tokens to environment file
echo -e "${BOLD}Step 4: Saving tokens...${NC}"

# Create or update .env.k6 file
cat > k6/.env.k6 << EOF
# k6 Testing Environment Variables
# Generated: $(date)
# Do not commit this file to version control!

export BASE_URL="${BASE_URL}"
export ACCESS_TOKEN="${access_token}"
export REFRESH_TOKEN="${refresh_token}"
EOF

echo -e "${GREEN}✓ Tokens saved to k6/.env.k6${NC}\n"

# Add to .gitignore if not already there
if [ -f .gitignore ]; then
    if ! grep -q "k6/.env.k6" .gitignore; then
        echo "k6/.env.k6" >> .gitignore
        echo -e "${GREEN}✓ Added k6/.env.k6 to .gitignore${NC}\n"
    fi
fi

# Display usage instructions
echo -e "${BOLD}=== Setup Complete! ===${NC}\n"

echo -e "${BOLD}To run k6 tests:${NC}\n"

echo -e "1. Load the environment variables:"
echo -e "   ${GREEN}source k6/.env.k6${NC}\n"

echo -e "2. Run a test:"
echo -e "   ${GREEN}k6 run k6/tests/smoke.js${NC}"
echo -e "   ${GREEN}k6 run k6/tests/load.js${NC}"
echo -e "   ${GREEN}k6 run k6/tests/stress.js${NC}\n"

echo -e "Or combine in one command:"
echo -e "   ${GREEN}source k6/.env.k6 && k6 run k6/tests/load.js${NC}\n"

echo -e "${YELLOW}Note:${NC} Tokens may expire. If tests fail with 401 errors, run this script again.\n"

echo -e "${BOLD}Happy load testing! 🚀${NC}\n"
