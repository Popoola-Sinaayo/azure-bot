function extractFirstItemId(html) {
  const regex = /itemid="([^"]+)"/;
  const match = regex.exec(html);

  return match ? match[1] : null; // Return the first match or null if no match
}

function removeFirstTwoLines(text) {
  const lines = text.split("\r\n"); // Split text into lines based on "\r\n"
  lines.splice(0, 4); // Remove the first two lines
  console.log(lines.join("\r\n").replace(/<at>.*?<\/at>/g, ""));
  return lines.join("\r\n").replace(/<at>.*?<\/at>/g, ""); // Join the remaining lines back together
}

module.exports = { extractFirstItemId, removeFirstTwoLines };
