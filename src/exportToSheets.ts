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

import {google} from 'googleapis';
import {getIssues} from './issue';
import {Issue} from './types';
const spreadsheetId = '1VV5Clqstgoeu1qVwpbKkYOxwEgjvhMhSkVCBLMqg24M';

/**
 * List all open issues, and synchronize them to a known Google Sheet.
 */
export async function exportToSheets() {
  const repos = await getIssues();
  const issues: Array<Issue> = [];
  repos.forEach(r => {
    r.issues.forEach(i => issues.push(i));
  });
  const values = issues.map(i => {
    return [
      i.repo,
      i.language,
      i.types ? i.types.join(', ') : '',
      i.api,
      i.isOutOfSLO,
      i.isTriaged,
      i.pri,
      i.isPR,
      i.number,
      i.createdAt,
      i.title,
      i.url,
      i.labels ? i.labels.join(', ') : '',
      i.team,
      i.assignees ? i.assignees.join(', ') : '',
    ];
  });
  values.unshift([
    'Repo',
    'Language',
    'Types',
    'API',
    'OutOfSLO',
    'Triaged',
    'Priority',
    'PR',
    'Number',
    'Created At',
    'Title',
    'Url',
    'Labels',
    'Team',
    'Asignee',
  ]);

  const auth = await google.auth.getClient({
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({
    version: 'v4',
    auth,
  });
  // clear the current text in the sheet
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: 'A1:Z10000',
  });

  // insert it into the sheet
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: [
        {
          range: 'A1',
          values,
        },
      ],
    },
  });
}
