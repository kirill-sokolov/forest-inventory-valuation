#!/usr/bin/env bash
set -euo pipefail

script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
repo_dir=$(cd "${script_dir}/.." && pwd)
sources_file="${repo_dir}/samples/contracts/SOURCES.md"
destination="${repo_dir}/samples/contracts/third-party"
partial=""

cleanup() {
  if [[ -n "${partial}" && -f "${partial}" ]]; then
    rm -f -- "${partial}"
  fi
}
trap cleanup EXIT INT TERM

if [[ ! -f "${sources_file}" ]]; then
  printf 'Missing source list: %s\n' "${sources_file}" >&2
  exit 1
fi

mkdir -p "${destination}"

fetched=0
skipped=0
while IFS=$'\t' read -r file_name source_url; do
  case "${file_name}" in
    ""|.*|*/*)
      printf 'Invalid sample file name in SOURCES.md: %s\n' "${file_name}" >&2
      exit 1
      ;;
  esac

  target="${destination}/${file_name}"
  if [[ -s "${target}" ]]; then
    printf 'Already present: %s\n' "${file_name}"
    skipped=$((skipped + 1))
    continue
  fi

  printf 'Fetching: %s\n' "${file_name}"
  partial=$(mktemp "${destination}/.${file_name}.XXXXXX")
  curl \
    --fail \
    --location \
    --silent \
    --show-error \
    --retry 2 \
    --connect-timeout 20 \
    --max-time 180 \
    --output "${partial}" \
    "${source_url}"

  if [[ ! -s "${partial}" ]]; then
    printf 'Downloaded file is empty: %s\n' "${file_name}" >&2
    exit 1
  fi
  mv -- "${partial}" "${target}"
  partial=""
  fetched=$((fetched + 1))
done < <(
  awk -F '|' '
    {
      name = $2
      url = $4
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", name)
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", url)
      if (url ~ /^https?:\/\//) print name "\t" url
    }
  ' "${sources_file}"
)

printf 'Contract samples ready: %d fetched, %d already present.\n' "${fetched}" "${skipped}"
