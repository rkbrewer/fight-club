<template>
  <div id="app">
    <Battle />
  </div>
</template>

<script>
import Battle from '@/components/Battle';

import { Tree } from "../../r-behavior";
import { HealTeamOrAttackRandomEnemy } from '@/behaviors';
import behaviorActions from '@/behaviors/actions';

export default {
  name: 'app',
  components: {
    Battle
  },

  data() {
    return {
      agentGoober: null,
      agentDad: null,
      agentGoblinA: null
    }
  },

  mounted() {
    const tree = new Tree(HealTeamOrAttackRandomEnemy);
    tree.registerActions(behaviorActions);

    this.agentGoober = tree.createAgent({ name: 'Goober', hp: 10, hpMax: 10, team: 'Brewer' });
    this.agentDad = tree.createAgent({ name: 'Dad', hp: 11, hpMax: 11, team: 'Brewer' });
    this.agentGoblinA = tree.createAgent({ name: 'Goblin A', hp: 6, hpMax: 6, team: 'Mob' });

    const game = { phaserLibOrSomething: {} };
    const battle = { teams: [[this.agentGoober.state, this.agentDad.state], [this.agentGoblinA.state]], environment: 'freezing' };
    const ctx = { game, battle };

    let interval;
    interval = setInterval(() => {
      tree.tick(ctx);

      // If one team is eliminated, stop ticking.
      const losingTeam = ctx.battle.teams.find(team => team.every(agent => agent.hp <= 0));
      if (losingTeam) {
        clearInterval(interval);
        console.log('%s lost.', losingTeam[0].team);
      }
    }, 3000);
  }
}
</script>

<style lang="scss">
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
