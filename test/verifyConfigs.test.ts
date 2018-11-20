import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

const REPOS_JSON = path.join(__dirname, '../../repos.json');
const USERS_JSON = path.join(__dirname, '../../users.json');

describe('Verify config files', () => {
  it('repos.json is valid json', () => {
    const file = fs.readFileSync(REPOS_JSON, 'utf-8');
    assert.doesNotThrow(() => JSON.parse(file));
  });

  it('users.json is valid json', () => {
    const file = fs.readFileSync(USERS_JSON, 'utf-8');
    assert.doesNotThrow(() => JSON.parse(file));
  });

  it('users.json has valid schema', () => {
    // tslint:disable-next-line:no-any
    const assertArrayOfStrings = (array: any) => assert(
        Array.isArray(array) &&
        array.every((elem) => typeof elem === 'string'));

    // tslint:disable-next-line:no-any
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
