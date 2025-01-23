const restify = require("restify");
const botbuilder = require("botbuilder");
const axios = require("axios");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Chat = require("./database/chat");
const { extractFirstItemId, removeFirstTwoLines } = require("./extractItemId");
dotenv.config();

// Create bot adapter, which defines how the bot sends and receives messages.
var adapter = new botbuilder.BotFrameworkAdapter({
  appId: process.env.APP_ID,
  appPassword: process.env.APP_PASSWORD,
});

const botMemory = new botbuilder.MemoryStorage();
const conversationState = new botbuilder.ConversationState(botMemory);

const tenantId = process.env.TENANT_ID; // Your Azure AD Tenant ID
const clientId = process.env.CLIENT_ID; // Your Azure AD App (Client) ID
const clientSecret = process.env.CLIENT_SECRET; // Your Client Secret
const scope = "https://graph.microsoft.com/.default"; // The scope for Microsoft Graph
const teamsId = process.env.TEAMS_ID; // Teams ID
const channelId = process.env.CHANNEL_ID; // Channel ID of the channel where you want to send the message

// OAuth 2.0 Token Endpoint for Azure AD
const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

// Request body to get the access token
const requestBody = new URLSearchParams({
  client_id: clientId,
  client_secret: clientSecret,
  scope: scope,
  grant_type: "client_credentials", // Client Credentials Flow
});

async function getAccessToken() {
  try {
    const response = await axios.post(tokenUrl, requestBody, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const accessToken = response.data.access_token;
    console.log("Access Token:", accessToken); // Access Token for Microsoft Graph API
    return accessToken;
  } catch (error) {
    console.error("Error getting access token:", error);
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
  mongoose.connect(process.env.MONGO_URI).then(() => {
    console.log("Connected to MongoDB");
  });
  console.log(`\n${server.name} listening to ${server.url}`);
  console.log(
    `\nGet Bot Framework Emulator: https://aka.ms/botframework-emulator`
  );
});

let context;

// Listen for incoming requests at /api/messages.
server.post("/api/messages", (req, res, next) => {
  // Use the adapter to process the incoming web request into a TurnContext object.
  adapter.processActivity(req, res, async (turnContext) => {
    // Do something with this incoming activity!
    if (turnContext.activity.type === "message") {
      const channelId = turnContext.activity.channelId;
      // console.log(channelId)
      if (channelId === "msteams") {
        const ref = botbuilder.TurnContext.getConversationReference(
          turnContext.activity
        );
        console.log(turnContext);
        console.log(
          extractFirstItemId(turnContext.activity.attachments[0].content)
        );
        console.log(turnContext.activity.topicName);
        // Message is from Microsoft Teams
        // const client = adapter.createConnectorClient(
        //   "https://webchat.botframework.com/"
        // );

        adapter.continueConversation(
          {
            serviceUrl: "https://webchat.botframework.com/",
            conversation: {
              id: "Inlf2fl4SOMDsnOAIDijif-uk",
            },
            bot: {
              id: "schedu-bot@34g493HcjeW7nbsfCvaItR2U5GttsMAUb2f1eV1fTqUo9KsWKQSuJQQJ99BAACGhslBAArohAAABAZBS1r6s",
              name: "schedu-bot",
            },
            // user: { id: "A79a5XutaxK", name: "You", role: "user" },
          },
          async (subTurnContext) => {
            console.log(turnContext.activity);
            const utterance = turnContext.activity.text;
            console.log(utterance)
            console.log(removeFirstTwoLines(utterance));
            console.log("Received message from Microsoft Teams");
            console.log("sending to webchat");
            await subTurnContext.sendActivity(removeFirstTwoLines(utterance));
          }
        );

        // const utterance = turnContext.activity.text;
        // console.log("Received message from Microsoft Teams");

        try {
          // console.log("sending to webchat");
          // await client.conversations.sendToConversation(
          //   "Inlf2fl4SOMDsnOAIDijif-uk",
          //   // "4f4a2210-d90f-11ef-ad84-61ab309b4730|livechat",
          //   {
          //     type: "message",
          //     channelData: {
          //       channel: {
          //         id: "webchat",
          //         channelId: "webchat",
          //       },
          //     },
          //     from: {
          //       id: turnContext.activity.from.id,
          //       name: "teams",
          //     },
          //     text: utterance,
          //   }
          // );
        } catch (error) {
          console.log(error);
        }

        // console.log(context);
        // await subTurnContext.sendActivity(`I heard you say ${utterance}`);

        // Handle Teams-specific logic here
      } else {
        // Message is from another channel or direct conversation
        console.log("Received message from a user");
        const ref = botbuilder.TurnContext.getConversationReference(
          turnContext.activity
        );
        console.log(turnContext.activity);
        // await Chat.create({
        //   conversationId: turnContext.activity.conversation.id,
        //   userContext: JSON.stringify(turnContext),
        // });
        context = turnContext;
        const client = adapter.createConnectorClient(
          "https://smba.trafficmanager.net/uk/35f419d7-33ae-45a8-8255-1945a78a7e21/"
        );

        try {
          console.log("sending to teams");

          const utterance = turnContext.activity.text;

          const data = await client.conversations.sendToConversation(
            "a:1RcHkx6yD3kLA_Jbmk1oo8QhAU1b_3l2A4oJ05weo_U8dGjdJlCkXiadO3rVt1NxrHfh1fEOK2-jSmdEDkLcONsMf--QGuo9w6yf_pPhAsF4_rm6MEAH6mWHmfqKpRP33",
            {
              type: "message",
              channelData: {
                channel: {
                  id: "msteams",
                },
              },
              from: {
                id: turnContext.activity.from.id,
                name: "webchat",
              },
              text: utterance,
              id: "123",
              callerId: turnContext.activity.from.id,
              label: "webchat",
              name: "webchat",
              topicName: "webchat",
            }
          );
          console.log(data);
          // const teams = new botbuilder.TeamsActivityHandler();
        } catch (error) {
          console.log(error);
        }

        // Handle user-specific logic here
      }
      // Get the user's text
      // const userState = conversationState.createProperty("userData");
      // let userData = await userState.get(turnContext, {});
      // userData.lastMessage = turnContext.activity.text;
      // await userState.set(turnContext, userData);

      // send a reply
    }
  });
});
