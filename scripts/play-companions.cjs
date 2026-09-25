// Open the verified companion review environment for manual play, without scripted chat.
process.env.QBOT_COMPANION_PLAY='1';
require('./review-companions.cjs');
