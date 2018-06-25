import Octokit from '@octokit/rest';
import {Member, Team} from './types';
import {octo, users} from './util';

/**
 * Ensure all provided teams actually exist in all orgs.
 * Create them if they don't.  Return a list of teams with Ids.
 */
export async function reconcileTeams() {
  // obtain all of the teams across all supported orgs
  const teamMap = new Map<string, Team[]>();
  const yoshiTeams = new Array<Team>();
  const promises = users.orgs.map(async org => {
    const teams = new Array<Team>();
    let page = 1;
    let res: Octokit.AnyResponse;
    console.log(`Fetching teams for ${org}...`);
    do {
      res = await octo.orgs.getTeams({org, per_page: 100, page});
      res.data.forEach((t: Team) => {
        t.org = org;
        teams.push(t);
      });
      page++;
    } while (res && res.headers && res.headers.link &&
             res.headers.link.indexOf('rel="last"') > -1);
    console.log(`Found ${teams.length} teams in ${org}.`);
    teamMap.set(org, teams);
  });
  await Promise.all(promises);

  // Loop over the desired teams for each org. Create any missing ones.
  users.membership.forEach(m => {
    users.orgs.forEach(async org => {
      const orgTeams = teamMap.get(org)!;
      const match =
          orgTeams.find(x => x.name.toLowerCase() === m.team.toLowerCase())!;
      if (!match) {
        throw new Error(`Team '${m.team}' does not exist in ${org}.`);
      }
      yoshiTeams.push(match);
    });
  });

  return yoshiTeams;
}

export async function reconcileRepos() {
  const promises = new Array<Promise<Octokit.AnyResponse|void>>();
  const teams = await reconcileTeams();
  users.membership.forEach(m => {
    m.repos.forEach(r => {
      const [o, repo] = r.split('/');
      const team = getTeam(m.team, o, teams);
      if (!team) {
        throw new Error(`Unable to find team '${m.team}`);
      }
      const p = octo.orgs
                    .addTeamRepo(
                        {id: team.id, owner: o, permission: 'push', repo} as
                        Octokit.OrgsAddTeamRepoParams)
                    .catch(e => {
                      console.error(`Error adding ${r} to ${m.team}.`);
                      // console.error(e);
                    });
      promises.push(p);
    });
  });
  await Promise.all(promises);
}

function getTeam(team: string, org: string, teams: Team[]) {
  return teams.find(x => {
    return x.name.toLowerCase() === team.toLowerCase() &&
        x.org!.toLowerCase() === org.toLowerCase();
  });
}

export async function reconcileUsers() {
  const promises = new Array<Promise<Octokit.AnyResponse|void>>();
  const teams = await reconcileTeams();
  for (const o of users.orgs) {
    for (const m of users.membership) {
      const team = getTeam(m.team, o, teams);
      if (!team) {
        throw new Error(`Unable to find team '${m.team}`);
      }

      // get the current list of team members
      const res = await octo.orgs.getTeamMembers(
          {id: team.id, team_id: team.id, per_page: 100});
      const currentMembers = res.data as Member[];

      // add any missing users
      for (const u of m.users) {
        const match =
            currentMembers.find(x => x.login.toLowerCase() === u.toLowerCase());
        if (!match) {
          console.log(`Adding ${u} to ${o}/${team.name}...`);
          const p = octo.orgs
                        .addTeamMembership(
                            {id: team.id, team_id: team.id, username: u})
                        .catch(e => {
                          console.error(
                              `Error adding ${u} to ${team.org}/${team.name}.`);
                          // console.error(e);
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
          const p = octo.orgs
                        .removeTeamMembership(
                            {id: team.id, team_id: team.id, username: u.login})
                        .catch(e => {
                          console.error(
                              `Error removing ${u.login} from ${team.name}.`);
                          // console.error(e);
                        });
          promises.push(p);
        }
      }
    }
  }
  await Promise.all(promises);
}
