const { issue_5_course_performance_leaderboardRoute } = require('./route');

const issue_5_course_performance_leaderboardModule = {
  key: 'course-performance-leaderboard',
  basePath: '/courses/performance-leaderboard',
  router: issue_5_course_performance_leaderboardRoute,
};

module.exports = { issue_5_course_performance_leaderboardModule };
