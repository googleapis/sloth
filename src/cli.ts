#!/usr/bin/env node
import Table = require('cli-table');
import meow = require('meow');
import {getRepoResults, getLanguageResults, sendMail} from './slo';
import {getIssues} from './issue';
import {reconcileLabels} from './label';
import mail from '@sendgrid/mail';
import {reconcileUsers, reconcileTeams, reconcileRepos} from './users';

const cli = meow(
    `
	Usage
	  $ sloth

	Options
	  --mail Send a mail with the contents

	Examples
    $ sloth
    $ sloth users
    $ sloth repos
    $ sloth labels
    $ sloth --mail
    $ sloth --csv

`,
    {flags: {mail: {type: 'boolean'}, csv: {type: 'boolean'}}});

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
    const values =
        [`${repo.repo}`, repo.total, repo.p0, repo.p1, repo.p2, repo.pX, repo.outOfSLO];
    if (cli.flags.csv) {
      output.push(values.join(','));
    } else {
      table.push(values);
    }
  });

  const values =
      [`TOTALS`, totals.total, totals.p0, totals.p1, totals.p2, totals.pX, totals.outOfSLO];
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
      ['Language', 'P0', 'P1', 'P2', 'Untriaged', 'Out of SLO'];
  let t2: Table;
  if (cli.flags.csv) {
    output.push('\n');
    output.push(languageHeader.join(','));
  } else {
    t2 = new Table({head: languageHeader});
  }

  res.forEach(x => {
    const values = [`${x.language}`, x.p0, x.p1, x.p2, x.pX, x.outOfSLO];
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

async function sendmail() {
  const out = await getOutput();
  mail.setApiKey(process.env.SENDGRID_KEY!);
  const msg = {
    to: 'beckwith@google.com',
    from: 'node-team@google.com',
    subject: 'Your daily SLO report',
    text: out.join('<br>'),
  };
  await mail.send(msg);
}

async function main() {
  const out = await getOutput();
  out.forEach(l => console.log(l));
}

if (cli.input.indexOf('labels') > -1) {
  reconcileLabels().catch(console.error);
} else if (cli.input.indexOf('users') > -1) {
  reconcileUsers().catch(console.error);
} else if (cli.input.indexOf('repos') > -1) {
  reconcileRepos().catch(console.error);
} else if (cli.input.indexOf('teams') > -1) {
  reconcileTeams().catch(console.error);
} else if (cli.input.indexOf('mail') > -1) {
  sendMail().catch(console.error);
} else {
  if (cli.flags.mail) {
    sendmail().catch(console.error);
  } else {
    main().catch(console.error);
  }
}
