#!/usr/bin/env node
import Table = require('cli-table');
import meow = require('meow');
import {getRepoResults, getLanguageResults} from './slo';
import {getIssues, showIssues, tagIssues} from './issue';
import {reconcileLabels} from './label';
import {reconcileUsers, reconcileTeams, reconcileRepos} from './users';
import {syncRepoSettings} from './repos';
import updateNotifier from 'update-notifier';

const pkg = require('../../package.json');

updateNotifier({pkg}).notify();

const cli = meow(
    `
	Usage
	  $ sloth

	Options
    --csv Encode the data in CSV format

	Examples
    $ sloth [--csv]
    $ sloth issues [--csv][--untriaged][--outOfSLO][--language][--repository][--api][--pr]
    $ sloth tag-issues
    $ sloth users
    $ sloth repos
    $ sloth labels
    $ sloth sync-repo-settings

`,
    {
      flags: {
        untriaged: {type: 'boolean'},
        language: {type: 'string', alias: 'l'},
        repo: {type: 'string', alias: 'r'},
        outOfSLO: {type: 'boolean'},
        csv: {type: 'boolean'},
        api: {type: 'string'},
        pr: {type: 'boolean'}
      }
    });

async function getOutput() {
  const output = new Array<string>();
  const issues = await getIssues();

  // Show repo based statistics
  const {repos, totals} = getRepoResults(issues);

  let table: Table;
  const head = ['Repo', 'Total', 'P0', 'P1', 'P2', 'Untriaged', 'Out of SLO'];
  if (cli.flags.csv) {
    output.push(head.join(','));
  } else {
    table = new Table({head});
  }

  repos.forEach(repo => {
    const values = [
      `${repo.repo}`, repo.total, repo.p0, repo.p1, repo.p2, repo.pX,
      repo.outOfSLO
    ];
    if (cli.flags.csv) {
      output.push(values.join(','));
    } else {
      table.push(values);
    }
  });

  const values = [
    `TOTALS`, totals.total, totals.p0, totals.p1, totals.p2, totals.pX,
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

  // Show language based statistics
  const res = getLanguageResults(issues);
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

  return output;
}

async function main() {
  const out = await getOutput();
  out.forEach(l => console.log(l));
}

if (cli.input.indexOf('labels') > -1) {
  reconcileLabels().catch(console.error);
} else if (cli.input.indexOf('sync-repo-settings') > -1) {
  syncRepoSettings().catch(console.error);
} else if (cli.input.indexOf('tag-issues') > -1) {
  tagIssues().catch(console.error);
} else if (cli.input.indexOf('users') > -1) {
  reconcileUsers().catch(console.error);
} else if (cli.input.indexOf('issues') > -1) {
  showIssues({
    csv: cli.flags.csv,
    language: cli.flags.language,
    outOfSLO: cli.flags.outOfSlo,
    untriaged: cli.flags.untriaged,
    repository: cli.flags.repo,
    api: cli.flags.api,
    pr: cli.flags.pr
  });
} else if (cli.input.indexOf('repos') > -1) {
  reconcileRepos().catch(console.error);
} else if (cli.input.indexOf('teams') > -1) {
  reconcileTeams().catch(console.error);
} else {
  main().catch(console.error);
}
