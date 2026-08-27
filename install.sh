#!/usr/bin/env bash
set -euo pipefail

readonly NEXTPRESS_RAW_BASE="${NEXTPRESS_RAW_BASE:-https://raw.githubusercontent.com/nextpress-ai/nextpress/main}"
readonly NEXTPRESS_BIN_PATH="${NEXTPRESS_BIN_PATH:-/usr/local/bin/nextpress}"
readonly NEXTPRESS_COMMAND_URL="${NEXTPRESS_COMMAND_URL:-$NEXTPRESS_RAW_BASE/scripts/nextpress}"

info() {
	printf '%s\n' "==> $*"
}

fail() {
	printf '%s\n' "Error: $*" >&2
	exit 1
}

command_exists() {
	command -v "$1" >/dev/null 2>&1
}

require_sudo() {
	if [ "$(id -u)" -eq 0 ]; then
		return
	fi

	if ! command_exists sudo; then
		fail "This step needs root permissions. Re-run as root or install sudo."
	fi

	if sudo -n true >/dev/null 2>&1; then
		return
	fi

	if [ -r /dev/tty ] && sudo -v </dev/tty; then
		return
	fi

	fail "Root permissions are required. Re-run as root, or run: curl -fsSL https://raw.githubusercontent.com/nextpress-ai/nextpress/main/install.sh | sudo bash"
}

as_root() {
	if [ "$(id -u)" -eq 0 ]; then
		"$@"
		return
	fi

	require_sudo
	sudo "$@"
}

can_write_directory() {
	local dir="$1"
	mkdir -p "$dir" >/dev/null 2>&1 && [ -w "$dir" ]
}

assert_linux() {
	if [ "$(uname -s)" != "Linux" ]; then
		fail "NextPress installer currently supports Linux servers only."
	fi
}

docker_compose_available() {
	if docker info >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
		return 0
	fi

	if [ "$(id -u)" -ne 0 ] && command_exists sudo && sudo docker info >/dev/null 2>&1 && sudo docker compose version >/dev/null 2>&1; then
		return 0
	fi

	return 1
}

install_docker_if_missing() {
	if docker_compose_available; then
		info "Docker Compose v2 is available."
		return
	fi

	if [ "${NEXTPRESS_SKIP_DOCKER_INSTALL:-}" = "1" ]; then
		fail "Docker Compose v2 is missing. Install Docker Engine + Compose plugin, then re-run this installer."
	fi

	info "Docker Compose v2 is missing; installing Docker Engine with the official Docker installer."
	curl -fsSL https://get.docker.com -o /tmp/nextpress-get-docker.sh
	as_root sh /tmp/nextpress-get-docker.sh
	rm -f /tmp/nextpress-get-docker.sh

	if ! docker_compose_available; then
		fail "Docker installed, but 'docker compose version' still failed. Open a new shell or check Docker permissions."
	fi
}

install_nextpress_command() {
	local bin_dir
	local tmp_file
	bin_dir="$(dirname "$NEXTPRESS_BIN_PATH")"
	tmp_file="$(mktemp)"

	info "Downloading nextpress command from GitHub."
	curl -fsSL "$NEXTPRESS_COMMAND_URL" -o "$tmp_file"
	chmod +x "$tmp_file"

	info "Installing nextpress command to $NEXTPRESS_BIN_PATH."
	if [ "$(id -u)" -eq 0 ] || can_write_directory "$bin_dir"; then
		mkdir -p "$bin_dir"
		install -m 0755 "$tmp_file" "$NEXTPRESS_BIN_PATH"
	else
		as_root mkdir -p "$bin_dir"
		as_root install -m 0755 "$tmp_file" "$NEXTPRESS_BIN_PATH"
	fi
	rm -f "$tmp_file"
}

verify_nextpress_command() {
	if ! "$NEXTPRESS_BIN_PATH" --version >/dev/null 2>&1; then
		fail "Installed command did not pass version verification: $NEXTPRESS_BIN_PATH --version"
	fi

	info "Installed $("$NEXTPRESS_BIN_PATH" --version)."
}

run_nextpress_install() {
	local install_dir
	install_dir="$(resolve_requested_install_dir "$@")"

	info "Starting NextPress install."
	if [ "$install_dir" = "/opt/nextpress" ]; then
		as_root "$NEXTPRESS_BIN_PATH" install "$@"
		return
	fi

	if [ "$(id -u)" -eq 0 ] || can_write_install_dir "$install_dir"; then
		"$NEXTPRESS_BIN_PATH" install "$@"
		return
	fi

	as_root "$NEXTPRESS_BIN_PATH" install "$@"
}

resolve_requested_install_dir() {
	local install_dir="${NEXTPRESS_INSTALL_DIR:-/opt/nextpress}"

	while [ "$#" -gt 0 ]; do
		case "$1" in
			-d|--install-dir)
				if [ "${2:-}" != "" ]; then
					install_dir="$2"
					shift 2
					continue
				fi
				;;
		esac
		shift
	done

	case "$install_dir" in
		/*) printf '%s\n' "$install_dir" ;;
		*) printf '%s\n' "$(pwd)/$install_dir" ;;
	esac
}

can_write_install_dir() {
	local dir="$1"
	local probe="$dir"

	if [ -d "$dir" ]; then
		[ -w "$dir" ] && can_write_existing_install_files "$dir"
		return
	fi

	while [ "$probe" != "/" ] && [ ! -d "$probe" ]; do
		probe="$(dirname "$probe")"
	done

	[ -d "$probe" ] && [ -w "$probe" ]
}

can_write_existing_install_files() {
	local dir="$1"
	local caddy_dir="$dir/caddy_config"
	local file

	for file in "$dir/docker-compose.prod.yml" "$dir/.env" "$caddy_dir/Caddyfile"; do
		if [ -e "$file" ] && [ ! -w "$file" ]; then
			return 1
		fi
	done

	if [ -d "$caddy_dir" ] && [ ! -w "$caddy_dir" ]; then
		return 1
	fi

	return 0
}

main() {
	assert_linux

	if ! command_exists curl; then
		fail "curl is required to install NextPress."
	fi

	install_docker_if_missing
	install_nextpress_command
	verify_nextpress_command
	run_nextpress_install "$@"

	printf '\n'
	printf '%s\n' "NextPress is installed and the nextpress command is ready."
	printf '%s\n' "Useful commands:"
	printf '%s\n' "  nextpress help"
	printf '%s\n' "  nextpress status"
	printf '%s\n' "  nextpress logs"
}

main "$@"
