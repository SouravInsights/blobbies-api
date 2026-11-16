#!/usr/bin/env bash
#
# Build the image and deploy it to an AWS Lightsail Container Service.
#
# One-time setup (creates the service, ~a minute):
#
#   aws lightsail create-container-service \
#     --service-name blobbies-api --power nano --scale 1 --region us-east-1
#
# Then, for every deploy:
#
#   ./scripts/deploy-lightsail.sh
#
set -euo pipefail

SERVICE="${LIGHTSAIL_SERVICE:-blobbies-api}"
REGION="${AWS_REGION:-us-east-1}"
LABEL="blobbies-api"
PORT="${PORT:-3000}"

command -v aws >/dev/null || { echo "aws CLI not found"; exit 1; }
command -v docker >/dev/null || { echo "docker not found"; exit 1; }
docker info >/dev/null 2>&1 || { echo "docker daemon is not running"; exit 1; }

echo "==> Building $LABEL:latest"
docker build -t "$LABEL:latest" .

echo "==> Pushing to Lightsail service '$SERVICE' in $REGION"
IMAGE=$(aws lightsail push-container-image \
  --region "$REGION" \
  --service-name "$SERVICE" \
  --label "$LABEL" \
  --image "$LABEL:latest" \
  --query 'containerImage.image' \
  --output text)

echo "==> Pushed $IMAGE"

echo "==> Deploying"
DEPLOYMENT=$(mktemp)
trap 'rm -f "$DEPLOYMENT"' EXIT

cat > "$DEPLOYMENT" <<JSON
{
  "containers": {
    "api": {
      "image": "$IMAGE",
      "ports": { "$PORT": "HTTP" },
      "environment": {
        "LOGGER": "1",
        "WORKERS": "2"
      }
    }
  },
  "publicEndpoint": {
    "containerName": "api",
    "containerPort": $PORT,
    "healthCheck": {
      "path": "/health",
      "intervalSeconds": 30,
      "timeoutSeconds": 5,
      "healthyThreshold": 2,
      "unhealthyThreshold": 3,
      "successCodes": "200"
    }
  }
}
JSON

aws lightsail create-container-service-deployment \
  --region "$REGION" \
  --service-name "$SERVICE" \
  --cli-input-json "file://$DEPLOYMENT" \
  --query 'containerService.currentDeployment.state' \
  --output text

echo "==> Done. A deployment takes a couple of minutes to go live."
echo "    Endpoint:"
aws lightsail get-container-services \
  --region "$REGION" \
  --service-name "$SERVICE" \
  --query 'containerServices[0].url' \
  --output text
