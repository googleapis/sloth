// Copyright 2019 Google LLC
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
import * as fs from 'fs';
import * as path from 'path';

const REPOS_JSON = path.join(__dirname, '../../repos.json');
const USERS_JSON = path.join(__dirname, '../../users.json');

describe('Verify config files', () => {
  describe('repos.json', () => {
    it('is valid json', () => {
      const file = fs.readFileSync(REPOS_JSON, 'utf-8');
      assert.doesNotThrow(() => JSON.parse(file));
    });

    it('has valid schema', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const assertRepo = (entry: any) => {
        assert('string', typeof entry.repo);
        assert('string', typeof entry.language);
      };

      const file = fs.readFileSync(REPOS_JSON, 'utf-8');
      const repos = JSON.parse(file);

      assert('object', repos);
      assert(Array.isArray(repos.repos));

      repos.repos.forEach(assertRepo);
    });
  });

  describe('users.json', () => {
    it('is valid json', () => {
      const file = fs.readFileSync(USERS_JSON, 'utf-8');
      assert.doesNotThrow(() => JSON.parse(file));
    });

    it('has valid schema', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const assertArrayOfStrings = (array: any) =>
        assert(
          Array.isArray(array) && array.every(elem => typeof elem === 'string')
        );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const assertMembership = (membership: any) => {
        assert('string', typeof membership.team);
        assertArrayOfStrings(membership.users);
        assertArrayOfStrings(membership.repos);
      };

      const file = fs.readFileSync(USERS_JSON, 'utf-8');
      const users = JSON.parse(file);

      assert('object', typeof users);

      assertArrayOfStrings(users.orgs);

      assert(Array.isArray(users.membership));
      users.membership.forEach(assertMembership);
    });
  });
});
