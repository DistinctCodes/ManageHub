const express = require('express');
const { createIssueRoute } = require('../../../common/create-issue-module');
const { issue_8_gamification_points_systemController } = require('./controller');

const issue_8_gamification_points_systemRoute = createIssueRoute(express, issue_8_gamification_points_systemController);

module.exports = { issue_8_gamification_points_systemRoute };
