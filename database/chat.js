const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema({
  conversationId: {
    type: String,
    required: true,
  },
  userContext: {
    type: String,
    required: true,
    default: {},
  },
});

const Chat = mongoose.model("Chat", chatSchema);

module.exports = Chat;
