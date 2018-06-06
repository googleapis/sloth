import Octokit, { ReposEditParams } from '@octokit/rest';
import {octo, repos} from './util';

export async function syncRepoSettings() {
  const ps = repos.map(repo => {
    const [owner, name] = repo.repo.split('/');
    return octo.repos.edit({
      name,
      repo: name,
      owner,
      allow_merge_commit: false,
      allow_rebase_merge: false,
      allow_squash_merge: true
    } as ReposEditParams).catch(e => {
      console.error(`Error changing repo settings on ${repo.repo}`);
      console.error(e);
    });
  });
  await Promise.all(ps);
}
