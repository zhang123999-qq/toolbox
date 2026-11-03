#!/bin/bash
# =============================================================================
# Toolbox - Production Rollback Script
# =============================================================================
# Usage:
#   ./rollback.sh                 # Rollback to previous version
#   ./rollback.sh v1.2.3          # Rollback to specific version tag
#   ./rollback.sh --list          # List available versions
#   ./rollback.sh --dry-run       # Show what would happen without executing
# =============================================================================

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${SCRIPT_DIR}"
COMPOSE_FILE="${PROJECT_DIR}/docker-compose.yml"
COMPOSE_PROJECT_NAME="toolbox"
SERVICE_NAME="toolbox"
HEALTH_ENDPOINT="/healthz"
HEALTH_PORT="8081"
MAX_HEALTH_RETRIES=30
HEALTH_RETRY_INTERVAL=2

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $*"; }
log_ok()   { echo -e "${GREEN}[OK]${NC}   $*"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_err()  { echo -e "${RED}[ERR]${NC}  $*" >&2; }

usage() {
    cat <<EOF
Toolbox Production Rollback Script

Usage:
  $(basename "$0") [VERSION] [OPTIONS]

Arguments:
  VERSION              Target version tag to rollback to (e.g., v1.2.3)
                       If omitted, rolls back to the previous version.

Options:
  --list               List available version tags
  --dry-run            Show what would happen without executing
  --force              Skip confirmation prompts
  --help               Show this help

Examples:
  $(basename "$0")                 # Rollback to previous version
  $(basename "$0") v1.2.3          # Rollback to specific version
  $(basename "$0") --list          # List available versions
  $(basename "$0") --dry-run       # Preview rollback
EOF
}

# Parse arguments
TARGET_VERSION=""
LIST_VERSIONS=false
DRY_RUN=false
FORCE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --list)
            LIST_VERSIONS=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        --help|-h)
            usage
            exit 0
            ;;
        -*)
            log_err "Unknown option: $1"
            usage
            exit 1
            ;;
        *)
            if [[ -z "$TARGET_VERSION" ]]; then
                TARGET_VERSION="$1"
            else
                log_err "Too many arguments"
                usage
                exit 1
            fi
            shift
            ;;
    esac
done

# Change to project directory
cd "$PROJECT_DIR"

# Check docker-compose file exists
if [[ ! -f "$COMPOSE_FILE" ]]; then
    log_err "docker-compose.yml not found at $COMPOSE_FILE"
    exit 1
fi

# Get current running version
get_current_version() {
    local container_id
    container_id=$(docker compose -p "$COMPOSE_PROJECT_NAME" -f "$COMPOSE_FILE" ps -q "$SERVICE_NAME" 2>/dev/null | head -1)
    if [[ -n "$container_id" ]]; then
        docker inspect "$container_id" --format '{{ index .Config.Labels "org.opencontainers.image.version" }}' 2>/dev/null || echo "unknown"
    else
        echo "none"
    fi
}

# Get available versions from local images
get_available_versions() {
    docker images --format '{{.Repository}}:{{.Tag}}' | grep "^toolbox:" | sed 's/^toolbox://' | grep -v "^<none>$" | sort -Vr
}

# Get previous version (second in list)
get_previous_version() {
    local versions
    versions=($(get_available_versions))
    if [[ ${#versions[@]} -ge 2 ]]; then
        echo "${versions[1]}"
    else
        echo ""
    fi
}

# Health check function
wait_for_health() {
    local version=$1
    local retries=0
    local url="http://127.0.0.1:${HEALTH_PORT}${HEALTH_ENDPOINT}"

    log_info "Waiting for health check on $url (expecting version $version)..."

    while [[ $retries -lt $MAX_HEALTH_RETRIES ]]; do
        if response=$(curl -fsS --max-time 3 "$url" 2>/dev/null); then
            if [[ "$response" == "ok v${version}"* ]]; then
                log_ok "Health check passed: $response"
                return 0
            else
                log_warn "Health check returned unexpected version: $response (expected v$version)"
            fi
        fi
        retries=$((retries + 1))
        sleep "$HEALTH_RETRY_INTERVAL"
    done

    log_err "Health check failed after $MAX_HEALTH_RETRIES attempts"
    return 1
}

# Execute docker compose command
docker_compose() {
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY-RUN] docker compose -p $COMPOSE_PROJECT_NAME -f $COMPOSE_FILE $*"
    else {
        docker compose -p "$COMPOSE_PROJECT_NAME" -f "$COMPOSE_FILE" "$@"
    }; fi
}

# List available versions
if [[ "$LIST_VERSIONS" == "true" ]]; then
    echo "Available versions:"
    get_available_versions | while read -r ver; do
        current=$(get_current_version)
        if [[ "$ver" == "$current" ]]; then
            echo "  * $ver (current)"
        else
            echo "    $ver"
        fi
    done
    exit 0
fi

# Determine target version
if [[ -z "$TARGET_VERSION" ]]; then
    TARGET_VERSION=$(get_previous_version)
    if [[ -z "$TARGET_VERSION" ]]; then
        log_err "No previous version available for rollback"
        exit 1
    fi
    log_info "No version specified, using previous version: $TARGET_VERSION"
fi

# Validate target version exists
if ! get_available_versions | grep -q "^${TARGET_VERSION}$"; then
    log_err "Version '$TARGET_VERSION' not found in local images"
    log_info "Available versions:"
    get_available_versions | sed 's/^/  /'
    exit 1
fi

# Get current version
CURRENT_VERSION=$(get_current_version)

if [[ "$CURRENT_VERSION" == "$TARGET_VERSION" ]]; then
    log_warn "Already running version $TARGET_VERSION"
    exit 0
fi

# Confirm rollback
if [[ "$FORCE" != "true" && "$DRY_RUN" != "true" ]]; then
    echo
    log_warn "About to rollback from $CURRENT_VERSION to $TARGET_VERSION"
    read -rp "Continue? [y/N] " -n 1
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Rollback cancelled"
        exit 0
    fi
fi

# Perform rollback
log_info "Starting rollback: $CURRENT_VERSION -> $TARGET_VERSION"

# Tag current image as backup (if not dry run)
if [[ "$DRY_RUN" != "true" && "$CURRENT_VERSION" != "none" && "$CURRENT_VERSION" != "unknown" ]]; then
    BACKUP_TAG="toolbox:rollback-backup-$(date +%Y%m%d-%H%M%S)"
    log_info "Tagging current image as backup: $BACKUP_TAG"
    docker tag "toolbox:${CURRENT_VERSION}" "$BACKUP_TAG" 2>/dev/null || log_warn "Could not tag backup image"
fi

# Update the image tag in docker-compose by setting VERSION env var
# The docker-compose.yml uses ${VERSION:-latest} for the image tag
export VERSION="$TARGET_VERSION"

log_info "Pulling/building target version..."
docker_compose pull "$SERVICE_NAME" 2>/dev/null || true

log_info "Stopping current service..."
docker_compose stop "$SERVICE_NAME"

log_info "Removing old container..."
docker_compose rm -f "$SERVICE_NAME"

log_info "Starting service with version $TARGET_VERSION..."
docker_compose up -d --no-deps "$SERVICE_NAME"

# Wait for health check
if [[ "$DRY_RUN" != "true" ]]; then
    if wait_for_health "$TARGET_VERSION"; then
        log_ok "Rollback successful! Now running version $TARGET_VERSION"
        log_info "Service URL: http://localhost:${HEALTH_PORT}/"
    else
        log_err "Rollback failed - health check did not pass"
        log_info "Attempting to rollback to previous version ($CURRENT_VERSION)..."
        
        # Emergency rollback
        export VERSION="$CURRENT_VERSION"
        docker_compose stop "$SERVICE_NAME"
        docker_compose rm -f "$SERVICE_NAME"
        docker_compose up -d --no-deps "$SERVICE_NAME"
        
        if wait_for_health "$CURRENT_VERSION"; then
            log_warn "Emergency rollback to $CURRENT_VERSION succeeded"
        else
            log_err "Emergency rollback also failed! Manual intervention required."
            exit 1
        fi
        exit 1
    fi
else
    log_info "[DRY-RUN] Would wait for health check on version $TARGET_VERSION"
fi

# Show final status
if [[ "$DRY_RUN" != "true" ]]; then
    echo
    log_info "Rollback complete. Current status:"
    docker_compose ps "$SERVICE_NAME"
    echo
    log_info "To verify: curl http://localhost:${HEALTH_PORT}${HEALTH_ENDPOINT}"
    log_info "To view logs: docker compose -p $COMPOSE_PROJECT_NAME -f $COMPOSE_FILE logs -f $SERVICE_NAME"
fi