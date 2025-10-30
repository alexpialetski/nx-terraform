#!/bin/bash

# Exit if any of the intermediate steps fail
set -e
eval "$(jq -r '@sh "BUCKET_NAME=\(.bucket_name)"')"

if aws s3api head-bucket --bucket "$BUCKET_NAME" >/dev/null 2>&1; then
  echo '{"exists": "true"}'
else
  echo '{"exists": "false"}'
fi
