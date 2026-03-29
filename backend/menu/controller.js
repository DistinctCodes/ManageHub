const { createIssueController } = require('../../../common/create-issue-module');
const { issue_5_course_performance_leaderboardService } = require('./service');

const issue_5_course_performance_leaderboardController = createIssueController(issue_5_course_performance_leaderboardService);

module.exports = { issue_5_course_performance_leaderboardController };
