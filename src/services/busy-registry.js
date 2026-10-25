// Each mounted workspace owns its channel. An idle sibling cannot clear an in-flight save.
export function createBusyRegistry(onChange){const states=new Map(),callbacks=new Map();return {channel(key){if(!callbacks.has(key))callbacks.set(key,value=>{states.set(key,!!value);onChange([...states.values()].some(Boolean));});return callbacks.get(key);}};}
