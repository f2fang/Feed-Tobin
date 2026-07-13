let allRestaurants = [];
let restaurantQueue = [];
let currentRestaurant = null;
let currentFoodType = null;
let currentSearchType = null;
let lastSurpriseType = null;

const API_URL =
  "https://feed-tobin-api.hzieeff.workers.dev";

const surpriseTypes = [
  "korean_restaurant",
  "japanese_restaurant",
  "chinese_restaurant",
  "italian_restaurant",
  "hamburger_restaurant",
  "pizza_restaurant",
  "fast_food_restaurant",
  "hawaiian",

  "thai",
  "vietnamese",
  "indian",
  "mexican",
  "filipino",
  "greek",
  "mediterranean",
  "french",
  "spanish",
  "middle_eastern",
  "cajun",
  "caribbean",
  "african",
  "brazilian",
  "peruvian",

  "american",
  "southern",
  "bbq",
  "seafood",
  "steakhouse",

  "sushi",
  "ramen",
  "pho",
  "dim_sum",
  "hot_pot",
  "noodles",
  "poke",

  "tacos",
  "sandwiches",
  "fried_chicken",
  "breakfast",
  "brunch",
  "bakery",
  "food_truck",
  "local_food",
];

function findFood(type) {
  currentFoodType = type;

  if (type === "restaurant") {
    findSurpriseFood();
    return;
  }

  findFoodFromApi(type);
}

async function findFoodFromApi(type) {
  const restaurantBox =
    document.getElementById("restaurant");

  restaurantBox.innerHTML = `
    <p>Finding food near you... 😊</p>
  `;

  allRestaurants = [];
  restaurantQueue = [];
  currentRestaurant = null;
  currentSearchType = type;

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

        console.log(
          "Food search:",
          type,
          data.query
        );

        const restaurants = (data.places || [])
          .filter((place) => {
            const rating =
              place.rating || 0;

            const reviews =
              place.userRatingCount || 0;

            return (
              rating >= 4.0 &&
              reviews >= 50
            );
          });

        if (restaurants.length === 0) {
          if (currentFoodType === "restaurant") {
            findSurpriseFood();
            return;
          }

          restaurantBox.innerHTML = `
            <p>Hmm... I couldn't find a good match 😭</p>
            <p>Try another food type.</p>
          `;

          return;
        }

        allRestaurants = [
          ...new Map(
            restaurants.map((restaurant) => [
              restaurant.id,
              restaurant,
            ])
          ).values(),
        ];

        restaurantQueue =
          shuffleArray(allRestaurants);

        pickNextRestaurant();

      } catch (error) {
        console.error(error);

        restaurantBox.innerHTML = `
          <p>Something went wrong 😭</p>
          <p>Please try again.</p>
        `;
      }
    },

    () => {
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

function findSurpriseFood() {
  const randomType =
    getRandomSurpriseType();

  lastSurpriseType = randomType;

  findFoodFromApi(randomType);
}

function getRandomSurpriseType() {
  const availableTypes =
    surpriseTypes.filter(
      (type) =>
        type !== lastSurpriseType
    );

  const randomIndex = Math.floor(
    Math.random() *
      availableTypes.length
  );

  return availableTypes[randomIndex];
}

function pickNextRestaurant() {
  const previousRestaurant =
    currentRestaurant;

  if (restaurantQueue.length === 0) {
    restaurantQueue =
      shuffleArray(allRestaurants);

    if (
      restaurantQueue.length > 1 &&
      previousRestaurant &&
      restaurantQueue[0].id ===
        previousRestaurant.id
    ) {
      [
        restaurantQueue[0],
        restaurantQueue[1],
      ] = [
        restaurantQueue[1],
        restaurantQueue[0],
      ];
    }
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

  const surpriseLabel =
    currentFoodType === "restaurant"
      ? `
        <p class="surprise-type">
          🎲 Surprise category:
          ${escapeHtml(
            formatFoodType(currentSearchType)
          )}
        </p>
      `
      : "";

  restaurantBox.innerHTML = `
    <h2>🍽️ Tonight's Pick</h2>

    ${surpriseLabel}

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
  if (currentFoodType === "restaurant") {
    findSurpriseFood();
    return;
  }

  pickNextRestaurant();
}

function formatFoodType(type) {
  const labels = {
    korean_restaurant: "Korean",
    japanese_restaurant: "Japanese",
    chinese_restaurant: "Chinese",
    italian_restaurant: "Italian",
    hamburger_restaurant: "Burgers",
    pizza_restaurant: "Pizza",
    fast_food_restaurant: "Fast Food",
    hawaiian: "Local Hawaiian",
    thai: "Thai",
    vietnamese: "Vietnamese",
    indian: "Indian",
    mexican: "Mexican",
    filipino: "Filipino",
    greek: "Greek",
    mediterranean: "Mediterranean",
    french: "French",
    spanish: "Spanish",
    middle_eastern: "Middle Eastern",
    cajun: "Cajun",
    caribbean: "Caribbean",
    african: "African",
    brazilian: "Brazilian",
    peruvian: "Peruvian",
    american: "American",
    southern: "Southern",
    bbq: "BBQ",
    seafood: "Seafood",
    steakhouse: "Steakhouse",
    sushi: "Sushi",
    ramen: "Ramen",
    pho: "Pho",
    dim_sum: "Dim Sum",
    hot_pot: "Hot Pot",
    noodles: "Noodles",
    poke: "Poke",
    tacos: "Tacos",
    sandwiches: "Sandwiches",
    fried_chicken: "Fried Chicken",
    breakfast: "Breakfast",
    brunch: "Brunch",
    bakery: "Bakery",
    food_truck: "Food Truck",
    local_food: "Local Food",
  };

  return labels[type] || type;
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
