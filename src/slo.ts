import Octokit, {AnyResponse} from '@octokit/rest';
import {Issue, IssueResult, LanguageResult, Repo, RepoResult} from './types';

const repos: Repo[] = require('../../repos.json').repos;
const token = process.env.SLOTH_GITHUB_TOKEN;
if (!token) {
  throw new Error('Please set the `SLOTH_GITHUB_TOKEN` environment variable.');
}

const octo = new Octokit();
octo.authenticate({token, type: 'token'});

export function getRepoResults(repos: IssueResult[]) {
  const results = new Array<RepoResult>();
  const totals = {p0: 0, p1: 0, p2: 0, pX: 0, outOfSLO: 0};
  repos.forEach(repo => {
    const counts =
        {p0: 0, p1: 0, p2: 0, pX: 0, outOfSLO: 0, repo: repo.repo.repo};
    repo.issues.forEach(i => {
      if (hasLabel(i, 'priority: p0')) {
        counts.p0++;
        totals.p0++;
      } else if (hasLabel(i, 'priority: p1')) {
        counts.p1++;
        totals.p1++;
      } else if (hasLabel(i, 'priority: p2')) {
        counts.p2++;
        totals.p2++;
      } else {
        counts.pX++;
        totals.pX++;
      }
      if (isOutOfSLO(i)) {
        counts.outOfSLO++;
        totals.outOfSLO++;
      }
    });
    results.push(counts);
  });
  return {repos: results, totals};
}

export function getLanguageResults(repos: IssueResult[]) {
  const results = new Map<string, LanguageResult>();
  const issues = new Array<Issue>();
  repos.forEach(r => {
    r.issues.forEach(i => {
      i.language = r.repo.language;
      issues.push(i);
    });
  });
  const languages = ['go', 'nodejs', 'ruby', 'python', 'php', 'dotnet', 'java'];
  languages.forEach(l => {
    results.set(l, {p0: 0, p1: 0, p2: 0, pX: 0, outOfSLO: 0, language: l});
  });
  issues.forEach(i => {
    const counts = results.get(i.language)!;
    if (hasLabel(i, 'priority: p0')) {
      counts.p0++;
    } else if (hasLabel(i, 'priority: p1')) {
      counts.p1++;
    } else if (hasLabel(i, 'priority: p2')) {
      counts.p2++;
    } else {
      counts.pX++;
    }
    if (isOutOfSLO(i)) {
      counts.outOfSLO++;
    }
  });
  return results;
}

function hasLabel(issue: Issue, label: string) {
  return issue.labels
             .filter(x => {
               return (x.name === label);
             })
             .length > 0;
}

function daysOld(date: string) {
  return (Date.now() - (new Date(date)).getTime()) / 1000 / 60 / 60 / 24;
}


/**
 * For a given issue, figure out if it's out of SLO.
 * @param i Issue to analyze
 */
function isOutOfSLO(i: Issue) {
  const d = new Date();
  const hasType = i.labels.filter(x => x.name.startsWith('type:')).length > 0;
  const isBug = hasLabel(i, 'type: bug');
  const isP0 = hasLabel(i, 'priority: p0');
  const isP1 = hasLabel(i, 'priority: p1');
  const isP2 = hasLabel(i, 'priority: p2');
  const hasPri = isP0 || isP1 || isP2;

  // If it has a priority, make sure it's in SLO
  if (isP0) {
    if (daysOld(i.created_at) > 5 || daysOld(i.updated_at) > 1) {
      return true;
    }
  } else if (isP1) {
    if (daysOld(i.created_at) > 42 || daysOld(i.updated_at) > 5) {
      return true;
    }
  } else if (isP2) {
    if (daysOld(i.created_at) > 180) {
      return true;
    }
  }

  // If it's a bug, make sure there's a priority
  if (isBug && !hasPri) {
    return true;
  }

  // otherwise, check if it's less than 5 days old
  if (daysOld(i.created_at) > 5) {
    return true;
  }

  // It's all good then!
  return false;
}

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
      result.issues.push(r);
    }
    console.log(res.meta.link);
    i++;
  } while (res.meta.link && res.meta.link.indexOf('rel="last"') > -1);
  return result;
}
