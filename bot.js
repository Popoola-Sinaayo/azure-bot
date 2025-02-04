const restify = require("restify");
const botbuilder = require("botbuilder");
const { LuisRecognizer } = require("botbuilder-ai");
const axios = require("axios");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Chat = require("./database/chat");
const { extractFirstItemId, removeFirstTwoLines } = require("./extractItemId");
const {
  ConversationAnalysisClient,
  AzureKeyCredential,
} = require("@azure/ai-language-conversations");
const Question = require("./database/question");
dotenv.config();

// Create bot adapter, which defines how the bot sends and receives messages.
var adapter = new botbuilder.BotFrameworkAdapter({
  appId: process.env.APP_ID,
  appPassword: process.env.APP_PASSWORD,
});

// CLU configuration
const cluClient = new ConversationAnalysisClient(
  process.env.CLU_ENDPOINT,
  new AzureKeyCredential(process.env.CLU_API_KEY)
);
const cluProjectName = process.env.CLU_PROJECT_NAME;
const cluDeploymentName = process.env.CLU_DEPLOYMENT_NAME;

// Load environment variables
const endpoint = process.env.AZURE_QNA_ENDPOINT; // Example: https://your-resource-name.cognitiveservices.azure.com
const apiKey = process.env.AZURE_QNA_API_KEY; // Your QnA service key
const projectName = process.env.AZURE_QNA_PROJECT; // Your QnA project name
const deploymentName = "production";

// Initialize the SDK client

async function queryQnA(question) {
  try {
    const url = `${endpoint}/language/:query-knowledgebases?projectName=${projectName}&deploymentName=${deploymentName}&api-version=2021-10-01`;

    const headers = {
      "Ocp-Apim-Subscription-Key": apiKey,
      "Content-Type": "application/json",
    };

    const body = {
      question: question,
      top: 1,
    };

    const response = await axios.post(url, body, { headers });

    if (response.data.answers.length > 0) {
      return response.data.answers[0].answer; // Return the best answer
    } else {
      return "No answer found.";
    }
  } catch (error) {
    console.error(
      "Error querying Azure QnA:",
      error.response?.data || error.message
    );
  }
}

// const botMemory = new botbuilder.MemoryStorage();
// const conversationState = new botbuilder.ConversationState(botMemory);

// OAuth 2.0 Token Endpoint for Azure AD

const RandomChannelID = "19:9f456709481340dbb9f963dddaaef137@thread.v2";
const PersonalChannelID =
  "a:1RcHkx6yD3kLA_Jbmk1oo8QhAU1b_3l2A4oJ05weo_U8dGjdJlCkXiadO3rVt1NxrHfh1fEOK2-jSmdEDkLcONsMf--QGuo9w6yf_pPhAsF4_rm6MEAH6mWHmfqKpRP33";

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

// Listen for incoming requests at /api/messages.
server.post("/api/messages", (req, res, next) => {
  // Use the adapter to process the incoming web request into a TurnContext object.
  adapter.processActivity(req, res, async (turnContext) => {
    // Do something with this incoming activity!
    if (turnContext.activity.type === "message") {
      const channelId = turnContext.activity.channelId;
      // console.log(channelId)
      if (channelId === "msteams") {
        // console.log(turnContext.activity.entities[0]);
        const conversationId = extractFirstItemId(
          turnContext.activity.attachments[0].content
        );
        // console.log(conversationId, "conversation id");
        if (!conversationId) {
          return await turnContext.sendActivity(
            "I can't find the user to reply, make sure you reply to a user's message"
          );
        }
        const user = await Chat.findOne({
          conversationId,
        });
        // console.log(user);
        if (!user) {
          return await turnContext.sendActivity(
            "I can't find the user to reply, make sure you reply to a user's message"
          );
        }

        adapter.continueConversation(
          {
            serviceUrl: "https://webchat.botframework.com/",
            conversation: {
              id: user.userId,
            },
            bot: {
              id: "schedu-bot@34g493HcjeW7nbsfCvaItR2U5GttsMAUb2f1eV1fTqUo9KsWKQSuJQQJ99BAACGhslBAArohAAABAZBS1r6s",
              name: "schedu-bot",
            },
          },
          async (subTurnContext) => {
            // console.log(turnContext.activity);
            const utterance = turnContext.activity.text;
            // console.log(utterance);
            // console.log(removeFirstTwoLines(utterance));
            console.log("Received message from Microsoft Teams");
            console.log("sending to webchat");
            await subTurnContext.sendActivity(removeFirstTwoLines(utterance));
          }
        );

        // const utterance = turnContext.activity.text;
        // console.log("Received message from Microsoft Teams");

        // console.log(context);
        // await subTurnContext.sendActivity(`I heard you say ${utterance}`);

        // Handle Teams-specific logic here
      } else {
        // Message is from another channel or direct conversation

        console.log("Received message from a user");

        // console.log(turnContext.activity);
        let user = await Chat.findOne({
          userId: turnContext.activity.conversation.id,
        });

        if (!user) {
          user = await Chat.create({
            userId: turnContext.activity.conversation.id,
          });
        }

        if (!user.name && !user.requestForName) {
          user.requestForName = true;
          await user.save();
          return turnContext.sendActivity(
            "Please type your name only in the chat box, we need it to identify you"
          );
        }

        if (!user.name && user.requestForName) {
          user.name = turnContext.activity.text;
          user.requestForName = false;
          await user.save();
          return turnContext.sendActivity(
            `Thanks, I have your name now. You'll be referred to as ${user.name}, how can I help you?`
          );
        }

        try {
          if (user.isRoutedToSupport) {
            const client = adapter.createConnectorClient(
              "https://smba.trafficmanager.net/uk/35f419d7-33ae-45a8-8255-1945a78a7e21/"
            );
            // console.log("sending to teams");
            const utterance = turnContext.activity.text;
            const data = await client.conversations.sendToConversation(
              RandomChannelID,
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
                text: `${utterance} -- ${user.name}`,
              }
            );
            // console.log(data);
            if (!user) {
              await Chat.create({
                conversationId: data.id,
                userId: turnContext.activity.conversation.id,
              });
            } else {
              user.conversationId = data.id;
              await user.save();
            }
          } else {
            if (user.isAwaitingRoutingResponse) {
              const cluResult = await cluClient.analyzeConversation({
                kind: "Conversation",
                analysisInput: {
                  conversationItem: {
                    text: turnContext.activity.text,
                    id: "1",
                    participantId: "user",
                  },
                },
                parameters: {
                  projectName: cluProjectName,
                  deploymentName: cluDeploymentName,
                },
              });
              const topIntent = cluResult.result.prediction.topIntent;
              console.log(topIntent);
              switch (topIntent) {
                case "CustomerSupport":
                  await turnContext.sendActivity(
                    "Let me connect you to customer support. Please wait..."
                  );
                  user.isAwaitingRoutingResponse = false;
                  user.isRoutedToSupport = true;
                  user.isAwaitingRoutingResponseCount = 0;
                  await user.save();
                  await turnContext.sendActivity(
                    "You have been routed to support, please type your message"
                  );

                  // Add logic to route to customer support
                  break;

                case "Satisfied":
                  await turnContext.sendActivity(
                    "Great! Let me know if you have more questions."
                  );
                  user.isAwaitingRoutingResponse = false;
                  user.isRoutedToSupport = false;
                  user.isAwaitingRoutingResponseCount = 0;
                  await user.save();
                  break;

                case "NotSatisfied":
                  if (user.isAwaitingRoutingResponseCount < 2) {
                    await turnContext.sendActivity(
                      "I'm sorry to hear that. Please rephrase your question again"
                    );
                    user.isAwaitingRoutingResponseCount++;
                    await user.save();
                  } else {
                    await turnContext.sendActivity(
                      "I'm sorry to hear that. Let me connect you to customer support. Please wait..."
                    );
                    user.isAwaitingRoutingResponse = false;
                    user.isRoutedToSupport = true;
                    user.isAwaitingRoutingResponseCount = 0;
                    await user.save();
                    // Add logic to route to customer support
                  }
                  // Add logic to route to customer support
                  break;

                default:
                  // Fallback to QnA Maker
                  const response = await queryQnA(turnContext.activity.text);
                  // console.log(response);
                  await turnContext.sendActivity(response);
                  await turnContext.sendActivity(
                    "Are you satisfied with the response?"
                  );
                  user.isAwaitingRoutingResponse = true;
                  await user.save();
                  Question.create({
                    question: turnContext.activity.text,
                  });
                  break;
              }
            } else {
              const response = await queryQnA(turnContext.activity.text);

              // console.log(response);
              await turnContext.sendActivity(response);
              await turnContext.sendActivity(
                "Are you satisfied with the response?"
              );
              user.isAwaitingRoutingResponse = true;
              await user.save();
              Question.create({
                question: turnContext.activity.text,
              });
            }
          }

          // const teams = new botbuilder.TeamsActivityHandler();
        } catch (error) {
          console.log(error);
        }
      }
    }
  });
});

server.get("*", (req, res, next) => {
  return res.send("Hello World");
});
