import { FireworksAI } from "@fireworksai/sdk";
const fireworksAI = new FireworksAI({
  apiKey: "fw_3ZcoZYaRUVPbhAHUiXsjBUt1",
});

const result = await fireworksAI.chat.completions.create({
  model: "accounts/fireworks/models/deepseek-r1", // Use Any model you want!
  maxTokens: 20000,
  messages: [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: "What are the candidate's BA and MBA GPAs?",
        },
        {
          // Do RAG over any image or PDF file just by passing in the URL with #transform=inline at the end!
          type: "image_url",
          imageUrl: {
            url: "https://storage.googleapis.com/fireworks-public/test/sample_resume.pdf#transform=inline",
          },
        },
      ],
    },
  ],
});

console.log(result.choices[0].message.content);
