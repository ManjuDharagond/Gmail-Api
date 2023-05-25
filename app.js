const { google } = require('googleapis');
const dotenv = require('dotenv');

dotenv.config();

// const credentials = {
//     client_id: process.env.CLIENT_ID,
//     client_secret: process.env.CLIENT_SECRET,
//     redirect_uri: process.env.REDIRECT_URI,
// };

// const auth = new google.auth.OAuth2(credentials);


const auth = new google.auth.OAuth2(
  "645021927496-pbdtvson82u4o7s5f4pn33pirqc6ms5v.apps.googleusercontent.com", "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",  ["http://localhost/3000"]);

auth.setCredentials({
  refresh_token: "1//0gFWExpLegJ7DCgYIARAAGBASNwF-L9IrEsNbf8yM4PBzU6be4I_Hs1g4VDIrJne9ZfAm0k_40OtT8Z5lUcsnDJh4d4vbbb7T6_M"
});

const gmail = google.gmail({ version: 'v1', auth });



// Function to generate a random interval between 45 and 120 seconds
function getRandomInterval() {
    return Math.floor(Math.random() * (120 - 45 + 1)) + 45;
  }
  
  // Function to check if an email has any prior replies
  async function hasPriorReplies(messageId) {
    const response = await gmail.users.threads.get({
      userId: 'me',
      id: messageId,
    });
  
    const { messages } = response.data;
  
    return messages.length > 1;
  }
  
  // Function to send an email reply
  async function sendEmailReply(messageId, threadId, to, subject, body) {
    const emailLines = [];
  
    emailLines.push(`To: ${to}`);
    emailLines.push('Content-Type: text/html; charset=utf-8');
    emailLines.push('MIME-Version: 1.0');
    emailLines.push(`Subject: Re: ${subject}`);
    emailLines.push('');
    emailLines.push(body);
  
    const email = emailLines.join('\r\n').trim();
  
    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        threadId,
        raw: Buffer.from(email).toString('base64'),
      },
    });
  
    return response;
  }
  
  // Function to create or get a label by name
  async function getOrCreateLabel(name) {
    const response = await gmail.users.labels.list({ userId: 'me' });
    const label = response.data.labels.find((l) => l.name === name);
  
    if (label) {
      return label;
    }
  
    const createResponse = await gmail.users.labels.create({
      userId: 'me',
      requestBody: {
        name,
      },
    });
  
    return createResponse.data;
  }
  
  // Function to add a label to a thread
  async function addLabelToThread(threadId, labelId) {
    await gmail.users.threads.modify({
      userId: 'me',
      id: threadId,
      requestBody: {
        addLabelIds: [labelId],
      },
    });
  }


  // Function to fetch new emails and send replies if necessary
async function processEmails() {
    const response = await gmail.users.threads.list({ userId: 'me', q: 'is:unread' });
    const { threads } = response.data;
  
    for (const thread of threads) {
      
      const { id: threadId } = thread;



      const threadResponse = await gmail.users.threads.get({ userId: 'me', id: threadId });
      const messages = threadResponse.data.messages;

      const message = messages[0];
      const { id: messageId, payload } = message;
      
      
      // const message = thread.messages[0];
      // const { id: messageId, payload } = message;
  
      const fromHeader = payload.headers.find((header) => header.name === 'From');
      const { value: from } = fromHeader;
  
      const subjectHeader = payload.headers.find((header) => header.name === 'Subject');
      const { value: subject } = subjectHeader;
  
      const hasReplies = await hasPriorReplies(messageId);
  
      if (!hasReplies) {
        // Send email reply
        const replyBody = 'Thank you for your email. I am currently on vacation and will respond to you as soon as possible.';
        await sendEmailReply(messageId, threadId, from, subject, replyBody);
  
        // Add label to the email
        const label = await getOrCreateLabel('Vacation Auto Reply');
        await addLabelToThread(threadId, label.id);
      }
    }
  }
  
  // Function to run the app in a loop with random intervals
  async function runApp() {
    while (true) {
      await processEmails();
  
      const interval = getRandomInterval() * 1000;
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
  }
  
  // Run the app
  runApp().catch(console.error);
  