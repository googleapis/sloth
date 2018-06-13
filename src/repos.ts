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

  console.log('Updating master branch protection...');
  const ps2 = repos.map(repo => {
    const [owner, name] = repo.repo.split('/');
    // return octo.repos.updateBranchProtection({
    //   branch: "master",
    //   owner,
    //   repo: name,
    //   required_pull_request_reviews: true,
    //   enforce_admins: false
    // });
  });
  await Promise.all(ps2);
}
