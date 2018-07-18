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

import {ReposEditParams} from '@octokit/rest';
import {octo, repos} from './util';

export async function syncRepoSettings() {
  console.log('Updating commit settings...');
  const ps = repos.map(repo => {
    const [owner, name] = repo.repo.split('/');
    return octo.repos
        .edit({
          name,
          repo: name,
          owner,
          allow_merge_commit: false,
          allow_rebase_merge: true,
          allow_squash_merge: true
        } as ReposEditParams)
        .catch(e => {
          console.error(`Error changing repo settings on ${repo.repo}`);
          console.error(e);
        });
  });
  await Promise.all(ps);

  console.log(`Adding kokoro-team user as an admin...`);
  const ps2 = repos.map(repo => {
    const [owner, name] = repo.repo.split('/');
    return octo.repos
        .addCollaborator(
            {owner, permission: 'admin', repo: name, username: 'kokoro-team'})
        .catch(e => {
          console.error(`Error adding kokoro-team to ${repo.repo}`);
          console.error(e);
        });
  });
  await Promise.all(ps2);

  console.log('Updating master branch protection...');
  const ps3 = repos.map(repo => {
    const [owner, name] = repo.repo.split('/');
    // return octo.repos.updateBranchProtection({
    //   branch: "master",
    //   owner,
    //   repo: name,
    //   required_pull_request_reviews: true,
    //   enforce_admins: false,
    //   required_status_checks: {
    //   }
    // });
  });
  await Promise.all(ps3);
}
