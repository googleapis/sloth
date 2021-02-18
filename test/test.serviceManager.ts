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
import {
  getAllServiceNames,
  getServiceConfig,
  isCloudApi,
} from '../src/fetchServices';

describe('Service Manager', () => {
  describe('getAllServiceNames()', () => {
    it('returns an object with >300 elements, and including: `storage.googleapis.com`', async () => {
      const serviceNames = await getAllServiceNames();
      assert.strictEqual(serviceNames.length > 300, true);
      assert.strictEqual(serviceNames.includes('storage.googleapis.com'), true);
      assert.strictEqual(
        serviceNames.includes('assuredworkloads.googleapis.com'),
        true
      );
    });
  });

  describe('getServiceConfig()', () => {
    it('returns a service config', async () => {
      const config = await getServiceConfig('storage.googleapis.com');
      assert.strictEqual('apis' in config, true);
      assert.strictEqual(
        config.usage.requirements.includes(
          'serviceusage.googleapis.com/tos/cloud'
        ),
        true
      );
    });
  });

  describe('isCloudApi()', () => {
    it('correctly attributes to Cloud', async () => {
      // Ads: false
      assert.strictEqual(await isCloudApi('adsense.googleapis.com'), false);
      // Workspace: true
      assert.strictEqual(await isCloudApi('drive.googleapis.com'), true);
      // Firebase: false
      assert.strictEqual(await isCloudApi('fcm.googleapis.com'), false);
      // Workspace: true
      assert.strictEqual(await isCloudApi('script.googleapis.com'), true);
      // GCS : true
      assert.strictEqual(await isCloudApi('storage.googleapis.com'), true);
      // YouTube: false
      assert.strictEqual(await isCloudApi('youtube.googleapis.com'), false);
    });
  });
});
