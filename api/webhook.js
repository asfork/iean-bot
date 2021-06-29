// https://github.com/yagop/node-telegram-bot-api/issues/319#issuecomment-324963294
// Fixes an error with Promise cancellation
process.env.NTBA_FIX_319 = 'test';

// Require our Telegram helper package
const TelegramBot = require('node-telegram-bot-api')

// Require Costflow package
const costflow = require('costflow').default;

const config = {
  mode: 'beancount',
  currency: 'CNY',
  timezone: 'Asia/Shanghai',
  tag: '#costflow'
};

if (process.env.BOT_TOKEN === undefined) {
  throw new TypeError('BOT_TOKEN must be provided!')
}

module.exports = async (request, response) => {
  // Create our new bot handler with the token
  // that the Botfather gave us
  // Use an environment variable so we don't expose it in our code
  const bot = new TelegramBot(process.env.BOT_TOKEN);

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
    } catch (e) {
      await bot.sendMessage(id, e.message, {
        reply_to_message_id:  message_id,
      });
    }
  }

  response.send('OK');
};