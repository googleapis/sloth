import Octokit from '@octokit/rest';

import {Member, Membership, Repo, Users} from './types';

const users: Users = require('../../users.json');

const token = process.env.SLOTH_GITHUB_TOKEN;
if (!token) {
  throw new Error('Please set the `SLOTH_GITHUB_TOKEN` environment variable.');
}

const octo = new Octokit();
octo.authenticate({token, type: 'token'});

export async function reconcileUsers() {
  const promises = new Array<Promise<Octokit.AnyResponse|void>>();
  for (const o of users.orgs) {
    for (const m of users.membership) {

      // find the team object that contains the org/team specific id for this team-name
      const team = users.teams.find(x => {
        return x.name.toLowerCase() === m.team.toLowerCase() &&
        x.org.toLowerCase() === o.toLowerCase();
      })!;

      // get the current list of team members
      const res = await octo.orgs.getTeamMembers({id: team.id, per_page: 100});
      const currentMembers = res.data as Member[];

      // add any missing users
      for (const u of m.users) {
        const match =
            currentMembers.find(x => x.login.toLowerCase() === u.toLowerCase());
        if (!match) {
          console.log(`Adding ${u} to ${o}/${team.name}...`);
          const p = octo.orgs.addTeamMembership({id: team.id, username: u})
                        .catch(e => {
                          console.error(`Error adding ${u} to ${team.org}/${team.name}.`);
                          console.error(e);
                        });
          promises.push(p);
        }
      }

      // remove any bonus users
      for (const u of currentMembers) {
        const match =
            m.users.find(x => x.toLowerCase() === u.login.toLowerCase());
        if (!match) {
          console.log(`Removing ${u.login} from ${team.name}...`);
          const p =
              octo.orgs.removeTeamMembership({id: team.id, username: u.login})
                  .catch(e => {
                    console.error(`Error removing ${u.login} from ${team.name}.`);
                    console.error(e);
                  });
          promises.push(p);
        }
      }
    }
  }
  await Promise.all(promises);
}
