import {getIssues} from './issue';
import {Issue, IssueResult, LanguageResult, RepoResult} from './types';
import {languages} from './util';

export function getRepoResults(repos: IssueResult[]) {
  const results = new Array<RepoResult>();
  const totals = {total: 0, p0: 0, p1: 0, p2: 0, pX: 0, outOfSLO: 0};
  repos.forEach(repo => {
    const counts = {
      total: 0,
      p0: 0,
      p1: 0,
      p2: 0,
      pX: 0,
      outOfSLO: 0,
      repo: repo.repo.repo
    };
    repo.issues.forEach(i => {
      counts.total++;
      totals.total++;

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
    results.set(
        l, {total: 0, p0: 0, p1: 0, p2: 0, pX: 0, outOfSLO: 0, language: l});
  });
  issues.forEach(i => {
    const counts = results.get(i.language)!;
    counts.total++;
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

export function isPullRequest(i: Issue) {
  return !!i.pull_request;
}

export function isApi(i: Issue, api: string) {
  for (const label of i.labels) {
    if (label.name.toLowerCase() === `api: ${api.toLowerCase()}`) {
      return true;
    }
  }
  // In node.js, we have separate repos for each API. We aren't looking for
  // a label, we're looking for a repo name.
  if (i.repo.indexOf('nodejs-') > -1) {
    const label = i.repo.split('-')[1];
    if (api.toLowerCase() === label.toLowerCase()) {
      return true;
    }
  }
  return false;
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
export function isTriaged(i: Issue) {
  if (isPullRequest(i)) {
    return true;
  }

  if (hasPriority(i)) {
    if (isP0(i) || isP1(i)) {
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
export function hasLabel(issue: Issue, label: string) {
  return issue.labels.filter(x => x.name.toLowerCase().indexOf(label) > -1)
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
 * Determine how many hours old an issue is
 * @param date Date to compare
 */
export function hoursOld(date: string) {
  return (Date.now() - (new Date(date)).getTime()) / 1000 / 60 / 60;
}

/**
 * For a given issue, figure out if it's out of SLO.
 * @param i Issue to analyze
 */
export function isOutOfSLO(i: Issue) {
  const d = new Date();

  // Pull requests don't count.
  if (isPullRequest(i)) {
    return false;
  }

  // All P0 issues must receive a reply within 1 day, an update at least daily,
  // and be resolved within 5 days.
  if (isP0(i)) {
    if (daysOld(i.created_at) > 5 || daysOld(i.updated_at) > 1) {
      return true;
    }
  }

  // All P1 issues must receive a reply within 5 days, an update at least every
  // 5 days thereafter, and be resolved within 42 days (six weeks).
  if (isP1(i)) {
    if (daysOld(i.created_at) > 42 || daysOld(i.updated_at) > 5) {
      return true;
    }
  }

  // All P2 issues must receive a reply within 5 days, and be resolved within
  // 180 days. In practice, we use fix-it weeks to burn down the P2 backlog.
  if (isP2(i)) {
    if (daysOld(i.created_at) > 180) {
      return true;
    }
  }

  // All questions must receive a reply within 5 days.
  if (hasLabel(i, 'type: question')) {
    if (!i.updated_at && daysOld(i.created_at) > 5) {
      return true;
    }
  }

  // All feature requests must receive a reply within 5 days, and be resolved
  // within 180 days. In this context, resolution may (and often will) entail
  // simply relocating the feature request elsewhere.
  if (hasLabel(i, 'type: feature')) {
    if (!i.updated_at && daysOld(i.created_at) > 5) {
      return true;
    }
    // We decided in a team meeting to drop this requirement.
    // if (daysOld(i.created_at) > 180) {
    //   return true;
    // }
  }

  // Make sure if it hasn't been triaged, it's less than 5 days old
  if (!isTriaged(i) && daysOld(i.created_at) > 5) {
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
      issues.push(i);
    });
  });
  console.log(`Issues: ${issues.length}`);
  // const issues: Issue[] = [].concat.apply([], repos);
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
    });
    // const outOfSLO = outOfSLOIssues.filter(x => x.language === l);
    // console.log(`Out of SLO [${l}]: ${outOfSLO.length}`);
  });
}
