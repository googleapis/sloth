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

import * as Octokit from '@octokit/rest';

import {Label} from './types';
import {labels, octo, repos} from './util';

export async function reconcileLabels() {
  const promises = new Array<Promise<Octokit.AnyResponse | void>>();
  repos.forEach(async r => {
    const [owner, repo] = r.repo.split('/');
    const res = await octo.issues.listLabelsForRepo({
      owner,
      repo,
      per_page: 100,
    });
    const oldLabels = res.data as Label[];
    labels.forEach(l => {
      // try to find a label with the same name
      const match = oldLabels.find(
        x => x.name.toLowerCase() === l.name.toLowerCase()
      );
      if (match) {
        // check to see if the color matches
        if (match.color !== l.color) {
          console.log(
            `Updating color for ${match.name} from ${match.color} to ${
              l.color
            }.`
          );
          const p = octo.issues
            .updateLabel({
              repo,
              owner,
              name: l.name,
              current_name: l.name,
              description: match.description,
              color: l.color,
            })
            .catch(e => {
              console.error(
                `Error updating label ${l.name} in ${owner}/${repo}`
              );
            });
          promises.push(p);
        }
      } else {
        // there was no match, go ahead and add it
        console.log(`Creating label for ${l.name}.`);
        const p = octo.issues
          .createLabel({
            repo,
            owner,
            color: l.color,
            description: l.description,
            name: l.name,
          })
          .catch(e => {
            console.error(`Error creating label ${l.name} in ${owner}/${repo}`);
          });
        promises.push(p);
      }
    });

    // now clean up common labels we don't want
    const labelsToDelete = [
      'bug',
      'enhancement',
      'kokoro:force-ci',
      'kokoro: force-run',
      'kokoro: run',
      'question',
    ];
    oldLabels.forEach(l => {
      if (labelsToDelete.includes(l.name)) {
        const p = octo.issues
          .deleteLabel({
            name: l.name,
            owner,
            repo,
          })
          .then(() => {
            console.log(`Deleted '${l.name}' from ${owner}/${repo}`);
          })
          .catch(e => {
            console.error(`Error deleting label ${l.name} in ${owner}/${repo}`);
            console.error(e.stack);
          });
        promises.push(p);
      }
    });
  });

  await Promise.all(promises);
}
