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

/**
 * Determine if an issue has been triaged. An issue is triaged if:
 * - It has a `priority` label OR
 * - It has a `type` label
 * - For `type: bug`, there must be a `priority` label
 * @param i Issue to analyze
 */
function isTriaged(i: Issue) {
  if (isBug(i)) {
    return hasPriority(i);
  }
  if (hasPriority(i)) {
    return true;
  }
  if (hasType(i)) {
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

export async function sendMail() {
  const repos = await getIssues();
  const issues = new Array<Issue>();
  repos.forEach(r => {
    r.issues.forEach(i => {
      issues.push(i)
    });
  });
  console.log(`Issues: ${issues.length}`);
  //const issues: Issue[] = [].concat.apply([], repos);
  const untriagedIssues = issues.filter(x => !isTriaged(x));
  const outOfSLOIssues = issues.filter(isOutOfSLO);
  console.log(`Untriaged: ${untriagedIssues.length}`);
  console.log(`Out of SLO: ${outOfSLOIssues.length}`);

  languages.forEach(l => {
    const untriaged = untriagedIssues.filter(x => x.language === l);
    console.log(`Untriaged [${l}]: ${untriaged.length}`);

    const outOfSLO = outOfSLOIssues.filter(x => x.language === l);
    console.log(`Out of SLO [${l}]: ${outOfSLO.length}`);
  });
}
