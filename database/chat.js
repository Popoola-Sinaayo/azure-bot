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
});

const Chat = mongoose.model("Chat", chatSchema);

module.exports = Chat;
