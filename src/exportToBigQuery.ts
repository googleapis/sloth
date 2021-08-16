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
import {getIssues} from './issue';
import {Issue} from './types';

export async function exportToBigQuery(
  datasetId: string,
  tableId: string,
  projectId: string
): Promise<void> {
  const repos = await getIssues();
  const issues = new Array<Issue>();
  repos.forEach(r => {
    r.issues.forEach(i => {
      i.createdAt = BigQuery.datetime(i.createdAt) as {} as string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (i as any).recordDate = BigQuery.date(
        new Date().toISOString().slice(0, 10)
      );
      issues.push(i);
    });
  });
  const bigquery = new BigQuery({
    projectId,
  });
  const result = await bigquery
    .dataset(datasetId)
    .table(tableId)
    .insert(issues);
  console.log(result);
}

if (module === require.main) {
  const args = process.argv.slice(2);
  if (args.length !== 3) {
    throw new Error(
      'Usage: node exportToBigQuery.js <datasetId> <tableId> <projectId>'
    );
  }
  exportToBigQuery(args[0], args[1], args[2]).catch(err => {
    console.error(err);
    if (err.errors) {
      for (const e of err.errors) {
        console.error(e);
      }
    }
  });
}
