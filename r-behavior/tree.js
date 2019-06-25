import { NodeType, CompletionStatus } from "./node";
import { Agent } from './agent';

/**
 * The Tree class can be instantiated. It also acts as an Agent Manager,
 * and can create new agents of this behavior, and tick one or all of them.
 *
 * Agents can also tick themselves.
 *
 * Reference Implementation:
 * I'm using this document as a Reference Implementation for my nodes.
 * https://www.gamasutra.com/blogs/ChrisSimpson/20140717/221339/Behavior_trees_for_AI_How_they_work.php
 *
 */
class Tree {
  agents;
  name;
  rootNode;

  #actions;
  #nodeMap;

  constructor(nodes = {}, name = "Behavior") {
    this.agents = [];
    this.name = name;
    this.rootNode = nodes;

    if (!['children', 'type'].some(prop => this.rootNode[prop])) {
      throw new Error('Root node must have children and a type');
    }

    this.#actions = new Map();
    this.#nodeMap = _mapNodes(nodes);
  }

  createAgent(state) {
    const agent = new Agent(state, this);
    this.agents.push(agent);

    return agent;
  }

  getAction(node) {
    const action = this.#actions.get(node.name);

    if (!action) {
      // Pre-built Node Types don't have action handlers,
      // But userland "actions" need to be registered.
      if (node.type === NodeType.ACTION) {
        console.warn('No Action Handler found for', node.name);
      }

      return {};
    }

    return action;
  }

  getNodeMap() {
    return this.#nodeMap;
  }

  nodeCount() {
    return this.#nodeMap.length;
  }

  registerAction(action) {
    // Prevent accidental registration of a reserved Node Type
    // (with the exception of ACTION).
    if (_isReservedNodeType(action.type)) {
      return;
    }

    if (this.#actions.get(action.name)) {
      throw new Error(`Already registered "${action.name}" action. Please rename this one.`);
    }

    // ACTION is inferred if it's not explicitly set
    if (!action.type) {
      action.type = NodeType.ACTION;
    }

    // An action can be an FN or an Obj with { init: fn, update: fn }
    // Actions with init/update get node state.
    switch (typeof action.handler) {
      case 'function':
        action.handler = { update: action.handler };
        break;
      case 'object':
        if (typeof action.handler.init !== 'function' || typeof action.handler.update !== 'function') {
          throw new Error('Invalid action. Action Handler objects must define an init and update function.');
        }
        break;
      default:
        throw new Error('Invalid action. "action.handler" must either be a function or an object defining an init and update function.');
    }

    // console.log('Registering action', action);
    this.#actions.set(action.name, action);
  };

  registerActions(actions) {
    actions.forEach(this.registerAction.bind(this));
  }

  tick(ctx = {}, agent = this.agents, node = this.rootNode) {
    /**
     * Recursively call this if the Tree invoked it
     * on a collection of agents.
     */
    if (Array.isArray(agent)) {
      agent.forEach(agent => {
        this.tick(ctx, agent, node);
      });
      return;
    }

    let status;

    // Performance boost. Don't tick entire tree,
    // but start at the running node when possible.
    // See "Tree Traversal" in Reference Implementation documentation.
    if (agent.runningNode) {
      node = agent.runningNode;
    }

    // Recursively invokes "tick" on children until the status
    // is not the one provided this fn.
    // Mutates the returned variable "status"
    const tickChildrenUntilNot = (s) => {
      status = s;
      for (const child of node.children) {
        const result = this.tick(ctx, agent, child);
        if (result !== s) {
          status = result;
          break;
        }
      }
    };

    switch(node.type) {
      case NodeType.SELECTOR:
        tickChildrenUntilNot(CompletionStatus.FAILURE);
        break;

      case NodeType.SEQUENCE:
        tickChildrenUntilNot(CompletionStatus.SUCCESS);
        break;

      case NodeType.ACTION:
      case undefined:
        const action = this.getAction(node);

        if (!action) {
          throw new Error("Invalid action: " + node.name);
        }

        const { init, update } = action.handler;

        if (agent.runningNode !== node && init) {
          init(ctx, agent.state, agent.getNodeState(node.id));
        }

        try {
          status = update(ctx, agent.state, agent.getNodeState(node.id));
        } catch(e) {
          debugger;
        }


        if (status === CompletionStatus.RUNNING) {
          agent.runningNode = node;
        }
        break;

      default:
        throw new Error(`Unknown Node Type.  NodeType.ACTION can be inferred, but "${node.type}" was explicitly set for ${node.name}.`);
    }

    return status;
  }
}

export { Tree };


function _mapNodes(rootNode) {
  const map = new Map();
  _mapNode(rootNode, 0, map);

  return map;
}


/**
 * Recursively provide behavior tree data with a node id.
 *
 * @param node  node
 * @param id    {Number} numeric id for the node
 * @param map   {Map} node-by-name lookup
 *
 * @returns next numeric id
 */
function _mapNode(node, id, map) {
  node.id = id;
  map.set(id, node);

  if (node.children) {
    node.children.forEach(child => {
      _mapNode(child, ++id, map);
    });
  }
}

/**
 * "Reserved" Node Types include all entries in NodeType
 * except ACTION, which is always user-defined.
 *
 * @param nodeType<NodeType>
 * @returns {boolean}
 * @private
 */
function _isReservedNodeType(nodeType) {
  return Object.entries(NodeType)
    .reduce((reserved, [key, val]) => {
      if (key !== 'ACTION') reserved.push(val);
      return reserved;
    }, [])
    .includes(nodeType);
}