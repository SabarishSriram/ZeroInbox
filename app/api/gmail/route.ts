import { fetchEmail } from "./fetchEmail";
import { analyzeSenders } from "./emailStats";

export async function GET(req: Request) {
  const accessToken = process.env.ACCESS_TOKEN!;
  const emails = await fetchEmail(accessToken);

  if (emails instanceof Response) {
    return emails;
  }

  const stats = analyzeSenders(emails);
  return Response.json(stats);
}
