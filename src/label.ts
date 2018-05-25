import Octokit from '@octokit/rest';

import {Label, Repo} from './types';

const repos: Repo[] = require('../../repos.json').repos;
const labels: Label[] = require('../../labels.json').labels;

const token = process.env.SLOTH_GITHUB_TOKEN;
if (!token) {
  throw new Error('Please set the `SLOTH_GITHUB_TOKEN` environment variable.');
}

const octo = new Octokit();
octo.authenticate({token, type: 'token'});

export async function reconcileLabels() {
  const promises = new Array<Promise<Octokit.AnyResponse|void>>();
  repos.forEach(async (r) => {
    const [owner, repo] = r.repo.split('/');
    const res = await octo.issues.getLabels({owner, repo, per_page: 100});
    const oldLabels = res.data as Label[];
    labels.forEach(l => {
      // try to find a label with the same name
      const match = oldLabels.find(x => x.name === l.name);
      if (match) {
        // check to see if the color matches
        if (match.color !== l.color) {
          console.log(`Updating color for ${match.name} from ${match.color} to ${l.color}.`);
          const p = octo.issues
                        .updateLabel({
                          repo,
                          owner,
                          name: l.name,
                          oldname: l.name,
                          description: match.description,
                          color: l.color
                        })
                        .catch(e => {
                          console.error(`Error updating label ${l.name} in ${owner}/${repo}`);
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
                        name: l.name
                      })
                      .catch(e => {
                        console.error(`Error creating label ${l.name} in ${owner}/${repo}`);
                      });
        promises.push(p);
      }
    });
  });
  await Promise.all(promises);
}
