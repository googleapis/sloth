import Octokit from '@octokit/rest';

import {Issue, RepoResult} from './types';

export async function getIssueData() {
  const repos = await getIssues();
  const results = new Array<RepoResult>();
  repos.forEach(repo => {
    const counts = {p0: 0, p1: 0, p2: 0, pX: 0, outOfSLO: 0, repo: repo.repo};
    repo.issues.forEach(i => {
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
    results.push(counts);
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

async function getIssues() {
  const repos: string[] = require('../../repos.json').repos;
  const octo = new Octokit();
  octo.authenticate({token: require('../../keys.json').token, type: 'token'});
  const promises = repos.map(repo => {
    const [owner, name] = repo.split('/');
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
