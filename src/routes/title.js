import getTitle from "../helpers/getTitle.js";
import { getSeason } from "../helpers/seriesFetcher.js";

export default async function title(req) {
  const { id, seasonId } = req.params;

  try {
    if (seasonId) {
      const result = await getSeason({ id, seasonId });
      return Response.json({
        id,
        title_api_path: `/title/${id}`,
        imdb: `https://www.imdb.com/title/${id}/episodes?season=${seasonId}`,
        season_id: seasonId,
        ...result
      });
    }

    const result = await getTitle(id);

    // If getTitle returned an error object → return 200 with error JSON
    if (result?.error) {
      return Response.json(result);
    }

    return Response.json(result);

  } catch (error) {
    return Response.json(
      { error: true, message: error.message || "Unknown Worker Error" },
      { status: 200 }
    );
  }
}
