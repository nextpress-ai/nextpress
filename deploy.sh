#!/bin/bash
#
# Nextpress Deploy Script
# Handles build, Docker Compose verification, and push to Docker Hub
#
# Usage: ./deploy.sh [OPTIONS]
#
# Options:
#   --with-db     Run database migration (pnpm db:push) before build
#   --skip-build  Skip project build (pnpm build)
#   --skip-push   Skip Docker Hub push confirmation
#   -h, --help    Show help message
#
# Requirements:
#   - pnpm, docker, docker compose, jq installed
#   - .env file with POSTGRES_PASSWORD, SESSION_SECRET
#

set -euo pipefail

VERSION="$(jq -r '.version' package.json 2>/dev/null || echo 'unknown')"
echo "==> NextPress deploy starting (v${VERSION})"

# ============================================
# CLI Arguments
# ============================================
SKIP_DB=true
SKIP_BUILD=false
SKIP_PUSH=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --with-db)
      SKIP_DB=false
      shift
      ;;
    --skip-build)
      SKIP_BUILD=true
      shift
      ;;
    --skip-push)
      SKIP_PUSH=true
      shift
      ;;
    -h|--help)
      echo "Usage: ./deploy.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --with-db     Run database migration (pnpm db:push)"
      echo "  --skip-build  Skip project build (pnpm build)"
      echo "  --skip-push   Skip Docker Hub push (build & verify only)"
      echo "  -h, --help    Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# ============================================
# Configuration
# ============================================
readonly DOCKER_HUB_IMAGE="husseinkizz/nextpress"
readonly COMPOSE_IMAGE="nextpress-app"
readonly PORT=5000
readonly HEALTH_ENDPOINT="/api/health"
readonly HEALTH_TIMEOUT=60

# ============================================
# Colors
# ============================================
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[0;33m'
readonly BLUE='\033[0;34m'
readonly BOLD='\033[1m'
readonly NC='\033[0m'

# ============================================
# Helper Functions
# ============================================

print_header() {
  echo ""
  echo -e "${BLUE}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}${BOLD}  $1${NC}"
  echo -e "${BLUE}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
}

print_step() {
  echo -e "\n${BOLD}[$1] $2${NC}"
}

print_success() {
  echo -e "  ${GREEN}✓${NC} $1"
}

print_error() {
  echo -e "  ${RED}✗${NC} $1"
}

print_warning() {
  echo -e "  ${YELLOW}⚠${NC} $1"
}

print_info() {
  echo -e "  ${BLUE}→${NC} $1"
}

cleanup() {
  local exit_code=$?
  if [[ $exit_code -ne 0 ]]; then
    echo ""
    print_error "Deploy failed. Cleaning up..."
    docker compose down 2>/dev/null || true
  fi
  exit $exit_code
}

trap cleanup EXIT

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

get_version() {
  jq -r '.version' package.json
}

docker_logged_in() {
  [[ -f ~/.docker/config.json ]] && grep -q "auth" ~/.docker/config.json 2>/dev/null
}

# ============================================
# Main Script
# ============================================

print_header "NEXTPRESS DEPLOY"

# ============================================
# Step 1: Pre-flight Checks
# ============================================
print_step "1/9" "Pre-flight checks..."

if [[ ! -f "package.json" ]]; then
  print_error "package.json not found. Run this script from the project root."
  exit 1
fi
print_success "Running from project root"

for tool in pnpm docker jq; do
  if ! command_exists "$tool"; then
    print_error "$tool is not installed"
    exit 1
  fi
  print_success "$tool installed"
done

# Check docker compose (v2)
if ! docker compose version >/dev/null 2>&1; then
  print_error "docker compose (v2) is not available"
  print_info "Install: https://docs.docker.com/compose/install/"
  exit 1
fi
print_success "docker compose installed"

VERSION=$(get_version)
if [[ -z "$VERSION" || "$VERSION" == "null" ]]; then
  print_error "Could not read version from package.json"
  exit 1
fi
readonly VERSION_TAG="beta-v${VERSION}"
print_success "Version: ${VERSION} → ${VERSION_TAG}"

if [[ ! -f ".env" ]]; then
  print_error ".env file not found"
  exit 1
fi
print_success ".env file found"

# Source .env
set -a
source .env
set +a

# Check required env vars for docker-compose
if [[ -z "${POSTGRES_PASSWORD:-}" ]]; then
  print_error "POSTGRES_PASSWORD not set in .env"
  exit 1
fi
print_success "POSTGRES_PASSWORD is set"

if [[ -z "${SESSION_SECRET:-}" ]]; then
  print_warning "SESSION_SECRET not set in .env"
else
  print_success "SESSION_SECRET is set"
fi

if docker_logged_in; then
  print_success "Docker Hub login detected"
else
  print_warning "Not logged into Docker Hub (push may fail)"
fi

# ============================================
# Step 2: Database Migration (Optional)
# ============================================
print_step "2/9" "Database migration..."

if [[ "$SKIP_DB" == true ]]; then
  print_warning "Skipped (use --with-db to run)"
else
  if ! pnpm db:push; then
    print_error "Database migration failed"
    exit 1
  fi
  print_success "pnpm db:push completed"
fi

# ============================================
# Step 3: Project Build
# ============================================
print_step "3/9" "Project build..."

if [[ "$SKIP_BUILD" == true ]]; then
  print_warning "Skipped (remove --skip-build to run)"
else
  if ! pnpm build; then
    print_error "Project build failed"
    exit 1
  fi
  print_success "pnpm build completed"
fi

# ============================================
# Step 4: Cleanup Existing Containers
# ============================================
print_step "4/9" "Cleanup existing containers..."

docker compose down 2>/dev/null || true
print_success "docker compose down completed"

# ============================================
# Step 5: Build, migrate, and start with Docker Compose
# ============================================
print_step "5/9" "Docker Compose build, migrate, and start..."

if ! docker compose build app; then
  print_error "docker compose build failed"
  exit 1
fi
print_success "App image built"

if ! docker compose up -d postgres; then
  print_error "Postgres start failed"
  exit 1
fi
print_success "Postgres started"

if ! docker compose run --rm --no-deps app pnpm drizzle-kit migrate; then
  print_error "Database migration failed"
  exit 1
fi
print_success "Database migrations applied"

if ! docker compose up -d app caddy; then
  print_error "App start failed"
  exit 1
fi
print_success "Containers started"

# ============================================
# Step 6: Health Check
# ============================================
print_step "6/9" "Health check..."

print_info "Waiting for app to be ready (max ${HEALTH_TIMEOUT}s)..."

elapsed=0
healthy=false
while [[ $elapsed -lt $HEALTH_TIMEOUT ]]; do
  if docker compose exec -T app node -e "
    fetch('http://127.0.0.1:${PORT}${HEALTH_ENDPOINT}')
      .then((r) => process.exit(r.ok ? 0 : 1))
      .catch(() => process.exit(1));
  " >/dev/null 2>&1; then
    healthy=true
    break
  fi
  sleep 3
  elapsed=$((elapsed + 3))
  printf "  ${BLUE}→${NC} Waiting... (%ds)\r" "$elapsed"
done
echo ""

if [[ "$healthy" == true ]]; then
  HEALTH_RESPONSE=$(docker compose exec -T app node -e "
    fetch('http://127.0.0.1:${PORT}${HEALTH_ENDPOINT}')
      .then((r) => r.text())
      .then((t) => { process.stdout.write(t); })
      .catch(() => process.exit(1));
  ")
  print_success "Health check passed: ${HEALTH_RESPONSE}"
else
  print_error "Health check failed after ${HEALTH_TIMEOUT}s"
  print_info "Container logs (app):"
  echo ""
  docker compose logs app --tail 50
  exit 1
fi

# ============================================
# Step 7: Stop Containers
# ============================================
print_step "7/9" "Stop containers..."

docker compose down
print_success "Containers stopped"

# Get image size before we potentially lose track
IMAGE_SIZE=$(docker images "${COMPOSE_IMAGE}:latest" --format "{{.Size}}" 2>/dev/null || echo "unknown")

# ============================================
# Step 8: Tag Image for Docker Hub
# ============================================
print_step "8/9" "Tag image for Docker Hub..."

docker tag "${COMPOSE_IMAGE}:latest" "${DOCKER_HUB_IMAGE}:${VERSION_TAG}"
print_success "Tagged: ${DOCKER_HUB_IMAGE}:${VERSION_TAG}"

docker tag "${COMPOSE_IMAGE}:latest" "${DOCKER_HUB_IMAGE}:latest"
print_success "Tagged: ${DOCKER_HUB_IMAGE}:latest"

print_info "Image size: ${IMAGE_SIZE}"

# ============================================
# Step 9: Push to Docker Hub
# ============================================
print_step "9/9" "Push to Docker Hub..."

if [[ "$SKIP_PUSH" == true ]]; then
  print_warning "Skipped (remove --skip-push to push)"
else
  echo ""
  echo -e "  ${BOLD}Image:${NC}   ${DOCKER_HUB_IMAGE}"
  echo -e "  ${BOLD}Tags:${NC}    ${VERSION_TAG}, latest"
  echo -e "  ${BOLD}Size:${NC}    ${IMAGE_SIZE}"
  echo ""

  read -rp "  Push to Docker Hub? [y/N]: " confirm_push

  if [[ ! "$confirm_push" =~ ^[Yy]$ ]]; then
    print_warning "Push cancelled"
    print_info "To push manually:"
    echo "    docker push ${DOCKER_HUB_IMAGE}:${VERSION_TAG}"
    echo "    docker push ${DOCKER_HUB_IMAGE}:latest"
  else
    print_info "Pushing ${VERSION_TAG}..."
    if ! docker push "${DOCKER_HUB_IMAGE}:${VERSION_TAG}"; then
      print_error "Push failed. Try: docker login"
      exit 1
    fi
    print_success "Pushed: ${DOCKER_HUB_IMAGE}:${VERSION_TAG}"

    print_info "Pushing latest..."
    if ! docker push "${DOCKER_HUB_IMAGE}:latest"; then
      print_error "Push failed"
      exit 1
    fi
    print_success "Pushed: ${DOCKER_HUB_IMAGE}:latest"
  fi
fi

# ============================================
# Summary
# ============================================
print_header "DEPLOY COMPLETE"

echo -e "  ${BOLD}Image:${NC}   ${DOCKER_HUB_IMAGE}:${VERSION_TAG}"
echo -e "  ${BOLD}Size:${NC}    ${IMAGE_SIZE}"
echo -e "  ${BOLD}Hub:${NC}     https://hub.docker.com/r/husseinkizz/nextpress"
echo ""
echo -e "  ${BOLD}Run with docker-compose:${NC}"
echo "    docker-compose up -d"
echo ""
echo -e "  ${BOLD}Pull from Docker Hub:${NC}"
echo "    docker pull ${DOCKER_HUB_IMAGE}:${VERSION_TAG}"
echo ""
