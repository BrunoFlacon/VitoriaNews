// Stub for get-weather — returns empty data in local dev mode
export default async function getWeather({ body, user, supabase }) {
  return {
    status: 200,
    body: {
      success: true,
      temperature: null,
      condition: null,
      humidity: null,
      wind_speed: null,
      icon: null,
      city: null,
      message: "Weather API not available in local dev mode",
    },
  };
}
