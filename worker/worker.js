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
          { error: "Missing lat or lng" },
          400,
          corsHeaders
        );
      }

      const lat = Number(latParam);
      const lng = Number(lngParam);

      if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng) ||
        lat < -90 ||
        lat > 90 ||
        lng < -180 ||
        lng > 180
      ) {
        return jsonResponse(
          { error: "Invalid location" },
          400,
          corsHeaders
        );
      }

      if (!env.GOOGLE_PLACES_API_KEY) {
        return jsonResponse(
          { error: "Google API key missing" },
          500,
          corsHeaders
        );
      }

      const requestedRadius = Number(
        url.searchParams.get("radius")
      );

      const allowedRadii = [5, 10, 20, 30];

      const radiusMiles = allowedRadii.includes(
        requestedRadius
      )
        ? requestedRadius
        : 10;

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
        african: "African Ethiopian restaurant",
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

      const searchPlan = buildSearchPlan(
        lat,
        lng,
        radiusMiles
      );

      const searchResponses = await Promise.all(
        searchPlan.map((search) =>
          searchGooglePlaces({
            env,
            textQuery,
            centerLat: search.latitude,
            centerLng: search.longitude,
            searchRadiusMiles:
              search.searchRadiusMiles,
          })
        )
      );

      const failedSearch = searchResponses.find(
        (result) => !result.ok
      );

      if (failedSearch) {
        return jsonResponse(
          {
            error: "Google Places API failed",
            status: failedSearch.status,
            details: failedSearch.data,
          },
          failedSearch.status,
          corsHeaders
        );
      }

      const allGooglePlaces = searchResponses.flatMap(
        (result) => result.data.places || []
      );

      const uniquePlaces = [
        ...new Map(
          allGooglePlaces
            .filter((place) => place?.id)
            .map((place) => [place.id, place])
        ).values(),
      ];

      const placesWithDistance = uniquePlaces
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

          const exactDistance = distanceMiles(
            lat,
            lng,
            placeLat,
            placeLng
          );

          return {
            ...place,
            distanceMiles:
              Math.round(exactDistance * 10) / 10,
          };
        })
        .filter(Boolean);

      const strictRange = getDistanceRange(
        radiusMiles,
        false
      );

      let filteredPlaces = filterAndSortPlaces(
        placesWithDistance,
        strictRange.min,
        strictRange.max
      );

      let usedFallbackRange = false;
      let activeRange = strictRange;

      // Avoid an empty Explore/Adventure result.
      // Only relax the lower bound; never exceed the chosen max.
      if (
        filteredPlaces.length === 0 &&
        radiusMiles >= 20
      ) {
        const fallbackRange = getDistanceRange(
          radiusMiles,
          true
        );

        filteredPlaces = filterAndSortPlaces(
          placesWithDistance,
          fallbackRange.min,
          fallbackRange.max
        );

        usedFallbackRange = true;
        activeRange = fallbackRange;
      }

      return jsonResponse(
        {
          query: textQuery,
          requestedType: type,

          searchCenter: {
            latitude: lat,
            longitude: lng,
          },

          selectedDistanceMiles: radiusMiles,
          minDistanceMiles: activeRange.min,
          maxDistanceMiles: activeRange.max,
          usedFallbackRange,

          googleSearchCount: searchPlan.length,
          totalGoogleResults:
            allGooglePlaces.length,
          uniqueGoogleResults:
            uniquePlaces.length,
          nearbyResultCount:
            filteredPlaces.length,

          places: filteredPlaces,
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

function buildSearchPlan(
  userLat,
  userLng,
  radiusMiles
) {
  if (radiusMiles <= 10) {
    return [
      {
        latitude: userLat,
        longitude: userLng,
        searchRadiusMiles: radiusMiles,
      },
    ];
  }

  const centerDistanceMiles =
    radiusMiles === 20 ? 15 : 25;

  const localSearchRadiusMiles =
    radiusMiles === 20 ? 8 : 8;

  const bearings = [0, 90, 180, 270];

  return bearings.map((bearing) => {
    const point = destinationPoint(
      userLat,
      userLng,
      centerDistanceMiles,
      bearing
    );

    return {
      latitude: point.latitude,
      longitude: point.longitude,
      searchRadiusMiles:
        localSearchRadiusMiles,
    };
  });
}

function getDistanceRange(
  radiusMiles,
  fallback
) {
  if (radiusMiles === 20) {
    return {
      min: fallback ? 6 : 10,
      max: 20,
    };
  }

  if (radiusMiles === 30) {
    return {
      min: fallback ? 12 : 20,
      max: 30,
    };
  }

  return {
    min: 0,
    max: radiusMiles,
  };
}

async function searchGooglePlaces({
  env,
  textQuery,
  centerLat,
  centerLng,
  searchRadiusMiles,
}) {
  const radiusMeters = Math.min(
    50000,
    Math.round(searchRadiusMiles * 1609.34)
  );

  const requestBody = {
    textQuery,
    pageSize: 20,
    locationBias: {
      circle: {
        center: {
          latitude: centerLat,
          longitude: centerLng,
        },
        radius: radiusMeters,
      },
    },
  };

  const response = await fetch(
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

  const data = await response.json();

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}

function filterAndSortPlaces(
  places,
  minDistance,
  maxDistance
) {
  return places
    .filter((place) => {
      return (
        place.distanceMiles >= minDistance &&
        place.distanceMiles <= maxDistance
      );
    })
    .sort((a, b) => {
      const ratingDifference =
        (Number(b.rating) || 0) -
        (Number(a.rating) || 0);

      if (ratingDifference !== 0) {
        return ratingDifference;
      }

      const reviewDifference =
        (Number(b.userRatingCount) || 0) -
        (Number(a.userRatingCount) || 0);

      if (reviewDifference !== 0) {
        return reviewDifference;
      }

      return (
        a.distanceMiles -
        b.distanceMiles
      );
    });
}

/**
 * Returns a point a given distance and
 * bearing away from the starting point.
 */
function destinationPoint(
  lat,
  lng,
  distanceInMiles,
  bearingInDegrees
) {
  const earthRadiusMiles = 3958.8;

  const angularDistance =
    distanceInMiles / earthRadiusMiles;

  const bearing =
    toRadians(bearingInDegrees);

  const lat1 = toRadians(lat);
  const lng1 = toRadians(lng);

  const lat2 = Math.asin(
    Math.sin(lat1) *
      Math.cos(angularDistance) +
      Math.cos(lat1) *
        Math.sin(angularDistance) *
        Math.cos(bearing)
  );

  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearing) *
        Math.sin(angularDistance) *
        Math.cos(lat1),
      Math.cos(angularDistance) -
        Math.sin(lat1) *
          Math.sin(lat2)
    );

  return {
    latitude: toDegrees(lat2),
    longitude: normalizeLongitude(
      toDegrees(lng2)
    ),
  };
}

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

function toDegrees(radians) {
  return radians * (180 / Math.PI);
}

function normalizeLongitude(longitude) {
  return (
    ((longitude + 540) % 360) - 180
  );
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
