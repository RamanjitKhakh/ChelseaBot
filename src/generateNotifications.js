const cron = require("node-cron");

export default function(tasks) {
  tasks.forEach(task => {
    const { category, cronPattern, description, frequency } = task;

    cron.schedule(cronPattern, () => {
      console.log("running a task every minute");
    });
  });
}
