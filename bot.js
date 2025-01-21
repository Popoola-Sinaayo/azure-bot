const restify = require("restify");
const botbuilder = require("botbuilder");
const axios = require("axios");
const dotenv = require("dotenv");
dotenv.config();


// Create bot adapter, which defines how the bot sends and receives messages.
var adapter = new botbuilder.BotFrameworkAdapter({
  appId: process.env.APP_ID,
  appPassword: process.env.APP_PASSWORD,
});

const botMemory = new botbuilder.MemoryStorage()
const conversationState = new botbuilder.ConversationState(botMemory)


const tenantId = process.env.TENANT_ID; // Your Azure AD Tenant ID
const clientId = process.env.CLIENT_ID; // Your Azure AD App (Client) ID
const clientSecret = process.env.CLIENT_SECRET; // Your Client Secret
const scope = 'https://graph.microsoft.com/.default'; // The scope for Microsoft Graph
const teamsId = process.env.TEAMS_ID; // Teams ID
const channelId =
  process.env.CHANNEL_ID; // Channel ID of the channel where you want to send the message

// OAuth 2.0 Token Endpoint for Azure AD
const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

// Request body to get the access token
const requestBody = new URLSearchParams({
  client_id: clientId,
  client_secret: clientSecret,
  scope: scope,
  grant_type: 'client_credentials', // Client Credentials Flow
});

async function getAccessToken() {
  try {
    const response = await axios.post(tokenUrl, requestBody, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    
    const accessToken = response.data.access_token;
    console.log('Access Token:', accessToken); // Access Token for Microsoft Graph API
    return accessToken;
  } catch (error) {
    console.error('Error getting access token:', error);
  }
}

// const getTeamsDetails = async () => {
//   try {
//     // const token = await getAccessToken();
//     const response = await axios.get(
//       `https://graph.microsoft.com/v1.0/teams/${teamsId}/channels`,
//       {
//         headers: {
// },
//       }
//     );
//     console.log('Teams Details:', response.data);
//   } catch (error) { 
//     console.error('Error getting teams details:', error?.response?.data?.error);
//   }
// }

async function sendMessageToTeamsChannel(message) {
  try {
    const accessToken = await getAccessToken(); // Implement this to retrieve an OAuth token
  const response = await axios.post(
      `https://graph.microsoft.com/v1.0/teams/${teamsId}/channels/${channelId}/messages`,
      {
        body: {
          content: message,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.log(error?.response?.data?.error);
  }
}

// var adapter = new botbuilder.


// Create HTTP server.
let server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
  // sendMessageToTeamsChannel('Hello from the bot');
  console.log(`\n${server.name} listening to ${server.url}`);
  console.log(
    `\nGet Bot Framework Emulator: https://aka.ms/botframework-emulator`
  );
});

// Listen for incoming requests at /api/messages.
server.post("/api/messages", (req, res, next) => {
  // Use the adapter to process the incoming web request into a TurnContext object.
  adapter.processActivity(req, res, async (turnContext) => {
    const a = botbuilder.TurnContext.getConversationReference(turnContext.activity);
    console.log(a)
    // Do something with this incoming activity!
      if (turnContext.activity.type === "message") {
          const channelId = turnContext.activity.channelId; 
        console.log(channelId)
         if (channelId === "msteams") {
           // Message is from Microsoft Teams
           console.log("Received message from Microsoft Teams");
           // Handle Teams-specific logic here
         } else {
           // Message is from another channel or direct conversation
           console.log("Received message from a user");
           // Handle user-specific logic here
         }
        // Get the user's text
        // const userState = conversationState.createProperty("userData");
        // let userData = await userState.get(turnContext, {});
        // userData.lastMessage = turnContext.activity.text;
        // await userState.set(turnContext, userData);

        const client = adapter.createConnectorClient(
          a.serviceUrl
        );
      const utterance = turnContext.activity.text;

        
        // try {
        //   console.log("sending to teams")
        //   await client.conversations.sendToConversation(teamsId, {
        //     type: "message",
        //     channelData: {
        //       channel: {
        //         id: channelId,
        //       },
        //     },
        //     text: utterance,
        //   });
        // } catch (error) {
        //   console.log(error)
        // }

      // send a reply
      await turnContext.sendActivity(`I heard you say ${utterance}`);
    }
  });
});
