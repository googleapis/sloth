import Octokit from '@octokit/rest';
import {Issue, IssueResult, LanguageResult, Repo, RepoResult} from './types';
import {octo, repos} from './util';
import Table = require('cli-table');
const truncate = require('truncate');

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
  let res: any;
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

export async function showIssues(csv: boolean) {
  const repos = await getIssues();
  const issues = new Array<Issue>();
  repos.forEach(r => {
    r.issues.forEach(i => {
      i.repo = r.repo.repo;
      issues.push(i)
    });
  });
  let table: Table;
  const output = new Array<string>();
  const head = ['Repo', '#', 'Title'];
  if (csv) {
    output.push(head.join(','));
  } else {
    table = new Table({
      head,
      colWidths: [45, 5, 100]
    });
  }

  issues.forEach(issue => {
    const values = [`${issue.repo}`, issue.number, issue.title];
    if (csv) {
      output.push(values.join(','));
    } else {
      table.push(values);
    }
  });

  if (table!) {
    output.push(table!.toString());
  }

  output.forEach(l => console.log(l));
}
