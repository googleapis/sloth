#!/bin/bash

# Copyright 2018 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

set -eo pipefail

export SLOTH_GITHUB_TOKEN=$(cat $KOKORO_KEYSTORE_DIR/73713_yoshi-automation-github-key)

export DRIFT_API_KEY=$(cat $KOKORO_KEYSTORE_DIR/73713_sloth_drift_api_key)

npx https://github.com/googleapis/sloth tag-issues
