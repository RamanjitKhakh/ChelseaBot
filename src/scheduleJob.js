const database = require("./database");
const cron = require("node-cron");

const cronPatternForSundayAtNoon = "0 12 * * 0";

const changeChoreTeam = () => {
  database.getAllTeams(teams => {
    const perviousChoreTeam = teams.find(team => team.isChoreWeek);
    let newChoreTeamIndex = perviousChoreTeam.index + 1;
    if (newChoreTeamIndex >= teams.length) {
      newChoreTeamIndex = 0;
    }
    perviousChoreTeam.isChoreWeek = false;
    teams[newChoreTeamIndex].isChoreWeek = true;
    database.updateTeams(teams);
  });
};

const createScheduledJob = (cronPattern, actionFunc) => {
  cron.schedule(cronPattern, () => {
    actionFunc();
  });
};

const generateDefaultScheduleJobs = () => {
  cron.schedule(cronPatternForSundayAtNoon, () => {
    changeChoreTeam();
  });
};

module.exports = {
  changeChoreTeam,
  createScheduledJob,
  generateDefaultScheduleJobs
};
