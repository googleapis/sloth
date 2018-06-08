import Octokit from '@octokit/rest';
import {Issue, IssueResult, LanguageResult, Repo, RepoResult} from './types';
import {octo, repos} from './util';
import Table = require('cli-table');
import {isTriaged, isOutOfSLO, hasLabel} from './slo';
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

export async function tagIssues() {
  const promises = new Array<Promise<void|Octokit.AnyResponse>>();
  const repos = await getIssues();
  repos.forEach(r => {
    r.issues.forEach(i => {
      const [owner, name] = r.repo.repo.split('/');
      i.isTriaged = isTriaged(i);
      i.isOutOfSLO = isOutOfSLO(i);
      i.repo = name;
      i.owner = owner;
      if (!i.isTriaged && !hasLabel(i, 'triage me')) {
        console.error(`Tagging ${i.repo}#${i.number} with 'triage me'`);
        promises.push(tagIssue(i, 'triage me'));
      } else if (i.isTriaged && hasLabel(i, 'triage me')) {
        console.error(`Un-Tagging ${i.repo}#${i.number} with 'triage me'`);
        promises.push(untagIssue(i, 'triage me'));
      }
      if (i.isOutOfSLO && !hasLabel(i, ':rotating_light:')) {
        console.error(`Tagging ${i.repo}#${i.number} with '🚨'`);
        promises.push(tagIssue(i, ':rotating_light:'));
      } else if (!i.isOutOfSLO && hasLabel(i, ':rotating_light:')) {
        console.error(`Un-tagging ${i.repo}#${i.number} with '🚨'`);
        promises.push(untagIssue(i, ':rotating_light:'));
      }
    });
  });
  await Promise.all(promises);
}

function tagIssue(i: Issue, label: string): Promise<void|Octokit.AnyResponse> {
  return octo.issues
      .addLabels(
          {labels: [label], number: i.number, owner: i.owner, repo: i.repo})
      .catch(e => {
        console.error(`Error tagging ${i.repo}#${i.number} with '${label}'`);
        console.error(e);
      });
}

function untagIssue(
    i: Issue, label: string): Promise<void|Octokit.AnyResponse> {
  return octo.issues
      .removeLabel(
          {name: label, number: i.number, owner: i.owner, repo: i.repo})
      .catch(e => {
        console.error(`Error un-tagging ${i.repo}#${i.number} with '${label}'`);
        console.error(e);
      });
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
  const head = ['Issue#', 'Triaged', 'In SLO', 'Title'];
  if (options.csv) {
    output.push(head.join(','));
  } else {
    table = new Table({head});
  }

  issues.forEach(issue => {
    const values = [
      `${issue.repo}#${issue.number}`,
      options.csv ? issue.isTriaged : (issue.isTriaged ? '🦖' : '🚨'),
      options.csv ? !issue.isOutOfSLO : (!issue.isOutOfSLO ? '🦖' : '🚨'),
      truncate(issue.title, 75)
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
