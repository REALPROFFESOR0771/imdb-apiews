import { parse } from "node-html-parser";
import apiRequestRawHtml from "./apiRequest.js";

export default async function seriesFetcher(id) {
  try {
    const firstSeason = await getSeason({ id, seasonId: 1 });

    return {
      all_seasons: firstSeason.all_seasons ?? [],
      seasons: firstSeason.name
        ? [{ ...firstSeason, all_seasons: undefined }]
        : []
    };

  } catch (err) {
    return {
      all_seasons: [],
      seasons: [],
      error: true,
      message: err.message || "Failed to fetch series data"
    };
  }
}

export async function getSeason({ id, seasonId }) {
  try {
    const html = await apiRequestRawHtml(
      `https://www.imdb.com/title/${id}/episodes?season=${seasonId}`
    );

    if (!html || html.length < 50) {
      return { error: true, message: "Invalid HTML for episodes page" };
    }

    const dom = parse(html);
    const nextData = dom.querySelector("#__NEXT_DATA__");

    if (!nextData) {
      return { error: true, message: "__NEXT_DATA__ missing in episodes page" };
    }

    let json;
    try {
      json = JSON.parse(nextData.text || "{}");
    } catch (err) {
      return { error: true, message: "Failed to parse NEXT_DATA JSON" };
    }

    const content = json?.props?.pageProps?.contentData?.section;
    if (!content) {
      return { error: true, message: "Episodes data missing" };
    }

    const episodes = content?.episodes?.items ?? {};
    const seasons = content?.seasons ?? [];

    const episodeList = Object.values(episodes).map((e, i) => ({
      idx: i + 1,
      no: e?.episode ?? null,
      title: e?.titleText ?? "",
      image: e?.image?.url ?? "",
      image_large: e?.image?.url ?? "",
      image_caption: e?.image?.caption ?? "",
      plot: e?.plot ?? "",
      publishedDate: e?.releaseDate
        ? new Date(
            e.releaseDate.year,
            e.releaseDate.month - 1,
            e.releaseDate.day
          ).toISOString()
        : null,
      rating: {
        count: e?.voteCount ?? 0,
        star: e?.aggregateRating ?? 0
      }
    }));

    return {
      name: json?.props?.pageProps?.contentData?.entityMetadata?.titleText?.text ?? "",
      episodes: episodeList,
      all_seasons: seasons.map((s) => ({
        id: s?.value ?? null,
        name: `Season ${s?.value ?? "?"}`,
        api_path: `/title/${id}/season/${s?.value}`
      }))
    };

  } catch (err) {
    return {
      error: true,
      message: err.message || "Failed to load season"
    };
  }
}
