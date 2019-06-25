"use strict";

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var State = {
  SUCCESS: "SUCCESS",
  FAILURE: "FAILURE",
  RUNNING: "RUNNING"
};

/*
 * Data-tree properties used for internal purposes.
 */
var INTERNAL_PROPS = {
  // user node id ( string)
  id: true,
  // internal node id ( number)
  _id: true,
  // node name
  name: true,
  // kids array
  kids: true
};

var MODULE_NAME_REGEXP = /^.\/(.*)\.js$/;

var RESERVED_ACTION_NAMES = {
  "Selector": true,
  "Sequence": true,

  "Inverter": true,
  "Succeeder": true,
  "Failer": true,
  "RepeatUntilSuccess": true,
  "RepeatUntilFailure": true
};

var actions = {};

/**
 * Recursively provide behavior tree data with a node id.
 *
 * @param node              node
 * @param id                {Number} numeric id for the node
 * @param nodeIdxByName     {Object} node-by-name lookup
 *
 * @returns next numeric id
 */
function initIds(node, id, nodeIdxByName) {
  if (node.id) {
    if (nodeIdxByName[node.id]) {
      throw new Error("Node id '" + node.id + "' used more than once.");
    }
    nodeIdxByName[node.id] = id;
  }

  node._id = id;

  var kids = node.kids;
  if (kids) {
    for (var i = 0; i < kids.length; i++) {
      initIds(kids[i], ++id, nodeIdxByName);
    }
  }

  return id;
}

/**
 * Creates a node memory object for every node whose update method takes more than 2 args.
 *
 * @param array     {Array} node memory array
 * @param node      {Object} node
 *
 * @returns {Array} node memory array
 */
function initNodeMemory(array, node) {
  var handler = actions[node.name];

  if (handler && handler.update.length > 2) {
    var mem = {};
    for (var name in node) {
      if (node.hasOwnProperty(name) && !INTERNAL_PROPS[name]) {
        mem[name] = node[name];
      }
    }

    array[node._id] = mem;
  }

  var kids = node.kids;
  if (kids) {
    for (var i = 0; i < kids.length; i++) {
      initNodeMemory(array, kids[i]);
    }
  }
  return array;
}

/**
 * Runs the recursive behavior tree update.
 * I recreated this as tick(node, ctx, agent)
 *
 * @param node          node
 * @param ctx           user context object
 * @param instance      behavior tree instance
 * @returns {State}
 */
function updateNodes(node, ctx, instance) {
  var nodeName = node.name;

  var kids = node.kids;

  var result = void 0;
  switch (nodeName) {
    case "Sequence":
      result = State.SUCCESS;
      if (kids) {
        for (var i = 0; i < kids.length; i++) {
          var state = updateNodes(kids[i], ctx, instance);
          if (state !== State.SUCCESS) {
            result = state;
            break;
          }
        }
      }
      break;
    case "Selector":
      result = State.FAILURE;
      if (kids) {
        for (var _i = 0; _i < kids.length; _i++) {
          var _state = updateNodes(kids[_i], ctx, instance);
          if (_state !== State.FAILURE) {
            result = _state;
            break;
          }
        }
      }
      break;
    case "Inverter":
      if (kids && kids.length) {
        var kidState = updateNodes(kids[0], ctx, instance);

        if (kidState === State.SUCCESS) {
          result = State.FAILURE;
        } else if (kidState === State.FAILURE) {
          result = State.SUCCESS;
        } else {
          result = kidState;
        }
      }
      break;
    case "Succeeder":
      if (kids && kids.length) {
        var _kidState = updateNodes(kids[0], ctx, instance);

        result = _kidState !== State.RUNNING ? State.SUCCESS : State.RUNNING;
      } else {
        result = State.SUCCESS;
      }
      break;
    case "Failer":
      if (kids && kids.length) {
        var _kidState2 = updateNodes(kids[0], ctx, instance);

        result = _kidState2 !== State.RUNNING ? State.FAILURE : State.RUNNING;
      } else {
        result = State.FAILURE;
      }
      break;
    case "RepeatUntilSuccess":
      if (kids && kids.length) {
        var _state2 = void 0;
        do {
          _state2 = updateNodes(kids[0], ctx, instance);
        } while (_state2 !== State.SUCCESS);

        result = State.SUCCESS;
      }
      break;
    case "RepeatUntilFailure":
      if (kids && kids.length) {
        var _state3 = void 0;
        do {
          _state3 = updateNodes(kids[0], ctx, instance);
        } while (_state3 !== State.FAILURE);

        result = State.SUCCESS;
      }
      break;
    default:
      var handler = actions[nodeName];
      if (!handler) {
        throw new Error("Invalid action: " + nodeName);
      }

      if (instance.runningNode !== node && handler.init) {
        handler.init(ctx, instance.globalMemory, instance.nodeMemory[node._id]);
      }

      result = handler.update(ctx, instance.globalMemory, instance.nodeMemory[node._id]);

      if (typeof result === "boolean") {
        result = result ? State.SUCCESS : State.FAILURE;
      }

      if (result === State.RUNNING) {
        instance.runningNode = node;
      } else if (result !== State.SUCCESS && result !== State.FAILURE) {
        throw new Error("Invalid leaf handler return value: " + result);
      }

      break;
  }

  //console.log("Update", nodeName, " ( id = ", node.id || node._id, ") => ", result);

  return result;
}

/**
 * Behavior tree
 *
 * @constructor
 */
function Behavior(data) {
  this.rootNode = data.root;
  this.nodeIdxByName = {};
  this.count = initIds(data.root, 0, this.nodeIdxByName);
}

/**
 * Creates a new instance for the current behavior tree.
 *
 * @param globalMemory          {?Object} global memory
 *
 * @returns {BehaviorInstance} new instance
 */
Behavior.prototype.createInstance = function (globalMemory) {
  return new BehaviorInstance(this, globalMemory);
};

/**
 * Updates the given behavior tree instance
 *
 * @param ctx           {*} user context object
 * @param instance      {BehaviorInstance} behavior tree instance
 *
 * @returns {State} bubbled up evaluation result
 */
Behavior.prototype.update = function (ctx, instance) {
  return updateNodes(this.rootNode, ctx, instance);
};

/**
 * Behavior tree state
 *
 * @param behaviour         behaviour
 * @param globalMemory      default global memory
 *
 * @constructor
 */
function BehaviorInstance(behaviour, globalMemory) {
  this.behaviour = behaviour;
  this.globalMemory = globalMemory || {};
  this.nodeMemory = initNodeMemory(new Array(behaviour.count), behaviour.rootNode);
  this.runningNode = null;
}

/**
 * Access the node memory of the node with the given user id.
 *
 * @param nodeId    {String} user node id
 *
 * @returns {Object} node memory
 */
BehaviorInstance.prototype.getNodeMemory = function (nodeId) {
  return this.nodeMemory[this.behaviour.nodeIdxByName[nodeId]];
};

/**
 * Returns the main memory for the behavior tree instance.
 *
 * @returns {Object} global instance memory
 */
BehaviorInstance.prototype.getMemory = function () {
  return this.globalMemory;
};

export { State };

export default {
  /**
   * Load the behavior tree from the given data representation / JSON.
   *
   * @param data      JSON data
   *
   * @returns {Behavior}
   */
  load: function load(data) {
    return new Behavior(data);
  },

  Behavior: Behavior,
  BehaviorInstance: BehaviorInstance,
  State: State,

  registerFromRequireContext: function registerFromRequireContext(ctx) {
    var modules = ctx.keys();

    for (var i = 0; i < modules.length; i++) {
      var moduleName = modules[i];
      var handler = ctx(moduleName);

      var m = MODULE_NAME_REGEXP.exec(moduleName);
      if (m) {
        var actionName = m[1];
        if (RESERVED_ACTION_NAMES.hasOwnProperty(actionName)) {
          throw new Error("'" + actionName + "' is a reserved name. You need to rename " + moduleName);
        }

        this.registerAction(actionName, handler);
      }
    }
  },

  registerAction: function registerAction(actionName, handler) {
    if (typeof handler === "function") {
      handler = {
        update: handler
      };
    }

    if ((typeof handler === "undefined" ? "undefined" : _typeof(handler)) !== "object" || typeof handler.update !== "function") {
      throw new Error("Invalid leaf handler", handler);
    }

    //console.log("Register" , actionName , "to", handler);
    actions[actionName] = handler;
  },

  resetActions: function resetActions() {
    actions = {};
  }

};