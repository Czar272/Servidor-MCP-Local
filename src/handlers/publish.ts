import {
  publishYouTube,
  publishInstagram,
  publishTikTok,
} from "../utils/apis.js";

export async function handlePublish(params: {
  platform: string;
  file: string;
  title: string;
  hashtags: string[];
}) {
  switch (params.platform) {
    case "youtube":
      return await publishYouTube(params.file, params.title, params.hashtags);
    case "instagram":
      return await publishInstagram(params.file, params.title, params.hashtags);
    case "tiktok":
      return await publishTikTok(params.file, params.title, params.hashtags);
    default:
      throw new Error("Unsupported platform");
  }
}
