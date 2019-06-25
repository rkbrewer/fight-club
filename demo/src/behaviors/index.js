import { NodeType } from "../../../r-behavior/node";

/*
Currently, leaf nodes can be defined with just a name. The type is inferred to be NodeType.ACTION
 */

const HealTeamOrAttackRandomEnemy = {
    name: 'HealTeamOrAttackRandomEnemy',
    type: NodeType.SELECTOR,
    children: [
      /**
       * Heal severely injured teammates
       */
      {
        name: 'HealSeverelyInjuredTeammates',
        type: NodeType.SEQUENCE,
        children: [
          { name: 'TargetSeverelyInjuredTeammate' },
          {
            name: 'HealTargetByAnyMeans',
            type: NodeType.SELECTOR,
            children: [
              { name: 'HealWithPotion' },
              { name: 'HealWithMagic' }
            ]
          }
        ]
      },

      /**
       * Attack random enemies
       */
      {
        name: 'AttackRandomEnemies',
        type: NodeType.SEQUENCE,
        children: [
          { name: 'TargetRandomEnemy' },
          { name: 'AttackTarget' }
        ]
      }
    ]
  }
;

export { HealTeamOrAttackRandomEnemy }
