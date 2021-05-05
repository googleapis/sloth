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
import * as nock from 'nock';
import * as policy from '../src/policy';

nock.disableNetConnect();

describe('policy', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  it('should fetch repo metadata', async () => {
    const repo = 'googleapis/repo1';
    const data = {test: 'data'};
    const scope = nock('https://api.github.com')
      .get(`/repos/${repo}`)
      .reply(200, data);
    const res = await policy.getRepo(repo);
    assert.deepStrictEqual(res, data);
    scope.done();
  });
});
