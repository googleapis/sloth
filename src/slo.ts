import {Issue, IssueResult, LanguageResult, RepoResult} from './types';
import {languages} from './util';
import { getIssues } from './issue';

export function getRepoResults(repos: IssueResult[]) {
  const results = new Array<RepoResult>();
  const totals = {p0: 0, p1: 0, p2: 0, pX: 0, outOfSLO: 0};
  repos.forEach(repo => {
    const counts =
        {p0: 0, p1: 0, p2: 0, pX: 0, outOfSLO: 0, repo: repo.repo.repo};
    repo.issues.forEach(i => {
      if (isP0(i)) {
        counts.p0++;
        totals.p0++;
      } else if (isP1(i)) {
        counts.p1++;
        totals.p1++;
      } else if (isP2(i)) {
        counts.p2++;
        totals.p2++;
      }

      if (!isTriaged(i)) {
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
  languages.forEach(l => {
    results.set(l, {p0: 0, p1: 0, p2: 0, pX: 0, outOfSLO: 0, language: l});
  });
  issues.forEach(i => {
    const counts = results.get(i.language)!;
    if (isP0(i)) {
      counts.p0++;
    } else if (isP1(i)) {
      counts.p1++;
    } else if (isP2(i)) {
      counts.p2++;
    }

    if (!isTriaged(i)) {
      counts.pX++;
    }

    if (isOutOfSLO(i)) {
      counts.outOfSLO++;
    }
  });
  return results;
}

/**
 * Determine if an issue has a `priority: ` label.
 * @param i Issue to analyze
 */
function hasPriority(i: Issue) {
  return hasLabel(i, 'priority: ');
}

/**
 * Determine if an issue has a `type: ` label.
 * @param i Issue to analyze
 */
function hasType(i: Issue) {
  return hasLabel(i, 'type: ');
}

/**
 * Determine if an issue has a `type: bug` label.
 * @param i Issue to analyze
 */
function isBug(i: Issue) {
  return hasLabel(i, 'type: bug');
}

function isP0(i: Issue) {
  return hasLabel(i, 'priority: p0');
}

function isP1(i: Issue) {
  return hasLabel(i, 'priority: p1');
}

function isP2(i: Issue) {
  return hasLabel(i, 'priority: p2');
}

function isAssigned(i: Issue) {
  return (i.assignee && i.assignee.length > 0) || i.assignees.length > 0;
}

function isPullRequest(i: Issue) {
  return !!i.pull_request;
}

/**
 * Determine if an issue has been triaged. An issue is triaged if:
 * - It has a `priority` label OR
 * - It has a `type` label
 * - For `type: bug`, there must be a `priority` label
 * - For a P0 or P1 issue, it must have an asignee
 * - Pull requests don't count.
 * @param i Issue to analyze
 */
function isTriaged(i: Issue) {

  if (isPullRequest(i)) {
    return true;
  }

  if (hasPriority(i)) {
    if(isP0(i) || isP1(i)) {
      return isAssigned(i);
    }
    return true;
  }

  if (hasType(i)) {
    if (isBug(i)) {
      return hasPriority(i);
    }
    return true;
  }

  return false;
}

/**
 * Check if there is a label that matches the given text.
 * @param issue Issue to analyze
 * @param label Label text to look for
 */
function hasLabel(issue: Issue, label: string) {
  return issue.labels
             .filter(x => x.name.toLowerCase().indexOf(label) > -1)
             .length > 0;
}

/**
 * Determine how many days old an issue is
 * @param date Date to compare
 */
function daysOld(date: string) {
  return (Date.now() - (new Date(date)).getTime()) / 1000 / 60 / 60 / 24;
}

/**
 * For a given issue, figure out if it's out of SLO.
 * @param i Issue to analyze
 */
function isOutOfSLO(i: Issue) {
  const d = new Date();

  // If it has a priority, make sure it's in SLO
  if (isP0(i)) {
    if (daysOld(i.created_at) > 5 || daysOld(i.updated_at) > 1) {
      return true;
    }
  } else if (isP1(i)) {
    if (daysOld(i.created_at) > 42 || daysOld(i.updated_at) > 5) {
      return true;
    }
  } else if (isP2(i)) {
    if (daysOld(i.created_at) > 180) {
      return true;
    }
  }

  // If it's a bug, make sure there's a priority
  if (isBug(i) && !hasPriority(i)) {
    return true;
  }

  // If it's a feature request, make sure it's not too old
  if (hasLabel(i, 'type: feature')) {
    if (daysOld(i.created_at) > 180) {
      return true;
    }
  }

  // otherwise, check if it's less than 5 days old
  if (daysOld(i.created_at) > 5) {
    return true;
  }

  // It's all good then!
  return false;
}

export async function sendMail() {
  const repos = await getIssues();
  const issues = new Array<Issue>();
  repos.forEach(r => {
    r.issues.forEach(i => {
      i.repo = r.repo.repo;
      issues.push(i)
    });
  });
  console.log(`Issues: ${issues.length}`);
  //const issues: Issue[] = [].concat.apply([], repos);
  const untriagedIssues = issues.filter(x => !isTriaged(x));
  const outOfSLOIssues = issues.filter(isOutOfSLO);
  console.log(`Untriaged: ${untriagedIssues.length}`);
  console.log(`Out of SLO: ${outOfSLOIssues.length}`);

  console.log(`repo,issue,title`);
  languages.forEach(l => {
    const untriaged = untriagedIssues.filter(x => x.language === l);
    console.log(`\n\n###\t${l}###`);
    console.log(`Untriaged: ${untriaged.length}`);
    untriaged.forEach(x => {
      console.log(`${x.repo},${x.number},${x.title}`);
    })
    // const outOfSLO = outOfSLOIssues.filter(x => x.language === l);
    // console.log(`Out of SLO [${l}]: ${outOfSLO.length}`);
  });
}
