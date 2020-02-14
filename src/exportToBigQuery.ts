// Copyright 2020 Google LLC
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

import {BigQuery} from '@google-cloud/bigquery';
import meow = require('meow');
import { getIssues } from './issue';
import { Issue } from './types';

const cli = meow(
  `
	Usage
	  $ build/src/exportToBigQuery

  Options
    --datasetId   DataSetId to use in BigQuery
    --tableId     TableId to use in BigQuery
    --projectId   ProjectId to use in BigQuery

	Examples
    $ build/src/exportToBigQuery --datasetId mydata --tableId records --projectId el-gato
`,
  {
    flags: {
      datasetId: {type: 'string'},
      tableId: {type: 'string'},
      projectId: {type: 'string'}
    },
  }
);

if (!cli.flags.datasetId) {
  throw new Error('datasetId is required');
}
if (!cli.flags.tableId) {
  throw new Error('tableId is required');
}
if (!cli.flags.projectId) {
  throw new Error('projectId is required');
}

export async function main(
  datasetId: string, 
  tableId: string,
  projectId: string
): Promise<void> {
  const repos = await getIssues();
  const issues = new Array<Issue>();
  repos.forEach(r => {
    r.issues.forEach(i => {
      i.createdAt = BigQuery.datetime(i.createdAt) as {} as string;
      // tslint: disable-next-line no-any
      (i as any).recordDate = BigQuery.date((new Date()).toISOString().slice(0,10));
      issues.push(i);
    });
  });
  const bigquery = new BigQuery({
    projectId: projectId
  });
  const result = await bigquery
    .dataset(datasetId)
    .table(tableId)
    .insert(issues);
  console.log(result);
}

main(cli.flags.datasetId, cli.flags.tableId, cli.flags.projectId).catch(err => {
  console.error(err);
  if (err.errors) {
    for(const e of err.errors) {
      console.error(e);
    }
  }
  process.exit(-1);
});
