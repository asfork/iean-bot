// Require our Telegram helper package
const TelegramBot = require('node-telegram-bot-api')

// Require Costflow package
const costflow = require('costflow').default;

// Require Github helper package
const { Octokit } = require("@octokit/core");

const config = require('../config');

const BOT_TOKEN = process.env.BOT_TOKEN;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OWNER = process.env.REPO_OWNER;
const REPO = process.env.REPO_NAME;
const PATH = process.env.REPO_PATH;

if (BOT_TOKEN === undefined) {
  throw new TypeError('BOT_TOKEN must be provided!')
}

if (GITHUB_TOKEN === undefined) {
  throw new TypeError('GITHUB_TOKEN must be provided!')
}

module.exports = async (request, response) => {
  // Create our new bot handler with the token that the Botfather gave us
  // Use an environment variable so we don't expose it in our code
  const bot = new TelegramBot(BOT_TOKEN);
  const octokit = new Octokit({auth: GITHUB_TOKEN,});

  // Retrieve the POST request body that gets sent from Telegram
  const { message } = request.body;

  // Ensure that this is a message being sent
  if (message) {
    // Retrieve the ID for this chat and the text that the user sent
    const { chat: { id }, text, message_id } = message;

    try {
      const { output } = await costflow.parse(text, config);
      // Send our new message back and wait for the request to finish
      await bot.sendMessage(id, output, { reply_to_message_id: message_id });
      // Get BeanCount repo info from Github 
      const response = await octokit.request(
        'GET /repos/{owner}/{repo}/contents/{path}', {
          owner: OWNER,
          repo: REPO,
          path: PATH,
        }
      );
      const  { content: encodeContent, encoding, sha, path } = response.data;
      const content = Buffer.from(encodeContent, encoding).toString();
      
      // Commit ${output} to bean file
      await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
        path: path,
        sha: sha,
        owner: OWNER,
        repo: REPO,
        message: 'add postings',
        content: Buffer.from(`${content}${output}\n\n`).toString('base64'),
      });
    } catch (e) {
      console.log(e);
      await bot.sendMessage(id, e.message, {
        reply_to_message_id:  message_id,
      });
    }
  }

  response.send('OK');
};
