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

import * as express from 'express';
import {exportToSheets} from './exportToSheets';
import {exportApisToSheets} from './fetchServices';
import {exportToBigQuery} from './exportToBigQuery';

// This simple server exposes endpoints that are used with Cloud Scheduler
// to perform regular sync to a sheet that powers go/yoshi-live.

const app = express();
const port = process.env.PORT || 8080;

app.post('/exportToSheets', async (req, res) => {
  await exportToSheets();
  res.sendStatus(202);
});

app.post('/exportApisToSheets', async (req, res) => {
  try {
    await exportApisToSheets();
    res.sendStatus(202);
  } catch (e) {
    console.error(e);
    res.sendStatus(500);
  }
});

app.post('/exportToBigQuery', async (req, res) => {
  try {
    const datasetId = 'yoshi_github_slo';
    const tableId = 'issues_raw';
    const projectId = 'yoshi-status';
    await exportToBigQuery(datasetId, tableId, projectId);
    res.sendStatus(202);
  } catch (e) {
    console.error(e);
    res.sendStatus(500);
  }
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
