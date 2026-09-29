#!/usr/bin/env bash
set -euo pipefail

# Separate authentication state from any future application databases.
gcloud --configuration=action-anxol services enable firestore.googleapis.com \
  --project=action-anxol-com --quiet
databases=$(gcloud --configuration=action-anxol firestore databases list \
  --project=action-anxol-com --format='value(name)' --quiet)
if ! [[ "$databases" == *"projects/action-anxol-com/databases/auth-security"* ]]; then
  gcloud --configuration=action-anxol firestore databases create \
    --project=action-anxol-com --database=auth-security \
    --location=asia-northeast1 --type=firestore-native --delete-protection --quiet
fi
gcloud --configuration=action-anxol projects add-iam-policy-binding action-anxol-com \
  --member=serviceAccount:shudan-web@action-anxol-com.iam.gserviceaccount.com \
  --role=roles/datastore.user \
  --condition='expression=resource.name=="projects/action-anxol-com/databases/auth-security",title=shudan-auth-storage' \
  --quiet --format=none

# A password guess must never let a caller mint a session and bypass the limiter.
session_secret=$(gcloud --configuration=action-anxol secrets list \
  --project=action-anxol-com --filter='name:shudan-basic-auth-session-secret' --format='value(name)' --quiet)
if [[ -z "$session_secret" ]]; then
  python3 -c 'import secrets; print(secrets.token_urlsafe(48), end="")' | \
    gcloud --configuration=action-anxol secrets create shudan-basic-auth-session-secret \
      --project=action-anxol-com --replication-policy=automatic --data-file=- --quiet
fi
gcloud --configuration=action-anxol secrets add-iam-policy-binding shudan-basic-auth-session-secret \
  --project=action-anxol-com \
  --member=serviceAccount:shudan-web@action-anxol-com.iam.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor --quiet --format=none
