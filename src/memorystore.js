var DATA_STORE = {};

var getStorageFunctions = function(storage, namespace) {
  return {
    get: function(id, callback) {
      if (id in DATA_STORE[namespace]) {
        return callback(null, DATA_STORE[namespace][id]);
      } else {
        return callback("Could not find object with provided id", null);
      }
    },
    save: function(object, callback) {
      if (object.id) {
        var newId = object.id;
        DATA_STORE[namespace][newId] = object;
      } else {
        return callback(
          "Object could not be saved/updated, or it has no id property"
        );
      }
    }
  };
};

module.exports = function() {
  var storage = {};
  var methods = ["teams", "users", "channels"];
  for (var i = 0; i < methods.length; i++) {
    storage[methods[i]] = getStorageFunctions(storage, methods[i]);
  }
  DATA_STORE.teams = {};
  DATA_STORE.channels = {};
  DATA_STORE.users = {};

  return storage;
};
