export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    try {
      const url = new URL(request.url);

      const latParam = url.searchParams.get("lat");
      const lngParam = url.searchParams.get("lng");
      const type =
        url.searchParams.get("type") || "restaurant";

      if (latParam === null || lngParam === null) {
        return jsonResponse(
          {
            error: "Missing lat or lng",
          },
          400,
          corsHeaders
        );
      }

 const lat = Number(latParam);
 const lng = Number(lngParam);

// Distance selected by frontend.
// Allowed values: 5 / 10 / 20 / 50 miles.
const radiusMiles = Math.min(
  50,
  Math.max(
    5,
    Number(url.searchParams.get("radius")) || 10
  )
);

const radiusMeters = Math.round(
  radiusMiles * 1609.34
);

      if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng) ||
        lat < -90 ||
        lat > 90 ||
        lng < -180 ||
        lng > 180
      ) {
        return jsonResponse(
          {
            error: "Invalid location",
          },
          400,
          corsHeaders
        );
      }

      if (!env.GOOGLE_PLACES_API_KEY) {
        return jsonResponse(
          {
            error: "Google API key missing",
          },
          500,
          corsHeaders
        );
      }

      const foodQueries = {
        korean_restaurant: "Korean restaurant",
        japanese_restaurant: "Japanese restaurant",
        chinese_restaurant: "Chinese restaurant",
        italian_restaurant: "Italian restaurant",
        hamburger_restaurant: "burger restaurant",
        pizza_restaurant: "pizza restaurant",
        fast_food_restaurant: "fast food restaurant",
        hawaiian: "Hawaiian food restaurant",

        thai: "Thai restaurant",
        vietnamese: "Vietnamese restaurant",
        indian: "Indian restaurant",
        mexican: "Mexican restaurant",
        filipino: "Filipino restaurant",
        greek: "Greek restaurant",
        mediterranean: "Mediterranean restaurant",
        french: "French restaurant",
        spanish: "Spanish restaurant",
        middle_eastern: "Middle Eastern restaurant",
        cajun: "Cajun restaurant",
        caribbean: "Caribbean restaurant",

        // African food can be uncommon in some areas.
        // Ethiopian restaurants are also included.
        african:
          "African Ethiopian restaurant",

        brazilian: "Brazilian restaurant",
        peruvian: "Peruvian restaurant",

        american: "American restaurant",
        southern: "Southern food restaurant",
        bbq: "BBQ restaurant",
        seafood: "seafood restaurant",
        steakhouse: "steakhouse",

        sushi: "sushi restaurant",
        ramen: "ramen restaurant",
        pho: "pho restaurant",
        dim_sum: "dim sum restaurant",
        hot_pot: "hot pot restaurant",
        noodles: "noodle restaurant",
        poke: "poke restaurant",

        tacos: "taco restaurant",
        sandwiches: "sandwich restaurant",
        fried_chicken: "fried chicken restaurant",
        breakfast: "breakfast restaurant",
        brunch: "brunch restaurant",
        bakery: "bakery",
        food_truck: "food truck",
        local_food: "popular local food restaurant",

        restaurant: "popular restaurant",
      };

      const textQuery =
        foodQueries[type] || "popular local restaurant";



      const requestBody = {
  textQuery,

  // More restaurants = better random picks.
  pageSize: 50,

  locationBias: {
    circle: {
      center: {
        latitude: lat,
        longitude: lng,
      },
      radius: radiusMeters,
    },
  },
};

      const googleResponse = await fetch(
        "https://places.googleapis.com/v1/places:searchText",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key":
              env.GOOGLE_PLACES_API_KEY,
            "X-Goog-FieldMask": [
              "places.id",
              "places.displayName",
              "places.formattedAddress",
              "places.rating",
              "places.userRatingCount",
              "places.location",
            ].join(","),
          },

          body: JSON.stringify(requestBody),
        }
      );

      const data = await googleResponse.json();

      if (!googleResponse.ok) {
        return jsonResponse(
          {
            error: "Google Places API failed",
            status: googleResponse.status,
            details: data,
          },
          googleResponse.status,
          corsHeaders
        );
      }

      const nearbyPlaces = (data.places || [])
        .map((place) => {
          const placeLat =
            place.location?.latitude;

          const placeLng =
            place.location?.longitude;

          if (
            !Number.isFinite(placeLat) ||
            !Number.isFinite(placeLng)
          ) {
            return null;
          }

          const distance = distanceMiles(
            lat,
            lng,
            placeLat,
            placeLng
          );

          return {
            ...place,

            // Rounded for display.
            distanceMiles:
              Math.round(distance * 10) / 10,
          };
        })
        .filter((place) => {
  return (
    place !== null &&
    place.distanceMiles <= radiusMiles
  );
})
        .sort((a, b) => {
          return (
            a.distanceMiles -
            b.distanceMiles
          );
        });

      return jsonResponse(
  {
    query: textQuery,
    requestedType: type,

    searchCenter: {
      latitude: lat,
      longitude: lng,
    },

    maxDistanceMiles: radiusMiles,

    totalGoogleResults:
      (data.places || []).length,

    nearbyResultCount:
      nearbyPlaces.length,

    places: nearbyPlaces,
  },
  200,
  corsHeaders
);
    } catch (error) {
      return jsonResponse(
        {
          error: "Worker error",
          message:
            error instanceof Error
              ? error.message
              : String(error),
        },
        500,
        corsHeaders
      );
    }
  },
};

/**
 * Calculates straight-line distance between
 * two latitude/longitude points.
 */
function distanceMiles(
  lat1,
  lng1,
  lat2,
  lng2
) {
  const earthRadiusMiles = 3958.8;

  const lat1Radians = toRadians(lat1);
  const lat2Radians = toRadians(lat2);

  const latitudeDifference =
    toRadians(lat2 - lat1);

  const longitudeDifference =
    toRadians(lng2 - lng1);

  const a =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(lat1Radians) *
      Math.cos(lat2Radians) *
      Math.sin(longitudeDifference / 2) ** 2;

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return earthRadiusMiles * c;
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

function jsonResponse(data, status, headers) {
  return new Response(
    JSON.stringify(data, null, 2),
    {
      status,
      headers: {
        ...headers,
        "Content-Type":
          "application/json; charset=UTF-8",
      },
    }
  );
}
