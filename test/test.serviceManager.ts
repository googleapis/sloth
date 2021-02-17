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
import {describe, it} from 'mocha';
import {getAllServiceNames, getServiceConfig} from '../src/fetchServices'

describe('Service Manager', function() {
  describe('getAllServiceNames()', function() {
    it('returns an object with >300 elements, and including: `storage.googleapis.com`', async function() {
      const serviceNames = await getAllServiceNames();
      assert.strictEqual(serviceNames.length > 300, true);
      assert.strictEqual(serviceNames.includes('storage.googleapis.com'), true);
      assert.strictEqual(serviceNames.includes('assuredworkloads.googleapis.com'), true);
    });
  });

  describe('getServiceConfig()', function() {
    it('returns a service config', async function() {
      const config = await getServiceConfig('storage.googleapis.com');
      assert.strictEqual('apis' in config, true);
      assert.strictEqual(config.usage.requirements.includes('serviceusage.googleapis.com/tos/cloud'), true);
    });
  });

});