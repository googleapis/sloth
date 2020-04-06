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
import {
  ApiResult,
  Flags,
  Issue,
  IssueResult,
  LanguageResult,
  RepoResult,
} from './types';
import {languages} from './util';

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
      language: repo.repo.language,
    };
    repo.issues.forEach(i => {
      if (i.isPR) {
        return;
      }
      counts.total++;
      totals.total++;

      if (i.pri === 0) {
        counts.p0++;
        totals.p0++;
      } else if (i.pri === 1) {
        counts.p1++;
        totals.p1++;
      } else if (i.pri === 2) {
        counts.p2++;
        totals.p2++;
      }

      if (!i.isTriaged) {
        counts.pX++;
        totals.pX++;
      }

      if (i.isOutOfSLO) {
        counts.outOfSLO++;
        totals.outOfSLO++;
      }
    });
    results.push(counts);
  });
  return {repos: results, totals};
}

function getLanguageResults(repos: IssueResult[]) {
  const results = new Map<string, LanguageResult>();
  const issues = new Array<Issue>();
  repos.forEach(r => {
    r.issues.forEach(i => {
      i.language = r.repo.language;
      if (i.isPR) {
        return;
      }
      issues.push(i);
    });
  });
  languages.forEach(l => {
    results.set(l, {
      total: 0,
      p0: 0,
      p1: 0,
      p2: 0,
      pX: 0,
      outOfSLO: 0,
      language: l,
    });
  });
  issues.forEach(i => {
    const counts = results.get(i.language)!;
    counts.total++;
    if (i.pri === 0) {
      counts.p0++;
    } else if (i.pri === 1) {
      counts.p1++;
    } else if (i.pri === 2) {
      counts.p2++;
    }

    if (!i.isTriaged) {
      counts.pX++;
    }

    if (i.isOutOfSLO) {
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
      if (i.isPR) {
        return;
      }
      if (api && i.api !== api) {
        return;
      }
      if (i.api) {
        const apiSet = apis.get(i.api);
        if (apiSet) {
          apiSet.push(i);
        } else {
          apis.set(i.api, [i]);
        }
      }
    });
  });

  apis.forEach((issues, api) => {
    results.set(api, {
      total: 0,
      p0: 0,
      p1: 0,
      p2: 0,
      pX: 0,
      outOfSLO: 0,
      api,
    });
    issues.forEach(i => {
      const counts = results.get(api)!;
      counts.total++;
      if (i.pri === 0) {
        counts.p0++;
      } else if (i.pri === 1) {
        counts.p1++;
      } else if (i.pri === 2) {
        counts.p2++;
      }
      if (!i.isTriaged) {
        counts.pX++;
      }
      if (i.isOutOfSLO) {
        counts.outOfSLO++;
      }
    });
  });
  const sortedResults = new Map([...results.entries()].sort());
  return sortedResults;
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
  const untriagedIssues = issues.filter(x => !x.isTriaged);
  const outOfSLOIssues = issues.filter(x => x.isOutOfSLO);
  console.log(`Untriaged: ${untriagedIssues.length}`);
  console.log(`Out of SLO: ${outOfSLOIssues.length}`);

  console.log('repo,issue,title');
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function showApiSLOs(cli: meow.Result<any>) {
  const output = new Array<string>();
  const issues = await getIssues();
  const apiResults = getApiResults(issues, cli.flags.api as string);
  const apiHeader = [
    'Api',
    'Total',
    'P0',
    'P1',
    'P2',
    'Untriaged',
    'Out of SLO',
  ];
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function showLanguageSLOs(cli: meow.Result<any>) {
  const output = new Array<string>();
  const issues = await getIssues((cli.flags as unknown) as Flags);
  const res = getLanguageResults(issues);
  const languageHeader = [
    'Language',
    'Total',
    'P0',
    'P1',
    'P2',
    'Untriaged',
    'Out of SLO',
  ];
  let t2: Table;
  if (cli.flags.csv) {
    output.push('\n');
    output.push(languageHeader.join(','));
  } else {
    t2 = new Table({head: languageHeader});
  }

  res.forEach(x => {
    const values = [
      `${x.language}`,
      x.total,
      x.p0,
      x.p1,
      x.p2,
      x.pX,
      x.outOfSLO,
    ];
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function showSLOs(cli: meow.Result<any>) {
  const output = new Array<string>();
  const issues = await getIssues();

  if (!cli.flags.api) {
    // Show repo based statistics
    const {repos, totals} = getRepoResults(issues);

    let table: Table;
    const head = [
      'Repo',
      'Language',
      'Total',
      'P0',
      'P1',
      'P2',
      'Untriaged',
      'Out of SLO',
    ];
    if (cli.flags.csv) {
      output.push(head.join(','));
    } else {
      table = new Table({head});
    }

    repos.forEach(repo => {
      const values = [
        `${repo.repo}`,
        `${repo.language}`,
        repo.total,
        repo.p0,
        repo.p1,
        repo.p2,
        repo.pX,
        repo.outOfSLO,
      ];
      if (cli.flags.csv) {
        output.push(values.join(','));
      } else {
        table.push(values);
      }
    });

    const values = [
      'TOTALS',
      '-',
      totals.total,
      totals.p0,
      totals.p1,
      totals.p2,
      totals.pX,
      totals.outOfSLO,
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
