let restaurants = [];
let currentRestaurant = null;
let rejectedPlaceIds = new Set();

const API_URL = "https://feed-tobin-api.hzieeff.workers.dev";

function findFood(type) {
  const restaurantBox = document.getElementById("restaurant");

  restaurantBox.innerHTML = `
    <p>Finding food near you... 😋</p>
  `;

  rejectedPlaceIds.clear();
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
          throw new Error("Unable to get restaurants");
        }

        const data = await response.json();

        restaurants = (data.places || [])
          .filter(
            (place) =>
              place.rating >= 4.3 &&
              place.userRatingCount >= 100
          )
          .sort((a, b) => {
            const scoreA =
              a.rating * Math.log10(a.userRatingCount + 1);

            const scoreB =
              b.rating * Math.log10(b.userRatingCount + 1);

            return scoreB - scoreA;
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
      console.error(error);

      restaurantBox.innerHTML = `
        <p>I need your location to find food near you 📍</p>
      `;
    }
  );
}

function pickNextRestaurant() {
  const availableRestaurants = restaurants.filter(
    (restaurant) => !rejectedPlaceIds.has(restaurant.id)
  );

  if (availableRestaurants.length === 0) {
    rejectedPlaceIds.clear();
  }

  const choices =
    availableRestaurants.length > 0
      ? availableRestaurants
      : restaurants;

  const randomIndex = Math.floor(Math.random() * choices.length);

  currentRestaurant = choices[randomIndex];

  showRestaurant();
}

function showRestaurant() {
  const restaurant = currentRestaurant;

  const name =
    restaurant.displayName?.text || "Restaurant";

  const rating =
    restaurant.rating || "N/A";

  const reviewCount =
    restaurant.userRatingCount || 0;

  const address =
    restaurant.formattedAddress || "";

  const googleSearchUrl =
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${name} ${address}`
    )}`;

  document.getElementById("restaurant").innerHTML = `
    <h2>🍽️ Tonight's Pick</h2>

    <h2>${name}</h2>

    <p>
      ⭐ ${rating}
      (${reviewCount.toLocaleString()} reviews)
    </p>

    <p>📍 ${address}</p>

    <button onclick="window.open('${googleSearchUrl}', '_blank')">
      GET THIS 😋
    </button>

    <button onclick="nextRestaurant()">
      Nah... pick another 😂
    </button>
  `;
}

function nextRestaurant() {
  if (currentRestaurant) {
    rejectedPlaceIds.add(currentRestaurant.id);
  }

  pickNextRestaurant();
}
