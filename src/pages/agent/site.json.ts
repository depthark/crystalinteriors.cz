/** Machine-readable site facts for AI agents (prerendered). */
import type { APIRoute } from "astro";
import { getSiteData } from "@/lib/site-data";

export const GET: APIRoute = () =>
  new Response(JSON.stringify(getSiteData(), null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
