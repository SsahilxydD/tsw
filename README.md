# App

## Google Places Autocomplete (Address)

The Address page can use Google Places to auto-fill Area/Society, City, State, PIN, and Country. Configure:

1. Create a Google Cloud API key with Maps JavaScript API enabled.
2. Add the key to a `.env` file at the project root:

```
VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
```

3. Restart the dev server. The “Search area or society” field will show suggestions and auto-fill address details on selection.

Notes:
- If the key isn’t set, the page still works with PIN auto-fill (Zippopotam.us + India Pincode fallback).
- The app does not store the API key in the repo; it’s read from env at runtime via Vite.
