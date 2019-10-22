// Copyright 2018 Google LLC
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

import {ReposUpdateBranchProtectionParamsRequiredStatusChecks} from '@octokit/rest';
import {octo, repos} from './util';

export async function syncRepoSettings() {
  console.log('Updating commit settings...');
  const ps = repos.map(repo => {
    const [owner, name] = repo.repo.split('/');
    return octo.repos
      .update({
        name,
        repo: name,
        owner,
        allow_merge_commit: false,
        allow_rebase_merge: true,
        allow_squash_merge: true,
      })
      .catch(e => {
        console.error(`Error changing repo settings on ${repo.repo}`);
        console.error(e);
      });
  });
  await Promise.all(ps);

  console.log('Updating master branch protection...');

  // The Go repositories are synchronized with a different git
  // repository, so direct commits need to be made.
  const ignoreRepos = [
    'googleapis/google-cloud-go',
    'googleapis/google-api-go-client',
  ];

  const ps3 = repos
    .filter(x => {
      return ignoreRepos.indexOf(x.repo) === -1;
    })
    .map(repo => {
      const [owner, name] = repo.repo.split('/');
      return octo.repos
        .getBranch({branch: 'master', owner, repo: name})
        .then(result => {
          const branch = result.data;
          const statusChecks = {strict: true, contexts: []};
          if (branch.protection && branch.protection.required_status_checks) {
            // tslint:disable-next-line no-any
            (statusChecks as any) = branch.protection.required_status_checks;
            statusChecks.strict = true;
          }
          return octo.repos
            .updateBranchProtection({
              branch: 'master',
              owner,
              repo: name,
              required_pull_request_reviews: {
                dismiss_stale_reviews: false,
                require_code_owner_reviews: false,
              },
              required_status_checks: statusChecks,
              enforce_admins: false,
              restrictions: null!,
            })
            .catch(e => {
              console.error(`Error updating ${repo.repo}`);
              console.error(e);
            });
        });
    });
  await Promise.all(ps3);
}
