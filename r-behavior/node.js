const CompletionStatus = {
  SUCCESS: 'success',
  FAILURE: 'failure',
  RUNNING: 'running'
};

const NodeType = {
  SEQUENCE: 'sequence',
  SELECTOR: 'selector',
  ACTION: 'action'
};

const isKnownNodeType = type => {
  return Object.values(NodeType).includes(type);
};


export {
  CompletionStatus,
  NodeType,
  isKnownNodeType
}