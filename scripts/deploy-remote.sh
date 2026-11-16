#!/usr/bin/env bash
#
# Runs ON the Lightsail instance. The GitHub Action pipes it over SSH:
#
#   ssh ubuntu@host "IMAGE=ghcr.io/owner/repo TAG=abc123 bash -s" < scripts/deploy-remote.sh
#
# It is safe to run by hand on the instance too — with no arguments it deploys
# the current `latest`.
set -euo pipefail

IMAGE="${IMAGE:-ghcr.io/souravinsights/blobbies-api}"
TAG="${TAG:-latest}"
CONTAINER="${CONTAINER:-blobbies-api}"
PORT="${PORT:-3000}"
# Bound to localhost: nginx owns the public port and terminates TLS. Set
# BIND=0.0.0.0 to expose the container directly instead.
BIND="${BIND:-127.0.0.1}"
WORKERS="${WORKERS:-2}"

# A fresh instance may not have the user in the docker group yet.
DOCKER="docker"
if ! docker info >/dev/null 2>&1; then
  if sudo -n docker info >/dev/null 2>&1; then
    DOCKER="sudo docker"
  else
    echo "Docker is not installed, or this user cannot use it." >&2
    echo "Run scripts/setup-instance.sh on this machine first." >&2
    exit 1
  fi
fi

echo "==> Pulling $IMAGE:$TAG"
if ! $DOCKER pull "$IMAGE:$TAG"; then
  echo >&2
  echo "Pull failed. On the first deploy the image is usually still private." >&2
  echo "Make it public: github.com -> your profile -> Packages -> blobbies-api" >&2
  echo "-> Package settings -> Change visibility -> Public." >&2
  exit 1
fi

# Replace rather than restart, so the container always runs the new tag.
echo "==> Restarting $CONTAINER"
$DOCKER stop "$CONTAINER" >/dev/null 2>&1 || true
$DOCKER rm "$CONTAINER" >/dev/null 2>&1 || true

$DOCKER run -d \
  --name "$CONTAINER" \
  --restart unless-stopped \
  -p "$BIND:$PORT:3000" \
  -e NODE_ENV=production \
  -e LOGGER=1 \
  -e WORKERS="$WORKERS" \
  -e NODE_OPTIONS=--max-old-space-size=384 \
  "$IMAGE:$TAG"

echo "==> Waiting for it to answer"
for _ in $(seq 1 20); do
  if curl -fsS "http://127.0.0.1:$PORT/health" >/dev/null 2>&1; then
    echo "==> Healthy. Deployed $IMAGE:$TAG"
    $DOCKER image prune -f >/dev/null 2>&1 || true
    exit 0
  fi
  sleep 2
done

echo "==> The container never became healthy." >&2
$DOCKER logs --tail 40 "$CONTAINER" >&2 || true
exit 1
