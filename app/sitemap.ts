import type { MetadataRoute } from "next";

const ROUTES = ["", "/predictions", "/countries", "/correlations", "/markets", "/zeno", "/contact"];

export default function sitemap(): MetadataRoute.Sitemap {
  return ROUTES.map((path) => ({
    url: `https://allforecasts.com${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.7,
  }));
}
