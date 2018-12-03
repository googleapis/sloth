// Copyright 2018 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {getIssues} from './issue';
import {ApiResult, Flags, Issue, IssueResult, LanguageResult, RepoResult} from './types';
import {labels, languages} from './util';

import Table = require('cli-table');
import * as meow from 'meow';

function getRepoResults(repos: IssueResult[]) {
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
      repo: repo.repo.repo,
      language: repo.repo.language
    };
    repo.issues.forEach(i => {
      if (isPullRequest(i)) {
        return;
      }
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

function getLanguageResults(repos: IssueResult[], api?: string) {
  const results = new Map<string, LanguageResult>();
  const issues = new Array<Issue>();
  repos.forEach(r => {
    r.issues.forEach(i => {
      i.language = r.repo.language;
      if (isPullRequest(i)) {
        return;
      }
      if (api && !isApi(i, api)) {
        return;
      }
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


function getApiResults(repos: IssueResult[], api?: string) {
  const results = new Map<string, ApiResult>();
  const apis = new Map<string, Issue[]>();
  repos.forEach(r => {
    r.issues.forEach(i => {
      if (isPullRequest(i)) {
        return;
      }
      if (api && !isApi(i, api)) {
        return;
      }
      const apiLabel = getApi(i);
      i.api = apiLabel;
      if (apiLabel) {
        const apiSet = apis.get(apiLabel);
        if (apiSet) {
          apiSet.push(i);
        } else {
          apis.set(apiLabel, [i]);
        }
      }
    });
  });

  apis.forEach((issues, api) => {
    results.set(api, {total: 0, p0: 0, p1: 0, p2: 0, pX: 0, outOfSLO: 0, api});
    issues.forEach(i => {
      const counts = results.get(api)!;
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
  });
  const sortedResults = new Map([...results.entries()].sort());
  return sortedResults;
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
  const label = getApi(i);
  return (label === api);
}

export function getPri(i: Issue) {
  if (isP0(i)) {
    return 'P0';
  } else if (isP1(i)) {
    return 'P1';
  } else if (isP2(i)) {
    return 'P2';
  } else {
    return '';
  }
}

export function getApi(i: Issue) {
  for (const label of i.labels) {
    const name = label.name.toLowerCase();
    if (name.startsWith('api: ')) {
      return name.slice(5);
    }
  }

  // In node.js, we have separate repos for each API. We aren't looking for
  // a label, we're looking for a repo name.
  const repoName =
      i.repo.startsWith('googleapis/') ? i.repo.split('/')[1] : i.repo;
  if (repoName.startsWith('nodejs-')) {
    return i.repo.split('-')[1];
  }
  return undefined;
}

export function getTypes(i: Issue) {
  const types = new Array<string>();
  for (const label of i.labels) {
    const name = label.name.toLowerCase();
    if (name.startsWith('type: ')) {
      types.push(name.slice(6));
    }
  }
  return types;
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

  if (hasLabel(i, 'status: investigating')) {
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

export async function showApiSLOs(cli: meow.Result) {
  const output = new Array<string>();
  const issues = await getIssues();
  const apiResults = getApiResults(issues, cli.flags.api);
  const apiHeader =
      ['Api', 'Total', 'P0', 'P1', 'P2', 'Untriaged', 'Out of SLO'];
  let t3: Table;
  if (cli.flags.csv) {
    output.push('\n');
    output.push(apiHeader.join(','));
  } else {
    t3 = new Table({head: apiHeader});
  }
  apiResults.forEach(x => {
    const values = [`${x.api}`, x.total, x.p0, x.p1, x.p2, x.pX, x.outOfSLO];
    if (cli.flags.csv) {
      output.push(values.join(','));
    } else {
      t3.push(values);
    }
  });
  if (t3!) {
    output.push(t3!.toString());
  }
  output.forEach(l => console.log(l));
}

export async function showLanguageSLOs(cli: meow.Result) {
  const output = new Array<string>();
  const issues = await getIssues(cli.flags as Flags);
  const res = getLanguageResults(issues, cli.flags.api);
  const languageHeader =
      ['Language', 'Total', 'P0', 'P1', 'P2', 'Untriaged', 'Out of SLO'];
  let t2: Table;
  if (cli.flags.csv) {
    output.push('\n');
    output.push(languageHeader.join(','));
  } else {
    t2 = new Table({head: languageHeader});
  }

  res.forEach(x => {
    const values =
        [`${x.language}`, x.total, x.p0, x.p1, x.p2, x.pX, x.outOfSLO];
    if (cli.flags.csv) {
      output.push(values.join(','));
    } else {
      t2.push(values);
    }
  });
  if (t2!) {
    output.push(t2!.toString());
  }
  output.forEach(l => console.log(l));
}

export async function showSLOs(cli: meow.Result) {
  const output = new Array<string>();
  const issues = await getIssues();

  if (!cli.flags.api) {
    // Show repo based statistics
    const {repos, totals} = getRepoResults(issues);

    let table: Table;
    const head = [
      'Repo', 'Language', 'Total', 'P0', 'P1', 'P2', 'Untriaged', 'Out of SLO'
    ];
    if (cli.flags.csv) {
      output.push(head.join(','));
    } else {
      table = new Table({head});
    }

    repos.forEach(repo => {
      const values = [
        `${repo.repo}`, `${repo.language}`, repo.total, repo.p0, repo.p1,
        repo.p2, repo.pX, repo.outOfSLO
      ];
      if (cli.flags.csv) {
        output.push(values.join(','));
      } else {
        table.push(values);
      }
    });

    const values = [
      `TOTALS`, `-`, totals.total, totals.p0, totals.p1, totals.p2, totals.pX,
      totals.outOfSLO
    ];
    if (cli.flags.csv) {
      output.push(values.join(','));
    } else {
      table!.push(values);
    }

    if (table!) {
      output.push(table!.toString());
    }
  }
  output.forEach(l => console.log(l));
}
