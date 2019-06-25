import { CompletionStatus } from "../../../../r-behavior/node";

export default [
  {
    name: 'TargetSeverelyInjuredTeammate',
    handler(ctx, agent) {
      agent.teammates = getTeammates(ctx.battle.teams, agent);
      agent.target = agent.teammates.find(({ hp, hpMax }) => hp <= hpMax * .2);

      return agent.target ? CompletionStatus.SUCCESS : CompletionStatus.FAILURE;
    }
  },

  {
    name: 'HealTarget',
    handler(ctx, agent) {
      console.log('%s is healing %s', agent.name, agent.target.name);
      return CompletionStatus.SUCCESS;
    }
  },

  {
    name: 'HealWithPotion',
    handler(ctx, agent) {
      console.log('%s used a potion on %s', agent.name, agent.target.name);
      return CompletionStatus.SUCCESS;
    }
  },

  {
    name: 'HealWithMagic',
    handler(ctx, agent) {
      console.log('%s used magic to heal someone', agent.name);
      return CompletionStatus.SUCCESS;
    }
  },

  {
    name: 'TargetRandomEnemy',
    handler(ctx, agent) {
      agent.enemies = getEnemies(ctx.battle.teams, agent);
      agent.target = getRandomEntry(agent.enemies);

      return agent.target ? CompletionStatus.SUCCESS : CompletionStatus.FAILURE;
    }
  },

  {
    name: 'AttackTarget',
    handler(ctx, agent) {
      const damage = getRandomInt(0, agent.target.hp + 1);
      agent.target.hp -= damage;

      console.log('%s attacks %s for %s damage', agent.name, agent.target.name, damage);

      return CompletionStatus.SUCCESS;
    }
  }
];

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min; // The maximum is exclusive and the minimum is inclusive
}

function getRandomEntry(array, onlyLiving = true) {
  if (onlyLiving) {
    array = array.filter(entry => entry.hp > 0);
  }

  return array[getRandomInt(0, array.length)];
}

function getTeammates(teams, agent) {
  return teams.find(team => team.includes(agent));
}

function getEnemies(teams, agent) {
  return teams.find(team => !team.includes(agent));
}