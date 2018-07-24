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

const getAllBeers = (successCallback, errorCallback) => {
  const ref = db.ref("/beers");
  ref.once(
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

// task CRUD
const getAllTasks = (successCallback, errorCallback) => {
  const ref = db.ref("/tasks");
  ref.once(
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
  if (!task.frequency) {
    task.frequency = cronstrue.toString(task.cronPattern);
  }

  const newPostKey = ref.push().key;
  task.id = newPostKey;
  const updates = {};
  updates["/tasks/" + newPostKey] = task;
  return db.ref().update(updates);
};

const deleteTask = taskId => {
  if (taskId) {
    const ref = db.ref(`/tasks/${taskId}`);
    return ref.remove();
  }
};

const updateTask = (taskId, task) => {
  task.frequency = cronstrue.toString(task.cronPattern);
  const updates = {};
  updates["/tasks/" + taskId] = task;
  return db.ref().update(updates);
};

const getAllTeams = (successCallback, errorCallback) => {
  const ref = db.ref("/teams");
  ref.once(
    "value",
    snapshot => {
      const teams = Object.values(snapshot.val()).sort((a, b) => {
        return a.index - b.index;
      });
      successCallback(teams);
    },
    error => {
      errorCallback(error.code);
    }
  );
};

const getCurrentChoreTeam = (successCallback, errorCallback) => {
  getAllTeams(teams => {
    const currentChoreTeam = teams.find(team => team.isChoreWeek);
    successCallback(currentChoreTeam);
  }, errorCallback);
};

const updateTeams = teams => {
  const updates = {};
  updates["/teams"] = teams;
  return db.ref().update(updates);
};

const addTeam = team => {
  getAllTeams(teams => {
    team.index = teams.length;
    const newTeamKey = ref.push().key;
    const updates = {};
    updates["/teams/" + newTeamKey] = team;
    return db.ref().update(updates);
  });
};

module.exports = {
  addTask,
  deleteTask,
  updateTask,
  getAllTasks,
  addBeer,
  clearAllBeers,
  getAllTeams,
  addTeam,
  getCurrentChoreTeam,
  updateTeams
};
