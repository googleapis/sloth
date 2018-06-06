import Octokit from '@octokit/rest';
import {Issue, IssueResult, LanguageResult, Repo, RepoResult} from './types';
import {octo, repos} from './util';
import Table = require('cli-table');
import {isTriaged, isOutOfSLO} from './slo';

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
  // tslint:disable-next-line no-any
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

export interface IssueOptions {
  csv?: boolean;
  untriaged?: boolean;
  outOfSLO?: boolean;
  repository?: string;
  language?: string;
}

export async function showIssues(options: IssueOptions) {
  const repos = await getIssues();
  const issues = new Array<Issue>();
  repos.forEach(r => {
    const includeL = !options.language ||
        (options.language &&
         options.language.toLowerCase() === r.repo.language.toLowerCase());
    const includeR = !options.repository ||
        (options.repository &&
         options.repository.toLowerCase() === r.repo.repo.toLowerCase());
    if (includeL && includeR) {
      r.issues.forEach(i => {
        i.isTriaged = isTriaged(i);
        i.isOutOfSLO = isOutOfSLO(i);
        i.repo = r.repo.repo;
        if (options.untriaged || options.outOfSLO) {
          if ((options.untriaged && !i.isTriaged) ||
              (options.outOfSLO && i.isOutOfSLO)) {
            issues.push(i);
          }
        } else {
          issues.push(i);
        }
      });
    }
  });
  let table: Table;
  const output = new Array<string>();
  const head = ['Issue#', 'Triaged', 'OOSLO', 'Title'];
  if (options.csv) {
    output.push(head.join(','));
  } else {
    table = new Table({head, colWidths: [50, 10, 10, 80]});
  }

  issues.forEach(issue => {
    const values = [
      `${issue.repo}#${issue.number}`, issue.isTriaged, issue.isOutOfSLO,
      issue.title
    ];
    if (options.csv) {
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
