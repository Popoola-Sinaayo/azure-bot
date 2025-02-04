const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema({
  conversationId: {
    type: String,
  },
  userId: {
    type: String,
    required: true,
  },
  name: {
    type: String,
  },
  requestForName: {
    type: Boolean,
    default: false,
  },
  isRoutedToSupport: {
    type: Boolean,
    default: false,
  },
  isAwaitingRoutingResponse: {
    type: Boolean,
    default: false,
  },
  isAwaitingRoutingResponseCount: {
    type: Number,
    default: 0,
  },
});

const Chat = mongoose.model("Chat", chatSchema);

module.exports = Chat;
