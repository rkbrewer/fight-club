/*
Characters can take CharacterActions. Like:
 - Fight with Inventory Entity (equiped wpn) ENEMY
 - Use Inventory Entity (like Potion or Wizard Wand) ON SELF | ENEMY
 - Cast ON SELF | ENEMY
 - Run

 The first 3 actions are all super-similar.  Running is different.
 - Fight prevents selecting teammates
 - Use allows selecting enemies or teammates (default to a group based off trait HARM or HEAL)
 - Cast allows selecting enemies or teammates (default to a group based off trait HARM or HEAL)
 - Run has no selection, but closes out your turn or something

The game I'm making, a Choose your Own Adventure with FFXII Gambit system fighting (aka, Idle Hero fighting)

 The api I want:
 goober.attack(selectTarget());
 goober.cast(ice3).on(murloc);
 goober.use(healStaff).on(goober);
 goober.run();


 self.attack(mostOffensiveTarget());

 self.heal(teammateWithLowestHP());

 Here's the Gambit system I want:
 If "my hp" "< 20% hp max"
   "heal self"
 If "friend hp" "< 30% hp max"
   "heal friend"
 If "!shell" "cast shell"

I can try building each character as a "context aware bot" using the Servo library. It builds behavior trees.

 */

const CharacterActions = [
  {
    name: 'Use', // Use Inventory Entity
    handler(inventoryEntity, target) {
      const self = this;
      const result = inventoryEntity.use(self); // self always uses the item
      (target || self).do(result.trait, result.value); // its result is applied to a target (if exists) or self
    }
  }
];

const Characters = [
  {
    name: 'Goober',
    do(characterAction, inventoryEntity, to) {
      characterAction.handler(inventoryEntity, to);
      console.log('I did it!');
    }
  }
];

// **************************************************************

const InventoryEntityTraits = {
  CONFUSE: 'confuse', // reduce int
  FLEE: 'flee', // reduce bravery
  HARM: 'harm', // reduce hp
  HEAL: 'heal' // increase hp
};

const InventoryEntityTypes = {
  SPELL: 'spell',
  CONSUMABLE: 'consumable',
  PERMANENT: 'permanent'
};

/*
Inventory Entities are things that Characters can collect.
They can be used by the Character.
They do not have any knowledge of who they are used ON (e.g., self or a foe)
 */
const InventoryEntities = [
  {
    name: 'Potion',
    type: InventoryEntityTypes.CONSUMABLE,
    trait: InventoryEntityTraits.HEAL,
    use(character) {
      // 1. Trigger an event on the target. Pass the trait and the result.
      character.do(this.trait, /* some number based of the item's efficacy */ 30);

      // 2a. if consumable, remove from target inventory
      // 2b. if spell, remove MP from target
      // 2c. if permanent, do nothing

    }
  },
  {
    name: 'Excalibur',
    type: InventoryEntityTypes.PERMANENT
  }
];
//
// window.app = {
//   CharacterActions,
//   Characters,
//   InventoryEntities,
//   InventoryEntityTraits,
//   InventoryEntityTypes
// };
//
// window.goober = Characters[0];
// window.potion = InventoryEntityTypes[0];
// window.use = CharacterActions[0];



// Playing with ff-behavior *********************************

// import Behavior, { State } from './r-behavior';
import Behavior, { State } from './ff-behavior-fork.js';

Behavior.registerAction('TargetSeverelyInjuredTeammate', (ctx, agent) => {
  agent.teammates = getTeammates(ctx.battle.teams, agent);
  agent.target = agent.teammates.find(({ hp, hpMax }) => hp <= hpMax * .2);

  return agent.target ? State.SUCCESS : State.FAILURE;
});

Behavior.registerAction('HealTarget', (ctx, globalMemory) => {
  console.log('%s is healing %s', globalMemory.name, globalMemory.target.name);
  return State.SUCCESS;
});

Behavior.registerAction('HealWithPotion', (ctx, globalMemory) => {
  console.log('%s used a potion on %s', globalMemory.name, globalMemory.target.name);
  return State.SUCCESS;
});

Behavior.registerAction('HealWithMagic', (ctx, globalMemory) => {
  console.log('%s used magic to heal someone', globalMemory.name);
  return State.SUCCESS;
});

Behavior.registerAction('TargetRandomEnemy', (ctx, agent) => {
  agent.enemies = getEnemies(ctx.battle.teams, agent);
  agent.target = getRandomEntry(agent.enemies);

  return agent.target ? State.SUCCESS : State.FAILURE;
});

Behavior.registerAction('AttackTarget', (ctx, agent) => {
  const damage = getRandomInt(0, agent.target.hp + 1);
  agent.target.hp -= damage;

  console.log('%s attacks %s for %s damage', agent.name, agent.target.name, damage);

  return State.SUCCESS;
});

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

const goobersBehaviorConfig = {
  root: {
    name: 'Selector',
    kids: [
      /**
       * Heal severely injured teammates
       */
      {
        name: 'Sequence',
        kids: [
          { name: 'TargetSeverelyInjuredTeammate' },
          {
            name: 'HealTarget',
            kids: [
              {
                name: 'Selector',
                kids: [
                  { name: 'HealWithPotion' },
                  { name: 'HealWithMagic' }
                ]
              }
            ]
          }
        ]
      },

      /**
       * Attack random enemies
       */
      {
        name: 'Sequence',
        kids: [
          { name: 'TargetRandomEnemy' },
          { name: 'AttackTarget' }
        ]
      }
    ]
  }
};


/*
 Do it if I can: []
  -

 Cast it if I can: [CanCast(spell), Cast(spell)]
  - CanCast(spell) { entity has spell, entity has MP for spell }
  - Cast(spell) { }

 SurviveEncounter: top level: kill enemies if you can, otherwise run

 My first behavior tree: mimick the "go through a door in the building"
 This Sequence will cause char to always favor healing critically hurt friends if there are any
 otherwise it will attack. When it attacks, it will favor using Sonic Scream.

  - Selector
    - Help Critically Hurt Friend
      - Selector
        - Heal with Magic
        - Heal with Potion
    - Until Fail
      - Sequence
        - Get Mob
 */

/*
Goober loves to cast her Sonic Scream. She knows how
to counter Striking Vipers, Iron Skin, and Death Charge.

Some of her characteristics cannot be overriden by the Player. For instance, if she can Sonic Scream, she will.
Others can be defined by the user, like healing thresholds

In other words, some basics:
Assess vulnerabilities. Whenever Sonic Scream is a vulnerability, she casts it no matter what.
Otherwise, cast the next best thing so long as she's not weak against them.
If her attacks are all weak against the target, and she knows it, let her heal. (Is this a good time for the 3rd node the lib offers?)
 */
const goobersBehaviorConfigExample = {
  root: {
    name: 'Selector',
    kids: [
      {
        name: 'Favor using Sonic Scream',
        kids: [
          {
            name: 'Sequence',
            kids: [
              { name: 'Do I have mana for Sonic Scream?' },
              {
                name: 'Inverter',
                kids: [
                  { name: 'Am I on the brink of death?' }
                ]
              },
              { name: 'Use Sonic Scream' }
            ]
          }
        ]
      },
      {
        name: 'Take care of self',
        kids: [
          {
            name: 'Selector',
            kids: [
              {

              }
            ]
          }
        ]
      },
      {
        name: 'Take care of friends',
        kids: [
          {
            name: 'Selector',
            kids: [
              {

              }
            ]
          }
        ]
      }
    ]
  }
};

const behaviorGoober = Behavior.load(goobersBehaviorConfig);

const goobersGlobalMemory = { name: 'Goober', hp: 10, hpMax: 10, team: 'Brewer' }; // aka goober
const agentGoober = behaviorGoober.createInstance(goobersGlobalMemory);

const dadsGlobalMemory = { name: 'Dad', hp: 11, hpMax: 11, team: 'Brewer' }; // aka dad
const agentDad = behaviorGoober.createInstance(dadsGlobalMemory);

const goblinsGlobalMemory = { name: 'Goblin A', hp: 6, hpMax: 6, team: 'Mob' };
const agentGoblin = behaviorGoober.createInstance(goblinsGlobalMemory);

const game = { phaserLibOrSomething: {} };
const battle = { teams: [[goobersGlobalMemory, dadsGlobalMemory], [goblinsGlobalMemory]], environment: 'freezing' };
const ctx = { game, battle };

behaviorGoober.update(ctx, agentGoober);
behaviorGoober.update(ctx, agentDad);
behaviorGoober.update(ctx, agentGoblin);

let interval;

window._ = {
  agentGoober,
  agentDad,
  agentGoblin,
  update() {
    if (agentGoober.globalMemory.hp > 0) {
      behaviorGoober.update(ctx, agentGoober);
    }

    if (agentDad.globalMemory.hp > 0) {
      behaviorGoober.update(ctx, agentDad);
    }

    if (agentGoblin.globalMemory.hp > 0) {
      behaviorGoober.update(ctx, agentGoblin);
    }

    // If one team is eliminated, stop.
    const losingTeam = ctx.battle.teams.find(team => team.every(agent => agent.hp <= 0));
    if (losingTeam) {
      clearInterval(interval);
      console.log('%s lost.', losingTeam[0].team);
    }
  }
};

interval = setInterval(_.update, 2000);

// TODO rewrite ff-behavior
// globalMemory --> rename to state
// "actions" shouldn't be a global var, but should be scoped to the instance of the BehaviorManager (aka, Behavior)
// "BehaviorInstance" --> rename to ...? "Agent"
// keep "Behavior" named as such, just make it a class.
