import {NodeType} from "./node";

class Agent {
  state; // agent state
  runningNode;

  #nodeStateMap; // map of node states for this agent
  #tree; // a reference to the Behavior Tree instance in charge of this Agent.

  constructor(state, tree) {
    this.runningNode = null;
    this.state = state;

    this.#nodeStateMap = _initNodeStateMap(tree);
    this.#tree = tree;
  }

  getNodeState(nodeId) {
    return this.#nodeStateMap.get(nodeId);
  }
}

/**
 * Recursively creates state objects on nodes
 * that have both an init and update fn.
 *
 * @param tree<Tree>
 * @returns {Map<node id, Object>}
 * @private
 */
function _initNodeStateMap(tree) {
  const map = new Map();

  const createState = node => {
    if (node.type !== NodeType.ACTION) {
      return;
    }

    const { init, update } = tree.getActionHandler(node);

    if (init && update) {
      map.set(node.id, {});
    }

    if (node.children) {
      node.children.forEach(createState);
    }
  };

  tree.getNodeMap().forEach(createState);

  return map;
}

export { Agent };