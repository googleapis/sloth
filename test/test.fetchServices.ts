// Copyright 2021 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import * as assert from 'assert';
import {describe, it, afterEach} from 'mocha';
import * as fs from 'fs';
import * as nock from 'nock';

// This must be set before `issue` is imported
process.env.GITHUB_TOKEN = 'not-a-token';
process.env.DRIFT_API_KEY = 'not-a-key';

import * as fetchServices from '../src/fetchServices';

const serviceConfigs = JSON.parse(
  fs.readFileSync('./test/fixtures/serviceConfigList.json', 'utf8')
);

nock.disableNetConnect();

describe('services', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  it('should identify services with no APIs', async () => {
    const scope = fetchServices.getApiClientScope(serviceConfigs[1]);
    assert.strictEqual(scope[1], false);
  });

  it('should default to config file override', async () => {
    const scope = fetchServices.getApiClientScope(serviceConfigs[2]);
    assert.strictEqual(scope[0], "Not Cloud (Firebase)");
  })

});
