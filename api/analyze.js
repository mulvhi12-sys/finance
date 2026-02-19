export default async function handler(req, res) {
  res.status(200).json({ 
    key: !!process.env.GEMINI_API_KEY,
    prefix: process.env.GEMINI_API_KEY?.slice(0, 8)
  });
}
