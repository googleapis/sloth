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
  const owner = 'google';
  const repo = 'google-api-nodejs-client';
  const res = await octo.issues.getLabels({owner, repo});
  const oldLabels = res.data as Label[];
  console.log(`Found ${oldLabels.length} existing tags.`);
  const promises = new Array<Promise<Octokit.AnyResponse|void>>();
  labels.forEach(l => {
    // try to find a label with the same name
    const match = oldLabels.find(x => x.name === l.name);
    if (match) {
      // check to see if the color matches
      console.log(`Found a match for ${match.name}.`);
      if (match.color !== l.color) {
        console.log(`Updating color for ${match.name}.`);
        const p = octo.issues
                      .updateLabel({
                        repo,
                        owner,
                        name: l.name,
                        oldname: l.name,
                        description: match.description,
                        color: l.color.slice(1)
                      })
                      .catch(console.error);
        promises.push(p);
      } else {
        console.log(`Color for ${match.name} was correct.`);
      }
    } else {
      // there was no match, go ahead and add it
      console.log(`Creating label for ${l.name}.`);
      const p = octo.issues
                    .createLabel({
                      repo,
                      owner,
                      color: l.color.slice(1),
                      description: l.description,
                      name: l.name
                    })
                    .catch(console.error);
      promises.push(p);
    }
  });
  await Promise.all(promises);
}
