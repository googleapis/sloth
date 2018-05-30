import {Issue, IssueResult, LanguageResult, RepoResult} from './types';

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
