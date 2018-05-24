#!/usr/bin/env node
import Table = require('cli-table');
import meow = require('meow');
import {getIssueData} from './slo';

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
  const results = await getIssueData();
  const table = new Table({
    head: ['Repo', 'P0', 'P1', 'P2', 'Untriaged', 'Out of SLO'],
  });
  const totals = {p0: 0, p1: 0, p2: 0, pX: 0, outOfSLO: 0};
  results.forEach(repo => {
    totals.p0 += repo.p0;
    totals.p1 += repo.p1;
    totals.p2 += repo.p2;
    totals.pX += repo.pX;
    totals.outOfSLO += repo.outOfSLO;
    table.push(
        [`${repo.repo}`, repo.p0, repo.p1, repo.p2, repo.pX, repo.outOfSLO]);
  });
  table.push(
      [`TOTALS`, totals.p0, totals.p1, totals.p2, totals.pX, totals.outOfSLO]);
  console.log(table.toString());
}

main().catch(console.error);
