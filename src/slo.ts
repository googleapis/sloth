import Octokit from '@octokit/rest';

import {Issue, IssueResult, LanguageResult, Repo, RepoResult} from './types';

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
        totals.p0++;
      } else if (hasLabel(i, 'priority: p2')) {
        counts.p2++;
        totals.p2++;
      } else {
        counts.pX++;
        totals.p2++;
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

function isOutOfSLO(i: Issue) {
  const d = new Date();
  if (hasLabel(i, 'priority: p0')) {
    if (daysOld(i.created_at) > 5 || daysOld(i.updated_at) > 1) {
      return true;
    }
  } else if (hasLabel(i, 'priority: p1')) {
    if (daysOld(i.created_at) > 42 || daysOld(i.updated_at) > 5) {
      return true;
    }
  } else if (hasLabel(i, 'priority: p2')) {
    if (daysOld(i.created_at) > 180) {
      return true;
    }
  } else {
    if (daysOld(i.created_at) > 5) {
      return true;
    }
  }
  return false;
}

export async function getIssues(): Promise<IssueResult[]> {
  const token = process.env.SLOTH_GITHUB_TOKEN;
  if (!token) {
    throw new Error(
        'Please set the `SLOTH_GITHUB_TOKEN` environment variable.');
  }
  const repos: Repo[] = require('../../repos.json').repos;
  const octo = new Octokit();
  octo.authenticate({token, type: 'token'});
  const promises = repos.map(repo => {
    const [owner, name] = repo.repo.split('/');
    return octo.issues
        .getForRepo({owner, repo: name, state: 'open', per_page: 100})
        .then(
            r => {
              return {repo, issues: r.data as Issue[]};
            },
            (err: Error) => {
              console.error(`Error fetching issues for ${repo}.`);
              console.error(err);
              throw err;
            });
  });
  return await Promise.all(promises);
}
