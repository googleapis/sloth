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
import * as sinon from 'sinon';
import * as google from '@googleapis/sheets';

// This must be set before `issue` is imported
process.env.GITHUB_TOKEN = 'not-a-token';
process.env.DRIFT_API_KEY = 'not-a-key';

import {exportToSheets, fixtures} from '../src/exportToSheets';
import * as issues from '../src/issue';
import {NUMBER_TO_DELETE} from '../src/util';

nock.disableNetConnect();
const sandbox = sinon.createSandbox();

describe('exportToSheets', () => {
  afterEach(() => {
    nock.cleanAll();
    sandbox.restore();
  });

  it('should export to sheets', async () => {
    const repo = {
      repo: 'googleapis/fake',
      language: 'boopscript',
    };
    const issue = {
      assignees: ['assignee1', 'assignee2'],
      team: 'team1',
      isPR: false,
      api: 'api: fake',
      types: ['fakeType'],
      pri: 0,
      language: 'boopscript',
      repo: 'googleapis/fake',
      owner: 'googleapis',
      name: 'fake title',
      number: 12345,
      createdAt: '2021-02-28T18:06:33.369Z',
      title: 'fake title',
      url: 'https://fake.url',
      labels: [],
      isTriaged: false,
      isOutOfSLO: true,
    };
    const getIssuesStub = sandbox.stub(issues, 'getIssues').resolves([
      {
        repo,
        issues: [issue],
      },
    ]);
    const jwt = new google.auth.JWT();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sandbox.stub(jwt as any, 'getRequestMetadataAsync').resolves({headers: {}});
    sandbox.stub(fixtures, 'getClient').resolves(jwt);
    const sheetPath =
      '/v4/spreadsheets/1VV5Clqstgoeu1qVwpbKkYOxwEgjvhMhSkVCBLMqg24M';

    // The test data has one row plus the file name row.
    const start = 3;
    const end = start + NUMBER_TO_DELETE;
    const scope = nock('https://sheets.googleapis.com')
      .post(`${sheetPath}/values:batchUpdate`)
      .reply(200)
      .post(`${sheetPath}/values/A${start}%3AZ${end}:clear`)
      .reply(200);
    await exportToSheets();
    scope.done();
    assert.ok(getIssuesStub.calledOnce);
  });
});
