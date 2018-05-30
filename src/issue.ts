import Octokit from '@octokit/rest';
import {Issue, IssueResult, LanguageResult, Repo, RepoResult} from './types';
import {octo, repos} from './util';

export async function getIssues(): Promise<IssueResult[]> {
  const promises = new Array<Promise<IssueResult>>();
  repos.forEach(repo => {
    promises.push(getRepoIssues(repo));
  });
  return Promise.all(promises);
}

async function getRepoIssues(repo: Repo): Promise<IssueResult> {
  const [owner, name] = repo.repo.split('/');
  const result = {issues: new Array<Issue>(), repo};
  let res: Octokit.AnyResponse;
  let i = 1;
  do {
    try {
      res = await octo.issues.getForRepo(
          {owner, repo: name, state: 'open', per_page: 100, page: i});
    } catch (e) {
      console.error(`Error fetching issues for ${repo.repo}.`);
      console.error(e);
      throw e;
    }
    for (const r of res.data) {
      r.language = repo.language;
      result.issues.push(r);
    }
    i++;
  } while (res.meta.link && res.meta.link.indexOf('rel="last"') > -1);
  return result;
}
