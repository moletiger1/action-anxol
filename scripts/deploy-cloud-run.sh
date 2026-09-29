#!/usr/bin/env bash
set -euo pipefail

# Use a dedicated gcloud configuration; never deploy to the user's unrelated default project.
cd "$(dirname "$0")/.."
gcloud --configuration=action-anxol run deploy shudan-sosho-demo \
  --project=action-anxol-com \
  --region=asia-northeast1 \
  --source=web \
  --build-service-account=projects/action-anxol-com/serviceAccounts/shudan-build@action-anxol-com.iam.gserviceaccount.com \
  --service-account=shudan-web@action-anxol-com.iam.gserviceaccount.com \
  --allow-unauthenticated \
  --min=0 --max=2 \
  --cpu=1 --memory=512Mi --concurrency=40 \
  --port=8080 \
  --set-env-vars=NEXT_TELEMETRY_DISABLED=1,BASIC_AUTH_USERNAME=reviewer \
  --update-secrets=BASIC_AUTH_PASSWORD=shudan-basic-auth-password:1 \
  --quiet
