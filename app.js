let restaurantQueue = [];
let currentRestaurant = null;

const API_URL =
  "https://feed-tobin-api.hzieeff.workers.dev";

function findFood(type) {
  const restaurantBox =
    document.getElementById("restaurant");

  restaurantBox.innerHTML = `
    <p>Finding food near you... 😊</p>
  `;

  restaurantQueue = [];
  currentRestaurant = null;

  if (!navigator.geolocation) {
    restaurantBox.innerHTML = `
      <p>Your browser does not support location.</p>
    `;
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        const response = await fetch(
          `${API_URL}/?lat=${lat}&lng=${lng}&type=${type}`
        );

        if (!response.ok) {
          const errorData = await response.json();

          console.error("API error:", errorData);

          throw new Error(
            errorData.error ||
              "Unable to get restaurants"
          );
        }

        const data = await response.json();

        const restaurants = (data.places || [])
          .filter((place) => {
            const rating =
              place.rating || 0;

            const reviewCount =
              place.userRatingCount || 0;

            return (
              rating >= 4.0 &&
              reviewCount >= 50
            );
          });

        if (restaurants.length === 0) {
          restaurantBox.innerHTML = `
            <p>Hmm... I couldn't find a good match 😭</p>
            <p>Try another food type.</p>
          `;
          return;
        }

        // Remove duplicate Google Place IDs
        const uniqueRestaurants = [
          ...new Map(
            restaurants.map((restaurant) => [
              restaurant.id,
              restaurant,
            ])
          ).values(),
        ];

        // Shuffle only once
        restaurantQueue =
          shuffleArray(uniqueRestaurants);

        pickNextRestaurant();
      } catch (error) {
        console.error(error);

        restaurantBox.innerHTML = `
          <p>Something went wrong 😭</p>
          <p>Please try again.</p>
        `;
      }
    },

    (error) => {
      console.error(
        "Location error:",
        error
      );

      restaurantBox.innerHTML = `
        <p>I need your location to find food near you 📍</p>
        <p>Please allow location access and try again.</p>
      `;
    },

    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000,
    }
  );
}

function pickNextRestaurant() {
  if (restaurantQueue.length === 0) {
    currentRestaurant = null;

    document.getElementById(
      "restaurant"
    ).innerHTML = `
      <h2>You've seen them all 😂</h2>

      <p>
        I showed you every good match I found.
      </p>

      <p>
        Pick another food type 😋
      </p>
    `;

    return;
  }

  currentRestaurant =
    restaurantQueue.shift();

  showRestaurant();
}

function showRestaurant() {
  if (!currentRestaurant) {
    return;
  }

  const restaurant =
    currentRestaurant;

  const name =
    restaurant.displayName?.text ||
    "Restaurant";

  const rating =
    restaurant.rating || "N/A";

  const reviewCount =
    restaurant.userRatingCount || 0;

  const address =
    restaurant.formattedAddress || "";

  const googleSearchUrl =
    "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent(
      `${name} ${address}`
    );

  const restaurantBox =
    document.getElementById("restaurant");

  restaurantBox.innerHTML = `
    <h2>🍽️ Tonight's Pick</h2>

    <h2>${escapeHtml(name)}</h2>

    <p>
      ⭐ ${rating}
      (${reviewCount.toLocaleString()} reviews)
    </p>

    <p>
      📍 ${escapeHtml(address)}
    </p>

    <p class="remaining">
      ${restaurantQueue.length} more picks available
    </p>

    <a
      class="get-this-button"
      href="${googleSearchUrl}"
    >
      GET THIS 😋
    </a>

    <button
      class="nah-button"
      onclick="nextRestaurant()"
    >
      Nah... pick another 😂
    </button>
  `;
}

function nextRestaurant() {
  pickNextRestaurant();
}

function shuffleArray(array) {
  const shuffled = [...array];

  for (
    let i = shuffled.length - 1;
    i > 0;
    i--
  ) {
    const j = Math.floor(
      Math.random() * (i + 1)
    );

    [
      shuffled[i],
      shuffled[j],
    ] = [
      shuffled[j],
      shuffled[i],
    ];
  }

  return shuffled;
}

function escapeHtml(value) {
  const div =
    document.createElement("div");

  div.textContent = value;

  return div.innerHTML;
}
