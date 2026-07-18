# Feed My Belly  😋

A simple mobile-friendly restaurant recommendation website that helps
Tobin quickly decide what to eat.

🌐 Website: https://f2fang.github.io/Feed-Tobin/

## How It Works

1.  The user chooses a food category.
2.  The website requests the user's current location using browser
    geolocation.
3.  The frontend sends latitude, longitude, and the selected food
    category to a Cloudflare Worker API.
4.  The Cloudflare Worker calls Google Places API Text Search.
5.  Google Places searches for restaurants within approximately 20 miles
    of the user's current location.
6.  Restaurants are filtered by:
    -   Google rating \>= 4.0
    -   At least 50 Google reviews
7.  Duplicate Google Place IDs are removed.
8.  The restaurant list is shuffled.
9.  The website recommends one restaurant at a time.
10. Clicking `Nah... pick another 😂` shows the next restaurant in the
    shuffled queue.

Restaurants do not repeat during the same recommendation round.

After every restaurant has been shown, the list is shuffled again and
recommendations start another round. The first restaurant in a new round
is prevented from immediately repeating the last restaurant from the
previous round.

## Food Categories

-   🇰🇷 Korean
-   🇯🇵 Japanese
-   🇨🇳 Chinese
-   🇮🇹 Italian
-   🍔 Burger
-   🍕 Pizza
-   🍟 Fast Food
-   🌺 Local Hawaiian
-   🎲 Surprise Me

## Recommendation Logic

The Cloudflare Worker converts each category into a Google Places text
query.

``` text
korean_restaurant    -> Korean food
japanese_restaurant  -> Japanese food
chinese_restaurant   -> Chinese food
italian_restaurant   -> Italian food
hamburger_restaurant -> burgers
pizza_restaurant     -> pizza
fast_food_restaurant -> fast food
hawaiian             -> local Hawaiian food
restaurant           -> popular restaurants
```

Search radius:

``` text
20 miles
approximately 32,187 meters
```

Frontend filtering:

``` javascript
rating >= 4.0
userRatingCount >= 50
```

Recommendation flow:

``` text
Google Places results
        ↓
Filter low-rating restaurants
        ↓
Remove duplicate Place IDs
        ↓
Shuffle restaurants
        ↓
Recommend one restaurant
        ↓
Nah... pick another
        ↓
Show next restaurant
        ↓
Finish entire queue
        ↓
Shuffle again
        ↓
Start a new recommendation round
```

## Architecture

``` text
GitHub Pages
      ↓
Browser Geolocation
      ↓
Cloudflare Worker
      ↓
Google Places API
      ↓
Restaurant Results
      ↓
Frontend Filtering + Shuffle Queue
      ↓
Restaurant Recommendation
```

## Tech Stack

-   HTML
-   CSS
-   Vanilla JavaScript
-   GitHub Pages
-   Cloudflare Workers
-   Google Places API

## Project Structure

``` text
Feed-Tobin/
├── index.html
├── style.css
├── app.js
└── README.md
```

## API Security

The Google Places API key is not stored in GitHub.

The API key is stored as a Cloudflare Worker secret:

``` text
GOOGLE_PLACES_API_KEY
```

The frontend only calls the Cloudflare Worker API.

``` text
Browser
   ↓
Cloudflare Worker
   ↓
Google Places API
```

This prevents the Google API key from being exposed in the public GitHub
repository.

## Restaurant Link

The `GET THIS 😋` button opens the selected restaurant in Google Maps
using a Google Maps search URL.

## Deployment

Frontend: GitHub Pages

Website: https://f2fang.github.io/Feed-Tobin/

Backend:

``` text
Cloudflare Worker
feed-tobin-api
```

## Development

After updating files:

``` bash
git add .
git commit -m "Update Feed Tobin"
git push
```

GitHub Pages deploys the latest version from:

``` text
main
/(root)
```

## Cache Refresh

If a browser is still loading an old version of `app.js`, update the
script version in `index.html`.

``` html
<script src="app.js?v=4"></script>
```

Increase the version number when needed:

``` text
v=4
v=5
v=6
```

This forces the browser to request the latest JavaScript file.

## Purpose

Feed Tobin was built to answer one very important question:

> What should Tobin eat today? 😂
