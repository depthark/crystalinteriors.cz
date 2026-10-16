/** Prerendered share images: /og/<slug>.jpg (see src/lib/og-image.ts). */
import type { APIRoute, GetStaticPaths } from "astro";
import { ogPages, renderOgImage, type OgPage } from "@/lib/og-image";

export const getStaticPaths: GetStaticPaths = () =>
  ogPages().map((page) => ({ params: { slug: page.slug }, props: { page } }));

export const GET: APIRoute = async ({ props }) =>
  new Response(new Uint8Array(await renderOgImage((props as { page: OgPage }).page)), {
    headers: { "Content-Type": "image/jpeg" },
  });
