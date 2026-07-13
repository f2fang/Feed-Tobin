let restaurants = [];
let currentRestaurant = null;
let rejectedPlaceIds = new Set();

const API_URL =
  "https://feed-tobin-api.hzieeff.workers.dev";

function findFood(type) {
  const restaurantBox =
    document.getElementById("restaurant");

  restaurantBox.innerHTML = `
    <p>Finding food near you... 😊</p>
  `;

  restaurants = [];
  currentRestaurant = null;
  rejectedPlaceIds.clear();

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

          console.error(
            "API error:",
            errorData
          );

          throw new Error(
            errorData.error ||
              "Unable to get restaurants"
          );
        }

        const data = await response.json();

        restaurants = (data.places || [])
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
  let availableRestaurants =
    restaurants.filter(
      (restaurant) =>
        !rejectedPlaceIds.has(
          restaurant.id
        )
    );

  // All restaurants have been shown
  if (availableRestaurants.length === 0) {
    rejectedPlaceIds.clear();

    availableRestaurants = [...restaurants];
  }

  const randomIndex = Math.floor(
    Math.random() *
      availableRestaurants.length
  );

  currentRestaurant =
    availableRestaurants[randomIndex];

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

    <button
      class="get-this-button"
      onclick="openRestaurant()"
    >
      GET THIS 😋
    </button>

    <button
      class="nah-button"
      onclick="nextRestaurant()"
    >
      Nah... pick another 😂
    </button>
  `;

  restaurantBox.dataset.googleUrl =
    googleSearchUrl;
}

function nextRestaurant() {
  if (currentRestaurant?.id) {
    rejectedPlaceIds.add(
      currentRestaurant.id
    );
  }

  pickNextRestaurant();
}

function openRestaurant() {
  const restaurantBox =
    document.getElementById("restaurant");

  const googleUrl =
    restaurantBox.dataset.googleUrl;

  if (googleUrl) {
    window.open(
      googleUrl,
      "_blank",
      "noopener,noreferrer"
    );
  }
}

function escapeHtml(value) {
  const div =
    document.createElement("div");

  div.textContent = value;

  return div.innerHTML;
}
