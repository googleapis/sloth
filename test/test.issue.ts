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

import * as issue from '../src/issue';

const reposFixture = JSON.parse(
  fs.readFileSync('./test/fixtures/repoList.json', 'utf8')
);

nock.disableNetConnect();

describe('issues', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  it('should skip archived repos', async () => {
    const scope = nock('https://api.github.com')
      .get('/orgs/googleapis/repos?type=public&page=1&per_page=100')
      .reply(200, reposFixture);
    const repos = await issue.getRepos();
    // repo2 in the fixtures is archived - make sure it isn't there
    const archivedRepos = repos.filter(x => x.repo === 'googleapis/repo2');
    assert.strictEqual(archivedRepos.length, 0);
    scope.done();
  });

  it('should skip experimental repos', async () => {
    // The repos are cached the first time, so nocking is not required.
    const repos = await issue.getRepos();
    // repo3 in the fixtures has an `experimental` tag
    const experimentalRepos = repos.filter(x => x.repo === 'googleapis/repo3');
    assert.strictEqual(experimentalRepos.length, 0);
  });

  it('should mark JavaScript as nodejs', async () => {
    const repos = await issue.getRepos();
    const repo = repos.find(x => x.repo === 'googleapis/repo4')!;
    assert.strictEqual(repo.language, 'nodejs');
  });

  it('should mark TypeScript as nodejs', async () => {
    const repos = await issue.getRepos();
    const repo = repos.find(x => x.repo === 'googleapis/repo5')!;
    assert.strictEqual(repo.language, 'nodejs');
  });

  it('should mark C# as dotnet', async () => {
    const repos = await issue.getRepos();
    const repo = repos.find(x => x.repo === 'googleapis/repo6')!;
    assert.strictEqual(repo.language, 'dotnet');
  });

  it('should mark C++ as cpp', async () => {
    const repos = await issue.getRepos();
    const repo = repos.find(x => x.repo === 'googleapis/repo7')!;
    assert.strictEqual(repo.language, 'cpp');
  });
});
