import "dotenv/config";

// --------------------
// YouTube
// --------------------
export async function publishYouTube(
  file: string,
  title: string,
  hashtags: string[]
) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const accessToken = process.env.YOUTUBE_ACCESS_TOKEN;

  if (!accessToken) {
    console.warn("⚠️ Missing YOUTUBE_ACCESS_TOKEN in .env");
    return { status: "error", message: "No token" };
  }

  // En la vida real: subirías el archivo en multipart/form-data
  // Endpoint: POST https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable
  // Aquí simulamos:
  console.log(`📺 Uploading ${file} to YouTube with title "${title}"`);

  return {
    platform: "youtube",
    file,
    title,
    hashtags,
    status: "ok (simulated)",
  };
}

// --------------------
// Instagram
// --------------------
export async function publishInstagram(
  file: string,
  title: string,
  hashtags: string[]
) {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const igBusinessId = process.env.INSTAGRAM_BUSINESS_ID;

  if (!accessToken || !igBusinessId) {
    console.warn("⚠️ Missing Instagram credentials in .env");
    return { status: "error", message: "No token/ID" };
  }

  // En la vida real:
  // 1) POST video → /{igBusinessId}/media
  // 2) POST publish → /{igBusinessId}/media_publish
  console.log(
    `📸 Uploading ${file} to Instagram with caption "${title} ${hashtags.join(
      " "
    )}"`
  );

  return {
    platform: "instagram",
    file,
    caption: `${title} ${hashtags.join(" ")}`,
    status: "ok (simulated)",
  };
}

// --------------------
// TikTok
// --------------------
export async function publishTikTok(
  file: string,
  title: string,
  hashtags: string[]
) {
  const accessToken = process.env.TIKTOK_ACCESS_TOKEN;
  const advertiserId = process.env.TIKTOK_ADVERTISER_ID;

  if (!accessToken || !advertiserId) {
    console.warn("⚠️ Missing TikTok credentials in .env");
    return { status: "error", message: "No token/advertiserId" };
  }

  // En la vida real:
  // Endpoint: POST https://open-api.tiktokglobalshop.com/video/upload/
  console.log(
    `🎵 Uploading ${file} to TikTok with description "${title} ${hashtags.join(
      " "
    )}"`
  );

  return {
    platform: "tiktok",
    file,
    description: `${title} ${hashtags.join(" ")}`,
    status: "ok (simulated)",
  };
}
