import apiRequestRawHtml from "./apiRequest.js";
import { parse } from "node-html-parser";
import seriesFetcher from "./seriesFetcher.js";

export default async function getTitle(id) {
  try {
    // Fetch IMDB HTML
    const html = await apiRequestRawHtml(`https://www.imdb.com/title/${id}`);

    if (!html || html.length < 50) {
      return { error: true, message: "Empty or invalid HTML received from IMDB" };
    }

    // Parse HTML
    const dom = parse(html);
    if (!dom) {
      return { error: true, message: "Failed to parse HTML" };
    }

    // Extract NEXT_DATA
    const nextData = dom.querySelector("#__NEXT_DATA__");
    if (!nextData) {
      return { error: true, message: "__NEXT_DATA__ not found on IMDB page" };
    }

    // Parse JSON inside NEXT_DATA
    let json;
    try {
      json = JSON.parse(nextData.text || "{}");
    } catch (err) {
      return { error: true, message: "Failed to parse IMDB NEXT_DATA JSON" };
    }

    const props = json?.props?.pageProps;
    if (!props) {
      return { error: true, message: "pageProps missing in IMDB data" };
    }

    const above = props?.aboveTheFoldData || {};
    const mainCol = props?.mainColumnData || {};

    // Begin building safe return object
    const data = {
      id: id,
      review_api_path: `/reviews/${id}`,
      imdb: `https://www.imdb.com/title/${id}`,

      contentType: above?.titleType?.id ?? "unknown",
      contentRating: above?.certificate?.rating ?? "N/A",

      isSeries: above?.titleType?.isSeries ?? false,

      productionStatus: above?.productionStatus?.currentProductionStage?.id ?? "unknown",
      isReleased:
        above?.productionStatus?.currentProductionStage?.id === "released",

      title: above?.titleText?.text ?? "",
      image: above?.primaryImage?.url ?? "",
      
      // images list
      images: Array.isArray(mainCol?.titleMainImages?.edges)
        ? mainCol.titleMainImages.edges
            .filter((e) => e?.__typename === "ImageEdge")
            .map((e) => e?.node?.url)
        : [],

      plot: above?.plot?.plotText?.plainText ?? "",
      
      runtime: above?.runtime?.displayableProperty?.value?.plainText ?? "",
      runtimeSeconds: above?.runtime?.seconds ?? 0,

      rating: {
        count: above?.ratingsSummary?.voteCount ?? 0,
        star: above?.ratingsSummary?.aggregateRating ?? 0,
      },

      genre: Array.isArray(above?.genres?.genres)
        ? above.genres.genres.map((e) => e?.id)
        : [],

      releaseDetailed: {
        date:
          above?.releaseDate?.year &&
          above?.releaseDate?.month &&
          above?.releaseDate?.day
            ? new Date(
                above.releaseDate.year,
                above.releaseDate.month - 1,
                above.releaseDate.day
              ).toISOString()
            : null,

        day: above?.releaseDate?.day ?? null,
        month: above?.releaseDate?.month ?? null,
        year: above?.releaseDate?.year ?? null,
      },

      year: above?.releaseDate?.year ?? null,
    };

    // Add series data if needed
    if (data.isSeries) {
      try {
        const seriesData = await seriesFetcher(id);
        Object.assign(data, seriesData);
      } catch (err) {
        data.seriesError = "Failed to fetch series info";
      }
    }

    return data;

  } catch (err) {
    return { error: true, message: err.message || "Unknown Worker Error" };
  }
}
