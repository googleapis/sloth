#!/usr/bin/env node
import Table = require('cli-table');
import meow = require('meow');
import {getIssues, getRepoResults, getLanguageResults} from './slo';

const cli = meow(
    `
	Usage
	  $ sloth <input>

	Options
	  --language, -l  Filter for a specific language

	Examples
	  $ sloth --language nodejs
`,
    {flags: {language: {type: 'string', alias: 'l'}}});

async function main() {
  const issues = await getIssues();

  // Show repo based statistics
  const {repos, totals} = getRepoResults(issues);
  const table = new Table({
    head: ['Repo', 'P0', 'P1', 'P2', 'Untriaged', 'Out of SLO'],
  });
  repos.forEach(repo => {
    table.push(
        [`${repo.repo}`, repo.p0, repo.p1, repo.p2, repo.pX, repo.outOfSLO]);
  });
  table.push(
      [`TOTALS`, totals.p0, totals.p1, totals.p2, totals.pX, totals.outOfSLO]);
  console.log(table.toString());

  // Show language based statistics
  const res = getLanguageResults(issues);
  const t2 = new Table({
    head: ['Language', 'P0', 'P1', 'P2', 'Untriaged', 'Out of SLO'],
  });
  res.forEach(x => {
    t2.push(
      [`${x.language}`, x.p0, x.p1, x.p2, x.pX, x.outOfSLO]);
  })
  console.log(t2.toString());
}

main().catch(console.error);
