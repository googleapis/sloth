import {Issue} from './types';
import * as Octokit from '@octokit/rest';
import Table = require('cli-table');

async function main() {
  const table = new Table({
    head: ['Repo', 'P0', 'P1', 'P2', 'Untriaged', 'Out of SLO'],
  });
  const repos = await getIssues();
  repos.forEach(repo => {
    const counts = { p0: 0, p1: 0, p2: 0, pX: 0, isOutOfSLO: 0};
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
      if(isOutOfSLO(i)) {
        counts.isOutOfSLO++;
      }
    });
    table.push([`${repo.repo}`, counts.p0, counts.p1, counts.p2, counts.pX, counts.isOutOfSLO]);
  });
  console.log(table.toString());
}

function hasLabel(issue: Issue, label: string) {
  return issue.labels.filter(x => {
    return (x.name === label);
  }).length > 0;
}

function daysOld(date: string) {
  return (Date.now() - (new Date(date)).getTime())/1000/60/60/24;
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
  octo.authenticate({
    token: require('../../keys.json').token,
    type:  'token'
  });
  const promises = repos.map(repo => {
    console.log(`Fetching ${repo}...`);
    const [owner, name] = repo.split('/');
    return octo.issues.getForRepo({
      owner: owner,
      repo: name,
      state: 'open',
      per_page: 100
    }).then(r => {
      return {
        repo,
        issues: r.data as Issue[]
      }
    }, err => {
      console.error(`Error fetching issues for ${repo}.`);
      console.error(err);
      throw err;
    });
  });
  return await Promise.all(promises);
}

main().catch(console.error);
