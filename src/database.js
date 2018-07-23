const admin = require("firebase-admin");
const cronstrue = require("cronstrue");
const serviceAccount = require("../firebaseKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://chelseabot-f56ce.firebaseio.com"
});

const db = admin.database();

// Beer

const addBeer = (response, user) => {
  const ref = db.ref("/beers");

  const newPostKey = ref.push().key;
  const responsePayload = {
    id: newPostKey,
    response,
    user
  };
  const updates = {};
  updates["/beers/" + newPostKey] = responsePayload;
  return db.ref().update(updates);
};

const clearAllBeers = () => {
  const ref = db.ref("/beers");
  return ref.remove();
};

// task CRUD
const getAllTasks = (successCallback, errorCallback) => {
  const ref = db.ref("/tasks");
  ref.on(
    "value",
    snapshot => {
      const tasks = Object.values(snapshot.val());
      successCallback(tasks);
    },
    error => {
      errorCallback(error.code);
    }
  );
};

const addTask = task => {
  const ref = db.ref("/tasks");
  task.frequency = cronstrue.toString(task.cronPattern);

  const newPostKey = ref.push().key;
  const updates = {};
  updates["/tasks/" + newPostKey] = task;
  return db.ref().update(updates);
};

const deleteTask = taskId => {
  const ref = db.ref("/tasks");
  return ref.remove(taskId);
};

const updateTask = (taskId, task) => {
  task.frequency = cronstrue.toString(task.cronPattern);
  const updates = {};
  updates["/tasks/" + taskId] = task;
  return db.ref().update(updates);
};

module.exports = {
  addTask,
  deleteTask,
  updateTask,
  getAllTasks,
  addBeer,
  clearAllBeers
};
