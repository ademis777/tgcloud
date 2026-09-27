export async function GET() {
  return Response.json({ app: "TG-Cloud", status: "ok" }, { headers: { "Cache-Control": "no-store" } });
}
