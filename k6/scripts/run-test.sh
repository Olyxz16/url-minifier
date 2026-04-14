#!/bin/bash
# Quick test runner script
# Usage: ./k6/scripts/run-test.sh [test-name]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
K6_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$K6_DIR")"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

# Load environment if exists
if [ -f "$K6_DIR/.env.k6" ]; then
    source "$K6_DIR/.env.k6"
    echo -e "${GREEN}✓ Loaded environment from .env.k6${NC}\n"
else
    echo -e "${YELLOW}Warning: No .env.k6 file found${NC}"
    echo -e "Run ${GREEN}./k6/scripts/get-tokens.sh${NC} to set up authentication\n"
fi

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo -e "${RED}Error: k6 is not installed${NC}"
    echo -e "Install k6: https://k6.io/docs/getting-started/installation/"
    exit 1
fi

# Check if server is running
BASE_URL="${BASE_URL:-http://localhost:8080}"
if ! curl -s -f "${BASE_URL}/healthz" > /dev/null 2>&1; then
    echo -e "${RED}Error: Server is not running at ${BASE_URL}${NC}"
    echo -e "Start the server with: ${GREEN}devbox run up${NC}\n"
    exit 1
fi
echo -e "${GREEN}✓ Server is running${NC}\n"

# Test selection
TEST_NAME="${1:-}"

if [ -z "$TEST_NAME" ]; then
    echo -e "${BOLD}Available tests:${NC}\n"
    echo -e "  ${GREEN}smoke${NC}   - Quick validation (1 min)"
    echo -e "  ${GREEN}load${NC}    - Normal load testing (16 min)"
    echo -e "  ${GREEN}stress${NC}  - Find breaking points (33 min)"
    echo -e "  ${GREEN}spike${NC}   - Sudden traffic spikes (16 min)"
    echo -e "  ${GREEN}soak${NC}    - Long-term stability (70 min)"
    echo -e "  ${GREEN}failure${NC} - Runs till failure"
    echo -e "  ${GREEN}all${NC}     - Run smoke + load tests\n"
    
    read -p "Select test: " TEST_NAME
fi

# Run the selected test
case $TEST_NAME in
    smoke)
        echo -e "${BOLD}Running Smoke Test...${NC}\n"
        k6 run "$K6_DIR/tests/smoke.js" \
            -e BASE_URL="$BASE_URL" \
            -e ACCESS_TOKEN="$ACCESS_TOKEN"
        ;;
    
    load)
        echo -e "${BOLD}Running Load Test...${NC}\n"
        k6 run "$K6_DIR/tests/load.js" \
            -e BASE_URL="$BASE_URL" \
            -e ACCESS_TOKEN="$ACCESS_TOKEN"
        ;;
    
    stress)
        echo -e "${BOLD}Running Stress Test...${NC}\n"
        echo -e "${YELLOW}This will take ~33 minutes and push the system hard.${NC}"
        read -p "Continue? (y/n): " confirm
        if [[ ! $confirm =~ ^[Yy]$ ]]; then
            exit 0
        fi
        k6 run "$K6_DIR/tests/stress.js" \
            -e BASE_URL="$BASE_URL" \
            -e ACCESS_TOKEN="$ACCESS_TOKEN"
        ;;
    
    spike)
        echo -e "${BOLD}Running Spike Test...${NC}\n"
        k6 run "$K6_DIR/tests/spike.js" \
            -e BASE_URL="$BASE_URL" \
            -e ACCESS_TOKEN="$ACCESS_TOKEN"
        ;;
    
    soak)
        echo -e "${BOLD}Running Soak Test...${NC}\n"
        echo -e "${YELLOW}This will take ~70 minutes.${NC}"
        read -p "Continue? (y/n): " confirm
        if [[ ! $confirm =~ ^[Yy]$ ]]; then
            exit 0
        fi
        k6 run "$K6_DIR/tests/soak.js" \
            -e BASE_URL="$BASE_URL" \
            -e ACCESS_TOKEN="$ACCESS_TOKEN"
        ;;

    failure)
        echo -e "${BOLD}Running Failure Test...${NC}\n"
        k6 run "$K6_DIR/tests/failure.js" \
            -e BASE_URL="$BASE_URL" \
            -e ACCESS_TOKEN="$ACCESS_TOKEN"
        ;;
    
    
    all)
        echo -e "${BOLD}Running Smoke + Load Tests...${NC}\n"
        
        echo -e "${BOLD}1. Smoke Test${NC}"
        k6 run "$K6_DIR/tests/smoke.js" \
            -e BASE_URL="$BASE_URL" \
            -e ACCESS_TOKEN="$ACCESS_TOKEN"
        
        echo -e "\n${BOLD}2. Load Test${NC}"
        k6 run "$K6_DIR/tests/load.js" \
            -e BASE_URL="$BASE_URL" \
            -e ACCESS_TOKEN="$ACCESS_TOKEN"
        
        echo -e "\n${GREEN}✓ All tests completed!${NC}\n"
        ;;
    
    *)
        echo -e "${RED}Invalid test name: $TEST_NAME${NC}"
        echo -e "Valid options: smoke, load, stress, spike, soak, failure, all"
        exit 1
        ;;
esac

echo -e "\n${GREEN}✓ Test completed!${NC}\n"
